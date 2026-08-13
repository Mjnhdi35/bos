import { describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "../../../../src/modules/identity/application/queries/get-current-user";
import { UserNotFoundError } from "../../../../src/modules/identity/domain/errors/auth-errors";
import { type UserRepository } from "../../../../src/modules/identity/domain/repositories/user-repository";
import { Email } from "../../../../src/modules/identity/domain/value-objects/email";
import { toPasswordHash } from "../../../../src/modules/identity/domain/value-objects/password-hash";
import { toUserId } from "../../../../src/modules/identity/domain/value-objects/user-id";

const fixedDate = new Date("2026-01-01T00:00:00.000Z");
const userId = toUserId("123e4567-e89b-12d3-a456-426614174000");

describe("getCurrentUser", () => {
  it("returns a current user view when user exists", async () => {
    const userRepository: UserRepository = {
      findById: vi.fn().mockResolvedValue({
        id: userId,
        email: Email.create("alice@example.com"),
        passwordHash: toPasswordHash("$2b$12$hash"),
        role: "user" as const,
        createdAt: fixedDate,
        updatedAt: fixedDate,
      }),
      findByEmail: vi.fn(),
      create: vi.fn(),
    };

    const view = await getCurrentUser(userId, { userRepository });

    expect(view).toEqual({
      id: userId,
      email: "alice@example.com",
      role: "user",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("throws UserNotFoundError when user does not exist", async () => {
    const userRepository: UserRepository = {
      findById: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn(),
      create: vi.fn(),
    };

    await expect(getCurrentUser(userId, { userRepository })).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });
});