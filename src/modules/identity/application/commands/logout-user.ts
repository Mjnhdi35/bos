import { type RefreshTokenRepository } from "../../domain/repositories/refresh-token-repository";
import { type TokenService } from "../../domain/token-service";

export type LogoutUserInput = {
  readonly refreshToken: string;
};

export type LogoutUserDeps = {
  readonly refreshTokenRepository: RefreshTokenRepository;
  readonly tokenService: TokenService;
};

export async function logoutUser(
  input: LogoutUserInput,
  deps: LogoutUserDeps,
): Promise<void> {
  const tokenHash = deps.tokenService.hashRefreshToken(
    input.refreshToken as never,
  );
  await deps.refreshTokenRepository.deleteByTokenHash(tokenHash);
}
