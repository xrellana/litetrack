const express = require('express');
const { z } = require('zod');
const db = require('../db/connection');
const { authenticate, requireCsrf } = require('../middleware/auth');
const { asyncHandler, validateQuery } = require('../middleware/errors');
const {
  hydrateDiscussionRows,
  pageEnvelope,
  parsePagination,
  requireMembership
} = require('../services/permissions');
const { idParam } = require('../services/http');

const router = express.Router();

const querySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().min(0).optional()
});

router.use(authenticate, requireCsrf);

router.get('/teams/:teamId/activity', validateQuery(querySchema), asyncHandler(async (req, res) => {
  const teamId = idParam(req.params.teamId, 'team id');
  await requireMembership(db, teamId, req.user.id);
  const { limit, offset } = parsePagination(req.query);
  const countRow = await db('activity_log').where({ team_id: teamId }).count({ total: 'id' }).first();
  const rows = await db('activity_log')
    .where({ team_id: teamId })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
  const hydrated = await hydrateDiscussionRows(db, rows);
  return res.json(pageEnvelope(hydrated.map((row) => ({
    ...row,
    details: JSON.parse(row.details || '{}')
  })), limit, offset, Number(countRow.total || 0)));
}));

module.exports = router;

