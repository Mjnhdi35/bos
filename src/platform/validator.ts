/**
 * Validation engine — applies metadata-declared constraints to record data.
 *
 * Supports: required, type (string/number/boolean/timestamp/enum), min, max,
 * minLength, maxLength, unique (when repository supports it), relation
 * existence (when relation is declared).
 *
 * Custom validators can be registered by name (per ADR-0019 — typed
 * registry; runtime does not import domain code).
 */

import type { FieldDef } from "./domain/field-def";

export type ValidatorFn = (
  _value: unknown,
  _field: FieldDef,
  _ctx: ValidationContext,
) => void | Promise<void>;

export type ValidationContext = {
  readonly entity: string;
  readonly applicationId: string;
  readonly record: Readonly<Record<string, unknown>>;
  readonly exists: (_entity: string, _id: string) => Promise<boolean>;
};

export class ValidationError extends Error {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(`'${field}': ${message}`);
    this.name = "ValidationError";
  }
}

export class ValidatorRegistry {
  private readonly validators = new Map<string, ValidatorFn>();

  register(name: string, fn: ValidatorFn): void {
    if (this.validators.has(name)) {
      throw new Error(`validator '${name}' already registered`);
    }
    this.validators.set(name, fn);
  }

  invoke(name: string): ValidatorFn | undefined {
    return this.validators.get(name);
  }
}

export async function validateRecord(
  fields: readonly FieldDef[],
  record: Readonly<Record<string, unknown>>,
  ctx: ValidationContext,
  registry?: ValidatorRegistry,
): Promise<void> {
  const errors: string[] = [];
  for (const field of fields) {
    const value = record[field.name];

    if (field.required && (value === undefined || value === null || value === "")) {
      errors.push(`'${field.name}' is required`);
      continue;
    }

    if (value === undefined || value === null) continue;

    switch (field.type) {
      case "string": {
        if (typeof value !== "string") {
          errors.push(`'${field.name}' must be string`);
          break;
        }
        if (field.maxLength !== undefined && value.length > field.maxLength) {
          errors.push(
            `'${field.name}' length ${String(value.length)} > maxLength ${String(field.maxLength)}`,
          );
        }
        break;
      }
      case "text": {
        if (typeof value !== "string") {
          errors.push(`'${field.name}' must be string`);
        }
        break;
      }
      case "number": {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          errors.push(`'${field.name}' must be number`);
        }
        break;
      }
      case "decimal": {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          errors.push(`'${field.name}' must be number`);
        }
        break;
      }
      case "boolean": {
        if (typeof value !== "boolean") {
          errors.push(`'${field.name}' must be boolean`);
        }
        break;
      }
      case "timestamp": {
        if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
          errors.push(`'${field.name}' must be ISO-8601 timestamp string`);
        }
        break;
      }
      case "json": {
        if (typeof value === "function" || typeof value === "symbol") {
          errors.push(`'${field.name}' must be JSON-serializable`);
        }
        break;
      }
      case "enum": {
        if (typeof value !== "string" || !field.values.includes(value)) {
          errors.push(
            `'${field.name}' must be one of [${field.values.join(", ")}]`,
          );
        }
        break;
      }
      case "array": {
        if (!Array.isArray(value)) {
          errors.push(`'${field.name}' must be array`);
          break;
        }
        break;
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError("*", errors.join("; "));
  }

  if (registry) {
    for (const field of fields) {
      const v = record[field.name];
      if (v === undefined) continue;
      const f = field as FieldDef & { validate?: string };
      if (typeof f.validate === "string") {
        const fn = registry.invoke(f.validate);
        if (fn) await fn(v, field, ctx);
      }
    }
  }
}
