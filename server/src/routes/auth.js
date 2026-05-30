const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const db = require('../db/connection');
const { authenticate, issueAuthCookies } = require('../middleware/auth');
const { AppError, asyncHandler, validateBody } = require('../middleware/errors');
const { avatarColor, normalizeEmail, publicUser, USER_COLUMNS } = require('../services/permissions');
const { sendData, sqliteConflict } = require('../services/http');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: Number(process.env.RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false
});

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/);

const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().email(),
  password: z.string().min(8),
  display_name: z.string().trim().min(1).max(80).optional()
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1)
});

router.post('/register', authLimiter, validateBody(registerSchema), asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const username = req.body.username.trim();
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12);
  const passwordHash = await bcrypt.hash(req.body.password, rounds);

  const userCountRow = await db('users').count({ total: 'id' }).first();
  const isFirstUser = Number(userCountRow.total || 0) === 0;
  let userId;
  try {
    [userId] = await db('users').insert({
      username,
      email,
      password_hash: passwordHash,
      display_name: req.body.display_name || username,
      avatar_color: avatarColor(`${username}:${email}`),
      is_instance_admin: isFirstUser ? 1 : 0
    });
  } catch (error) {
    sqliteConflict(error, 'Username or email is already in use.');
  }

  const user = await db('users').select(USER_COLUMNS).where({ id: userId }).first();
  const { csrfToken } = issueAuthCookies(res, user.id);
  return sendData(res, { user: publicUser(user), csrfToken }, 201);
}));

router.post('/login', authLimiter, validateBody(loginSchema), asyncHandler(async (req, res) => {
  const identifier = req.body.identifier.trim();
  const user = await db('users')
    .whereRaw('username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE', [identifier, normalizeEmail(identifier)])
    .first();

  if (!user || !await bcrypt.compare(req.body.password, user.password_hash)) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username/email or password.');
  }

  const { csrfToken } = issueAuthCookies(res, user.id);
  return sendData(res, { user: publicUser(user), csrfToken });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await db('users').select(USER_COLUMNS).where({ id: req.user.id }).first();
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'User account no longer exists.');
  return sendData(res, { user: publicUser(user) });
}));

module.exports = router;
