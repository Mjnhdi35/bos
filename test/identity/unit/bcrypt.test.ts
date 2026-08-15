import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../../src/shared/bcrypt";

describe("hashPassword", () => {
  it("hashes a valid password to a bcrypt hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$2[abxy]\$\d{2}\$/);
    expect(hash.length).toBe(60);
  });

  it("produces a different hash for the same input (salt)", async () => {
    const a = await hashPassword("password123");
    const b = await hashPassword("password123");
    expect(a).not.toBe(b);
  });

  it("rejects empty string with a specific error", async () => {
    await expect(hashPassword("")).rejects.toThrow(/must not be empty/);
  });

  it("rejects passwords longer than 72 bytes", async () => {
    const longPassword = "a".repeat(73);
    await expect(hashPassword(longPassword)).rejects.toThrow(/must not exceed 72 bytes/);
  });

  it("accepts a password at exactly 72 bytes", async () => {
    const exactPassword = "a".repeat(72);
    await expect(hashPassword(exactPassword)).resolves.toMatch(/^\$2[abxy]\$/);
  });

  it("counts UTF-8 byte length, not character length", async () => {
    // Each "\u20AC" (euro sign) is 3 bytes in UTF-8.
    // 25 euro signs = 75 bytes (over the limit) even though only 25 chars.
    const unicode25 = "\u20AC".repeat(25);
    await expect(hashPassword(unicode25)).rejects.toThrow(/must not exceed 72 bytes/);
  });

  it("accepts a 24-char UTF-8 password that fits within 72 bytes", async () => {
    // 24 euro signs = 72 bytes exactly.
    const exactUtf8 = "\u20AC".repeat(24);
    await expect(hashPassword(exactUtf8)).resolves.toMatch(/^\$2[abxy]\$/);
  });

  it("rejects non-string input with TypeError", async () => {
    await expect(hashPassword(null)).rejects.toThrow(TypeError);
    await expect(hashPassword(undefined as unknown as string)).rejects.toThrow(TypeError);
    await expect(hashPassword(123)).rejects.toThrow(TypeError);
    await expect(
      hashPassword({}),
    ).rejects.toThrow(TypeError);
  });
});

describe("verifyPassword", () => {
  const validPassword = "correct horse battery staple";

  it("returns true for matching password", async () => {
    const hash = await hashPassword(validPassword);
    expect(await verifyPassword(validPassword, hash)).toBe(true);
  });

  it("returns false for non-matching password", async () => {
    const hash = await hashPassword(validPassword);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("returns false for malformed hash (not bcrypt format)", async () => {
    expect(await verifyPassword(validPassword, "not-a-bcrypt-hash")).toBe(false);
    expect(await verifyPassword(validPassword, "$1$oldformat")).toBe(false);
    expect(
      await verifyPassword(validPassword, "plain-sha256-hash"),
    ).toBe(false);
  });

  it("returns false for empty hash without throwing", async () => {
    expect(await verifyPassword(validPassword, "")).toBe(false);
  });

  it("returns false for empty plain without throwing", async () => {
    const hash = await hashPassword(validPassword);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("returns false for non-string inputs without throwing", async () => {
    const hash = await hashPassword(validPassword);
    expect(await verifyPassword(null, hash)).toBe(false);
    expect(await verifyPassword(undefined as unknown as string, hash)).toBe(false);
    expect(
      await verifyPassword(validPassword, null),
    ).toBe(false);
    expect(await verifyPassword(123, hash)).toBe(false);
  });
});
