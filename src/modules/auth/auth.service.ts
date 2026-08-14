import { createHash, randomBytes } from "node:crypto";
import { db } from "../../infrastructure/database/knex";
import { verifyPassword } from "../../shared/bcrypt";
import { signAccessToken, parseTtl } from "../../shared/jwt";
import { env } from "../../shared/config/env";
import { HttpError } from "../../shared/errors";
import {
  createUser,
  findByEmail,
  findById,
  type User,
} from "../users/users.service";

const REFRESH_TTL_MS = parseTtl(env.JWT_REFRESH_TTL);

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
};

export type CurrentUser = User;

type RefreshTokenRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
};

export async function registerUser(input: {
  email: string;
  password: string;
}): Promise<TokenPair> {
  const user = await createUser(input);
  return issueTokenPair(user.id);
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<TokenPair> {
  const user = await findByEmail(input.email);
  if (!user) throw new HttpError(401, "invalid_credentials");

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new HttpError(401, "invalid_credentials");

  return issueTokenPair(user.id);
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenPair> {
  const hash = sha256(refreshToken);
  const record = await db<RefreshTokenRow>("refresh_tokens")
    .where({ token_hash: hash })
    .first();
  if (!record) throw new HttpError(401, "invalid_token");
  if (record.revoked_at !== null) {
    await db<RefreshTokenRow>("refresh_tokens")
      .where({ user_id: record.user_id })
      .whereNull("revoked_at")
      .update({ revoked_at: new Date() });
    throw new HttpError(401, "token_reused");
  }
  if (record.expires_at.getTime() <= Date.now()) {
    throw new HttpError(401, "invalid_token");
  }

  await db<RefreshTokenRow>("refresh_tokens")
    .where({ token_hash: hash })
    .update({ revoked_at: new Date() });
  return issueTokenPair(record.user_id);
}

export async function logoutUser(refreshToken: string): Promise<void> {
  const hash = sha256(refreshToken);
  await db<RefreshTokenRow>("refresh_tokens")
    .where({ token_hash: hash })
    .delete();
}

export async function getCurrentUser(userId: string): Promise<CurrentUser> {
  return findById(userId);
}

async function issueTokenPair(userId: string): Promise<TokenPair> {
  const access = await signAccessToken(userId);
  const refreshToken = randomBytes(32).toString("base64url");
  const refreshHash = sha256(refreshToken);
  await db<RefreshTokenRow>("refresh_tokens").insert({
    user_id: userId,
    token_hash: refreshHash,
    expires_at: new Date(Date.now() + REFRESH_TTL_MS),
  });
  const expiresIn = Math.max(
    1,
    Math.floor((access.expiresAt.getTime() - Date.now()) / 1000),
  );
  return {
    access_token: access.token,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: expiresIn,
  };
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}