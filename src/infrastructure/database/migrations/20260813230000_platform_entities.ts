import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("platform_entities", (table) => {
    table.increments("id").primary();
    table.string("name", 64).notNullable();
    table.integer("version").notNullable();
    table.jsonb("fields").notNullable();
    table.boolean("is_system").notNullable().defaultTo(false);
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table.unique(["name", "version"], {
      indexName: "uq_platform_entities_name_version",
    });
  });
  await knex.raw(
    "CREATE INDEX idx_platform_entities_name ON platform_entities (name)",
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("platform_entities");
}
