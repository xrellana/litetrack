class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'The requested resource was not found.'));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err && err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: err.flatten()
      }
    });
  }

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = status === 500 ? 'Unexpected server error.' : err.message;

  if (status === 500 && process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  return res.status(status).json({
    error: {
      code,
      message,
      details: err.details || (process.env.NODE_ENV === 'test' && status === 500
        ? { message: err.message }
        : undefined)
    }
  });
}

function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(parsed.error);
    req.body = parsed.data;
    return next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return next(parsed.error);
    req.query = parsed.data;
    return next();
  };
}

module.exports = {
  AppError,
  asyncHandler,
  errorHandler,
  notFound,
  validateBody,
  validateQuery
};
