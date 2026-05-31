exports.up = async function up(knex) {
  await knex.raw(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT COLLATE NOCASE NOT NULL UNIQUE,
      email TEXT COLLATE NOCASE NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_color TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  await knex.raw(`
    CREATE TABLE teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      invite_code TEXT NOT NULL UNIQUE,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  await knex.raw(`
    CREATE TABLE team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('admin', 'member')),
      joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      UNIQUE(team_id, user_id)
    )
  `);

  await knex.raw(`
    CREATE TABLE items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      due_date TEXT,
      is_pinned INTEGER NOT NULL DEFAULT 0 CHECK(is_pinned IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  await knex.raw(`
    CREATE TABLE tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      UNIQUE(team_id, name)
    )
  `);

  await knex.raw(`
    CREATE TABLE item_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      UNIQUE(item_id, tag_id)
    )
  `);

  await knex.raw(`
    CREATE TABLE progress_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      content TEXT NOT NULL,
      status_change TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);



  await knex.raw(`
    CREATE TABLE activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  await knex.schema.raw('CREATE INDEX idx_team_members_team_user ON team_members(team_id, user_id)');
  await knex.schema.raw('CREATE INDEX idx_team_members_user ON team_members(user_id)');
  await knex.schema.raw('CREATE INDEX idx_items_team_status ON items(team_id, status)');
  await knex.schema.raw('CREATE INDEX idx_items_team_assignee ON items(team_id, assigned_to)');
  await knex.schema.raw('CREATE INDEX idx_items_team_due_date ON items(team_id, due_date)');
  await knex.schema.raw('CREATE INDEX idx_items_team_pinned_updated ON items(team_id, is_pinned, updated_at)');
  await knex.schema.raw('CREATE INDEX idx_tags_team_name ON tags(team_id, name)');
  await knex.schema.raw('CREATE INDEX idx_updates_item_created ON progress_updates(item_id, created_at)');

  await knex.schema.raw('CREATE INDEX idx_activity_team_created ON activity_log(team_id, created_at)');
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('activity_log');

  await knex.schema.dropTableIfExists('progress_updates');
  await knex.schema.dropTableIfExists('item_tags');
  await knex.schema.dropTableIfExists('tags');
  await knex.schema.dropTableIfExists('items');
  await knex.schema.dropTableIfExists('team_members');
  await knex.schema.dropTableIfExists('teams');
  await knex.schema.dropTableIfExists('users');
};

