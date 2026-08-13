import { type Knex } from "../infrastructure/database/knex";

export type EntityRecord = {
  readonly id: string;
  readonly [column: string]: unknown;
};

type Row = Record<string, unknown>;

function rowToRecord(row: Row): EntityRecord {
  const id = row.id;
  if (typeof id !== "string") throw new Error("entity record missing string id");
  const rec: Row = { id };
  for (const [k, v] of Object.entries(row)) {
    if (k === "id") continue;
    rec[k] = v instanceof Date ? v.toISOString() : v;
  }
  return rec as EntityRecord;
}

export async function insertRecord(
  knex: Knex,
  table: string,
  input: Record<string, unknown>,
): Promise<EntityRecord> {
  const rows = (await knex(table).insert({ ...input }).returning("*")) as readonly Row[];
  const row = rows[0];
  if (!row) throw new Error(`Insert into ${table} returned no row`);
  return rowToRecord(row);
}

export async function findRecordById(
  knex: Knex,
  table: string,
  id: string,
): Promise<EntityRecord | null> {
  const row = (await knex(table).where({ id }).first()) as Row | undefined;
  return row ? rowToRecord(row) : null;
}

export type ListOptions = {
  limit?: number;
  offset?: number;
};

export async function listRecords(
  knex: Knex,
  table: string,
  options: ListOptions = {},
): Promise<readonly EntityRecord[]> {
  let q = knex(table).orderBy("created_at", "asc").orderBy("id", "asc");
  if (options.limit !== undefined) q = q.limit(options.limit);
  if (options.offset !== undefined) q = q.offset(options.offset);
  const rows = (await q) as readonly Row[];
  return rows.map((r) => rowToRecord(r));
}

export async function updateRecord(
  knex: Knex,
  table: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<EntityRecord | null> {
  const rows = (await knex(table)
    .where({ id })
    .update({ ...patch, updated_at: knex.fn.now() })
    .returning("*")) as readonly Row[];
  const row = rows[0];
  return row ? rowToRecord(row) : null;
}

export async function deleteRecord(
  knex: Knex,
  table: string,
  id: string,
): Promise<boolean> {
  const removed = await knex(table).where({ id }).delete();
  return removed > 0;
}
