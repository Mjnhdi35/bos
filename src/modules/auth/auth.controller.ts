import { type Request, type Response } from "express";
import { HttpError } from "../../shared/errors";
import { parseBody } from "../../shared/http";
import type { AuthRuntime } from "./auth.runtime";
import { LoginSchema, RegisterSchema } from "./auth.schema";
import {
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
  setRefreshTokenCookie,
} from "./auth.cookies";

export type AuthControllerDeps = {
  readonly auth: AuthRuntime;
};

export function createAuthController(deps: AuthControllerDeps) {
  return {
    registerHandler: async (req: Request, res: Response): Promise<void> => {
      const data = parseBody(RegisterSchema, req);
      const result = await deps.auth.register(data);
      setRefreshTokenCookie(res, result.refresh_token);
      res.status(201).json(result.tokenPair);
    },
    loginHandler: async (req: Request, res: Response): Promise<void> => {
      const data = parseBody(LoginSchema, req);
      const result = await deps.auth.login(data);
      setRefreshTokenCookie(res, result.refresh_token);
      res.status(200).json(result.tokenPair);
    },
    refreshHandler: async (req: Request, res: Response): Promise<void> => {
      const refreshToken = readRefreshTokenCookie(req);
      const result = await deps.auth.refresh(refreshToken);
      setRefreshTokenCookie(res, result.refresh_token);
      res.status(200).json(result.tokenPair);
    },
    logoutHandler: async (req: Request, res: Response): Promise<void> => {
      const refreshToken = readRefreshTokenCookie(req);
      await deps.auth.logout(refreshToken);
      clearRefreshTokenCookie(res);
      res.status(204).end();
    },
    meHandler: async (req: Request, res: Response): Promise<void> => {
      if (!req.user) {
        throw new HttpError(401, "invalid_token");
      }
      const view = await deps.auth.getCurrentUser(req.user.id);
      res.status(200).json(view);
    },
  };
}