const http = require('http');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/teams');
const itemRoutes = require('./routes/items');
const updateRoutes = require('./routes/updates');

const activityRoutes = require('./routes/activity');
const adminRoutes = require('./routes/admin');
const { errorHandler, notFound } = require('./middleware/errors');
const registerSocketHandlers = require('./socket/handler');

function createApp() {
  const app = express();
  const server = http.createServer(app);
  const clientOrigin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const io = new Server(server, {
    cors: {
      origin: clientOrigin,
      credentials: true
    }
  });
  registerSocketHandlers(io);
  app.set('io', io);

  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(':method :url :status :response-time ms user=:req[x-user-id]'));
  }

  app.get('/health', (req, res) => {
    res.json({ data: { ok: true } });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api', itemRoutes);
  app.use('/api', updateRoutes);

  app.use('/api', activityRoutes);
  app.use('/api/admin', adminRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return { app, server, io };
}

module.exports = createApp;
