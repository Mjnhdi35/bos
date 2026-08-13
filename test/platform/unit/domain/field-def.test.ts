import { describe, expect, it } from "vitest";
import { validateFieldDef, validateFieldDefs } from "../../../../src/platform/domain/field-def";

describe("validateFieldDef", () => {
  it("accepts string with optional maxLength", () => {
    const fd = validateFieldDef({ name: "title", type: "string", required: true, maxLength: 200 });
    expect(fd.type).toBe("string");
    if (fd.type === "string") {
      expect(fd.maxLength).toBe(200);
    }
  });

  it("rejects unknown type", () => {
    expect(() =>
      validateFieldDef({ name: "x", type: "uuid", required: true }),
    ).toThrow();
  });

  it("rejects invalid name pattern", () => {
    expect(() =>
      validateFieldDef({ name: "Title", type: "string", required: true }),
    ).toThrow();
  });

  it("rejects decimal scale > precision", () => {
    expect(() =>
      validateFieldDef({
        name: "price",
        type: "decimal",
        required: true,
        precision: 4,
        scale: 6,
      }),
    ).toThrow();
  });

  it("accepts decimal with precision/scale", () => {
    const fd = validateFieldDef({
      name: "price",
      type: "decimal",
      required: true,
      precision: 18,
      scale: 4,
    });
    expect(fd.type).toBe("decimal");
  });

  it("accepts enum with values", () => {
    const fd = validateFieldDef({
      name: "status",
      type: "enum",
      required: true,
      values: ["draft", "active", "archived"],
    });
    expect(fd.type).toBe("enum");
    if (fd.type === "enum") {
      expect(fd.values).toEqual(["draft", "active", "archived"]);
    }
  });

  it("rejects enum with empty values", () => {
    expect(() =>
      validateFieldDef({
        name: "status",
        type: "enum",
        required: true,
        values: [],
      }),
    ).toThrow();
  });

  it("rejects enum with non-string values", () => {
    expect(() =>
      validateFieldDef({
        name: "status",
        type: "enum",
        required: true,
        values: ["draft", 42],
      }),
    ).toThrow();
  });

  it("accepts array with primitive inner type", () => {
    const fd = validateFieldDef({
      name: "tags",
      type: "array",
      required: true,
      items: { type: "string" },
    });
    expect(fd.type).toBe("array");
    if (fd.type === "array") {
      expect(fd.items.type).toBe("string");
    }
  });

  it("rejects array with missing items", () => {
    expect(() =>
      validateFieldDef({
        name: "tags",
        type: "array",
        required: true,
      }),
    ).toThrow();
  });

  it("rejects array with non-primitive inner type (enum)", () => {
    expect(() =>
      validateFieldDef({
        name: "tags",
        type: "array",
        required: true,
        items: { type: "enum" },
      }),
    ).toThrow();
  });

  it("rejects array with nested array items", () => {
    expect(() =>
      validateFieldDef({
        name: "tags",
        type: "array",
        required: true,
        items: { type: "array" },
      }),
    ).toThrow();
  });
});

describe("validateFieldDefs", () => {
  it("rejects non-array", () => {
    expect(() => validateFieldDefs("nope")).toThrow();
  });

  it("rejects empty array", () => {
    expect(() => validateFieldDefs([])).toThrow();
  });
});
