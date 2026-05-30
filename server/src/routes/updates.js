const express = require('express');
const { z } = require('zod');
const db = require('../db/connection');
const { authenticate, requireCsrf } = require('../middleware/auth');
const { AppError, asyncHandler, validateBody } = require('../middleware/errors');
const {
  canChangeItemStatus,
  emitTeam,
  hydrateDiscussionRows,
  hydrateItems,
  insertActivity,
  now,
  requireItemAccess
} = require('../services/permissions');
const { idParam, sendData } = require('../services/http');

const router = express.Router();

const updateSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  status: z.enum(['todo', 'in_progress', 'done']).optional()
});

router.use(authenticate, requireCsrf);

router.post('/items/:itemId/updates', validateBody(updateSchema), asyncHandler(async (req, res) => {
  const itemId = idParam(req.params.itemId, 'item id');
  const { item, membership } = await requireItemAccess(db, itemId, req.user.id);
  if (req.body.status && req.body.status !== item.status && !canChangeItemStatus(membership, item, req.user.id)) {
    throw new AppError(403, 'FORBIDDEN', 'Only admins, creators, or assignees can change item status.');
  }

  const statusChange = req.body.status && req.body.status !== item.status
    ? `${item.status}->${req.body.status}`
    : null;
  let updateId;
  let activity;
  await db.transaction(async (trx) => {
    [updateId] = await trx('progress_updates').insert({
      item_id: itemId,
      user_id: req.user.id,
      content: req.body.content,
      status_change: statusChange
    });
    await trx('items').where({ id: itemId }).update({
      status: req.body.status || item.status,
      updated_at: now()
    });
    activity = await insertActivity(trx, {
      team_id: item.team_id,
      user_id: req.user.id,
      action: statusChange ? 'status_changed' : 'update_posted',
      entity_type: 'item',
      entity_id: itemId,
      details: { item_title: item.title, status_change: statusChange }
    });
  });

  const [update] = await hydrateDiscussionRows(db, await db('progress_updates').where({ id: updateId }));
  const [updatedItem] = await hydrateItems(db, await db('items').where({ id: itemId }));
  emitTeam(req, item.team_id, 'update_posted', { update, itemId });
  emitTeam(req, item.team_id, 'item_updated', { item: updatedItem });
  emitTeam(req, item.team_id, 'activity', { activity });
  return sendData(res, update, 201);
}));

router.get('/items/:itemId/updates', asyncHandler(async (req, res) => {
  const itemId = idParam(req.params.itemId, 'item id');
  await requireItemAccess(db, itemId, req.user.id);
  const updates = await db('progress_updates').where({ item_id: itemId }).orderBy('created_at', 'asc');
  return sendData(res, await hydrateDiscussionRows(db, updates));
}));

module.exports = router;

