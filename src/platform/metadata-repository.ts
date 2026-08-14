import { type Knex } from "../infrastructure/database/knex";
import { type FieldDef } from "./domain/field-def";
import {
  type ArrayInnerType,
  type FieldType,
  isArrayInnerType,
  isFieldType,
} from "./domain/field-type";
import { type EntityMetadata } from "./domain/metadata";

type EntityRow = {
  id: number;
  name: string;
  version: number;
  fields: ReadonlyArray<Record<string, unknown>>;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
};

function rowToFields(
  raw: ReadonlyArray<Record<string, unknown>>,
): readonly FieldDef[] {
  const out: FieldDef[] = [];
  for (const item of raw) {
    const type = item.type;
    if (!isFieldType(type))
      throw new Error(`Invalid field type in metadata: ${String(type)}`);
    const name = item.name;
    const required = item.required;
    if (typeof name !== "string" || typeof required !== "boolean") {
      throw new Error("Invalid field shape in metadata");
    }
    const base = { name, required } as const;
    const ft: FieldType = type;
    switch (ft) {
      case "string":
        out.push({
          ...base,
          type: "string",
          ...(typeof item.maxLength === "number"
            ? { maxLength: item.maxLength }
            : {}),
        });
        break;
      case "text":
        out.push({ ...base, type: "text" });
        break;
      case "number":
        out.push({ ...base, type: "number" });
        break;
      case "decimal":
        out.push({
          ...base,
          type: "decimal",
          ...(typeof item.precision === "number"
            ? { precision: item.precision }
            : {}),
          ...(typeof item.scale === "number" ? { scale: item.scale } : {}),
        });
        break;
      case "boolean":
        out.push({ ...base, type: "boolean" });
        break;
      case "timestamp":
        out.push({ ...base, type: "timestamp" });
        break;
      case "json":
        out.push({ ...base, type: "json" });
        break;
      case "enum": {
        const valuesRaw = item.values;
        const values: string[] = [];
        if (Array.isArray(valuesRaw)) {
          for (const v of valuesRaw) {
            if (typeof v === "string") values.push(v);
          }
        }
        out.push({
          ...base,
          type: "enum",
          values,
          ...(typeof item.maxLength === "number"
            ? { maxLength: item.maxLength }
            : {}),
        });
        break;
      }
      case "array": {
        let innerType: ArrayInnerType = "string";
        const itemsRaw = item.items;
        if (itemsRaw && typeof itemsRaw === "object") {
          const itype = (itemsRaw as Record<string, unknown>).type;
          if (isArrayInnerType(itype)) innerType = itype;
        }
        out.push({
          ...base,
          type: "array",
          items: { type: innerType },
        });
        break;
      }
    }
  }
  return out;
}

function rowToMetadata(row: EntityRow): EntityMetadata {
  return {
    name: row.name,
    version: row.version,
    fields: rowToFields(row.fields),
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertMetadata(
  knex: Knex,
  metadata: EntityMetadata,
): Promise<EntityMetadata> {
  const [row] = await knex<EntityRow>("platform_entities")
    .insert({
      name: metadata.name,
      version: metadata.version,
      fields: knex.raw("?::jsonb", [JSON.stringify(metadata.fields)]),
      is_system: metadata.isSystem,
    })
    .returning("*");
  if (!row) throw new Error("platform_entities insert returned no row");
  return rowToMetadata(row);
}

export async function listMetadata(
  knex: Knex,
): Promise<readonly EntityMetadata[]> {
  const rows = await knex<EntityRow>("platform_entities")
    .orderBy("name", "asc")
    .orderBy("version", "desc");
  return rows.map(rowToMetadata);
}

export async function findMetadataByName(
  knex: Knex,
  name: string,
): Promise<readonly EntityMetadata[]> {
  const rows = await knex<EntityRow>("platform_entities")
    .where({ name })
    .orderBy("version", "desc");
  return rows.map(rowToMetadata);
}

export async function findMetadataByNameAndVersion(
  knex: Knex,
  name: string,
  version: number,
): Promise<EntityMetadata | null> {
  const row = await knex<EntityRow>("platform_entities")
    .where({ name, version })
    .first();
  return row ? rowToMetadata(row) : null;
}

export async function deleteMetadata(
  knex: Knex,
  name: string,
  version: number,
): Promise<void> {
  await knex<EntityRow>("platform_entities").where({ name, version }).delete();
}

export async function countMetadata(knex: Knex): Promise<number> {
  const result =
    await knex<EntityRow>("platform_entities").count<{ count: string }[]>("*");
  const first = result[0];
  if (!first) return 0;
  return Number.parseInt(first.count, 10);
}
