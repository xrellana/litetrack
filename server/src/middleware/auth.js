const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { AppError } = require('./errors');

const AUTH_COOKIE = 'auth_token';
const CSRF_COOKIE = 'csrf_token';

function cookieOptions(httpOnly) {
  return {
    httpOnly,
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    secure: String(process.env.COOKIE_SECURE).toLowerCase() === 'true',
    path: '/'
  };
}

function makeCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

function issueAuthCookies(res, userId) {
  const token = jwt.sign(
    { sub: String(userId) },
    process.env.JWT_SECRET || 'development-only-change-me-before-deploying',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  const csrfToken = makeCsrfToken();

  res.cookie(AUTH_COOKIE, token, cookieOptions(true));
  res.cookie(CSRF_COOKIE, csrfToken, cookieOptions(false));

  return { csrfToken };
}

function extractToken(req) {
  const authHeader = req.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return { token: authHeader.slice(7), source: 'bearer' };
  }
  if (req.cookies && req.cookies[AUTH_COOKIE]) {
    return { token: req.cookies[AUTH_COOKIE], source: 'cookie' };
  }
  return { token: null, source: null };
}

function authenticate(req, res, next) {
  const { token, source } = extractToken(req);
  if (!token) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.'));
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'development-only-change-me-before-deploying'
    );
    req.user = { id: Number(payload.sub) };
    req.authSource = source;
    return next();
  } catch (error) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired token.'));
  }
}

function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.authSource !== 'cookie') return next();

  const cookieToken = req.cookies && req.cookies[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new AppError(403, 'CSRF_INVALID', 'Missing or invalid CSRF token.'));
  }
  return next();
}

module.exports = {
  AUTH_COOKIE,
  CSRF_COOKIE,
  authenticate,
  issueAuthCookies,
  requireCsrf
};

