import { describe, expect, it } from "vitest";
import { InvalidUserIdError, toUserId } from "../../../../../src/modules/identity/domain/value-objects/user-id";

describe("toUserId", () => {
  it("accepts a valid UUID", () => {
    const id = toUserId("123e4567-e89b-12d3-a456-426614174000");
    expect(id).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("accepts a valid UUID with uppercase", () => {
    const id = toUserId("123E4567-E89B-12D3-A456-426614174000");
    expect(id.toLowerCase()).toBe("123e4567-e89b-12d3-a456-426614174000");
  });

  it("rejects non-UUID strings", () => {
    expect(() => toUserId("not-a-uuid")).toThrow(InvalidUserIdError);
  });

  it("rejects empty string", () => {
    expect(() => toUserId("")).toThrow(InvalidUserIdError);
  });
});
