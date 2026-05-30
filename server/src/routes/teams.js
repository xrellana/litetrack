const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const db = require('../db/connection');
const { authenticate, requireCsrf } = require('../middleware/auth');
const { AppError, asyncHandler, validateBody } = require('../middleware/errors');
const {
  assertNotLastAdmin,
  emitTeam,
  generateInviteCode,
  getMembership,
  insertActivity,
  isInstanceAdmin,
  publicUser,
  requireAdmin,
  requireMembership,
  USER_COLUMNS
} = require('../services/permissions');
const { idParam, sendData, sqliteConflict } = require('../services/http');

const router = express.Router();

const joinLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: Number(process.env.RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false
});

const teamSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(5000).optional().nullable()
});

const joinSchema = z.object({
  invite_code: z.string().trim().min(6).max(32)
});

const roleSchema = z.object({
  role: z.enum(['admin', 'member'])
});

router.use(authenticate, requireCsrf);

async function loadTeam(teamId) {
  return db('teams').where({ id: teamId }).first();
}

async function loadMembers(teamId) {
  const rows = await db('team_members')
    .join('users', 'users.id', 'team_members.user_id')
    .select(
      'team_members.id as membership_id',
      'team_members.team_id',
      'team_members.user_id',
      'team_members.role',
      'team_members.joined_at',
      'users.id as id',
      'users.username as username',
      'users.email as email',
      'users.display_name as display_name',
      'users.avatar_color as avatar_color',
      'users.is_instance_admin as is_instance_admin',
      'users.created_at as created_at'
    )
    .where('team_members.team_id', teamId)
    .orderBy('users.display_name', 'asc');

  return rows.map((row) => ({
    id: row.membership_id,
    team_id: row.team_id,
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,
    user: publicUser(row)
  }));
}

router.post('/', validateBody(teamSchema), asyncHandler(async (req, res) => {
  let inviteCode = generateInviteCode();
  let teamId;

  await db.transaction(async (trx) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        [teamId] = await trx('teams').insert({
          name: req.body.name,
          description: req.body.description || '',
          invite_code: inviteCode,
          created_by: req.user.id
        });
        break;
      } catch (error) {
        if (!String(error.message || '').includes('SQLITE_CONSTRAINT')) throw error;
        inviteCode = generateInviteCode();
      }
    }

    if (!teamId) throw new AppError(409, 'CONFLICT', 'Could not allocate a unique invite code.');

    await trx('team_members').insert({
      team_id: teamId,
      user_id: req.user.id,
      role: 'admin'
    });

    await insertActivity(trx, {
      team_id: teamId,
      user_id: req.user.id,
      action: 'team_created',
      entity_type: 'team',
      entity_id: teamId,
      details: { team_name: req.body.name }
    });
  });

  const team = await loadTeam(teamId);
  return sendData(res, { ...team, role: 'admin', member_count: 1 }, 201);
}));

router.get('/', asyncHandler(async (req, res) => {
  const instanceAdmin = await isInstanceAdmin(db, req.user.id);
  const teams = instanceAdmin
    ? await db('teams')
      .leftJoin('team_members as own', function joinOwn() {
        this.on('own.team_id', 'teams.id').andOn('own.user_id', db.raw('?', [req.user.id]));
      })
      .leftJoin('team_members as counts', 'counts.team_id', 'teams.id')
      .select('teams.*', 'own.role as member_role')
      .count({ member_count: 'counts.id' })
      .groupBy('teams.id', 'own.role')
      .orderBy('teams.created_at', 'desc')
    : await db('teams')
      .join('team_members', 'team_members.team_id', 'teams.id')
      .leftJoin('team_members as counts', 'counts.team_id', 'teams.id')
      .select('teams.*', 'team_members.role')
      .count({ member_count: 'counts.id' })
      .where('team_members.user_id', req.user.id)
      .groupBy('teams.id', 'team_members.role')
      .orderBy('teams.created_at', 'desc');

  return sendData(res, teams.map((team) => ({
    ...team,
    role: team.role || team.member_role || 'instance_admin',
    member_role: undefined,
    member_count: Number(team.member_count)
  })));
}));

router.post('/join', joinLimiter, validateBody(joinSchema), asyncHandler(async (req, res) => {
  const team = await db('teams').where({ invite_code: req.body.invite_code.toUpperCase() }).first();
  if (!team) throw new AppError(404, 'NOT_FOUND', 'Invite code was not found.');

  let activity;
  try {
    await db.transaction(async (trx) => {
      await trx('team_members').insert({
        team_id: team.id,
        user_id: req.user.id,
        role: 'member'
      });
      activity = await insertActivity(trx, {
        team_id: team.id,
        user_id: req.user.id,
        action: 'member_joined',
        entity_type: 'team_member',
        entity_id: req.user.id,
        details: { team_name: team.name }
      });
    });
  } catch (error) {
    sqliteConflict(error, 'You are already a member of this team.');
  }

  const [member] = await loadMembers(team.id).then((members) => members.filter((row) => row.user_id === req.user.id));
  emitTeam(req, team.id, 'member_joined', { member });
  emitTeam(req, team.id, 'activity', { activity });
  return sendData(res, { team: { ...team, role: 'member' }, member }, 201);
}));

