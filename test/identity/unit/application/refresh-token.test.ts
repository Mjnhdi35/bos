import { describe, expect, it, vi } from "vitest";
import { refreshAccessToken } from "../../../../src/modules/identity/application/commands/refresh-token";
import { TokenInvalidError, TokenReusedError } from "../../../../src/modules/identity/domain/errors/auth-errors";
import { type RefreshTokenRepository } from "../../../../src/modules/identity/domain/repositories/refresh-token-repository";
import { type TokenService } from "../../../../src/modules/identity/domain/token-service";
import { toUserId } from "../../../../src/modules/identity/domain/value-objects/user-id";

const USER_ID = toUserId("123e4567-e89b-12d3-a456-426614174000");
const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");
const VALID_HASH = "hash:refreshtoken" as never;

function makeDeps(overrides: {
  refreshTokenRepository?: Partial<RefreshTokenRepository>;
  tokenService?: Partial<TokenService>;
  clock?: () => Date;
} = {}) {
  const refreshTokenRepository: RefreshTokenRepository = {
    create: vi.fn().mockResolvedValue(undefined),
    findByTokenHash: vi.fn().mockResolvedValue({
      id: "rt-1",
      userId: USER_ID,
      tokenHash: VALID_HASH,
      expiresAt: new Date("2026-02-01T00:00:00.000Z"),
      createdAt: FIXED_DATE,
      revokedAt: null,
    }),
    revokeByTokenHash: vi.fn().mockResolvedValue(1),
    deleteByTokenHash: vi.fn().mockResolvedValue(1),
    revokeAllForUser: vi.fn().mockResolvedValue(1),
    ...overrides.refreshTokenRepository,
  };

  const tokenService: TokenService = {
    issueAccessToken: vi.fn().mockResolvedValue({
      token: "new.access.token" as never,
      expiresAt: new Date("2026-01-01T00:15:00.000Z"),
    }),
    verifyAccessToken: vi.fn(),
    generateRefreshToken: vi.fn().mockReturnValue({
      token: "new.refresh.token" as never,
      hash: "newRefreshHash",
      expiresAt: new Date("2026-02-01T00:00:00.000Z"),
    }),
    hashRefreshToken: vi.fn().mockReturnValue(VALID_HASH),
    ...overrides.tokenService,
  };

  const clock = overrides.clock ?? (() => FIXED_DATE);

  return { refreshTokenRepository, tokenService, clock, userId: USER_ID };
}

describe("refreshAccessToken", () => {
  it("returns new token pair and revokes old token on success", async () => {
    const deps = makeDeps();

    const result = await refreshAccessToken(
      { refreshToken: "refreshtoken" },
      deps,
    );

    expect(result.accessToken).toBe("new.access.token");
    expect(result.refreshToken).toBe("new.refresh.token");
    expect(result.tokenType).toBe("Bearer");
    expect(result.expiresIn).toBe(900);
    expect(deps.refreshTokenRepository.revokeByTokenHash).toHaveBeenCalled();
    expect(deps.refreshTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID }),
    );
  });

  it("throws TokenInvalidError when refresh token is unknown", async () => {
    const deps = makeDeps({
      refreshTokenRepository: { findByTokenHash: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      refreshAccessToken({ refreshToken: "ghost" }, deps),
    ).rejects.toBeInstanceOf(TokenInvalidError);
  });

  it("throws TokenReusedError and revokes all user tokens when refresh token is already revoked", async () => {
    const deps = makeDeps({
      refreshTokenRepository: {
        findByTokenHash: vi.fn().mockResolvedValue({
          id: "rt-1",
          userId: USER_ID,
          tokenHash: "hash:stolen",
          expiresAt: new Date("2026-02-01T00:00:00.000Z"),
          createdAt: FIXED_DATE,
          revokedAt: new Date("2026-01-15T00:00:00.000Z"),
        }),
      },
    });

    await expect(
      refreshAccessToken({ refreshToken: "stolen" }, deps),
    ).rejects.toBeInstanceOf(TokenReusedError);

    expect(deps.refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(USER_ID);
  });

  it("throws TokenInvalidError when refresh token is expired", async () => {
    const deps = makeDeps({
      refreshTokenRepository: {
        findByTokenHash: vi.fn().mockResolvedValue({
          id: "rt-1",
          userId: USER_ID,
          tokenHash: "hash:expired",
          expiresAt: new Date("2020-01-01T00:00:00.000Z"),
          createdAt: new Date("2019-12-01T00:00:00.000Z"),
          revokedAt: null,
        }),
      },
    });

    await expect(
      refreshAccessToken({ refreshToken: "expired" }, deps),
    ).rejects.toBeInstanceOf(TokenInvalidError);
  });

  it("does not issue tokens when refresh token is reused", async () => {
    const issueAccessToken = vi.fn();
    const generateRefreshToken = vi.fn();
    const createRefresh = vi.fn();

    const deps = makeDeps({
      refreshTokenRepository: {
        findByTokenHash: vi.fn().mockResolvedValue({
          id: "rt-1",
          userId: USER_ID,
          tokenHash: "hash:stolen",
          expiresAt: new Date("2026-02-01T00:00:00.000Z"),
          createdAt: FIXED_DATE,
          revokedAt: new Date("2026-01-15T00:00:00.000Z"),
        }),
        revokeAllForUser: vi.fn(),
        revokeByTokenHash: vi.fn(),
        create: createRefresh,
      },
      tokenService: {
        issueAccessToken,
        generateRefreshToken,
      },
    });

    await expect(
      refreshAccessToken({ refreshToken: "stolen" }, deps),
    ).rejects.toBeInstanceOf(TokenReusedError);

    expect(issueAccessToken).not.toHaveBeenCalled();
    expect(generateRefreshToken).not.toHaveBeenCalled();
    expect(createRefresh).not.toHaveBeenCalled();
  });
});