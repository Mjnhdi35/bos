import {
  TokenInvalidError,
  TokenReusedError,
} from "../../domain/errors/auth-errors";
import { type RefreshTokenRepository } from "../../domain/repositories/refresh-token-repository";
import { type TokenService } from "../../domain/token-service";

export type RefreshTokenInput = {
  readonly refreshToken: string;
};

export type RefreshTokenOutput = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: "Bearer";
  readonly expiresIn: number;
};

export type RefreshTokenDeps = {
  readonly refreshTokenRepository: RefreshTokenRepository;
  readonly tokenService: TokenService;
  readonly clock: () => Date;
};

export async function refreshAccessToken(
  input: RefreshTokenInput,
  deps: RefreshTokenDeps,
): Promise<RefreshTokenOutput> {
  const tokenHash = deps.tokenService.hashRefreshToken(
    input.refreshToken as never,
  );
  const record = await deps.refreshTokenRepository.findByTokenHash(tokenHash);
  if (!record) {
    throw new TokenInvalidError();
  }
  if (record.revokedAt !== null) {
    await deps.refreshTokenRepository.revokeAllForUser(record.userId);
    throw new TokenReusedError();
  }
  if (record.expiresAt.getTime() <= deps.clock().getTime()) {
    throw new TokenInvalidError();
  }

  await deps.refreshTokenRepository.revokeByTokenHash(tokenHash);

  const access = await deps.tokenService.issueAccessToken(record.userId);
  const refresh = deps.tokenService.generateRefreshToken();
  await deps.refreshTokenRepository.create({
    userId: record.userId,
    tokenHash: refresh.hash,
    expiresAt: refresh.expiresAt,
  });

  const now = deps.clock().getTime();
  const expiresInSeconds = Math.max(
    1,
    Math.floor((access.expiresAt.getTime() - now) / 1000),
  );

  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    tokenType: "Bearer",
    expiresIn: expiresInSeconds,
  };
}
