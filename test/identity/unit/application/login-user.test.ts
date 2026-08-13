import { describe, expect, it, vi } from "vitest";
import { loginUser } from "../../../../src/modules/identity/application/commands/login-user";
import { InvalidCredentialsError } from "../../../../src/modules/identity/domain/errors/auth-errors";
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
} = {}) {
  const fixedDate = new Date("2026-01-01T00:00:00.000Z");
  const userId = toUserId("123e4567-e89b-12d3-a456-426614174000");

  const user = {
    id: userId,
    email: Email.create("alice@example.com"),
    passwordHash: toPasswordHash("$2b$12$abcdefghijklmnopqrstuv"),
    role: "user" as const,
    createdAt: fixedDate,
    updatedAt: fixedDate,
  };

  const userRepository: UserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn().mockResolvedValue(user),
    create: vi.fn(),
    ...overrides.userRepository,
  };

  const passwordHasher: PasswordHasher = {
    hash: vi.fn(),
    verify: vi.fn().mockResolvedValue(true),
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
    user,
  };
}

describe("loginUser", () => {
  it("returns access + refresh token pair on success", async () => {
    const deps = makeDeps();
    const result = await loginUser(
      { email: "alice@example.com", password: "correcthorse" },
      deps,
    );

    expect(result.accessToken).toBe("access.token.value");
    expect(result.refreshToken).toBe("refresh.token.value");
    expect(result.tokenType).toBe("Bearer");
    expect(result.expiresIn).toBe(900);
  });

  it("verifies the password against the stored hash", async () => {
    const verifyMock = vi.fn().mockResolvedValue(true);
    const deps = makeDeps({
      passwordHasher: { verify: verifyMock },
    });

    await loginUser(
      { email: "alice@example.com", password: "correcthorse" },
      deps,
    );

    expect(verifyMock).toHaveBeenCalledWith(
      "correcthorse",
      deps.user.passwordHash,
    );
  });

  it("throws InvalidCredentialsError when user is not found", async () => {
    const deps = makeDeps({
      userRepository: { findByEmail: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      loginUser(
        { email: "ghost@example.com", password: "correcthorse" },
        deps,
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("throws InvalidCredentialsError when password does not match", async () => {
    const deps = makeDeps({
      passwordHasher: { verify: vi.fn().mockResolvedValue(false) },
    });

    await expect(
      loginUser(
        { email: "alice@example.com", password: "wronghorse" },
        deps,
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("throws InvalidCredentialsError when email format is invalid", async () => {
    const deps = makeDeps();

    await expect(
      loginUser(
        { email: "not-an-email", password: "correcthorse" },
        deps,
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("does not issue tokens when password verification fails", async () => {
    const issueAccessToken = vi.fn();
    const generateRefreshToken = vi.fn();
    const createRefreshToken = vi.fn();

    const deps = makeDeps({
      passwordHasher: { verify: vi.fn().mockResolvedValue(false) },
      tokenService: {
        issueAccessToken,
        generateRefreshToken,
      },
      refreshTokenRepository: {
        create: createRefreshToken,
      },
    });

    await expect(
      loginUser(
        { email: "alice@example.com", password: "wronghorse" },
        deps,
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(issueAccessToken).not.toHaveBeenCalled();
    expect(generateRefreshToken).not.toHaveBeenCalled();
    expect(createRefreshToken).not.toHaveBeenCalled();
  });

  it("saves refresh token after successful verification", async () => {
    const createRefresh = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({
      refreshTokenRepository: { create: createRefresh },
    });

    await loginUser(
      { email: "alice@example.com", password: "correcthorse" },
      deps,
    );

    expect(createRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: "refreshHash123",
        userId: deps.user.id,
      }),
    );
  });
});