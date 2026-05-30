const express = require('express');
const { z } = require('zod');
const db = require('../db/connection');
const { authenticate, requireCsrf } = require('../middleware/auth');
const { asyncHandler, validateBody } = require('../middleware/errors');
const {
  emitTeam,
  hydrateDiscussionRows,
  insertActivity,
  now,
  requireItemAccess
} = require('../services/permissions');
const { idParam, sendData } = require('../services/http');

const router = express.Router();

const commentSchema = z.object({
  content: z.string().trim().min(1).max(5000)
});

router.use(authenticate, requireCsrf);

router.post('/items/:itemId/comments', validateBody(commentSchema), asyncHandler(async (req, res) => {
  const itemId = idParam(req.params.itemId, 'item id');
  const { item } = await requireItemAccess(db, itemId, req.user.id);
  let commentId;
  let activity;

  await db.transaction(async (trx) => {
    [commentId] = await trx('comments').insert({
      item_id: itemId,
      user_id: req.user.id,
      content: req.body.content
    });
    await trx('items').where({ id: itemId }).update({ updated_at: now() });
    activity = await insertActivity(trx, {
      team_id: item.team_id,
      user_id: req.user.id,
      action: 'comment_posted',
      entity_type: 'comment',
      entity_id: commentId,
      details: { item_id: itemId, item_title: item.title }
    });
  });

  const [comment] = await hydrateDiscussionRows(db, await db('comments').where({ id: commentId }));
  emitTeam(req, item.team_id, 'comment_posted', { comment, itemId });
  emitTeam(req, item.team_id, 'activity', { activity });
  return sendData(res, comment, 201);
}));

router.get('/items/:itemId/comments', asyncHandler(async (req, res) => {
  const itemId = idParam(req.params.itemId, 'item id');
  await requireItemAccess(db, itemId, req.user.id);
  const comments = await db('comments').where({ item_id: itemId }).orderBy('created_at', 'asc');
  return sendData(res, await hydrateDiscussionRows(db, comments));
}));

module.exports = router;
