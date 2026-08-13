import { type NextFunction, type Request, type Response } from "express";
import {
  type GetCurrentUserDeps,
  getCurrentUser,
} from "../../../application/queries/get-current-user";
import { UserNotFoundError } from "../../../domain/errors/auth-errors";

export type MeControllerDeps = Pick<GetCurrentUserDeps, "userRepository">;

export function makeMeController(
  deps: MeControllerDeps,
): (_req: Request, _res: Response, _next: NextFunction) => Promise<void> {
  return async function meController(req, res, next) {
    if (!req.user) {
      res.status(401).json({ error: "invalid_token" });
      return;
    }
    try {
      const view = await getCurrentUser(req.user.id, {
        userRepository: deps.userRepository,
      });
      res.status(200).json(view);
    } catch (err) {
      if (err instanceof UserNotFoundError) {
        res.status(401).json({ error: "invalid_token" });
        return;
      }
      next(err);
    }
  };
}