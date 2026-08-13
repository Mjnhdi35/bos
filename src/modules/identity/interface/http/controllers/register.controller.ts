import { type NextFunction, type Request, type Response } from "express";
import { registerUser } from "../../../application/commands/register-user";
import { EmailAlreadyTakenError } from "../../../domain/errors/auth-errors";
import { type PasswordHasher } from "../../../domain/password-hasher";
import { type RefreshTokenRepository } from "../../../domain/repositories/refresh-token-repository";
import { type UserRepository } from "../../../domain/repositories/user-repository";
import { type TokenService } from "../../../domain/token-service";
import {
  type RegisterRequestDto,
  type TokenPairDto,
  RegisterRequestSchema,
} from "../schemas/register.schema";

export type RegisterControllerDeps = {
  readonly userRepository: UserRepository;
  readonly passwordHasher: PasswordHasher;
  readonly tokenService: TokenService;
  readonly refreshTokenRepository: RefreshTokenRepository;
};

export function makeRegisterController(
  deps: RegisterControllerDeps,
): (_req: Request, _res: Response, _next: NextFunction) => Promise<void> {
  return async function registerController(req, res, next) {
    const parsed = RegisterRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    try {
      const body: RegisterRequestDto = parsed.data;
      const result = await registerUser(
        { email: body.email, password: body.password },
        {
          userRepository: deps.userRepository,
          passwordHasher: deps.passwordHasher,
          tokenService: deps.tokenService,
          refreshTokenRepository: deps.refreshTokenRepository,
          clock: () => new Date(),
        },
      );
      const dto: TokenPairDto = {
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        token_type: "Bearer",
        expires_in: result.expiresIn,
      };
      res.status(201).json(dto);
    } catch (err) {
      if (err instanceof EmailAlreadyTakenError) {
        res.status(409).json({ error: "email_taken" });
        return;
      }
      next(err);
    }
  };
}
