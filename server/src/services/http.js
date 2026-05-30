const { AppError } = require('../middleware/errors');

function idParam(value, name = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', `${name} must be a positive integer.`);
  }
  return id;
}

function sendData(res, data, status = 200) {
  return res.status(status).json({ data });
}

function sqliteConflict(error, message = 'Duplicate record.') {
  if (error && String(error.message || '').includes('SQLITE_CONSTRAINT')) {
    throw new AppError(409, 'CONFLICT', message);
  }
  throw error;
}

module.exports = {
  idParam,
  sendData,
  sqliteConflict
};

