import { type Knex } from "../infrastructure/database/knex";
import { type FieldDef } from "./domain/field-def";
import { validateEntityDefinition } from "./domain/definition";
import { type EntityMetadata } from "./domain/metadata";
import { HttpError } from "../shared/errors";
import {
  deleteMetadata,
  findMetadataByName,
  findMetadataByNameAndVersion,
  insertMetadata,
  listMetadata,
} from "./metadata-repository";
import {
  createPhysicalTable,
  dropPhysicalTable,
  physicalTableExists,
} from "./schema-materializer";
import {
  deleteRecord,
  findRecordById,
  insertRecord,
  listRecords,
  updateRecord,
  type EntityRecord,
  type ListOptions,
} from "./entity-data-store";

function now(): Date {
  return new Date();
}

function pickLatest(rows: readonly EntityMetadata[]): EntityMetadata | null {
  let latest: EntityMetadata | null = null;
  for (const m of rows) if (!latest || m.version > latest.version) latest = m;
  return latest;
}

export async function registerEntity(
  knex: Knex,
  rawInput: unknown,
): Promise<EntityMetadata> {
  const def = validateEntityDefinition(rawInput);

  const existing = await findMetadataByNameAndVersion(
    knex,
    def.name,
    def.version,
  );
  if (existing) throw new HttpError(409, "entity_already_exists");

  const exists = await physicalTableExists(knex, def.name);
  if (exists) {
    throw new HttpError(500, "schema_materialization_failed");
  }

  const metadata: EntityMetadata = {
    name: def.name,
    version: def.version,
    fields: def.fields,
    isSystem: false,
    createdAt: now(),
    updatedAt: now(),
  };

  let inserted: EntityMetadata;
  try {
    inserted = await insertMetadata(knex, metadata);
    await createPhysicalTable(knex, inserted);
  } catch (err) {
    try {
      await deleteMetadata(knex, metadata.name, metadata.version);
    } catch {
      // swallow rollback error; original error is more important
    }
    throw new HttpError(
      500,
      `schema_materialization_failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return inserted;
}

export async function getEntity(
  knex: Knex,
  name: string,
  version?: number,
): Promise<EntityMetadata> {
  if (version !== undefined) {
    const found = await findMetadataByNameAndVersion(knex, name, version);
    if (!found) throw new HttpError(404, "entity_not_found");
    return found;
  }
  const rows = await findMetadataByName(knex, name);
  if (rows.length === 0) throw new HttpError(404, "entity_not_found");
  const latest = pickLatest(rows);
  if (!latest) throw new HttpError(404, "entity_not_found");
  return latest;
}

export async function listEntities(
  knex: Knex,
): Promise<readonly EntityMetadata[]> {
  return listMetadata(knex);
}

export async function deleteEntity(
  knex: Knex,
  name: string,
  version: number,
): Promise<void> {
  const existing = await findMetadataByNameAndVersion(knex, name, version);
  if (!existing) throw new HttpError(404, "entity_not_found");
  await deleteMetadata(knex, name, version);
  await dropPhysicalTable(knex, name);
}

function validateInput(
  fields: readonly FieldDef[],
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const value = input[f.name];
    if (f.required && (value === undefined || value === null)) {
      throw new HttpError(400, "invalid_input", `field '${f.name}' is required`);
    }
    if (value === undefined || value === null) continue;
    switch (f.type) {
      case "string":
      case "text":
        if (typeof value !== "string") {
          throw new HttpError(400, "invalid_input", `field '${f.name}' must be string`);
        }
        break;
      case "number":
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new HttpError(400, "invalid_input", `field '${f.name}' must be number`);
        }
        out[f.name] = Math.trunc(value);
        continue;
      case "decimal":
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new HttpError(400, "invalid_input", `field '${f.name}' must be decimal (number)`);
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          throw new HttpError(400, "invalid_input", `field '${f.name}' must be boolean`);
        }
        break;
      case "timestamp":
        if (typeof value !== "string") {
          throw new HttpError(400, "invalid_input", `field '${f.name}' must be ISO string`);
        }
        if (Number.isNaN(Date.parse(value))) {
          throw new HttpError(400, "invalid_input", `field '${f.name}' must be valid date string`);
        }
        break;
      case "json":
        if (typeof value !== "object") {
          throw new HttpError(400, "invalid_input", `field '${f.name}' must be object`);
        }
        break;
      case "enum": {
        if (typeof value !== "string") {
          throw new HttpError(400, "invalid_input", `field '${f.name}' must be string`);
        }
        if (!f.values.includes(value)) {
          throw new HttpError(400, "invalid_input", `field '${f.name}' must be one of [${f.values.join(",")}]`);
        }
        break;
      }
      case "array": {
        if (!Array.isArray(value)) {
          throw new HttpError(400, "invalid_input", `field '${f.name}' must be array`);
        }
        const rawArr: unknown[] = value;
        const coercedArr: unknown[] = [];
        for (let i = 0; i < rawArr.length; i += 1) {
          const item: unknown = rawArr[i];
          const idx = `[${String(i)}]`;
          switch (f.items.type) {
            case "string":
            case "text":
              if (typeof item !== "string") {
                throw new HttpError(400, "invalid_input", `field '${f.name}${idx}' must be string`);
              }
              coercedArr.push(item);
              break;
            case "number":
              if (typeof item !== "number" || !Number.isFinite(item)) {
                throw new HttpError(400, "invalid_input", `field '${f.name}${idx}' must be number`);
              }
              coercedArr.push(Math.trunc(item));
              break;
            case "decimal":
              if (typeof item !== "number" || !Number.isFinite(item)) {
                throw new HttpError(400, "invalid_input", `field '${f.name}${idx}' must be decimal (number)`);
              }
              coercedArr.push(item);
              break;
            case "boolean":
              if (typeof item !== "boolean") {
                throw new HttpError(400, "invalid_input", `field '${f.name}${idx}' must be boolean`);
              }
              coercedArr.push(item);
              break;
            case "timestamp":
              if (typeof item !== "string" || Number.isNaN(Date.parse(item))) {
                throw new HttpError(400, "invalid_input", `field '${f.name}${idx}' must be valid date string`);
              }
              coercedArr.push(item);
              break;
            case "json":
              if (item === null || typeof item !== "object") {
                throw new HttpError(400, "invalid_input", `field '${f.name}${idx}' must be object`);
              }
              coercedArr.push(item);
              break;
          }
        }
        out[f.name] = coercedArr;
        continue;
      }
    }
    out[f.name] = value;
  }
  return out;
}

function validatePatch(
  fields: readonly FieldDef[],
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (!(f.name in input)) continue;
    const v = input[f.name];
    const k = f.name;
    if (v === undefined || v === null) {
      out[k] = v;
      continue;
    }
    switch (f.type) {
      case "string":
      case "text":
        if (typeof v !== "string") {
          throw new HttpError(400, "invalid_input", `field '${k}' must be string`);
        }
        break;
      case "number":
        if (typeof v !== "number" || !Number.isFinite(v)) {
          throw new HttpError(400, "invalid_input", `field '${k}' must be number`);
        }
        out[k] = Math.trunc(v);
        continue;
      case "decimal":
        if (typeof v !== "number" || !Number.isFinite(v)) {
          throw new HttpError(400, "invalid_input", `field '${k}' must be decimal (number)`);
        }
        break;
      case "boolean":
        if (typeof v !== "boolean") {
          throw new HttpError(400, "invalid_input", `field '${k}' must be boolean`);
        }
        break;
      case "timestamp":
        if (typeof v !== "string") {
          throw new HttpError(400, "invalid_input", `field '${k}' must be ISO string`);
        }
        if (Number.isNaN(Date.parse(v))) {
          throw new HttpError(400, "invalid_input", `field '${k}' must be valid date string`);
        }
        break;
      case "json":
        if (typeof v !== "object") {
          throw new HttpError(400, "invalid_input", `field '${k}' must be object`);
        }
        break;
      case "enum": {
        if (typeof v !== "string") {
          throw new HttpError(400, "invalid_input", `field '${k}' must be string`);
        }
        if (!f.values.includes(v)) {
          throw new HttpError(400, "invalid_input", `field '${k}' must be one of [${f.values.join(",")}]`);
        }
        break;
      }
      case "array": {
        if (!Array.isArray(v)) {
          throw new HttpError(400, "invalid_input", `field '${k}' must be array`);
        }
        const rawArr: unknown[] = v;
        const coercedArr: unknown[] = [];
        for (let i = 0; i < rawArr.length; i += 1) {
          const item: unknown = rawArr[i];
          const idx = `[${String(i)}]`;
          switch (f.items.type) {
            case "string":
            case "text":
              if (typeof item !== "string") {
                throw new HttpError(400, "invalid_input", `field '${k}${idx}' must be string`);
              }
              coercedArr.push(item);
              break;
            case "number":
              if (typeof item !== "number" || !Number.isFinite(item)) {
                throw new HttpError(400, "invalid_input", `field '${k}${idx}' must be number`);
              }
              coercedArr.push(Math.trunc(item));
              break;
            case "decimal":
              if (typeof item !== "number" || !Number.isFinite(item)) {
                throw new HttpError(400, "invalid_input", `field '${k}${idx}' must be decimal (number)`);
              }
              coercedArr.push(item);
              break;
            case "boolean":
              if (typeof item !== "boolean") {
                throw new HttpError(400, "invalid_input", `field '${k}${idx}' must be boolean`);
              }
              coercedArr.push(item);
              break;
            case "timestamp":
              if (typeof item !== "string" || Number.isNaN(Date.parse(item))) {
                throw new HttpError(400, "invalid_input", `field '${k}${idx}' must be valid date string`);
              }
              coercedArr.push(item);
              break;
            case "json":
              if (item === null || typeof item !== "object") {
                throw new HttpError(400, "invalid_input", `field '${k}${idx}' must be object`);
              }
              coercedArr.push(item);
              break;
          }
        }
        out[k] = coercedArr;
        continue;
      }
    }
    out[k] = v;
  }
  return out;
}

export async function createRecord(
  knex: Knex,
  entityName: string,
  rawInput: Record<string, unknown>,
): Promise<EntityRecord> {
  const meta = await getEntity(knex, entityName);
  const input = validateInput(meta.fields, rawInput);
  return insertRecord(knex, meta.name, input);
}

export async function readRecord(
  knex: Knex,
  entityName: string,
  id: string,
): Promise<EntityRecord> {
  const meta = await getEntity(knex, entityName);
  const record = await findRecordById(knex, meta.name, id);
  if (!record) throw new HttpError(404, "not_found");
  return record;
}

export async function listAllRecords(
  knex: Knex,
  entityName: string,
  options: ListOptions = {},
): Promise<readonly EntityRecord[]> {
  const meta = await getEntity(knex, entityName);
  return listRecords(knex, meta.name, options);
}

export async function updateOneRecord(
  knex: Knex,
  entityName: string,
  id: string,
  rawPatch: Record<string, unknown>,
): Promise<EntityRecord> {
  const meta = await getEntity(knex, entityName);
  const patch = validatePatch(meta.fields, rawPatch);
  const updated = await updateRecord(knex, meta.name, id, patch);
  if (!updated) throw new HttpError(404, "not_found");
  return updated;
}

export async function deleteOneRecord(
  knex: Knex,
  entityName: string,
  id: string,
): Promise<void> {
  const meta = await getEntity(knex, entityName);
  const removed = await deleteRecord(knex, meta.name, id);
  if (!removed) throw new HttpError(404, "not_found");
}
