const crypto = require('crypto');
const { AppError } = require('../middleware/errors');

const USER_COLUMNS = ['id', 'username', 'email', 'display_name', 'avatar_color', 'is_instance_admin', 'created_at'];

function now() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function avatarColor(seed) {
  const colors = ['#22d3ee', '#34d399', '#f59e0b', '#f97316', '#fb7185', '#a78bfa', '#60a5fa', '#14b8a6'];
  const hash = crypto.createHash('sha1').update(seed).digest();
  return colors[hash[0] % colors.length];
}

function generateInviteCode() {
  return crypto.randomBytes(5).toString('base64url').toUpperCase();
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    display_name: user.display_name,
    avatar_color: user.avatar_color,
    is_instance_admin: Boolean(user.is_instance_admin),
    created_at: user.created_at
  };
}

async function isInstanceAdmin(db, userId) {
  const user = await db('users').select('is_instance_admin').where({ id: Number(userId) }).first();
  return Boolean(user && user.is_instance_admin);
}

async function requireInstanceAdmin(db, userId) {
  if (!await isInstanceAdmin(db, userId)) {
    throw new AppError(403, 'FORBIDDEN', 'Instance admin access is required.');
  }
}

async function getMembership(db, teamId, userId) {
  return db('team_members')
    .where({ team_id: Number(teamId), user_id: Number(userId) })
    .first();
}

async function requireTeamExists(db, teamId) {
  const team = await db('teams').where({ id: Number(teamId) }).first();
  if (!team) {
    throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
  }
  return team;
}

async function requireMembership(db, teamId, userId) {
  if (await isInstanceAdmin(db, userId)) {
    throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
  }

  const membership = await getMembership(db, teamId, userId);
  if (!membership) {
    throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
  }
  return membership;
}

async function requireAdmin(db, teamId, userId) {
  if (await isInstanceAdmin(db, userId)) {
    throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
  }

  const membership = await getMembership(db, teamId, userId);
  if (!membership) {
    throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
  }
  if (membership.role !== 'admin') {
    throw new AppError(403, 'FORBIDDEN', 'Admin access is required.');
  }
  return membership;
}

async function requireTeamDefinitionAccess(db, teamId, userId) {
  if (await isInstanceAdmin(db, userId)) {
    await requireTeamExists(db, teamId);
    return {
      id: null,
      team_id: Number(teamId),
      user_id: Number(userId),
      role: 'instance_admin',
      is_instance_admin: true
    };
  }

  const membership = await getMembership(db, teamId, userId);
  if (!membership) {
    throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
  }
  return membership;
}

async function requireTeamDefinitionAdmin(db, teamId, userId) {
  if (await isInstanceAdmin(db, userId)) {
    await requireTeamExists(db, teamId);
    return {
      id: null,
      team_id: Number(teamId),
      user_id: Number(userId),
      role: 'instance_admin',
      is_instance_admin: true
    };
  }

  const membership = await getMembership(db, teamId, userId);
  if (!membership) {
    throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
  }
  if (membership.role !== 'admin') {
    throw new AppError(403, 'FORBIDDEN', 'Admin access is required.');
  }
  return membership;
}

async function requireItemAccess(db, itemId, userId) {
  const item = await db('items').where({ id: Number(itemId) }).first();
  if (!item) {
    throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
  }
  const membership = await requireMembership(db, item.team_id, userId);
  return { item, membership };
}

function canEditItem(membership, item, userId) {
  return Boolean(membership) && ['admin', 'member'].includes(membership.role);
}

function canChangeItemStatus(membership, item, userId) {
  return canEditItem(membership, item, userId);
}

async function ensureAssigneeIsMember(db, teamId, assignedTo) {
  if (!assignedTo) return;
  const membership = await db('team_members')
    .join('users', 'users.id', 'team_members.user_id')
    .select('team_members.id', 'users.is_instance_admin')
    .where({ 'team_members.team_id': Number(teamId), 'team_members.user_id': Number(assignedTo) })
    .first();
  if (!membership || membership.is_instance_admin) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Assignee must be a member of this team.');
  }
}

