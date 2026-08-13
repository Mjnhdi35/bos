import { describe, expect, it, vi } from "vitest";
import { logoutUser } from "../../../../src/modules/identity/application/commands/logout-user";
import { type RefreshTokenRepository } from "../../../../src/modules/identity/domain/repositories/refresh-token-repository";
import { type TokenService } from "../../../../src/modules/identity/domain/token-service";

function makeDeps(overrides: {
  refreshTokenRepository?: Partial<RefreshTokenRepository>;
  tokenService?: Partial<TokenService>;
} = {}) {
  const refreshTokenRepository: RefreshTokenRepository = {
    create: vi.fn(),
    findByTokenHash: vi.fn(),
    revokeByTokenHash: vi.fn(),
    deleteByTokenHash: vi.fn().mockResolvedValue(1),
    revokeAllForUser: vi.fn(),
    ...overrides.refreshTokenRepository,
  };

  const tokenService: TokenService = {
    issueAccessToken: vi.fn(),
    verifyAccessToken: vi.fn(),
    generateRefreshToken: vi.fn(),
    hashRefreshToken: vi.fn().mockReturnValue("hashed-refresh"),
    ...overrides.tokenService,
  };

  return { refreshTokenRepository, tokenService };
}

describe("logoutUser", () => {
  it("hashes the refresh token before deleting", async () => {
    const hashMock = vi.fn().mockReturnValue("hashed-x");
    const deleteMock = vi.fn().mockResolvedValue(1);
    const deps = makeDeps({
      refreshTokenRepository: { deleteByTokenHash: deleteMock },
      tokenService: { hashRefreshToken: hashMock },
    });

    await logoutUser({ refreshToken: "plain-refresh" }, deps);

    expect(hashMock).toHaveBeenCalledWith("plain-refresh");
    expect(deleteMock).toHaveBeenCalledWith("hashed-x");
  });

  it("does not throw when refresh token does not exist", async () => {
    const deps = makeDeps({
      refreshTokenRepository: { deleteByTokenHash: vi.fn().mockResolvedValue(0) },
    });

    await expect(
      logoutUser({ refreshToken: "unknown" }, deps),
    ).resolves.toBeUndefined();
  });
});