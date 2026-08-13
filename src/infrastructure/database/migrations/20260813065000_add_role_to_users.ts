import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  const hasRole = await knex.schema.hasColumn("users", "role");
  if (!hasRole) {
    await knex.schema.alterTable("users", (table) => {
      table.string("role", 10).notNullable().defaultTo("user");
    });
  }
  await knex.raw(
    "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check",
  );
  await knex.raw(
    "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'))",
  );
}


export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check",
  );
  const hasRole = await knex.schema.hasColumn("users", "role");
  if (hasRole) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("role");
    });
  }
}