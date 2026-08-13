import { type NextFunction, type Request, type Response } from "express";
import { type LogoutUserDeps, logoutUser } from "../../../application/commands/logout-user";
import { RefreshRequestSchema } from "../schemas/refresh.schema";

export function makeLogoutController(
  deps: LogoutUserDeps,
): (_req: Request, _res: Response, _next: NextFunction) => Promise<void> {
  return async function logoutController(req, res, next) {
    const parsed = RefreshRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    try {
      await logoutUser(
        { refreshToken: parsed.data.refresh_token },
        {
          refreshTokenRepository: deps.refreshTokenRepository,
          tokenService: deps.tokenService,
        },
      );
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}