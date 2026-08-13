import { type FieldDef, validateFieldDefs } from "./field-def";

export type EntityDefinition = {
  readonly name: string;
  readonly version: number;
  readonly fields: readonly FieldDef[];
};

export class InvalidDefinitionError extends Error {
  constructor(message: string) {
    super(`Invalid definition: ${message}`);
    this.name = "InvalidDefinitionError";
  }
}

export const MAX_ENTITY_NAME_LENGTH = 64;
const ENTITY_NAME_RE = /^[a-z][a-z0-9_]*$/;

export function validateEntityDefinition(input: unknown): EntityDefinition {
  if (input === null || typeof input !== "object") {
    throw new InvalidDefinitionError("not an object");
  }
  const obj = input as Record<string, unknown>;

  const name = obj.name;
  if (typeof name !== "string" || name.length === 0) {
    throw new InvalidDefinitionError("name must be non-empty string");
  }
  if (name.length > MAX_ENTITY_NAME_LENGTH) {
    throw new InvalidDefinitionError(`name exceeds ${String(MAX_ENTITY_NAME_LENGTH)} chars`);
  }
  if (!ENTITY_NAME_RE.test(name)) {
    throw new InvalidDefinitionError(
      "name must match /^[a-z][a-z0-9_]*$/ (lowercase, digits, underscore)",
    );
  }

  const version = obj.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new InvalidDefinitionError("version must be positive integer");
  }

  const fields = validateFieldDefs(obj.fields);

  return { name, version, fields };
}