router.get('/:id/members', asyncHandler(async (req, res) => {
  const teamId = idParam(req.params.id, 'team id');
  await requireMembership(db, teamId, req.user.id);
  return sendData(res, await loadMembers(teamId));
}));

router.put('/:id', validateBody(teamSchema), asyncHandler(async (req, res) => {
  const teamId = idParam(req.params.id, 'team id');
  await requireAdmin(db, teamId, req.user.id);

  let activity;
  await db.transaction(async (trx) => {
    await trx('teams').where({ id: teamId }).update({
      name: req.body.name,
      description: req.body.description || ''
    });
    activity = await insertActivity(trx, {
      team_id: teamId,
      user_id: req.user.id,
      action: 'team_updated',
      entity_type: 'team',
      entity_id: teamId,
      details: { team_name: req.body.name }
    });
  });

  const team = await loadTeam(teamId);
  emitTeam(req, teamId, 'team_updated', { team });
  emitTeam(req, teamId, 'activity', { activity });
  return sendData(res, team);
}));

router.patch('/:id/members/:userId', validateBody(roleSchema), asyncHandler(async (req, res) => {
  const teamId = idParam(req.params.id, 'team id');
  const userId = idParam(req.params.userId, 'user id');
  await requireAdmin(db, teamId, req.user.id);
  const target = await getMembership(db, teamId, userId);
  if (!target) throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');

  if (target.role === 'admin' && req.body.role === 'member') {
    await assertNotLastAdmin(db, teamId, userId);
  }

  let activity;
  await db.transaction(async (trx) => {
    await trx('team_members').where({ team_id: teamId, user_id: userId }).update({ role: req.body.role });
    activity = await insertActivity(trx, {
      team_id: teamId,
      user_id: req.user.id,
      action: 'member_role_changed',
      entity_type: 'team_member',
      entity_id: userId,
      details: { role: req.body.role }
    });
  });

  const [member] = await loadMembers(teamId).then((members) => members.filter((row) => row.user_id === userId));
  emitTeam(req, teamId, 'team_updated', { team: await loadTeam(teamId) });
  emitTeam(req, teamId, 'activity', { activity });
  return sendData(res, member);
}));

router.delete('/:id/members/:userId', asyncHandler(async (req, res) => {
  const teamId = idParam(req.params.id, 'team id');
  const userId = idParam(req.params.userId, 'user id');
  const requester = await requireMembership(db, teamId, req.user.id);
  if (requester.role !== 'admin' && req.user.id !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Only admins can remove other members.');
  }

  const target = await getMembership(db, teamId, userId);
  if (!target) throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
  await assertNotLastAdmin(db, teamId, userId);

  let activity;
  await db.transaction(async (trx) => {
    await trx('team_members').where({ team_id: teamId, user_id: userId }).delete();
    activity = await insertActivity(trx, {
      team_id: teamId,
      user_id: req.user.id,
      action: 'member_removed',
      entity_type: 'team_member',
      entity_id: userId,
      details: { removed_user_id: userId }
    });
  });

  emitTeam(req, teamId, 'member_removed', { userId, teamId });
  emitTeam(req, teamId, 'activity', { activity });
  return sendData(res, { deleted: true });
}));

router.post('/:id/invite-code/regenerate', asyncHandler(async (req, res) => {
  const teamId = idParam(req.params.id, 'team id');
  await requireAdmin(db, teamId, req.user.id);
  let inviteCode = generateInviteCode();
  let activity;

  await db.transaction(async (trx) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await trx('teams').where({ id: teamId }).update({ invite_code: inviteCode });
        break;
      } catch (error) {
        if (!String(error.message || '').includes('SQLITE_CONSTRAINT')) throw error;
        inviteCode = generateInviteCode();
      }
    }
    activity = await insertActivity(trx, {
      team_id: teamId,
      user_id: req.user.id,
      action: 'invite_code_regenerated',
      entity_type: 'team',
      entity_id: teamId,
      details: {}
    });
  });

  const team = await loadTeam(teamId);
  emitTeam(req, teamId, 'team_updated', { team });
  emitTeam(req, teamId, 'activity', { activity });
  return sendData(res, team);
}));

module.exports = router;
