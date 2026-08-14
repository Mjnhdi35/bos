import { SignJWT, jwtVerify } from "jose";
import { env } from "./config/env";

const SECRET = new TextEncoder().encode(env.JWT_SECRET);

export async function signAccessToken(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(SECRET);
  const expiresAt = new Date(Date.now() + parseTtl(env.JWT_ACCESS_TTL));
  return { token, expiresAt };
}

export async function verifyAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, SECRET);
  if (typeof payload.sub !== "string") {
    throw new Error("token missing sub");
  }
  return payload.sub;
}

export function parseTtl(ttl: string): number {
  const m = /^(\d+)([smhd])$/.exec(ttl);
  if (!m) throw new Error(`Invalid TTL format: ${ttl}`);
  const n = Number(m[1]);
  const unit = m[2] ?? "";
  const mult: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  const factor = mult[unit] ?? 0;
  if (factor === 0) throw new Error(`Invalid TTL unit: ${unit}`);
  return n * factor;
}
