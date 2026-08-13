import { describe, expect, it } from "vitest";
import { User } from "../../../../../src/modules/identity/domain/entities/user";
import { Email } from "../../../../../src/modules/identity/domain/value-objects/email";
import { toPasswordHash } from "../../../../../src/modules/identity/domain/value-objects/password-hash";
import { toUserId } from "../../../../../src/modules/identity/domain/value-objects/user-id";

function makeUser() {
  return User.rehydrate({
    id: toUserId("123e4567-e89b-12d3-a456-426614174000"),
    email: Email.create("alice@example.com"),
    passwordHash: toPasswordHash("$2b$12$abcdefghijklmnopqrstuv"),
    role: "user",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  });
}

describe("User", () => {
  it("rehydrates with all props", () => {
    const user = makeUser();
    expect(user.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(user.email.value).toBe("alice@example.com");
    expect(user.passwordHash).toBe("$2b$12$abcdefghijklmnopqrstuv");
    expect(user.role).toBe("user");
    expect(user.createdAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(user.updatedAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("exposes immutable getters", () => {
    const user = makeUser();
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.passwordHash).toBeDefined();
  });
});
