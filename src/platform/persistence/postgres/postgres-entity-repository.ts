/**
 * PostgresEntityRepository — Knex-backed Postgres adapter.
 *
 * Persistence identity: a single table per `(applicationId, entityName)` pair.
 * The table name is `app__<applicationId>__<entityName>` (identifier-safe).
 * Two applications declaring entities with the same name resolve to different
 * physical tables, preserving Phase 4.1 application isolation.
 *
 * Schema: `id` (PK, text) + `data` (JSONB, full record). The record is
 * stored as JSONB so the runtime can evolve the metadata without DDL.
 */

import type { Knex } from "knex";
import type { EntityRef, QueryResult, QuerySort } from "../../runtime";
import { entityRefKey } from "../../runtime";
import type { EntityRecord, EntityRepository } from "../../repository";
import { applyFilter, applySort } from "../shared/sql-translator";

export class PostgresEntityRepository implements EntityRepository {
  private readonly knex: Knex;
  constructor(knex: Knex) {
    this.knex = knex;
  }

  private tableName(ref: EntityRef): string {
    return `app__${ref.applicationId}__${ref.entityName}`;
  }

  private async ensureTable(ref: EntityRef): Promise<void> {
    const name = this.tableName(ref);
    const exists = await this.knex.schema.hasTable(name);
    if (exists) return;
    await this.knex.schema.createTable(name, (t) => {
      t.text("id").primary();
      t.jsonb("data").notNullable();
      t.timestamp("created_at", { useTz: true }).defaultTo(this.knex.fn.now());
    });
  }

  async insert(ref: EntityRef, record: EntityRecord): Promise<void> {
    await this.ensureTable(ref);
    await this.knex(this.tableName(ref)).insert({
      id: record.id,
      data: JSON.stringify(record),
    });
  }

  async findById(ref: EntityRef, id: string): Promise<EntityRecord | null> {
    const exists = await this.knex.schema.hasTable(this.tableName(ref));
    if (!exists) return null;
    const row = await this.knex(this.tableName(ref))
      .where({ id })
      .first<{ data: string } | undefined>();
    if (!row) return null;
    return JSON.parse(row.data) as EntityRecord;
  }

  async update(ref: EntityRef, id: string, record: EntityRecord): Promise<void> {
    const updated = await this.knex(this.tableName(ref))
      .where({ id })
      .update({ data: JSON.stringify(record) });
    if (updated === 0) {
      throw new Error(`record '${id}' not found in ${entityRefKey(ref)}`);
    }
  }

  async delete(ref: EntityRef, id: string): Promise<void> {
    const deleted = await this.knex(this.tableName(ref)).where({ id }).delete();
    if (deleted === 0) {
      throw new Error(`record '${id}' not found in ${entityRefKey(ref)}`);
    }
  }

  async query(
    ref: EntityRef,
    args: {
      readonly filter?: import("../../runtime").QueryCondition;
      readonly sort?: readonly QuerySort[];
      readonly page?: number;
      readonly limit?: number;
    },
  ): Promise<QueryResult<EntityRecord>> {
    const exists = await this.knex.schema.hasTable(this.tableName(ref));
    if (!exists) {
      return { items: [], total: 0, page: args.page ?? 1, limit: args.limit ?? 0 };
    }
    const countQb = this.knex(this.tableName(ref)).count<{ count: string }[]>("* as count");
    applyFilter(countQb, args.filter);
    const countRow = await countQb.first();
    const total = Number(countRow?.count ?? 0);

    let qb = this.knex(this.tableName(ref)).select("data");
    applyFilter(qb, args.filter);
    applySort(qb, args.sort);
    if (args.page !== undefined && args.limit !== undefined) {
      qb = qb.offset((args.page - 1) * args.limit).limit(args.limit);
    }
    const rows = await qb;
    const items = rows.map((r: { data: string }) => JSON.parse(r.data) as EntityRecord);
    return {
      items,
      total,
      page: args.page ?? 1,
      limit: args.limit ?? items.length,
    };
  }
}
