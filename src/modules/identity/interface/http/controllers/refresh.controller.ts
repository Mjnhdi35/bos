import { type NextFunction, type Request, type Response } from "express";
import {
  type RefreshTokenDeps,
  refreshAccessToken,
} from "../../../application/commands/refresh-token";
import {
  TokenInvalidError,
  TokenReusedError,
} from "../../../domain/errors/auth-errors";
import { RefreshRequestSchema } from "../schemas/refresh.schema";
import { type TokenPairDto } from "../schemas/register.schema";

export type RefreshControllerDeps = Pick<
  RefreshTokenDeps,
  "refreshTokenRepository" | "tokenService"
>;

export function makeRefreshController(
  deps: RefreshControllerDeps,
): (_req: Request, _res: Response, _next: NextFunction) => Promise<void> {
  return async function refreshController(req, res, next) {
    const parsed = RefreshRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    try {
      const result = await refreshAccessToken(
        { refreshToken: parsed.data.refresh_token },
        {
          refreshTokenRepository: deps.refreshTokenRepository,
          tokenService: deps.tokenService,
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
      if (err instanceof TokenInvalidError) {
        res.status(401).json({ error: "invalid_token" });
        return;
      }
      if (err instanceof TokenReusedError) {
        res.status(401).json({ error: "token_reused" });
        return;
      }
      next(err);
    }
  };
}