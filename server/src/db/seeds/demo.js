const bcrypt = require('bcryptjs');
const { avatarColor, generateInviteCode, now } = require('../../services/permissions');

exports.seed = async function seed(knex) {
  await knex('activity_log').del();
  await knex('comments').del();
  await knex('progress_updates').del();
  await knex('item_tags').del();
  await knex('tags').del();
  await knex('items').del();
  await knex('team_members').del();
  await knex('teams').del();
  await knex('users').del();

  const passwordHash = await bcrypt.hash('password123', Number(process.env.BCRYPT_ROUNDS || 12));
  const [adminId] = await knex('users').insert({
    username: 'admin',
    email: 'admin@litetrack.local',
    password_hash: passwordHash,
    display_name: 'Avery Chen',
    avatar_color: avatarColor('admin@litetrack.local'),
    is_instance_admin: 1
  });
  const [teamAdminId] = await knex('users').insert({
    username: 'teamadmin',
    email: 'teamadmin@litetrack.local',
    password_hash: passwordHash,
    display_name: 'Jordan Lee',
    avatar_color: avatarColor('teamadmin@litetrack.local'),
    is_instance_admin: 0
  });
  const [memberId] = await knex('users').insert({
    username: 'member',
    email: 'member@litetrack.local',
    password_hash: passwordHash,
    display_name: 'Mina Park',
    avatar_color: avatarColor('member@litetrack.local'),
    is_instance_admin: 0
  });
  const [teamId] = await knex('teams').insert({
    name: 'Launch Room',
    description: 'Demo workspace for tracking the LiteTrack launch.',
    invite_code: generateInviteCode(),
    created_by: adminId
  });

  await knex('team_members').insert([
    { team_id: teamId, user_id: teamAdminId, role: 'admin' },
    { team_id: teamId, user_id: memberId, role: 'member' }
  ]);

  const [uiTag] = await knex('tags').insert({ team_id: teamId, name: 'UI', color: '#22d3ee' });
  const [apiTag] = await knex('tags').insert({ team_id: teamId, name: 'API', color: '#34d399' });

  const [itemId] = await knex('items').insert({
    team_id: teamId,
    created_by: teamAdminId,
    assigned_to: memberId,
    title: 'Wire dashboard filters',
    description: 'Keep dashboard filter state reflected in URL query params.',
    status: 'in_progress',
    priority: 'high',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    is_pinned: 1,
    updated_at: now()
  });

  await knex('item_tags').insert([
    { item_id: itemId, tag_id: uiTag },
    { item_id: itemId, tag_id: apiTag }
  ]);
  await knex('progress_updates').insert({
    item_id: itemId,
    user_id: memberId,
    content: 'Filter controls are in place; wiring query param sync next.',
    status_change: 'todo->in_progress'
  });
  await knex('comments').insert({
    item_id: itemId,
    user_id: teamAdminId,
    content: 'Keep the status change explicit; no drag-and-drop in V1.'
  });
  await knex('activity_log').insert({
    team_id: teamId,
    user_id: teamAdminId,
    action: 'item_created',
    entity_type: 'item',
    entity_id: itemId,
    details: JSON.stringify({ item_title: 'Wire dashboard filters' })
  });
};
