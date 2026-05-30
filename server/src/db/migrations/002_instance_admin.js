exports.up = async function up(knex) {
  await knex.raw('ALTER TABLE users ADD COLUMN is_instance_admin INTEGER NOT NULL DEFAULT 0 CHECK(is_instance_admin IN (0, 1))');
  await knex.raw('UPDATE users SET is_instance_admin = 1 WHERE username = ?', ['admin']);
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('is_instance_admin');
  });
};
