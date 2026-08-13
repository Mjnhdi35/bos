import { EmailAlreadyTakenError } from "../../domain/errors/auth-errors";
import { type PasswordHasher } from "../../domain/password-hasher";
import { type RefreshTokenRepository } from "../../domain/repositories/refresh-token-repository";
import { type UserRepository } from "../../domain/repositories/user-repository";
import { type TokenService } from "../../domain/token-service";
import { Email, InvalidEmailError } from "../../domain/value-objects/email";

export type RegisterUserInput = {
  readonly email: string;
  readonly password: string;
};

export type RegisterUserOutput = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: "Bearer";
  readonly expiresIn: number;
};

export type RegisterUserDeps = {
  readonly userRepository: UserRepository;
  readonly passwordHasher: PasswordHasher;
  readonly tokenService: TokenService;
  readonly refreshTokenRepository: RefreshTokenRepository;
  readonly clock: () => Date;
};

export async function registerUser(
  input: RegisterUserInput,
  deps: RegisterUserDeps,
): Promise<RegisterUserOutput> {
  const email = Email.create(input.email);

  const existing = await deps.userRepository.findByEmail(email);
  if (existing) {
    throw new EmailAlreadyTakenError(email.value);
  }

  const passwordHash = await deps.passwordHasher.hash(input.password);
  const user = await deps.userRepository.create({
    email,
    passwordHash,
  });

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

export { InvalidEmailError };
