import { isArrayInnerType, isFieldType, type ArrayInnerType } from "./field-type";

export type BaseFieldDef = {
  readonly name: string;
  readonly required: boolean;
};

export type StringFieldDef = BaseFieldDef & {
  readonly type: "string";
  readonly maxLength?: number;
};

export type TextFieldDef = BaseFieldDef & {
  readonly type: "text";
};

export type NumberFieldDef = BaseFieldDef & {
  readonly type: "number";
};

export type DecimalFieldDef = BaseFieldDef & {
  readonly type: "decimal";
  readonly precision?: number;
  readonly scale?: number;
};

export type BooleanFieldDef = BaseFieldDef & {
  readonly type: "boolean";
};

export type TimestampFieldDef = BaseFieldDef & {
  readonly type: "timestamp";
};

export type JsonFieldDef = BaseFieldDef & {
  readonly type: "json";
};

export type EnumFieldDef = BaseFieldDef & {
  readonly type: "enum";
  readonly values: readonly string[];
  readonly maxLength?: number;
};

export type ArrayFieldDef = BaseFieldDef & {
  readonly type: "array";
  readonly items: { readonly type: ArrayInnerType };
};

export type FieldDef =
  | StringFieldDef
  | TextFieldDef
  | NumberFieldDef
  | DecimalFieldDef
  | BooleanFieldDef
  | TimestampFieldDef
  | JsonFieldDef
  | EnumFieldDef
  | ArrayFieldDef;

export const MAX_FIELD_NAME_LENGTH = 64;
const FIELD_NAME_RE = /^[a-z][a-z0-9_]*$/;

export class InvalidFieldDefError extends Error {
  constructor(message: string) {
    super(`Invalid field definition: ${message}`);
    this.name = "InvalidFieldDefError";
  }
}

export function validateFieldDef(def: unknown): FieldDef {
  if (def === null || typeof def !== "object") {
    throw new InvalidFieldDefError("not an object");
  }
  const obj = def as Record<string, unknown>;

  const name = obj.name;
  if (typeof name !== "string" || name.length === 0) {
    throw new InvalidFieldDefError("name must be non-empty string");
  }
  if (name.length > MAX_FIELD_NAME_LENGTH) {
    throw new InvalidFieldDefError(`name exceeds ${String(MAX_FIELD_NAME_LENGTH)} chars`);
  }
  if (!FIELD_NAME_RE.test(name)) {
    throw new InvalidFieldDefError(
      "name must match /^[a-z][a-z0-9_]*$/ (lowercase, digits, underscore)",
    );
  }

  const type = obj.type;
  if (!isFieldType(type)) {
    throw new InvalidFieldDefError(`unknown type: ${String(type)}`);
  }

  const required = obj.required;
  if (typeof required !== "boolean") {
    throw new InvalidFieldDefError("required must be boolean");
  }

  switch (type) {
    case "string": {
      const maxLength = obj.maxLength;
      if (
        maxLength !== undefined &&
        (typeof maxLength !== "number" || !Number.isInteger(maxLength) || maxLength <= 0)
      ) {
        throw new InvalidFieldDefError("string.maxLength must be positive integer");
      }
      return {
        name,
        type: "string",
        required,
        ...(maxLength !== undefined ? { maxLength } : {}),
      };
    }
    case "text":
      return { name, type: "text", required };
    case "number":
      return { name, type: "number", required };
    case "decimal": {
      const precision = obj.precision;
      const scale = obj.scale;
      if (
        precision !== undefined &&
        (typeof precision !== "number" || !Number.isInteger(precision) || precision <= 0)
      ) {
        throw new InvalidFieldDefError("decimal.precision must be positive integer");
      }
      if (
        scale !== undefined &&
        (typeof scale !== "number" || !Number.isInteger(scale) || scale < 0)
      ) {
        throw new InvalidFieldDefError("decimal.scale must be non-negative integer");
      }
      if (precision !== undefined && scale !== undefined && scale > precision) {
        throw new InvalidFieldDefError("decimal.scale must be <= precision");
      }
      return {
        name,
        type: "decimal",
        required,
        ...(precision !== undefined ? { precision } : {}),
        ...(scale !== undefined ? { scale } : {}),
      };
    }
    case "boolean":
      return { name, type: "boolean", required };
    case "timestamp":
      return { name, type: "timestamp", required };
    case "json":
      return { name, type: "json", required };
    case "enum": {
      const values = obj.values;
      if (!Array.isArray(values) || values.length === 0) {
        throw new InvalidFieldDefError("enum.values must be non-empty array");
      }
      const stringValues: string[] = [];
      for (const v of values) {
        if (typeof v !== "string" || v.length === 0) {
          throw new InvalidFieldDefError("enum.values must contain non-empty strings");
        }
        stringValues.push(v);
      }
      const maxLength = obj.maxLength;
      if (
        maxLength !== undefined &&
        (typeof maxLength !== "number" || !Number.isInteger(maxLength) || maxLength <= 0)
      ) {
        throw new InvalidFieldDefError("enum.maxLength must be positive integer");
      }
      return {
        name,
        type: "enum",
        required,
        values: stringValues,
        ...(maxLength !== undefined ? { maxLength } : {}),
      };
    }
    case "array": {
      const itemsRaw = obj.items;
      if (itemsRaw === null || typeof itemsRaw !== "object") {
        throw new InvalidFieldDefError("array.items must be an object");
      }
      const itemsObj = itemsRaw as Record<string, unknown>;
      const itemsType = itemsObj.type;
      if (!isArrayInnerType(itemsType)) {
        throw new InvalidFieldDefError(
          `array.items.type must be one of [string,text,number,decimal,boolean,timestamp,json]`,
        );
      }
      return {
        name,
        type: "array",
        required,
        items: { type: itemsType },
      };
    }
  }
}

export function validateFieldDefs(defs: unknown): readonly FieldDef[] {
  if (!Array.isArray(defs) || defs.length === 0) {
    throw new InvalidFieldDefError("fields must be non-empty array");
  }
  const validated: FieldDef[] = [];
  const seen = new Set<string>();
  for (const raw of defs) {
    const fd = validateFieldDef(raw);
    if (seen.has(fd.name)) {
      throw new InvalidFieldDefError(`duplicate field name: ${fd.name}`);
    }
    seen.add(fd.name);
    validated.push(fd);
  }
  return validated;
}
