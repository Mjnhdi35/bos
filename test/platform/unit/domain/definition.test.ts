import { describe, expect, it } from "vitest";
import {
  InvalidDefinitionError,
  validateEntityDefinition,
} from "../../../../src/platform/domain/definition";
import { InvalidFieldDefError } from "../../../../src/platform/domain/field-def";

describe("validateEntityDefinition", () => {
  it("accepts valid definition", () => {
    const result = validateEntityDefinition({
      name: "products",
      version: 1,
      fields: [
        { name: "title", type: "string", required: true },
        { name: "price", type: "decimal", required: true, precision: 18, scale: 4 },
      ],
    });
    expect(result.name).toBe("products");
    expect(result.version).toBe(1);
    expect(result.fields).toHaveLength(2);
  });

  it("rejects non-object input", () => {
    expect(() => validateEntityDefinition("nope")).toThrow(InvalidDefinitionError);
  });

  it("rejects invalid name", () => {
    expect(() =>
      validateEntityDefinition({
        name: "Products",
        version: 1,
        fields: [{ name: "x", type: "string", required: true }],
      }),
    ).toThrow(InvalidDefinitionError);
  });

  it("rejects missing version", () => {
    expect(() =>
      validateEntityDefinition({
        name: "products",
        fields: [{ name: "x", type: "string", required: true }],
      }),
    ).toThrow(InvalidDefinitionError);
  });

  it("rejects empty fields", () => {
    expect(() =>
      validateEntityDefinition({
        name: "products",
        version: 1,
        fields: [],
      }),
    ).toThrow(InvalidFieldDefError);
  });

  it("rejects duplicate field names", () => {
    expect(() =>
      validateEntityDefinition({
        name: "products",
        version: 1,
        fields: [
          { name: "x", type: "string", required: true },
          { name: "x", type: "string", required: true },
        ],
      }),
    ).toThrow(InvalidFieldDefError);
  });
});
