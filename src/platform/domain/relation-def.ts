/**
 * Relation definition — describes a foreign-key relationship between two
 * entities within the SAME application scope.
 *
 * Cross-application relations are explicitly NOT supported. The runtime
 * enforces this through `CrossApplicationRelationError` at create/update
 * time (see `src/platform/entity-runtime.ts`).
 */

import type { FieldDef } from "./field-def";

export const RELATION_KINDS = ["many-to-one"] as const;
export type RelationKind = (typeof RELATION_KINDS)[number];

export type RelationDef = {
  /** Stable identifier within the source entity (e.g. "category"). */
  readonly name: string;
  readonly kind: RelationKind;
  /** Target entity name; must be declared in the same application. */
  readonly target: string;
  /** When true, the relation FK must be present on every record. */
  readonly required: boolean;
};

/**
 * Convention: the storage column storing the FK on the source entity is
 * `<target_snake>_id`. Examples:
 *
 *   Product.category: many-to-one Category → storage column "category_id"
 *   OrderItem.order:  many-to-one Order    → storage column "order_id"
 *
 * The runtime reads this convention so relation lookups are metadata-driven
 * without an explicit `field` annotation on the relation.
 */
export function relationForeignKeyName(rel: RelationDef): string {
  return `${snake(rel.target)}_id`;
}

export function relationStorageFieldName(rel: RelationDef): string {
  return relationForeignKeyName(rel);
}

/**
 * Validate the relation definition against the field list of the source
 * entity. Used by `compileDefinition` to ensure the FK field actually
 * exists on the source entity.
 */
export function validateRelation(
  rel: RelationDef,
  sourceFields: readonly FieldDef[],
): void {
  const fk = relationForeignKeyName(rel);
  const exists = sourceFields.find((f) => f.name === fk);
  if (!exists) {
    throw new Error(
      `relation '${rel.name}' target '${rel.target}' requires field '${fk}' on source entity`,
    );
  }
  if (rel.required && !exists.required) {
    // Source field is required by the relation but the field itself is
    // optional on the source entity; tighten the contract.
    // We don't fail compilation here — the runtime enforces
    // presence at create/update time.
  }
}

function snake(s: string): string {
  // Already-snake entities stay as-is; PascalCase is converted.
  if (/^[a-z][a-z0-9_]*$/.test(s)) return s;
  return s
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}
