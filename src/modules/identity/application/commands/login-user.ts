import { InvalidCredentialsError } from "../../domain/errors/auth-errors";
import { type PasswordHasher } from "../../domain/password-hasher";
import { type RefreshTokenRepository } from "../../domain/repositories/refresh-token-repository";
import { type UserRepository } from "../../domain/repositories/user-repository";
import { type TokenService } from "../../domain/token-service";
import { Email } from "../../domain/value-objects/email";

export type LoginUserInput = {
  readonly email: string;
  readonly password: string;
};

export type LoginUserOutput = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: "Bearer";
  readonly expiresIn: number;
};

export type LoginUserDeps = {
  readonly userRepository: UserRepository;
  readonly passwordHasher: PasswordHasher;
  readonly tokenService: TokenService;
  readonly refreshTokenRepository: RefreshTokenRepository;
  readonly clock: () => Date;
};

export async function loginUser(
  input: LoginUserInput,
  deps: LoginUserDeps,
): Promise<LoginUserOutput> {
  let email: Email;
  try {
    email = Email.create(input.email);
  } catch {
    throw new InvalidCredentialsError();
  }

  const user = await deps.userRepository.findByEmail(email);
  if (!user) {
    throw new InvalidCredentialsError();
  }

  const passwordOk = await deps.passwordHasher.verify(
    input.password,
    user.passwordHash,
  );
  if (!passwordOk) {
    throw new InvalidCredentialsError();
  }

  const access = await deps.tokenService.issueAccessToken(user.id);
  const refresh = deps.tokenService.generateRefreshToken();
  await deps.refreshTokenRepository.create({
    userId: user.id,
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
