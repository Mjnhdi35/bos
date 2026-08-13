import { type NextFunction, type Request, type Response } from "express";
import { type LoginUserDeps, loginUser } from "../../../application/commands/login-user";
import { InvalidCredentialsError } from "../../../domain/errors/auth-errors";
import { LoginRequestSchema } from "../schemas/login.schema";
import { type TokenPairDto } from "../schemas/register.schema";

export type LoginControllerDeps = Pick<
  LoginUserDeps,
  "userRepository" | "passwordHasher" | "tokenService" | "refreshTokenRepository"
>;

export function makeLoginController(
  deps: LoginControllerDeps,
): (_req: Request, _res: Response, _next: NextFunction) => Promise<void> {
  return async function loginController(req, res, next) {
    const parsed = LoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    try {
      const result = await loginUser(
        { email: parsed.data.email, password: parsed.data.password },
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
      res.status(200).json(dto);
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        res.status(401).json({ error: "invalid_credentials" });
        return;
      }
      next(err);
    }
  };
}