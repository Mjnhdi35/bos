/**
 * Query DSL parser — converts Express `req.query` or POST body
 * `{ filter, sort, page, limit }` into the runtime's typed
 * `QueryCondition` AST.
 *
 * Two accepted forms:
 *   URL form:  ?filter[field_op]=value&filter[field_op]=value&sort=-field
 *   Body form: { filter: {field_op: value}, sort: [{field, direction}], page, limit }
 *
 * The parser is intentionally generic — it has NO knowledge of any
 * entity, application, or domain. It only validates that operator
 * suffixes are recognised and that the resulting AST matches the
 * runtime's `QueryCondition` shape.
 */

import type {
  QueryCondition,
  QueryLeaf,
  QueryOperator,
  QuerySort,
} from "../../platform/runtime";
import { badRequest } from "./errors";

const OPERATORS: readonly QueryOperator[] = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "nin",
  "contains",
  "startsWith",
  "endsWith",
];

const OP_SUFFIX_SET = new Set<string>(OPERATORS);

export const QUERY_KEYWORDS = {
  filterPrefix: "filter[",
  sort: "sort",
} as const;

/**
 * Parse the `filter` sub-object from either URL or body form.
 *
 * Keys are `field_op` (e.g. `slug_eq`, `name_contains`). The
 * underscore is treated as the field/operator separator — keys with
 * an underscore whose suffix is not a known operator are rejected
 * with a 400. Keys without an underscore are treated as field names
 * with the implicit `eq` operator (back-compat for callers that
 * send `filter[slug]=value`).
 */
export function parseFilterObject(
  raw: Readonly<Record<string, unknown>> | undefined,
): QueryCondition | undefined {
  if (!raw) return undefined;

  const leaves: QueryLeaf[] = [];
  for (const [key, value] of Object.entries(raw)) {
    const lastUnderscore = key.lastIndexOf("_");
    let field: string;
    let op: QueryOperator;
    if (lastUnderscore > 0) {
      const suffix = key.slice(lastUnderscore + 1);
      if (OP_SUFFIX_SET.has(suffix)) {
        field = key.slice(0, lastUnderscore);
        op = suffix as QueryOperator;
      } else {
        throw badRequest(
          `filter key '${key}' has unknown operator suffix '${suffix}'`,
        );
      }
    } else {
      field = key;
      op = "eq";
    }
    leaves.push({ kind: "leaf", filter: { field, operator: op, value } });
  }

  if (leaves.length === 0) return undefined;
  if (leaves.length === 1) return leaves[0];
  return { kind: "and", all: leaves };
}

/**
 * Parse the URL query string (`req.query`) into a `QueryDef`. The
 * function tolerates missing values by skipping them — Express
 * already URL-decodes them. Filters with `filter[field_op]=value`
 * become leaf conditions joined by AND.
 */
export function parseUrlQuery(
  query: Readonly<Record<string, unknown>>,
): {
  filter?: QueryCondition;
  sort?: readonly QuerySort[];
  page?: number;
  limit?: number;
} {
  const sorts: QuerySort[] = [];
  let page: number | undefined;
  let limit: number | undefined;

  // Express with `query parser: 'extended'` uses `qs`, which already
  // parses `filter[field_op]=value` into a nested object:
  //   req.query.filter = { field_op: value }
  // We then pass that through `parseFilterObject`, which also
  // validates operator suffixes.
  let filterBag: Record<string, unknown> | undefined;
  const filterRaw = query["filter"];
  if (
    filterRaw !== undefined &&
    typeof filterRaw === "object" &&
    filterRaw !== null &&
    !Array.isArray(filterRaw)
  ) {
    filterBag = { ...(filterRaw as Record<string, unknown>) };
  }

  for (const [rawKey, rawValue] of Object.entries(query)) {
    if (rawKey === QUERY_KEYWORDS.sort) {
      const value = Array.isArray(rawValue) ? rawValue.join(",") : String(rawValue);
      for (const piece of value.split(",").map((s) => s.trim()).filter(Boolean)) {
        const direction: "asc" | "desc" = piece.startsWith("-") ? "desc" : "asc";
        const field = piece.startsWith("-") ? piece.slice(1) : piece;
        sorts.push({ field, direction });
      }
      continue;
    }
    if (rawKey === "page") {
      const v = Number(Array.isArray(rawValue) ? rawValue[0] : rawValue);
      if (Number.isInteger(v) && v > 0) page = v;
      continue;
    }
    if (rawKey === "limit") {
      const v = Number(Array.isArray(rawValue) ? rawValue[0] : rawValue);
      if (Number.isInteger(v) && v > 0) limit = v;
      continue;
    }
  }

  const out: {
    filter?: QueryCondition;
    sort?: readonly QuerySort[];
    page?: number;
    limit?: number;
  } = {};
  const filter = parseFilterObject(filterBag);
  if (filter) out.filter = filter;
  if (sorts.length > 0) out.sort = sorts;
  if (page !== undefined) out.page = page;
  if (limit !== undefined) out.limit = limit;
  return out;
}

/**
 * Parse a POST `_query` body into a `QueryDef`. Body form differs
 * from URL form in that `filter` is a flat object whose keys are
 * `field_op` pairs.
 */
export function parseBodyQuery(
  body: unknown,
): {
  filter?: QueryCondition;
  sort?: readonly QuerySort[];
  page?: number;
  limit?: number;
} {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return {};
  }
  const b = body as Record<string, unknown>;
  const out: {
    filter?: QueryCondition;
    sort?: readonly QuerySort[];
    page?: number;
    limit?: number;
  } = {};

  const filter = parseFilterObject(
    typeof b["filter"] === "object" && b["filter"] !== null
      ? (b["filter"] as Record<string, unknown>)
      : undefined,
  );
  if (filter) out.filter = filter;

  if (Array.isArray(b["sort"])) {
    const sorts: QuerySort[] = [];
    for (const item of b["sort"]) {
      if (typeof item !== "string") continue;
      const direction: "asc" | "desc" = item.startsWith("-") ? "desc" : "asc";
      const field = item.startsWith("-") ? item.slice(1) : item;
      sorts.push({ field, direction });
    }
    if (sorts.length > 0) out.sort = sorts;
  }

  if (typeof b["page"] === "number" && Number.isInteger(b["page"]) && b["page"] > 0) {
    out.page = b["page"];
  }
  if (typeof b["limit"] === "number" && Number.isInteger(b["limit"]) && b["limit"] > 0) {
    out.limit = b["limit"];
  }

  return out;
}

export const OPERATORS_LIST = OPERATORS;