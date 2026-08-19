import { type NextFunction, type Request, type Response } from "express";
import { HttpError } from "../../shared/errors";
import type { AuthRuntime } from "./auth.runtime";

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string };
  }
}

export function createAuthMiddleware(auth: AuthRuntime) {
  return {
    authenticate: async (
      req: Request,
      _res: Response,
      next: NextFunction,
    ): Promise<void> => {
      const header = req.header("authorization");
      if (!header || !header.toLowerCase().startsWith("bearer ")) {
        throw new HttpError(401, "invalid_token");
      }
      const token = header.slice("bearer ".length).trim();
      if (token.length === 0) {
        throw new HttpError(401, "invalid_token");
      }
      try {
        const user = await auth.authenticateAccessToken(token);
        req.user = { id: user.id };
        next();
      } catch {
        throw new HttpError(401, "invalid_token");
      }
    },
  };
}