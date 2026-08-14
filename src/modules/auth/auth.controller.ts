import { type Request, type Response } from "express";
import { parseBody } from "../../shared/http";
import { LoginSchema, RegisterSchema } from "./auth.schema";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "./auth.service";
import {
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
  setRefreshTokenCookie,
} from "./auth.cookies";

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const data = parseBody(RegisterSchema, req);
  const result = await registerUser(data);
  setRefreshTokenCookie(res, result.refresh_token);
  res.status(201).json(result.tokenPair);
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const data = parseBody(LoginSchema, req);
  const result = await loginUser(data);
  setRefreshTokenCookie(res, result.refresh_token);
  res.status(200).json(result.tokenPair);
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const refreshToken = readRefreshTokenCookie(req);
  const result = await refreshAccessToken(refreshToken);
  setRefreshTokenCookie(res, result.refresh_token);
  res.status(200).json(result.tokenPair);
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  const refreshToken = readRefreshTokenCookie(req);
  await logoutUser(refreshToken);
  clearRefreshTokenCookie(res);
  res.status(204).end();
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "invalid_token" });
    return;
  }
  const view = await getCurrentUser(req.user.id);
  res.status(200).json(view);
}
