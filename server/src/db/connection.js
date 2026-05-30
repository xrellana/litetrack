const fs = require('fs');
const path = require('path');
const knex = require('knex');
require('dotenv').config();

function resolveDatabasePath() {
  const configured = process.env.DATABASE_PATH || '../data/litetrack.db';
  if (configured === ':memory:') return configured;
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

function afterCreate(connection, done) {
  connection.run('PRAGMA foreign_keys = ON', (foreignKeyError) => {
    if (foreignKeyError) return done(foreignKeyError, connection);
    connection.run('PRAGMA journal_mode = WAL', (walError) => {
      if (walError) return done(walError, connection);
      connection.run('PRAGMA busy_timeout = 5000', (timeoutError) => {
        done(timeoutError, connection);
      });
    });
  });
}

function createDatabase(config = {}) {
  const filename = config.filename || resolveDatabasePath();
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  return knex({
    client: 'sqlite3',
    connection: { filename },
    useNullAsDefault: true,
    pool: { min: 1, max: 1, afterCreate }
  });
}

module.exports = createDatabase();
module.exports.createDatabase = createDatabase;
