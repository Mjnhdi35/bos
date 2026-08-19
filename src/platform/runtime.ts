/**
 * Platform runtime — public types and small helpers.
 *
 * The runtime has two top-level identities:
 *   - **EntityRef** = { applicationId, entityName }
 *   - **EntityRef key** = `${applicationId}/${entityName}` (suitable as a Map key)
 *
 * `applicationId` is the COMPOSITE identity dimension. The runtime NEVER
 * resolves entities by name alone; a bare `entityName` is not accepted
 * by `getDefinition`. This is the isolation contract enforced by Phase 4.1
 * and audited by `test/platform/invariant/entity-identity.test.ts`.
 */

import { HttpError } from "../shared/errors";
import type { FieldDef } from "./domain/field-def";
import type { RelationDef } from "./domain/relation-def";
import type { WorkflowDef } from "./domain/workflow-def";

// Re-export the field/relation/workflow types so callers can
// `import { ExtendedEntityDefinition } from "../platform/runtime"`.
export type { FieldDef } from "./domain/field-def";
export type { RelationDef, RelationKind } from "./domain/relation-def";
export type { WorkflowDef, WorkflowState, WorkflowAction, WorkflowTransition } from "./domain/workflow-def";
export { workflowStateField, DEFAULT_WORKFLOW_STATE_FIELD } from "./domain/workflow-def";
export { relationForeignKeyName, relationStorageFieldName } from "./domain/relation-def";

// ---------------------------------------------------------------------------
// EntityRef — the runtime identity
// ---------------------------------------------------------------------------

export type EntityRef = {
  readonly applicationId: string;
  readonly entityName: string;
};

export function refOf(applicationId: string, entityName: string): EntityRef {
  return { applicationId, entityName };
}

export function entityRefKey(ref: EntityRef): string {
  return `${ref.applicationId}/${ref.entityName}`;
}

export function isEntityRef(x: unknown): x is EntityRef {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as { applicationId?: unknown }).applicationId === "string" &&
    typeof (x as { entityName?: unknown }).entityName === "string"
  );
}

// ---------------------------------------------------------------------------
// EntityDefinition (extended) — metadata-driven, normalised
// ---------------------------------------------------------------------------

/**
 * The "extended" entity definition is what the runtime consumes after
 * `compileDefinition()` has normalised the user-supplied raw object. It
 * carries relations, workflow, and permissions alongside the fields.
 */
export type ExtendedEntityDefinition = {
  readonly name: string;
  readonly version: number;
  readonly fields: readonly FieldDef[];
  readonly relations?: readonly RelationDef[];
  readonly workflow?: WorkflowDef;
  readonly permissions?: readonly PermissionDef[];
};

export type PermissionDef = {
  readonly action: "create" | "read" | "update" | "delete" | "transition";
  readonly actor?: string;
};

// ---------------------------------------------------------------------------
// Query DSL — the runtime's filter / sort / pagination vocabulary
// ---------------------------------------------------------------------------

export type QueryOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "contains"
  | "startsWith"
  | "endsWith";

export type QueryLeaf = {
  readonly kind: "leaf";
  readonly filter: { readonly field: string; readonly operator: QueryOperator; readonly value: unknown };
};

export type QueryAnd = {
  readonly kind: "and";
  readonly all: readonly QueryCondition[];
};

export type QueryOr = {
  readonly kind: "or";
  readonly any: readonly QueryCondition[];
};

export type QueryCondition = QueryLeaf | QueryAnd | QueryOr;

export type QuerySort = {
  readonly field: string;
  readonly direction: "asc" | "desc";
};

export type QueryPagination = {
  readonly page: number;
  readonly limit: number;
};

export type QueryDef = {
  readonly filter?: QueryCondition;
  readonly sort?: readonly QuerySort[];
  readonly pagination?: QueryPagination;
};

export type QueryResult<T> = {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
};

// ---------------------------------------------------------------------------
// Lifecycle events
// ---------------------------------------------------------------------------

export const ENTITY_EVENT_KINDS = [
  "entity.created",
  "entity.updated",
  "entity.deleted",
  "workflow.transitioned",
] as const;

export type EntityEventKind = (typeof ENTITY_EVENT_KINDS)[number];

export type EntityEvent<TPayload = unknown> = {
  readonly kind: EntityEventKind;
  readonly applicationId: string;
  readonly entity: string;
  readonly entityId: string;
  readonly payload: TPayload;
  readonly timestamp: string;
};

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export type AuditOperation = "create" | "update" | "delete" | "transition";

