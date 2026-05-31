import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { io as ioClient } from 'socket.io-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.resolve(__dirname, 'litetrack-test.db');
for (const suffix of ['', '-wal', '-shm']) {
  fs.rmSync(`${testDbPath}${suffix}`, { force: true });
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = testDbPath;
process.env.JWT_SECRET = 'test-secret';
process.env.BCRYPT_ROUNDS = '4';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

const dbModule = await import('../src/db/connection.js');
const createAppModule = await import('../src/app.js');
const db = dbModule.default || dbModule;
const createApp = createAppModule.default || createAppModule;

function cookieValue(response, name) {
  const cookies = response.headers['set-cookie'] || [];
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return match?.split(';')[0].split('=').slice(1).join('=');
}

function cookieHeader(response) {
  return (response.headers['set-cookie'] || []).map((cookie) => cookie.split(';')[0]).join('; ');
}

function connectSocket(url, cookie) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(url, {
      transports: ['websocket'],
      forceNew: true,
      extraHeaders: { Cookie: cookie }
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

describe('LiteTrack API', () => {
  let app;
  let server;
  let io;
  let baseUrl;

  beforeAll(async () => {
    await db.migrate.latest({ directory: path.resolve(__dirname, '../src/db/migrations') });
    ({ app, server, io } = createApp());
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    if (io) io.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    await db.destroy();
    await new Promise((resolve) => setTimeout(resolve, 100));
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.rmSync(`${testDbPath}${suffix}`, { force: true });
      } catch (error) {
        if (error.code !== 'EPERM') throw error;
      }
    }
  });

  it('supports the primary V1 workflow and team-scoped access', async () => {
    const instanceAdmin = request.agent(app);
    const adminRegister = await instanceAdmin.post('/api/auth/register').send({
      username: 'avery',
      email: 'avery@example.com',
      display_name: 'Avery Chen',
      password: 'password123'
    });
    expect(adminRegister.status, JSON.stringify(adminRegister.body)).toBe(201);
    expect(adminRegister.body.data.user.is_instance_admin).toBe(true);
    const instanceAdminId = adminRegister.body.data.user.id;
    const instanceAdminCsrf = cookieValue(adminRegister, 'csrf_token');
    const instanceAdminSocketCookie = cookieHeader(adminRegister);

    const me = await instanceAdmin.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.username).toBe('avery');

    const teamAdmin = request.agent(app);
    const teamAdminRegister = await teamAdmin.post('/api/auth/register').send({
      username: 'jordan',
      email: 'jordan@example.com',
      display_name: 'Jordan Lee',
      password: 'password123'
    });
    expect(teamAdminRegister.status, JSON.stringify(teamAdminRegister.body)).toBe(201);
    expect(teamAdminRegister.body.data.user.is_instance_admin).toBe(false);
    const teamAdminId = teamAdminRegister.body.data.user.id;
    const teamAdminCsrf = cookieValue(teamAdminRegister, 'csrf_token');
    const teamAdminSocketCookie = cookieHeader(teamAdminRegister);

    const teamAdminCreateTeam = await teamAdmin
      .post('/api/teams')
      .set('x-csrf-token', teamAdminCsrf)
      .send({ name: 'Unauthorized Room', description: 'Should not work' });
    expect(teamAdminCreateTeam.status).toBe(403);

    const createdTeam = await instanceAdmin
      .post('/api/teams')
      .set('x-csrf-token', instanceAdminCsrf)
      .send({ name: 'Launch Room', description: 'Test team' });
    expect(createdTeam.status).toBe(201);
    expect(createdTeam.body.data.role).toBe('instance_admin');
    expect(createdTeam.body.data.member_count).toBe(0);
    const teamId = createdTeam.body.data.id;

    const assignedTeamAdmin = await instanceAdmin
      .post(`/api/admin/users/${teamAdminId}/teams`)
      .set('x-csrf-token', instanceAdminCsrf)
      .send({ team_id: teamId, role: 'admin' });
    expect(assignedTeamAdmin.status).toBe(201);

    const tag = await teamAdmin
      .post(`/api/teams/${teamId}/tags`)
      .set('x-csrf-token', teamAdminCsrf)
      .send({ name: 'API', color: '#34d399' });
    expect(tag.status).toBe(201);

    const item = await teamAdmin
      .post(`/api/teams/${teamId}/items`)
      .set('x-csrf-token', teamAdminCsrf)
      .send({
        title: 'Ship API',
        description: 'Wire the documented endpoints.',
        priority: 'high',
        tag_ids: [tag.body.data.id]
      });
    expect(item.status).toBe(201);
    expect(item.body.data.tags).toHaveLength(1);
    expect(item.body.data.team.name).toBe('Launch Room');

    const globalItems = await teamAdmin.get('/api/items');
    expect(globalItems.status).toBe(200);
    expect(globalItems.body.data).toHaveLength(1);
    expect(globalItems.body.data[0].team.name).toBe('Launch Room');

    const filteredGlobalItems = await teamAdmin.get(`/api/items?teams=${teamId}&status=todo`);
    expect(filteredGlobalItems.status).toBe(200);
    expect(filteredGlobalItems.body.data).toHaveLength(1);

    const updated = await teamAdmin
      .put(`/api/items/${item.body.data.id}`)
      .set('x-csrf-token', teamAdminCsrf)
      .send({ status: 'in_progress', updated_at: item.body.data.updated_at });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe('in_progress');

    const progress = await teamAdmin
      .post(`/api/items/${item.body.data.id}/updates`)
      .set('x-csrf-token', teamAdminCsrf)
      .send({ content: 'Endpoint set is wired.', status: 'done' });
    expect(progress.status).toBe(201);
    expect(progress.body.data.status_change).toBe('in_progress->done');

    const comment = await teamAdmin
      .post(`/api/items/${item.body.data.id}/comments`)
      .set('x-csrf-token', teamAdminCsrf)
      .send({ content: 'Looks ready for UI integration.' });
    expect(comment.status).toBe(201);

    const activity = await teamAdmin.get(`/api/teams/${teamId}/activity`);
    expect(activity.status).toBe(200);
    expect(activity.body.data.length).toBeGreaterThan(0);

    const teamMember = request.agent(app);
    const memberRegister = await teamMember.post('/api/auth/register').send({
      username: 'mina',
      email: 'mina@example.com',
      display_name: 'Mina Park',
      password: 'password123'
    });
    expect(memberRegister.status).toBe(201);
    const teamMemberId = memberRegister.body.data.user.id;
    const teamMemberCsrf = cookieValue(memberRegister, 'csrf_token');

    const join = await teamMember
      .post('/api/teams/join')
      .set('x-csrf-token', teamMemberCsrf)
      .send({ invite_code: createdTeam.body.data.invite_code });
    expect(join.status).toBe(403);

    const assignedTeamMember = await instanceAdmin
      .post(`/api/admin/users/${teamMemberId}/teams`)
      .set('x-csrf-token', instanceAdminCsrf)
      .send({ team_id: teamId, role: 'member' });
    expect(assignedTeamMember.status).toBe(201);

    const memberItemView = await teamMember.get(`/api/items/${item.body.data.id}`);
    expect(memberItemView.status).toBe(200);
    const memberEditedItem = await teamMember
      .put(`/api/items/${item.body.data.id}`)
      .set('x-csrf-token', teamMemberCsrf)
      .send({ title: 'Ship API from team member', updated_at: memberItemView.body.data.item.updated_at });
    expect(memberEditedItem.status).toBe(200);
    expect(memberEditedItem.body.data.title).toBe('Ship API from team member');

    const memberDeletedItem = await teamMember
      .delete(`/api/items/${item.body.data.id}`)
      .set('x-csrf-token', teamMemberCsrf);
    expect(memberDeletedItem.status).toBe(200);

    const adminOverview = await instanceAdmin.get('/api/admin/overview');
    expect(adminOverview.status).toBe(200);
    expect(adminOverview.body.data.summary.teams).toBe(1);
    expect(adminOverview.body.data.teams[0].members[0].role).toBe('admin');
    expect(adminOverview.body.data.teams[0].members.some((member) => member.user_id === instanceAdminId)).toBe(false);

    const adminMembers = await instanceAdmin.get(`/api/teams/${teamId}/members`);
    expect(adminMembers.status).toBe(200);
    expect(adminMembers.body.data.some((member) => member.user_id === instanceAdminId)).toBe(false);

    const adminTeamUpdate = await instanceAdmin
      .put(`/api/teams/${teamId}`)
      .set('x-csrf-token', instanceAdminCsrf)
      .send({ name: 'Launch Room Managed', description: 'Updated by instance admin' });
    expect(adminTeamUpdate.status).toBe(200);
    expect(adminTeamUpdate.body.data.name).toBe('Launch Room Managed');

    const instanceAdminItems = await instanceAdmin.get(`/api/teams/${teamId}/items`);
    expect(instanceAdminItems.status).toBe(404);

    const instanceAdminGlobalItems = await instanceAdmin.get('/api/items');
    expect(instanceAdminGlobalItems.status).toBe(404);

    const instanceAdminCreateItem = await instanceAdmin
      .post(`/api/teams/${teamId}/items`)
      .set('x-csrf-token', instanceAdminCsrf)
      .send({ title: 'Should not track' });
    expect(instanceAdminCreateItem.status).toBe(404);

    const selfAssign = await instanceAdmin
      .post(`/api/admin/users/${instanceAdminId}/teams`)
      .set('x-csrf-token', instanceAdminCsrf)
      .send({ team_id: teamId, role: 'admin' });
    expect(selfAssign.status).toBe(400);

    const createdUser = await instanceAdmin
      .post('/api/admin/users')
      .set('x-csrf-token', instanceAdminCsrf)
      .send({
        username: 'riley',
        email: 'riley@example.com',
        display_name: 'Riley Stone',
        password: 'password123'
      });
    expect(createdUser.status).toBe(201);
    expect(createdUser.body.data.is_instance_admin).toBe(false);
    expect(createdUser.body.data.memberships).toHaveLength(0);

    const socket = await connectSocket(baseUrl, teamAdminSocketCookie);
    const joined = await new Promise((resolve) => {
      socket.emit('join_team', { teamId }, resolve);
    });
    expect(joined.ok).toBe(true);
    socket.close();

    const adminSocket = await connectSocket(baseUrl, instanceAdminSocketCookie);
    const adminJoined = await new Promise((resolve) => {
      adminSocket.emit('join_team', { teamId }, resolve);
    });
    expect(adminJoined.ok).toBe(false);
    adminSocket.close();

    const outsider = request.agent(app);
    const outsiderLogin = await outsider.post('/api/auth/login').send({ identifier: 'riley', password: 'password123' });
    expect(outsiderLogin.status).toBe(200);

    const hidden = await outsider.get(`/api/teams/${teamId}/items`);
    expect(hidden.status).toBe(404);

    const teamAdminAddedMember = await teamAdmin
      .post(`/api/teams/${teamId}/members`)
      .set('x-csrf-token', teamAdminCsrf)
      .send({ identifier: 'riley', role: 'member' });
    expect(teamAdminAddedMember.status).toBe(201);
    expect(teamAdminAddedMember.body.data.user.username).toBe('riley');
    expect(teamAdminAddedMember.body.data.role).toBe('member');

    const duplicateMember = await teamAdmin
      .post(`/api/teams/${teamId}/members`)
      .set('x-csrf-token', teamAdminCsrf)
      .send({ identifier: 'riley@example.com', role: 'member' });
    expect(duplicateMember.status).toBe(409);

    const visibleAfterAdd = await outsider.get(`/api/teams/${teamId}/members`);
    expect(visibleAfterAdd.status).toBe(200);
    expect(visibleAfterAdd.body.data.some((member) => member.user_id === createdUser.body.data.id)).toBe(true);
  });
});
