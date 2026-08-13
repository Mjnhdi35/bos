import { describe, expect, it } from "vitest";
import { Email, InvalidEmailError } from "../../../../../src/modules/identity/domain/value-objects/email";

describe("Email", () => {
  describe("create", () => {
    it("accepts a valid email and normalizes it", () => {
      const email = Email.create("  Alice@Example.COM  ");
      expect(email.value).toBe("alice@example.com");
    });

    it("rejects empty string", () => {
      expect(() => Email.create("")).toThrow(InvalidEmailError);
    });

    it("rejects whitespace-only string", () => {
      expect(() => Email.create("   ")).toThrow(InvalidEmailError);
    });

    it("rejects string without @", () => {
      expect(() => Email.create("not-an-email")).toThrow(InvalidEmailError);
    });

    it("rejects string without domain", () => {
      expect(() => Email.create("alice@")).toThrow(InvalidEmailError);
    });

    it("rejects string longer than 255 chars", () => {
      const long = `${"a".repeat(250)}@x.ioo`;
      expect(() => Email.create(long)).toThrow(InvalidEmailError);
    });
  });

  describe("equals", () => {
    it("returns true for same value", () => {
      expect(Email.create("alice@example.com").equals(Email.create("alice@example.com"))).toBe(true);
    });

    it("returns true for same value with different casing", () => {
      expect(Email.create("alice@example.com").equals(Email.create("ALICE@EXAMPLE.COM"))).toBe(true);
    });

    it("returns false for different values", () => {
      expect(Email.create("alice@example.com").equals(Email.create("bob@example.com"))).toBe(false);
    });
  });
});
