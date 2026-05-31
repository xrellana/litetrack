exports.up = async function up(knex) {
  await knex.schema.dropTableIfExists('item_tags');
  await knex.schema.dropTableIfExists('tags');
};

exports.down = async function down(knex) {
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

  await knex.schema.raw('CREATE INDEX idx_tags_team_name ON tags(team_id, name)');
};
