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
    const agent = request.agent(app);
    const register = await agent.post('/api/auth/register').send({
      username: 'avery',
      email: 'avery@example.com',
      display_name: 'Avery Chen',
      password: 'password123'
    });
    expect(register.status, JSON.stringify(register.body)).toBe(201);
    expect(register.body.data.user.is_instance_admin).toBe(true);
    const csrf = cookieValue(register, 'csrf_token');
    const socketCookie = cookieHeader(register);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.username).toBe('avery');

    const createdTeam = await agent
      .post('/api/teams')
      .set('x-csrf-token', csrf)
      .send({ name: 'Launch Room', description: 'Test team' });
    expect(createdTeam.status).toBe(201);
    const teamId = createdTeam.body.data.id;

    const tag = await agent
      .post(`/api/teams/${teamId}/tags`)
      .set('x-csrf-token', csrf)
      .send({ name: 'API', color: '#34d399' });
    expect(tag.status).toBe(201);

    const item = await agent
      .post(`/api/teams/${teamId}/items`)
      .set('x-csrf-token', csrf)
      .send({
        title: 'Ship API',
        description: 'Wire the documented endpoints.',
        priority: 'high',
        tag_ids: [tag.body.data.id]
      });
    expect(item.status).toBe(201);
    expect(item.body.data.tags).toHaveLength(1);

    const updated = await agent
      .put(`/api/items/${item.body.data.id}`)
      .set('x-csrf-token', csrf)
      .send({ status: 'in_progress', updated_at: item.body.data.updated_at });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe('in_progress');

    const progress = await agent
      .post(`/api/items/${item.body.data.id}/updates`)
      .set('x-csrf-token', csrf)
      .send({ content: 'Endpoint set is wired.', status: 'done' });
    expect(progress.status).toBe(201);
    expect(progress.body.data.status_change).toBe('in_progress->done');

    const comment = await agent
      .post(`/api/items/${item.body.data.id}/comments`)
      .set('x-csrf-token', csrf)
      .send({ content: 'Looks ready for UI integration.' });
    expect(comment.status).toBe(201);

    const activity = await agent.get(`/api/teams/${teamId}/activity`);
    expect(activity.status).toBe(200);
    expect(activity.body.data.length).toBeGreaterThan(0);

    const adminOverview = await agent.get('/api/admin/overview');
    expect(adminOverview.status).toBe(200);
    expect(adminOverview.body.data.summary.teams).toBe(1);
    expect(adminOverview.body.data.teams[0].members[0].role).toBe('admin');

    const socket = await connectSocket(baseUrl, socketCookie);
    const joined = await new Promise((resolve) => {
      socket.emit('join_team', { teamId }, resolve);
    });
    expect(joined.ok).toBe(true);
    socket.close();

    const outsider = request.agent(app);
    const outsiderRegister = await outsider.post('/api/auth/register').send({
      username: 'mina',
      email: 'mina@example.com',
      display_name: 'Mina Park',
      password: 'password123'
    });
    expect(outsiderRegister.status).toBe(201);

    const hidden = await outsider.get(`/api/teams/${teamId}/items`);
    expect(hidden.status).toBe(404);
  });
});
