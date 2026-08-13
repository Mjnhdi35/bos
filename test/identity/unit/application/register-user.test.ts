import { describe, expect, it, vi } from "vitest";
import { registerUser } from "../../../../src/modules/identity/application/commands/register-user";
import { EmailAlreadyTakenError } from "../../../../src/modules/identity/domain/errors/auth-errors";
import { type PasswordHasher } from "../../../../src/modules/identity/domain/password-hasher";
import { type RefreshTokenRepository } from "../../../../src/modules/identity/domain/repositories/refresh-token-repository";
import { type UserRepository } from "../../../../src/modules/identity/domain/repositories/user-repository";
import { type TokenService } from "../../../../src/modules/identity/domain/token-service";
import { Email } from "../../../../src/modules/identity/domain/value-objects/email";
import { toPasswordHash } from "../../../../src/modules/identity/domain/value-objects/password-hash";
import { toUserId } from "../../../../src/modules/identity/domain/value-objects/user-id";

function makeDeps(overrides: {
  userRepository?: Partial<UserRepository>;
  passwordHasher?: Partial<PasswordHasher>;
  tokenService?: Partial<TokenService>;
  refreshTokenRepository?: Partial<RefreshTokenRepository>;
  clock?: () => Date;
  refreshTokenTtl?: () => Date;
} = {}) {
  const fixedDate = new Date("2026-01-01T00:00:00.000Z");
  const userId = toUserId("123e4567-e89b-12d3-a456-426614174000");

  const userRepository: UserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({
      id: userId,
      email: Email.create("alice@example.com"),
      passwordHash: toPasswordHash("$2b$12$abcdefghijklmnopqrstuv"),
      role: "user",
      createdAt: fixedDate,
      updatedAt: fixedDate,
    }),
    ...overrides.userRepository,
  };

  const passwordHasher: PasswordHasher = {
    hash: vi.fn().mockResolvedValue(toPasswordHash("$2b$12$abcdefghijklmnopqrstuv")),
    verify: vi.fn(),
    ...overrides.passwordHasher,
  };

  const tokenService: TokenService = {
    issueAccessToken: vi.fn().mockResolvedValue({
      token: "access.token.value" as never,
      expiresAt: new Date("2026-01-01T00:15:00.000Z"),
    }),
    verifyAccessToken: vi.fn(),
    generateRefreshToken: vi.fn().mockReturnValue({
      token: "refresh.token.value" as never,
      hash: "refreshHash123",
      expiresAt: new Date("2026-01-31T00:00:00.000Z"),
    }),
    hashRefreshToken: vi.fn().mockImplementation((token: string) => `hash:${token}` as never),
    ...overrides.tokenService,
  };

  const refreshTokenRepository: RefreshTokenRepository = {
    create: vi.fn().mockResolvedValue(undefined),
    findByTokenHash: vi.fn(),
    revokeByTokenHash: vi.fn(),
    deleteByTokenHash: vi.fn(),
    revokeAllForUser: vi.fn(),
    ...overrides.refreshTokenRepository,
  };

  const clock = overrides.clock ?? (() => fixedDate);

  return {
    userRepository,
    passwordHasher,
    tokenService,
    refreshTokenRepository,
    clock,
  };
}

describe("registerUser", () => {
  it("returns access + refresh token pair on success", async () => {
    const deps = makeDeps();
    const result = await registerUser(
      { email: "alice@example.com", password: "correcthorse" },
      deps,
    );

    expect(result.accessToken).toBe("access.token.value");
    expect(result.refreshToken).toBe("refresh.token.value");
    expect(result.tokenType).toBe("Bearer");
    expect(result.expiresIn).toBe(900);
  });

  it("hashes the password before persisting", async () => {
    const hashMock = vi.fn().mockResolvedValue(toPasswordHash("$2b$hashed"));
    const createUserMock = vi.fn().mockResolvedValue({
      id: toUserId("123e4567-e89b-12d3-a456-426614174000"),
      email: Email.create("alice@example.com"),
      passwordHash: toPasswordHash("$2b$hashed"),
      role: "user",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const deps = makeDeps({
      passwordHasher: { hash: hashMock },
      userRepository: { create: createUserMock },
    });

    await registerUser(
      { email: "alice@example.com", password: "correcthorse" },
      deps,
    );

    expect(hashMock).toHaveBeenCalledWith("correcthorse");
    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: toPasswordHash("$2b$hashed"),
      }),
    );
  });

  it("throws EmailAlreadyTakenError when email is taken", async () => {
    const existingUser = {
      id: toUserId("123e4567-e89b-12d3-a456-426614174000"),
      email: Email.create("alice@example.com"),
      passwordHash: toPasswordHash("$2b$12$existing"),
      role: "user" as const,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const deps = makeDeps({
      userRepository: { findByEmail: vi.fn().mockResolvedValue(existingUser) },
    });

    await expect(
      registerUser(
        { email: "alice@example.com", password: "correcthorse" },
        deps,
      ),
    ).rejects.toBeInstanceOf(EmailAlreadyTakenError);
  });

  it("propagates InvalidEmailError for malformed email", async () => {
    const deps = makeDeps();
    await expect(
      registerUser({ email: "not-an-email", password: "correcthorse" }, deps),
    ).rejects.toThrow();
  });

  it("does not issue tokens when user creation fails", async () => {
    const issueAccessToken = vi.fn();
    const generateRefreshToken = vi.fn();
    const createRefreshToken = vi.fn();

    const deps = makeDeps({
      userRepository: {
        create: vi.fn().mockRejectedValue(new Error("db fail")),
      },
      tokenService: {
        issueAccessToken,
        generateRefreshToken,
      },
      refreshTokenRepository: {
        create: createRefreshToken,
      },
    });

    await expect(
      registerUser(
        { email: "alice@example.com", password: "correcthorse" },
        deps,
      ),
    ).rejects.toThrow("db fail");

    expect(issueAccessToken).not.toHaveBeenCalled();
    expect(generateRefreshToken).not.toHaveBeenCalled();
    expect(createRefreshToken).not.toHaveBeenCalled();
  });

  it("saves refresh token after issue", async () => {
    const createRefresh = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({
      refreshTokenRepository: { create: createRefresh },
    });

    await registerUser(
      { email: "alice@example.com", password: "correcthorse" },
      deps,
    );

    expect(createRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: "refreshHash123",
      }),
    );
  });
});