async function countAdmins(db, teamId) {
  const row = await db('team_members')
    .join('users', 'users.id', 'team_members.user_id')
    .where({
      'team_members.team_id': Number(teamId),
      'team_members.role': 'admin',
      'users.is_instance_admin': 0
    })
    .count({ total: 'id' })
    .first();
  return Number(row.total || 0);
}

async function assertNotLastAdmin(db, teamId, userId) {
  const membership = await db('team_members')
    .join('users', 'users.id', 'team_members.user_id')
    .select('team_members.role', 'users.is_instance_admin')
    .where({ 'team_members.team_id': Number(teamId), 'team_members.user_id': Number(userId) })
    .first();
  if (
    membership &&
    !membership.is_instance_admin &&
    membership.role === 'admin' &&
    await countAdmins(db, teamId) <= 1
  ) {
    throw new AppError(400, 'LAST_ADMIN', 'A team must always have at least one admin.');
  }
}

async function insertActivity(db, payload) {
  const [id] = await db('activity_log').insert({
    team_id: payload.team_id,
    user_id: payload.user_id,
    action: payload.action,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    details: JSON.stringify(payload.details || {}),
    created_at: now()
  });
  const row = await db('activity_log').where({ id }).first();
  return {
    ...row,
    details: JSON.parse(row.details || '{}')
  };
}

async function hydrateUsers(db, rows, fields) {
  const ids = [...new Set(rows.flatMap((row) => fields.map((field) => row[field]).filter(Boolean)))];
  if (!ids.length) return {};
  const users = await db('users').select(USER_COLUMNS).whereIn('id', ids);
  return Object.fromEntries(users.map((user) => [user.id, publicUser(user)]));
}

async function hydrateItems(db, items) {
  if (!items.length) return [];
  const ids = items.map((item) => item.id);
  const teamIds = [...new Set(items.map((item) => item.team_id).filter(Boolean))];
  const usersById = await hydrateUsers(db, items, ['created_by', 'assigned_to']);
  const teams = teamIds.length
    ? await db('teams').select('id', 'name', 'description').whereIn('id', teamIds)
    : [];
  const teamsById = Object.fromEntries(teams.map((team) => [team.id, team]));
  return items.map((item) => ({
    ...item,
    is_pinned: Boolean(item.is_pinned),
    team: teamsById[item.team_id] || null,
    creator: usersById[item.created_by] || null,
    assignee: usersById[item.assigned_to] || null
  }));
}

async function hydrateDiscussionRows(db, rows) {
  const usersById = await hydrateUsers(db, rows, ['user_id']);
  return rows.map((row) => ({
    ...row,
    user: usersById[row.user_id] || null
  }));
}

function parsePagination(query) {
  const limit = Math.min(Number(query.limit || 50), 100);
  const offset = Math.max(Number(query.offset || 0), 0);
  return { limit, offset };
}

function pageEnvelope(data, limit, offset, total) {
  return {
    data,
    page: { limit, offset, total }
  };
}

function emitTeam(req, teamId, event, payload) {
  const io = req.app.get('io');
  if (io) io.to(`team:${teamId}`).emit(event, payload);
}

module.exports = {
  USER_COLUMNS,
  assertNotLastAdmin,
  avatarColor,
  canChangeItemStatus,
  canEditItem,
  emitTeam,
  ensureAssigneeIsMember,
  generateInviteCode,
  getMembership,
  hydrateDiscussionRows,
  hydrateItems,
  insertActivity,
  isInstanceAdmin,
  normalizeEmail,
  now,
  pageEnvelope,
  parsePagination,
  publicUser,
  requireAdmin,
  requireInstanceAdmin,
  requireItemAccess,
  requireMembership,
  requireTeamDefinitionAccess,
  requireTeamDefinitionAdmin,
  requireTeamExists
};
