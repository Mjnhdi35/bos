import { type NextFunction, type Request, type Response } from "express";
import { TokenService } from "../../../domain/token-service";
import { type UserId } from "../../../domain/value-objects/user-id";

export type AuthenticatedRequestUser = {
  readonly id: UserId;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedRequestUser;
  }
}

export type AuthenticateMiddlewareDeps = {
  readonly tokenService: TokenService;
};

export function makeAuthenticateMiddleware(
  deps: AuthenticateMiddlewareDeps,
): (_req: Request, _res: Response, _next: NextFunction) => Promise<void> {
  return async function authenticateMiddleware(req, res, next) {
    const header = req.header("authorization");
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
      res.status(401).json({ error: "invalid_token" });
      return;
    }
    const token = header.slice("bearer ".length).trim();
    if (token.length === 0) {
      res.status(401).json({ error: "invalid_token" });
      return;
    }
    try {
      const userId = await deps.tokenService.verifyAccessToken(
        token as never,
      );
      req.user = { id: userId };
      next();
    } catch {
      res.status(401).json({ error: "invalid_token" });
    }
  };
}