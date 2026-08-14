import { type Request, type Response } from "express";
import { env } from "../../shared/config/env";
import { parseTtl } from "../../shared/jwt";
import { HttpError } from "../../shared/errors";

export const REFRESH_COOKIE_NAME = "refresh_token";
const REFRESH_COOKIE_PATH = "/auth";
const REFRESH_COOKIE_MAX_AGE = Math.floor(parseTtl(env.JWT_REFRESH_TTL) / 1000);

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.append("Set-Cookie", serializeRefreshCookie(token));
}

export function clearRefreshTokenCookie(res: Response): void {
  const attributes = [
    `${REFRESH_COOKIE_NAME}=`,
    "HttpOnly",
    `Path=${REFRESH_COOKIE_PATH}`,
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (env.NODE_ENV === "production") attributes.push("Secure");
  res.append("Set-Cookie", attributes.join("; "));
}

export function readRefreshTokenCookie(req: Request): string {
  const header = req.header("cookie");
  if (!header) throw new HttpError(401, "invalid_token");

  const prefix = `${REFRESH_COOKIE_NAME}=`;
  const rawCookie = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!rawCookie) throw new HttpError(401, "invalid_token");

  const encodedToken = rawCookie.slice(prefix.length);
  if (!encodedToken) throw new HttpError(401, "invalid_token");

  try {
    const token = decodeURIComponent(encodedToken);
    if (!token) throw new Error("empty refresh token");
    return token;
  } catch {
    throw new HttpError(401, "invalid_token");
  }
}

function serializeRefreshCookie(token: string): string {
  const attributes = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    `Path=${REFRESH_COOKIE_PATH}`,
    "SameSite=Lax",
    `Max-Age=${String(REFRESH_COOKIE_MAX_AGE)}`,
  ];
  if (env.NODE_ENV === "production") attributes.push("Secure");
  return attributes.join("; ");
}
