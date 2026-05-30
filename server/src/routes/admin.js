const { z } = require('zod');
const express = require('express');
const db = require('../db/connection');
const { authenticate, requireCsrf } = require('../middleware/auth');
const { AppError, asyncHandler, validateBody } = require('../middleware/errors');
const { getMembership, publicUser, requireInstanceAdmin, USER_COLUMNS } = require('../services/permissions');
const { idParam, sendData } = require('../services/http');

const assignTeamSchema = z.object({
  team_id: z.number().int().positive(),
  role: z.enum(['admin', 'member'])
});

const router = express.Router();

router.use(authenticate, requireCsrf);

router.get('/overview', asyncHandler(async (req, res) => {
  await requireInstanceAdmin(db, req.user.id);

  const [teams, users, memberships] = await Promise.all([
    db('teams').select('*').orderBy('created_at', 'desc'),
    db('users').select(USER_COLUMNS).orderBy('display_name', 'asc'),
    db('team_members')
      .join('users', 'users.id', 'team_members.user_id')
      .join('teams', 'teams.id', 'team_members.team_id')
      .select(
        'team_members.id',
        'team_members.team_id',
        'team_members.user_id',
        'team_members.role',
        'team_members.joined_at',
        'teams.name as team_name',
        'users.id as id',
        'users.username as username',
        'users.email as email',
        'users.display_name as display_name',
        'users.avatar_color as avatar_color',
        'users.is_instance_admin as is_instance_admin',
        'users.created_at as created_at'
      )
      .orderBy('teams.name', 'asc')
      .orderBy('users.display_name', 'asc')
  ]);

  const usersById = Object.fromEntries(users.map((user) => [user.id, publicUser(user)]));
  const membershipsByTeam = memberships.reduce((acc, row) => {
    acc[row.team_id] ||= [];
    acc[row.team_id].push({
      id: row.id,
      team_id: row.team_id,
      user_id: row.user_id,
      role: row.role,
      joined_at: row.joined_at,
      user: publicUser(row)
    });
    return acc;
  }, {});
  const membershipsByUser = memberships.reduce((acc, row) => {
    acc[row.user_id] ||= [];
    acc[row.user_id].push({
      id: row.id,
      team_id: row.team_id,
      team_name: row.team_name,
      role: row.role,
      joined_at: row.joined_at
    });
    return acc;
  }, {});

  return sendData(res, {
    summary: {
      teams: teams.length,
      users: users.length,
      memberships: memberships.length,
      instance_admins: users.filter((user) => user.is_instance_admin).length
    },
    teams: teams.map((team) => ({
      ...team,
      creator: usersById[team.created_by] || null,
      member_count: membershipsByTeam[team.id]?.length || 0,
      members: membershipsByTeam[team.id] || []
    })),
    users: users.map((user) => ({
      ...publicUser(user),
      memberships: membershipsByUser[user.id] || []
    }))
  });
}));

router.delete('/teams/:id', asyncHandler(async (req, res) => {
  await requireInstanceAdmin(db, req.user.id);
  const teamId = idParam(req.params.id, 'team id');
  
  await db('teams').where({ id: teamId }).delete();
  return sendData(res, { deleted: true });
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  await requireInstanceAdmin(db, req.user.id);
  const userId = idParam(req.params.id, 'user id');
  if (userId === req.user.id) {
    throw new AppError(400, 'BAD_REQUEST', 'Cannot delete yourself.');
  }

  try {
    await db('users').where({ id: userId }).delete();
    return sendData(res, { deleted: true });
  } catch (error) {
    if (String(error.message || '').includes('SQLITE_CONSTRAINT')) {
      throw new AppError(400, 'CONFLICT', 'Cannot delete user with existing activity or owned teams.');
    }
    throw error;
  }
}));

router.post('/users/:id/teams', validateBody(assignTeamSchema), asyncHandler(async (req, res) => {
  await requireInstanceAdmin(db, req.user.id);
  const userId = idParam(req.params.id, 'user id');
  const { team_id, role } = req.body;

  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found.');

  const team = await db('teams').where({ id: team_id }).first();
  if (!team) throw new AppError(404, 'NOT_FOUND', 'Team not found.');

  const existing = await getMembership(db, team_id, userId);
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'User is already a member of this team.');
  }

  await db('team_members').insert({
    team_id,
    user_id: userId,
    role
  });

  return sendData(res, { success: true }, 201);
}));

module.exports = router;

