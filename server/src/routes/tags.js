const express = require('express');
const { z } = require('zod');
const db = require('../db/connection');
const { authenticate, requireCsrf } = require('../middleware/auth');
const { AppError, asyncHandler, validateBody } = require('../middleware/errors');
const {
  emitTeam,
  insertActivity,
  requireAdmin,
  requireMembership
} = require('../services/permissions');
const { idParam, sendData, sqliteConflict } = require('../services/http');

const router = express.Router();

const tagCreateSchema = z.object({
  name: z.string().trim().min(1).max(32),
  color: z.string().trim().regex(/^#([0-9a-fA-F]{6})$/)
});

const tagUpdateSchema = z.object({
  name: z.string().trim().min(1).max(32).optional(),
  color: z.string().trim().regex(/^#([0-9a-fA-F]{6})$/).optional()
}).refine((body) => body.name || body.color, {
  message: 'At least one tag field is required.'
});

router.use(authenticate, requireCsrf);

router.get('/teams/:teamId/tags', asyncHandler(async (req, res) => {
  const teamId = idParam(req.params.teamId, 'team id');
  await requireMembership(db, teamId, req.user.id);
  const tags = await db('tags').where({ team_id: teamId }).orderBy('name', 'asc');
  return sendData(res, tags);
}));

router.post('/teams/:teamId/tags', validateBody(tagCreateSchema), asyncHandler(async (req, res) => {
  const teamId = idParam(req.params.teamId, 'team id');
  await requireAdmin(db, teamId, req.user.id);
  let tagId;
  let activity;

  try {
    await db.transaction(async (trx) => {
      [tagId] = await trx('tags').insert({
        team_id: teamId,
        name: req.body.name,
        color: req.body.color
      });
      activity = await insertActivity(trx, {
        team_id: teamId,
        user_id: req.user.id,
        action: 'tag_created',
        entity_type: 'tag',
        entity_id: tagId,
        details: { tag_name: req.body.name, tag_color: req.body.color }
      });
    });
  } catch (error) {
    sqliteConflict(error, 'A tag with that name already exists for this team.');
  }

  const tag = await db('tags').where({ id: tagId }).first();
  emitTeam(req, teamId, 'tag_created', { tag });
  emitTeam(req, teamId, 'activity', { activity });
  return sendData(res, tag, 201);
}));

router.put('/tags/:id', validateBody(tagUpdateSchema), asyncHandler(async (req, res) => {
  const tagId = idParam(req.params.id, 'tag id');
  const existing = await db('tags').where({ id: tagId }).first();
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
  await requireAdmin(db, existing.team_id, req.user.id);

  const patch = {};
  if (req.body.name) patch.name = req.body.name;
  if (req.body.color) patch.color = req.body.color;
  let activity;

  try {
    await db.transaction(async (trx) => {
      await trx('tags').where({ id: tagId }).update(patch);
      activity = await insertActivity(trx, {
        team_id: existing.team_id,
        user_id: req.user.id,
        action: 'tag_updated',
        entity_type: 'tag',
        entity_id: tagId,
        details: { tag_name: patch.name || existing.name, tag_color: patch.color || existing.color }
      });
    });
  } catch (error) {
    sqliteConflict(error, 'A tag with that name already exists for this team.');
  }

  const tag = await db('tags').where({ id: tagId }).first();
  emitTeam(req, existing.team_id, 'tag_updated', { tag });
  emitTeam(req, existing.team_id, 'activity', { activity });
  return sendData(res, tag);
}));

router.delete('/tags/:id', asyncHandler(async (req, res) => {
  const tagId = idParam(req.params.id, 'tag id');
  const existing = await db('tags').where({ id: tagId }).first();
  if (!existing) return sendData(res, { deleted: true });
  await requireAdmin(db, existing.team_id, req.user.id);

  let activity;
  await db.transaction(async (trx) => {
    await trx('tags').where({ id: tagId }).delete();
    activity = await insertActivity(trx, {
      team_id: existing.team_id,
      user_id: req.user.id,
      action: 'tag_deleted',
      entity_type: 'tag',
      entity_id: tagId,
      details: { tag_name: existing.name, tag_color: existing.color }
    });
  });

  emitTeam(req, existing.team_id, 'tag_deleted', { tagId, teamId: existing.team_id });
  emitTeam(req, existing.team_id, 'activity', { activity });
  return sendData(res, { deleted: true });
}));

module.exports = router;
