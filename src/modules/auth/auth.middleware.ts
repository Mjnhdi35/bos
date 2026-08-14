import { type NextFunction, type Request, type Response } from "express";
import { verifyAccessToken } from "../../shared/jwt";
import { HttpError } from "../../shared/errors";

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string };
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.header("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    throw new HttpError(401, "invalid_token");
  }
  const token = header.slice("bearer ".length).trim();
  if (token.length === 0) {
    throw new HttpError(401, "invalid_token");
  }
  const userId = await verifyAccessToken(token).catch(() => {
    throw new HttpError(401, "invalid_token");
  });
  req.user = { id: userId };
  next();
}