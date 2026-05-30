const jwt = require('jsonwebtoken');
const db = require('../db/connection');
const { getMembership, isInstanceAdmin } = require('../services/permissions');

function parseCookies(header = '') {
  return header.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function registerSocketHandlers(io) {
  io.use((socket, next) => {
    const cookies = parseCookies(socket.handshake.headers.cookie || '');
    const token = socket.handshake.auth?.token || cookies.auth_token;
    if (!token) return next(new Error('UNAUTHENTICATED'));

    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET || 'development-only-change-me-before-deploying'
      );
      socket.user = { id: Number(payload.sub) };
      return next();
    } catch (error) {
      return next(new Error('UNAUTHENTICATED'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_team', async (payload, callback) => {
      try {
        const teamId = Number(payload && payload.teamId);
        if (!Number.isInteger(teamId) || teamId <= 0) throw new Error('INVALID_TEAM');
        const membership = await getMembership(db, teamId, socket.user.id);
        if (!membership && !await isInstanceAdmin(db, socket.user.id)) throw new Error('FORBIDDEN');
        await socket.join(`team:${teamId}`);
        if (callback) callback({ ok: true });
      } catch (error) {
        if (callback) callback({ ok: false, error: error.message });
        socket.emit('socket_error', { code: error.message });
      }
    });
  });
}

module.exports = registerSocketHandlers;
