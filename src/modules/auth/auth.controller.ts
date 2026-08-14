import { type Request, type Response } from "express";
import { LoginSchema, RefreshSchema, RegisterSchema } from "./auth.schema";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "./auth.service";

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const result = await registerUser(parsed.data);
  res.status(201).json(result);
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const result = await loginUser(parsed.data);
  res.status(200).json(result);
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const parsed = RefreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  const result = await refreshAccessToken(parsed.data.refresh_token);
  res.status(200).json(result);
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  const parsed = RefreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }
  await logoutUser(parsed.data.refresh_token);
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