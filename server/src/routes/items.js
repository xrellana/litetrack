const express = require('express');
const { z } = require('zod');
const db = require('../db/connection');
const { authenticate, requireCsrf } = require('../middleware/auth');
const { AppError, asyncHandler, validateBody, validateQuery } = require('../middleware/errors');
const {
  canChangeItemStatus,
  canEditItem,
  emitTeam,
  ensureAssigneeIsMember,
  ensureTagsBelongToTeam,
  hydrateDiscussionRows,
  hydrateItems,
  insertActivity,
  isInstanceAdmin,
  now,
  pageEnvelope,
  parsePagination,
  requireItemAccess,
  requireMembership
} = require('../services/permissions');
const { idParam, sendData } = require('../services/http');

const router = express.Router();

const itemCreateSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(5000).optional().default(''),
  status: z.enum(['todo', 'in_progress', 'done']).optional().default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  assigned_to: z.number().int().positive().nullable().optional(),
  due_date: z.string().trim().max(40).nullable().optional(),
  is_pinned: z.boolean().optional().default(false),
  tag_ids: z.array(z.number().int().positive()).optional().default([])
});

const itemUpdateSchema = z.object({
  title: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to: z.number().int().positive().nullable().optional(),
  due_date: z.string().trim().max(40).nullable().optional(),
  is_pinned: z.boolean().optional(),
  tag_ids: z.array(z.number().int().positive()).optional(),
  updated_at: z.string().optional()
}).refine((body) => Object.keys(body).some((key) => key !== 'updated_at'), {
  message: 'At least one item field is required.'
});

const listQuerySchema = z.object({
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  assignee: z.coerce.number().int().positive().optional(),
  tag: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(140).optional(),
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).optional()
});

const globalListQuerySchema = listQuerySchema.extend({
  teams: z.string().trim().max(500).optional()
});

router.use(authenticate, requireCsrf);

async function replaceItemTags(trx, itemId, teamId, tagIds) {
  if (tagIds === undefined) return;
  await ensureTagsBelongToTeam(trx, teamId, tagIds);
  await trx('item_tags').where({ item_id: itemId }).delete();
  if (tagIds.length) {
    await trx('item_tags').insert(tagIds.map((tagId) => ({ item_id: itemId, tag_id: tagId })));
  }
}

async function loadItem(itemId) {
  const item = await db('items').where({ id: itemId }).first();
  if (!item) return null;
  const [hydrated] = await hydrateItems(db, [item]);
  return hydrated;
}

function applyItemFilters(base, query) {
  if (query.status) base.andWhere('items.status', query.status);
  if (query.assignee) base.andWhere('items.assigned_to', query.assignee);
  if (query.search) {
    const search = `%${query.search}%`;
    base.andWhere((builder) => {
      builder.whereLike('items.title', search).orWhereLike('items.description', search);
    });
  }
  if (query.tag) {
    base.whereExists(function exists() {
      this.select(1)
        .from('item_tags')
        .whereRaw('item_tags.item_id = items.id')
        .andWhere('item_tags.tag_id', query.tag);
    });
  }
  return base;
}

function parseTeamFilter(value) {
  if (!value) return [];
  const ids = value.split(',')
    .map((id) => Number(id.trim()))
    .filter(Boolean);
  if (!ids.length || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Team filter must contain positive team ids.');
  }
  return [...new Set(ids)];
}

router.post('/teams/:teamId/items', validateBody(itemCreateSchema), asyncHandler(async (req, res) => {
  const teamId = idParam(req.params.teamId, 'team id');
  await requireMembership(db, teamId, req.user.id);
  await ensureAssigneeIsMember(db, teamId, req.body.assigned_to);
  await ensureTagsBelongToTeam(db, teamId, req.body.tag_ids);

  let itemId;
  let activity;
  await db.transaction(async (trx) => {
    [itemId] = await trx('items').insert({
      team_id: teamId,
      created_by: req.user.id,
      assigned_to: req.body.assigned_to || null,
      title: req.body.title,
      description: req.body.description || '',
      status: req.body.status,
      priority: req.body.priority,
      due_date: req.body.due_date || null,
      is_pinned: req.body.is_pinned ? 1 : 0,
      updated_at: now()
    });
    if (req.body.tag_ids.length) {
      await trx('item_tags').insert(req.body.tag_ids.map((tagId) => ({ item_id: itemId, tag_id: tagId })));
    }
    activity = await insertActivity(trx, {
      team_id: teamId,
      user_id: req.user.id,
      action: 'item_created',
      entity_type: 'item',
      entity_id: itemId,
      details: { item_title: req.body.title }
    });
  });

  const item = await loadItem(itemId);
  emitTeam(req, teamId, 'item_created', { item });
  emitTeam(req, teamId, 'activity', { activity });
  return sendData(res, item, 201);
}));

router.get('/items', validateQuery(globalListQuerySchema), asyncHandler(async (req, res) => {
  if (await isInstanceAdmin(db, req.user.id)) {
    throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
  }

  const memberships = await db('team_members')
    .select('team_id')
    .where({ user_id: req.user.id });
  const accessibleTeamIds = memberships.map((membership) => membership.team_id);
  const requestedTeamIds = parseTeamFilter(req.query.teams);
  if (requestedTeamIds.some((teamId) => !accessibleTeamIds.includes(teamId))) {
    throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
  }

  const visibleTeamIds = requestedTeamIds.length ? requestedTeamIds : accessibleTeamIds;
  const { limit, offset } = parsePagination(req.query);
  if (!visibleTeamIds.length) {
    return res.json(pageEnvelope([], limit, offset, 0));
  }

  const base = applyItemFilters(db('items').whereIn('items.team_id', visibleTeamIds), req.query);
  const countRow = await base.clone().count({ total: 'items.id' }).first();
  const items = await base
    .clone()
    .select('items.*')
    .orderBy('items.is_pinned', 'desc')
    .orderBy('items.updated_at', 'desc')
    .limit(limit)
    .offset(offset);

  const hydrated = await hydrateItems(db, items);
  return res.json(pageEnvelope(hydrated, limit, offset, Number(countRow.total || 0)));
}));

