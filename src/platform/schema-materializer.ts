import { type Knex } from "../infrastructure/database/knex";
import { type FieldDef } from "./domain/field-def";
import { type ArrayInnerType } from "./domain/field-type";
import { type EntityMetadata } from "./domain/metadata";

function arrayInnerPgType(t: ArrayInnerType): string {
  switch (t) {
    case "string":
      return "varchar(255)";
    case "text":
      return "text";
    case "number":
      return "integer";
    case "decimal":
      return "numeric";
    case "boolean":
      return "boolean";
    case "timestamp":
      return "timestamp";
    case "json":
      return "jsonb";
  }
}

function applyColumn(table: Knex.CreateTableBuilder, fd: FieldDef): void {
  switch (fd.type) {
    case "string": {
      const col = table.string(fd.name, fd.maxLength ?? 255);
      if (fd.required) col.notNullable();
      else col.nullable();
      break;
    }
    case "text": {
      const col = table.text(fd.name);
      if (fd.required) col.notNullable();
      else col.nullable();
      break;
    }
    case "number": {
      const col = table.integer(fd.name);
      if (fd.required) col.notNullable();
      else col.nullable();
      break;
    }
    case "decimal": {
      const col = table.decimal(fd.name, fd.precision ?? 18, fd.scale ?? 4);
      if (fd.required) col.notNullable();
      else col.nullable();
      break;
    }
    case "boolean": {
      const col = table.boolean(fd.name);
      if (fd.required) col.notNullable();
      else col.nullable();
      break;
    }
    case "timestamp": {
      const col = table.timestamp(fd.name);
      if (fd.required) col.notNullable();
      else col.nullable();
      break;
    }
    case "json": {
      const col = table.jsonb(fd.name);
      if (fd.required) col.notNullable();
      else col.nullable();
      break;
    }
    case "enum": {
      const col = table.string(fd.name, fd.maxLength ?? 32);
      if (fd.required) col.notNullable();
      else col.nullable();
      break;
    }
    case "array": {
      const pgType = `${arrayInnerPgType(fd.items.type)}[]`;
      const col = table.specificType(fd.name, pgType);
      if (fd.required) col.notNullable();
      else col.nullable();
      break;
    }
  }
}

export async function createPhysicalTable(
  knex: Knex,
  metadata: EntityMetadata,
): Promise<void> {
  await knex.schema.createTable(metadata.name, (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    for (const fd of metadata.fields) applyColumn(table, fd);
  });
  for (const fd of metadata.fields) {
    if (fd.type === "enum") {
      const inList = fd.values
        .map((v) => `'${v.replace(/'/g, "''")}'`)
        .join(",");
      const constraintName = `chk_${metadata.name}_${fd.name}`;
      await knex.raw(
        `ALTER TABLE "${metadata.name}" ADD CONSTRAINT "${constraintName}" ` +
          `CHECK ("${fd.name}" IS NULL OR "${fd.name}" IN (${inList}))`,
      );
    }
  }
}

export async function dropPhysicalTable(
  knex: Knex,
  name: string,
): Promise<void> {
  await knex.schema.dropTableIfExists(name);
}

export async function physicalTableExists(
  knex: Knex,
  name: string,
): Promise<boolean> {
  const result = await knex.raw<{ rows: { exists: boolean }[] }>(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = ?) AS exists",
    [name],
  );
  const first = result.rows[0];
  return first?.exists === true;
}
