export const FIELD_TYPES = [
  "string",
  "text",
  "number",
  "decimal",
  "boolean",
  "timestamp",
  "json",
  "enum",
  "array",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export function isFieldType(value: unknown): value is FieldType {
  return (
    typeof value === "string" &&
    (FIELD_TYPES as readonly string[]).includes(value)
  );
}

export const ARRAY_INNER_TYPES = [
  "string",
  "text",
  "number",
  "decimal",
  "boolean",
  "timestamp",
  "json",
] as const;

export type ArrayInnerType = (typeof ARRAY_INNER_TYPES)[number];

export function isArrayInnerType(value: unknown): value is ArrayInnerType {
  return (
    typeof value === "string" &&
    (ARRAY_INNER_TYPES as readonly string[]).includes(value)
  );
}

export class InvalidFieldTypeError extends Error {
  constructor(value: unknown) {
    super(`Invalid field type: ${String(value)}`);
    this.name = "InvalidFieldTypeError";
  }
}