router.get('/teams/:teamId/items', validateQuery(listQuerySchema), asyncHandler(async (req, res) => {
  const teamId = idParam(req.params.teamId, 'team id');
  await requireMembership(db, teamId, req.user.id);
  const { limit, offset } = parsePagination(req.query);

  const base = applyItemFilters(db('items').where('items.team_id', teamId), req.query);

  const countRow = await base.clone().count({ total: 'items.id' }).first();
  const items = await base
    .clone()
    .select('items.*')
    .orderBy('items.is_pinned', 'desc')
    .orderBy('items.updated_at', 'desc')
    .limit(limit)
    .offset(offset);

  const hydrated = await hydrateItems(db, items);
  return res.json(pageEnvelope(hydrated, limit, offset, Number(countRow.total || 0)));
}));

router.get('/items/:id', asyncHandler(async (req, res) => {
  const itemId = idParam(req.params.id, 'item id');
  const { item } = await requireItemAccess(db, itemId, req.user.id);
  const [hydratedItem] = await hydrateItems(db, [item]);
  const updates = await db('progress_updates').where({ item_id: itemId }).orderBy('created_at', 'asc');
  const comments = await db('comments').where({ item_id: itemId }).orderBy('created_at', 'asc');
  return sendData(res, {
    item: hydratedItem,
    updates: await hydrateDiscussionRows(db, updates),
    comments: await hydrateDiscussionRows(db, comments)
  });
}));

router.put('/items/:id', validateBody(itemUpdateSchema), asyncHandler(async (req, res) => {
  const itemId = idParam(req.params.id, 'item id');
  const { item, membership } = await requireItemAccess(db, itemId, req.user.id);
  if (req.body.updated_at && req.body.updated_at !== item.updated_at) {
    throw new AppError(409, 'CONFLICT', 'Item was changed by someone else. Refresh and try again.');
  }

  const metadataKeys = ['title', 'description', 'priority', 'assigned_to', 'due_date', 'is_pinned', 'tag_ids'];
  const touchesMetadata = metadataKeys.some((key) => Object.hasOwn(req.body, key));
  if (touchesMetadata && !canEditItem(membership, item, req.user.id)) {
    throw new AppError(403, 'FORBIDDEN', 'Only admins or the item creator can edit item metadata.');
  }
  if (Object.hasOwn(req.body, 'status') && !canChangeItemStatus(membership, item, req.user.id)) {
    throw new AppError(403, 'FORBIDDEN', 'Only admins, creators, or assignees can change item status.');
  }

  if (Object.hasOwn(req.body, 'assigned_to')) {
    await ensureAssigneeIsMember(db, item.team_id, req.body.assigned_to);
  }
  if (Object.hasOwn(req.body, 'tag_ids')) {
    await ensureTagsBelongToTeam(db, item.team_id, req.body.tag_ids);
  }

  let activity;
  const updates = { updated_at: now() };
  for (const key of ['title', 'description', 'status', 'priority', 'due_date']) {
    if (Object.hasOwn(req.body, key)) updates[key] = req.body[key] || null;
  }
  if (Object.hasOwn(req.body, 'assigned_to')) updates.assigned_to = req.body.assigned_to || null;
  if (Object.hasOwn(req.body, 'is_pinned')) updates.is_pinned = req.body.is_pinned ? 1 : 0;

  await db.transaction(async (trx) => {
    await trx('items').where({ id: itemId }).update(updates);
    await replaceItemTags(trx, itemId, item.team_id, req.body.tag_ids);
    activity = await insertActivity(trx, {
      team_id: item.team_id,
      user_id: req.user.id,
      action: req.body.status && req.body.status !== item.status ? 'status_changed' : 'item_updated',
      entity_type: 'item',
      entity_id: itemId,
      details: {
        item_title: req.body.title || item.title,
        from_status: item.status,
        to_status: req.body.status || item.status
      }
    });
  });

  const updatedItem = await loadItem(itemId);
  emitTeam(req, item.team_id, 'item_updated', { item: updatedItem });
  emitTeam(req, item.team_id, 'activity', { activity });
  return sendData(res, updatedItem);
}));

router.delete('/items/:id', asyncHandler(async (req, res) => {
  const itemId = idParam(req.params.id, 'item id');
  const { item, membership } = await requireItemAccess(db, itemId, req.user.id);
  if (!canEditItem(membership, item, req.user.id)) {
    throw new AppError(403, 'FORBIDDEN', 'Only admins or the item creator can delete this item.');
  }

  let activity;
  await db.transaction(async (trx) => {
    await trx('items').where({ id: itemId }).delete();
    activity = await insertActivity(trx, {
      team_id: item.team_id,
      user_id: req.user.id,
      action: 'item_deleted',
      entity_type: 'item',
      entity_id: itemId,
      details: { item_title: item.title }
    });
  });

  emitTeam(req, item.team_id, 'item_deleted', { itemId, teamId: item.team_id });
  emitTeam(req, item.team_id, 'activity', { activity });
  return sendData(res, { deleted: true });
}));

module.exports = router;
