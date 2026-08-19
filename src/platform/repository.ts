/**
 * EntityRepository — the persistence boundary.
 *
 * Identity: every method takes an `EntityRef` (composite of
 * `applicationId` + `entityName`). The runtime identity is NOT
 * `entityName` alone; Phase 4.1 proved this and Phase 5.2 tightened
 * the API to remove the legacy `entityName`-only fallback.
 *
 * Adapters:
 *   - `InMemoryRepository` — fast tests / prototype
 *   - `PostgresEntityRepository` — Knex-based Postgres
 *   - `MySqlEntityRepository` — Knex-based MySQL
 *
 * The runtime itself owns cross-cutting concerns (validation, audit,
 * events, workflow) and dispatches to whichever adapter the host wires
 * in.
 */

import type { EntityRef, QueryCondition, QueryResult, QuerySort } from "./runtime";
import { entityRefKey } from "./runtime";

export type { EntityRef } from "./runtime";

export type EntityRecord = Readonly<Record<string, unknown>> & { id: string };

export interface EntityRepository {
  insert(_ref: EntityRef, _record: EntityRecord): Promise<void>;
  findById(_ref: EntityRef, _id: string): Promise<EntityRecord | null>;
  update(_ref: EntityRef, _id: string, _record: EntityRecord): Promise<void>;
  delete(_ref: EntityRef, _id: string): Promise<void>;
  query(
    _ref: EntityRef,
    _args: {
      readonly filter?: QueryCondition;
      readonly sort?: readonly QuerySort[];
      readonly page?: number;
      readonly limit?: number;
    },
  ): Promise<QueryResult<EntityRecord>>;
}

// ---------------------------------------------------------------------------
// InMemoryRepository
// ---------------------------------------------------------------------------

export class InMemoryRepository implements EntityRepository {
  /**
   * Storage keyed by `entityRefKey(ref)`. Two applications declaring
   * Product with different schemas get DIFFERENT buckets here.
   */
  private readonly buckets = new Map<string, Map<string, EntityRecord>>();

  private bucket(ref: EntityRef): Map<string, EntityRecord> {
    const key = entityRefKey(ref);
    let b = this.buckets.get(key);
    if (!b) {
      b = new Map();
      this.buckets.set(key, b);
    }
    return b;
  }

  insert(ref: EntityRef, record: EntityRecord): Promise<void> {
    this.bucket(ref).set(record.id, { ...record });
    return Promise.resolve();
  }

  findById(ref: EntityRef, id: string): Promise<EntityRecord | null> {
    const r = this.bucket(ref).get(id);
    return Promise.resolve(r ? { ...r } : null);
  }

  update(ref: EntityRef, id: string, record: EntityRecord): Promise<void> {
    const b = this.bucket(ref);
    if (!b.has(id)) {
      return Promise.reject(new Error(`record '${id}' not found in ${entityRefKey(ref)}`));
    }
    b.set(id, { ...record });
    return Promise.resolve();
  }

  delete(ref: EntityRef, id: string): Promise<void> {
    const b = this.bucket(ref);
    if (!b.has(id)) {
      return Promise.reject(new Error(`record '${id}' not found in ${entityRefKey(ref)}`));
    }
    b.delete(id);
    return Promise.resolve();
  }

  query(
    ref: EntityRef,
    args: {
      readonly filter?: QueryCondition;
      readonly sort?: readonly QuerySort[];
      readonly page?: number;
      readonly limit?: number;
    },
  ): Promise<QueryResult<EntityRecord>> {
    const items = [...this.bucket(ref).values()].map((r) => ({ ...r }));
    const filtered = args.filter ? applyFilter(items, args.filter) : items;
    const sorted = args.sort ? applySort(filtered, args.sort) : filtered;
    const page = args.page ?? 1;
    const limit = args.limit ?? sorted.length;
    const start = (page - 1) * limit;
    const slice = sorted.slice(start, start + limit);
    return Promise.resolve({ items: slice, total: sorted.length, page, limit });
  }
}

// ---------------------------------------------------------------------------
// Filter / sort helpers (shared between in-memory and SQL adapters)
// ---------------------------------------------------------------------------

export function applyFilter<T extends Record<string, unknown>>(
  items: readonly T[],
  filter: QueryCondition,
): T[] {
  return items.filter((item) => matchCondition(item, filter));
}

function matchCondition(
  item: Record<string, unknown>,
  cond: QueryCondition,
): boolean {
  if (cond.kind === "leaf") {
    const v = item[cond.filter.field];
    return matchOperator(v, cond.filter.operator, cond.filter.value);
  }
  if (cond.kind === "and") {
    return cond.all.every((c) => matchCondition(item, c));
  }
  return cond.any.some((c) => matchCondition(item, c));
}

function matchOperator(actual: unknown, op: string, expected: unknown): boolean {
  switch (op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gt":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lt":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "in":
      return Array.isArray(expected) && (expected as unknown[]).includes(actual);
    case "nin":
      return Array.isArray(expected) && !(expected as unknown[]).includes(actual);
    case "contains":
      return typeof actual === "string" && typeof expected === "string" && actual.includes(expected);
    case "startsWith":
      return typeof actual === "string" && typeof expected === "string" && actual.startsWith(expected);
    case "endsWith":
      return typeof actual === "string" && typeof expected === "string" && actual.endsWith(expected);
    default:
      return false;
  }
}

export function applySort<T extends Record<string, unknown>>(
  items: readonly T[],
  sort: readonly QuerySort[],
): T[] {
  const out = [...items];
  out.sort((a, b) => {
    for (const s of sort) {
      const av = a[s.field];
      const bv = b[s.field];
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      if (cmp !== 0) return s.direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });
  return out;
}