export type AuditEntry = {
  readonly who: string;
  readonly applicationId: string;
  readonly entity: string;
  readonly entityId: string;
  readonly operation: AuditOperation;
  readonly before: Readonly<Record<string, unknown>> | null;
  readonly after: Readonly<Record<string, unknown>> | null;
  readonly timestamp: string;
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class RuntimeError extends HttpError {
  constructor(message: string) {
    super(500, "runtime_error", message);
    this.name = "RuntimeError";
  }
}

/**
 * Raised when a relation target is referenced from an entity that does
 * NOT declare that target in the same application. Cross-application
 * relations are explicitly not supported (Phase 4.1 §23).
 */
export class CrossApplicationRelationError extends HttpError {
  // Public readonly fields are part of the error contract; consumers
  // inspect these via property reads after `instanceof` checks. Declared
  // explicitly (instead of via constructor `public readonly` parameter
  // shorthand) because TypeScript's `no-unused-vars` rule flags
  // constructor parameters that are only used through implicit field
  // access in the class body.
  public readonly source: { applicationId: string; entityName: string };
  public readonly relationName: string;
  public readonly targetEntity: string;
  public readonly targetId: string;

  constructor(
    source: { applicationId: string; entityName: string },
    relationName: string,
    targetEntity: string,
    targetId: string,
    message: string,
  ) {
    super(409, "cross_application_relation_not_supported", message);
    this.name = "CrossApplicationRelationError";
    this.source = source;
    this.relationName = relationName;
    this.targetEntity = targetEntity;
    this.targetId = targetId;
  }
}

// ---------------------------------------------------------------------------
// compileDefinition — normalises a raw object into ExtendedEntityDefinition
// ---------------------------------------------------------------------------

import { validateFieldDef } from "./domain/field-def";

function asString(v: unknown): string {
  if (typeof v !== "string") throw new RuntimeError(`expected string, got ${typeof v}`);
  return v;
}

function asNumber(v: unknown): number {
  if (typeof v !== "number" || !Number.isInteger(v)) {
    throw new RuntimeError(`expected integer, got ${typeof v}`);
  }
  return v;
}

function asBoolean(v: unknown): boolean {
  if (typeof v !== "boolean") throw new RuntimeError(`expected boolean, got ${typeof v}`);
  return v;
}

function asArray(v: unknown): readonly unknown[] {
  if (!Array.isArray(v)) throw new RuntimeError("expected array");
  return v;
}

function asObject(v: unknown): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new RuntimeError("expected object");
  }
  return v as Record<string, unknown>;
}

/**
 * Compile a raw object literal into an `ExtendedEntityDefinition`,
 * validating all metadata. This is the canonical entry point for
 * turning user-supplied metadata into a value the runtime can trust.
 */
export function compileDefinition(
  raw: Readonly<Record<string, unknown>>,
): ExtendedEntityDefinition {
  const errors: string[] = [];

  const name = asString(raw["name"]);
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    errors.push(`name '${name}' must match /^[a-z][a-z0-9_]*$/`);
  }

  const version = asNumber(raw["version"]);
  if (version < 1) errors.push("version must be >= 1");

  const fieldsRaw = raw["fields"];
  const fields: FieldDef[] = [];
  if (!Array.isArray(fieldsRaw) || fieldsRaw.length === 0) {
    errors.push("fields must be non-empty array");
  } else {
    for (const f of fieldsRaw) {
      try {
        fields.push(validateFieldDef(f));
      } catch (e) {
        errors.push(`field invalid: ${(e as Error).message}`);
      }
    }
  }

  // Relations
  const relationsRaw = raw["relations"];
  const relations: RelationDef[] = [];
  if (relationsRaw !== undefined) {
    for (const r of asArray(relationsRaw)) {
      const obj = asObject(r);
      const relName = asString(obj["name"]);
      const target = asString(obj["target"]);
      const kind = asString(obj["kind"] ?? "many-to-one");
      if (kind !== "many-to-one") errors.push(`relation '${relName}' kind must be 'many-to-one'`);
      const required = obj["required"] === undefined ? true : asBoolean(obj["required"]);
      relations.push({ name: relName, kind: "many-to-one", target, required });
    }
  }

  // Workflow
  let workflow: WorkflowDef | undefined;
  const wRaw = raw["workflow"];
  if (wRaw !== undefined) {
    const w = asObject(wRaw);
    const initial = asString(w["initial"]);
    const states = asArray(w["states"]).map(asString);
    const transitions: { from: string; to: string; action: string; guard?: string }[] = [];
    for (const t of asArray(w["transitions"])) {
      const tObj = asObject(t);
      const from = asString(tObj["from"]);
      const to = asString(tObj["to"]);
      const action = asString(tObj["action"]);
      const guard = tObj["guard"];
      transitions.push({
        from,
        to,
        action,
        ...(typeof guard === "string" ? { guard } : {}),
      });
    }
    const stateField = w["stateField"];
    workflow = {
      initial,
      states,
      transitions,
      ...(typeof stateField === "string" ? { stateField } : {}),
    };
  }

  // Permissions
  const permsRaw = raw["permissions"];
  const permissions: PermissionDef[] = [];
  if (permsRaw !== undefined) {
    for (const p of asArray(permsRaw)) {
      const o = asObject(p);
      const action = asString(o["action"]) as PermissionDef["action"];
      const actor = typeof o["actor"] === "string" ? o["actor"] : undefined;
      permissions.push({
        action,
        ...(actor !== undefined ? { actor } : {}),
      });
    }
  }

  if (errors.length > 0) {
    throw new RuntimeError(`Invalid definition '${name}': ${errors.join("; ")}`);
  }

  const out: ExtendedEntityDefinition = {
    name,
    version,
    fields,
    ...(relations.length > 0 ? { relations } : {}),
    ...(workflow !== undefined ? { workflow } : {}),
    ...(permissions.length > 0 ? { permissions } : {}),
  };
  return out;
}
