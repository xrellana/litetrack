const fs = require('fs');
const path = require('path');
require('dotenv').config();

function resolveFromServer(configured) {
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

const optional = process.argv.includes('--if-exists') || process.argv.includes('--optional');
const databasePath = resolveFromServer(process.env.DATABASE_PATH || '../data/litetrack.db');
const backupDir = resolveFromServer(process.env.BACKUP_DIR || '../data/backups');

if (!fs.existsSync(databasePath)) {
  if (optional) {
    console.log('No database file exists yet; skipping backup.');
    process.exit(0);
  }
  console.error(`Database file not found: ${databasePath}`);
  process.exit(1);
}

fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(backupDir, `litetrack-${stamp}.db`);
fs.copyFileSync(databasePath, target);
console.log(`Backup written to ${target}`);
