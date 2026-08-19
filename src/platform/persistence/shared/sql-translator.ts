/**
 * SQL translator — converts the runtime's query DSL into a parameterized
 * Knex query.
 *
 * Both Postgres and MySQL adapters store each record as a single JSON
 * payload (`data` column) plus a string `id`. The translator builds
 * `data->>field` lookups for flat fields. This is the simplest portable
 * schema that preserves the runtime's identity contract.
 *
 * NOTE: simplicity over performance. Production deployments should
 * schema-materialise hot columns; see Phase 3 follow-ups.
 */

import type { Knex } from "knex";
import type { QueryCondition, QuerySort } from "../../runtime";

export function applyFilter(
  qb: Knex.QueryBuilder,
  filter: QueryCondition | undefined,
): Knex.QueryBuilder {
  if (!filter) return qb;
  const visit = (q: Knex.QueryBuilder, c: QueryCondition): Knex.QueryBuilder => {
    if (c.kind === "leaf") {
      return applyLeaf(q, c.filter.field, c.filter.operator, c.filter.value);
    }
    if (c.kind === "and") {
      q.where(function () {
        for (const sub of c.all) visit(this, sub);
      });
      return q;
    }
    q.orWhere(function () {
      for (const sub of c.any) visit(this, sub);
    });
    return q;
  };
  return visit(qb, filter);
}

function applyLeaf(
  qb: Knex.QueryBuilder,
  field: string,
  op: string,
  value: unknown,
): Knex.QueryBuilder {
  // Single-level fields only — `data->>'field'`.
  const col = `data->>'${field.replace(/'/g, "''")}'`;
  switch (op) {
    case "eq":
      return qb.whereRaw(`${col} = ?`, [String(value)]);
    case "neq":
      return qb.whereRaw(`${col} <> ?`, [String(value)]);
    case "gt":
      return qb.whereRaw(`(${col})::numeric > ?::numeric`, [String(value)]);
    case "gte":
      return qb.whereRaw(`(${col})::numeric >= ?::numeric`, [String(value)]);
    case "lt":
      return qb.whereRaw(`(${col})::numeric < ?::numeric`, [String(value)]);
    case "lte":
      return qb.whereRaw(`(${col})::numeric <= ?::numeric`, [String(value)]);
    case "in": {
      const arr = Array.isArray(value) ? (value as unknown[]).map(String) : [];
      return qb.whereIn(`data->>'${field.replace(/'/g, "''")}'`, arr);
    }
    case "nin": {
      const arr = Array.isArray(value) ? (value as unknown[]).map(String) : [];
      return qb.whereNotIn(`data->>'${field.replace(/'/g, "''")}'`, arr);
    }
    case "contains":
      return qb.whereRaw(`${col} LIKE ?`, [`%${String(value)}%`]);
    case "startsWith":
      return qb.whereRaw(`${col} LIKE ?`, [`${String(value)}%`]);
    case "endsWith":
      return qb.whereRaw(`${col} LIKE ?`, [`%${String(value)}`]);
    default:
      return qb;
  }
}

export function applySort(
  qb: Knex.QueryBuilder,
  sort: readonly QuerySort[] | undefined,
): Knex.QueryBuilder {
  if (!sort) return qb;
  for (const s of sort) {
    qb.orderBy(`data->>'${s.field.replace(/'/g, "''")}'`, s.direction);
  }
  return qb;
}
