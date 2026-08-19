/**
 * Auth runtime — wires the EntityRuntime to the platform-managed
 * User + Session entities declared by `src/applications/system.ts`.
 *
 * The runtime is the source of truth for identity; no separate
 * `users` / `refresh_tokens` SQL table is used. Passwords are
 * bcrypt-hashed and stored in the `password_hash` field on the
 * system `User` entity; refresh tokens are random 32-byte
 * base64url strings whose sha256 hash is stored in `Session.token_hash`.
 */

import { randomBytes, createHash } from "node:crypto";
import type { EntityRuntime } from "../../platform/entity-runtime";
import { HttpError } from "../../shared/errors";
import { hashPassword, verifyPassword } from "../../shared/bcrypt";
import { signAccessToken, parseTtl, verifyAccessToken } from "../../shared/jwt";
import { env } from "../../shared/config/env";
import { SYSTEM_APPLICATION_NAME } from "../../platform/system-bootstrap";
import { refOf } from "../../platform/runtime";

export type TokenPair = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
};

export type IssuedTokenPair = {
  tokenPair: TokenPair;
  refresh_token: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  role: "user" | "admin";
};

export type AuthRuntimeDeps = {
  readonly runtime: EntityRuntime;
};

export class AuthRuntime {
  private readonly refreshTtlMs: number;
  private readonly deps: AuthRuntimeDeps;

  constructor(deps: AuthRuntimeDeps) {
    this.deps = deps;
    this.refreshTtlMs = parseTtl(env.JWT_REFRESH_TTL);
  }

  async register(input: { email: string; password: string }): Promise<IssuedTokenPair> {
    const existing = await this.findByEmail(input.email);
    if (existing) throw new HttpError(409, "email_taken");
    const passwordHash = await hashPassword(input.password);
    const userId = await this.deps.runtime.create(
      refOf(SYSTEM_APPLICATION_NAME, "User"),
      {
        email: input.email,
        password_hash: passwordHash,
        role: "user",
      },
    );
    return this.issueTokenPair(userId);
  }

  async login(input: { email: string; password: string }): Promise<IssuedTokenPair> {
    const user = await this.findByEmail(input.email);
    if (!user) throw new HttpError(401, "invalid_credentials");
    const ok = await verifyPassword(input.password, user.password_hash);
    if (!ok) throw new HttpError(401, "invalid_credentials");
    return this.issueTokenPair(user.id);
  }

  async refresh(refreshToken: string): Promise<IssuedTokenPair> {
    const hash = sha256(refreshToken);
    const list = await this.deps.runtime.query(
      refOf(SYSTEM_APPLICATION_NAME, "Session"),
      {
        filter: {
          kind: "leaf",
          filter: { field: "token_hash", operator: "eq", value: hash },
        },
      },
    );
    const session = list.items[0];
    if (!session) throw new HttpError(401, "invalid_token");
    const expiresAt = session["expires_at"];
    const revokedAt = session["revoked_at"];
    if (typeof expiresAt !== "string") throw new HttpError(401, "invalid_token");
    if (Date.parse(expiresAt) <= Date.now()) {
      throw new HttpError(401, "invalid_token");
    }
    if (revokedAt !== undefined && revokedAt !== null && revokedAt !== "") {
      // token reused → revoke all sessions for that user
      const userId = session["user_id"];
      if (typeof userId === "string") {
        await this.revokeAllForUser(userId);
      }
      throw new HttpError(401, "token_reused");
    }

    const userId = session["user_id"];
    if (typeof userId !== "string") throw new HttpError(401, "invalid_token");
    const sessionId = session["id"];
    if (typeof sessionId !== "string") throw new HttpError(401, "invalid_token");
    await this.deps.runtime.update(
      refOf(SYSTEM_APPLICATION_NAME, "Session"),
      sessionId,
      { revoked_at: new Date().toISOString() },
    );
    return this.issueTokenPair(userId);
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = sha256(refreshToken);
    const list = await this.deps.runtime.query(
      refOf(SYSTEM_APPLICATION_NAME, "Session"),
      {
        filter: {
          kind: "leaf",
          filter: { field: "token_hash", operator: "eq", value: hash },
        },
      },
    );
    for (const session of list.items) {
      const id = session["id"];
      if (typeof id === "string") {
        await this.deps.runtime.delete(
          refOf(SYSTEM_APPLICATION_NAME, "Session"),
          id,
        );
      }
    }
  }

  async getCurrentUser(userId: string): Promise<CurrentUser> {
    const record = await this.deps.runtime.findById(
      refOf(SYSTEM_APPLICATION_NAME, "User"),
      userId,
    );
    if (!record) throw new HttpError(401, "invalid_token");
    return {
      id: record.id,
      email: record["email"] as string,
      role: record["role"] as "user" | "admin",
    };
  }

  async authenticateAccessToken(token: string): Promise<CurrentUser> {
    const userId = await verifyAccessToken(token);
    return this.getCurrentUser(userId);
  }

  private async findByEmail(email: string): Promise<{
    id: string;
    email: string;
    role: "user" | "admin";
    password_hash: string;
  } | null> {
    const result = await this.deps.runtime.query(
      refOf(SYSTEM_APPLICATION_NAME, "User"),
      {
        filter: {
          kind: "leaf",
          filter: { field: "email", operator: "eq", value: email },
        },
      },
    );
    const record = result.items[0];
    if (!record) return null;
    return {
      id: record.id,
      email: record["email"] as string,
      role: record["role"] as "user" | "admin",
      password_hash: record["password_hash"] as string,
    };
  }

  private async issueTokenPair(userId: string): Promise<IssuedTokenPair> {
    const access = await signAccessToken(userId);
    const refreshToken = randomBytes(32).toString("base64url");
    const refreshHash = sha256(refreshToken);
    await this.deps.runtime.create(
      refOf(SYSTEM_APPLICATION_NAME, "Session"),
      {
        user_id: userId,
        token_hash: refreshHash,
        expires_at: new Date(Date.now() + this.refreshTtlMs).toISOString(),
      },
    );
    const expiresIn = Math.max(
      1,
      Math.floor((access.expiresAt.getTime() - Date.now()) / 1000),
    );
    return {
      tokenPair: {
        access_token: access.token,
        token_type: "Bearer",
        expires_in: expiresIn,
      },
      refresh_token: refreshToken,
    };
  }

  private async revokeAllForUser(userId: string): Promise<void> {
    const list = await this.deps.runtime.query(
      refOf(SYSTEM_APPLICATION_NAME, "Session"),
      {
        filter: {
          kind: "leaf",
          filter: { field: "user_id", operator: "eq", value: userId },
        },
      },
    );
    for (const session of list.items) {
      const id = session["id"];
      if (typeof id !== "string") continue;
      if (session["revoked_at"]) continue;
      await this.deps.runtime.update(
        refOf(SYSTEM_APPLICATION_NAME, "Session"),
        id,
        { revoked_at: new Date().toISOString() },
      );
    }
  }
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}