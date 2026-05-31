const { z } = require('zod');
const bcrypt = require('bcryptjs');
const express = require('express');
const db = require('../db/connection');
const { authenticate, requireCsrf } = require('../middleware/auth');
const { AppError, asyncHandler, validateBody } = require('../middleware/errors');
const {
  avatarColor,
  getMembership,
  normalizeEmail,
  publicUser,
  requireInstanceAdmin,
  USER_COLUMNS
} = require('../services/permissions');
const { idParam, sendData, sqliteConflict } = require('../services/http');

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/);

const createUserSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().email(),
  password: z.string().min(8),
  display_name: z.string().trim().min(1).max(80).optional()
});

const updateUserSchema = z.object({
  email: z.string().trim().email().optional(),
  display_name: z.string().trim().min(1).max(80).optional(),
  password: z.string().min(8).optional()
}).refine((data) => data.email || data.display_name || data.password, {
  message: 'At least one user field must be provided.'
});

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

router.post('/users', validateBody(createUserSchema), asyncHandler(async (req, res) => {
  await requireInstanceAdmin(db, req.user.id);

  const email = normalizeEmail(req.body.email);
  const username = req.body.username.trim();
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12);
  const passwordHash = await bcrypt.hash(req.body.password, rounds);
  let userId;

  try {
    [userId] = await db('users').insert({
      username,
      email,
      password_hash: passwordHash,
      display_name: req.body.display_name || username,
      avatar_color: avatarColor(`${username}:${email}`),
      is_instance_admin: 0
    });
  } catch (error) {
    sqliteConflict(error, 'Username or email is already in use.');
  }

  const user = await db('users').select(USER_COLUMNS).where({ id: userId }).first();
  return sendData(res, { ...publicUser(user), memberships: [] }, 201);
}));

router.patch('/users/:id', validateBody(updateUserSchema), asyncHandler(async (req, res) => {
  await requireInstanceAdmin(db, req.user.id);
  const userId = idParam(req.params.id, 'user id');

  const existing = await db('users').select('id').where({ id: userId }).first();
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'User not found.');

  const updates = {};
  if (req.body.email) updates.email = normalizeEmail(req.body.email);
  if (req.body.display_name) updates.display_name = req.body.display_name;
  if (req.body.password) {
    const rounds = Number(process.env.BCRYPT_ROUNDS || 12);
    updates.password_hash = await bcrypt.hash(req.body.password, rounds);
  }

  try {
    await db('users').where({ id: userId }).update(updates);
  } catch (error) {
    sqliteConflict(error, 'Username or email is already in use.');
  }

  const user = await db('users').select(USER_COLUMNS).where({ id: userId }).first();
  return sendData(res, publicUser(user));
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
  if (user.is_instance_admin) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Instance admins cannot be assigned to teams.');
  }

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
