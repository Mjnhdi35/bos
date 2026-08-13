import { type FieldDef } from "./field-def";

export type EntityMetadata = {
  readonly name: string;
  readonly version: number;
  readonly fields: readonly FieldDef[];
  readonly isSystem: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type EntityIdentifier = {
  readonly name: string;
  readonly version: number;
};

export function entityIdentifierEquals(
  a: EntityIdentifier,
  b: EntityIdentifier,
): boolean {
  return a.name === b.name && a.version === b.version;
}
