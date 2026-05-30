const fs = require('fs');
const path = require('path');
require('dotenv').config();

function resolveDbPath() {
  const configured = process.env.DATABASE_PATH || '../data/litetrack.db';
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(__dirname, configured);
}

const filename = resolveDbPath();
fs.mkdirSync(path.dirname(filename), { recursive: true });

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

module.exports = {
  development: {
    client: 'sqlite3',
    connection: { filename },
    useNullAsDefault: true,
    pool: { min: 1, max: 1, afterCreate },
    migrations: {
      directory: './src/db/migrations'
    },
    seeds: {
      directory: './src/db/seeds'
    }
  },
  test: {
    client: 'sqlite3',
    connection: {
      filename: process.env.TEST_DATABASE_PATH || ':memory:'
    },
    useNullAsDefault: true,
    pool: { min: 1, max: 1, afterCreate },
    migrations: {
      directory: './src/db/migrations'
    },
    seeds: {
      directory: './src/db/seeds'
    }
  },
  production: {
    client: 'sqlite3',
    connection: { filename },
    useNullAsDefault: true,
    pool: { min: 1, max: 1, afterCreate },
    migrations: {
      directory: './src/db/migrations'
    }
  }
};

