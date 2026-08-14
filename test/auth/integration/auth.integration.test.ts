import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { SignJWT } from "jose";
import { createHash } from "node:crypto";
import { db } from "../../../src/infrastructure/database/knex";
import {
  cleanupAuthTables,
  createAuthTestApp,
} from "./helpers/create-auth-test-app";

beforeEach(async () => {
  await cleanupAuthTables();
});

type SetCookieResponse = {
  headers: {
    "set-cookie"?: string[];
  };
};

function getRefreshCookieHeader(response: SetCookieResponse): string {
  const cookie = response.headers["set-cookie"]?.find((value) =>
    value.startsWith("refresh_token="),
  );
  expect(cookie).toBeDefined();
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Lax");
  expect(cookie).toContain("Path=/auth");
  return cookie?.split(";", 1)[0] ?? "";
}

function getRefreshToken(cookieHeader: string): string {
  return decodeURIComponent(cookieHeader.slice("refresh_token=".length));
}

describe("POST /auth/register", () => {
  it("returns 201 with token pair on success", async () => {
    const app = createAuthTestApp();
    const email = `register+${String(Date.now())}@example.com`;

    const res = await request(app)
      .post("/auth/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    expect(res.body.access_token).toMatch(/^eyJ/);
    expect(res.body.refresh_token).toBeUndefined();
    expect(res.body.token_type).toBe("Bearer");
    expect(res.body.expires_in).toBeGreaterThan(0);
    getRefreshCookieHeader(res);

    const stored = await db("users").where({ email }).first();
    expect(stored).toBeDefined();
    expect(stored.password_hash).toMatch(/^\$2[aby]\$/);

    const refresh = await db("refresh_tokens").where({ user_id: stored.id }).first();
    expect(refresh).toBeDefined();
    expect(refresh.revoked_at).toBeNull();
  });

  it("returns 409 when email is already taken", async () => {
    const app = createAuthTestApp();
    const email = `dup+${String(Date.now())}@example.com`;

    await request(app)
      .post("/auth/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    const res = await request(app)
      .post("/auth/register")
      .send({ email, password: "different1" })
      .expect(409);

    expect(res.body).toEqual({ error: "email_taken" });
  });

  it("returns 400 when email is invalid", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "not-an-email", password: "correcthorse" })
      .expect(400);

    expect(res.body).toEqual({ error: "invalid_request" });
  });

  it("returns 400 when password is too short", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .post("/auth/register")
      .send({ email: `short+${String(Date.now())}@example.com`, password: "short" })
      .expect(400);

    expect(res.body).toEqual({ error: "invalid_request" });
  });
});

describe("POST /auth/login", () => {
  it("returns 200 with token pair on success", async () => {
    const app = createAuthTestApp();
    const email = `login+${String(Date.now())}@example.com`;

    await request(app)
      .post("/auth/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    const res = await request(app)
      .post("/auth/login")
      .send({ email, password: "correcthorse" })
      .expect(200);

    expect(res.body.access_token).toMatch(/^eyJ/);
    expect(res.body.refresh_token).toBeUndefined();
    getRefreshCookieHeader(res);
  });

  it("returns 401 when password is wrong", async () => {
    const app = createAuthTestApp();
    const email = `wrong+${String(Date.now())}@example.com`;

    await request(app)
      .post("/auth/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    const res = await request(app)
      .post("/auth/login")
      .send({ email, password: "wrongwrong" })
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_credentials" });
  });

  it("returns 401 when email does not exist", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "ghost@example.com", password: "correcthorse" })
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_credentials" });
  });

  it("returns 401 when email is malformed (does not leak existence)", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "not-an-email", password: "correcthorse" })
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_credentials" });
  });
});

describe("POST /auth/refresh", () => {
  it("rotates refresh token cookie and returns 200", async () => {
    const app = createAuthTestApp();
    const agent = request.agent(app);
    const email = `refresh+${String(Date.now())}@example.com`;

    const reg = await agent
      .post("/auth/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    const oldCookie = getRefreshCookieHeader(reg);
    const oldRefresh = getRefreshToken(oldCookie);

    const res = await agent
      .post("/auth/refresh")
      .expect(200);

    const newCookie = getRefreshCookieHeader(res);
    expect(newCookie).not.toBe(oldCookie);
    expect(res.body.refresh_token).toBeUndefined();
    expect(res.body.access_token).toMatch(/^eyJ/);

    const oldHash = createHash("sha256").update(oldRefresh).digest("hex");
    const oldRecord = await db("refresh_tokens").where({ token_hash: oldHash }).first();
    expect(oldRecord).toBeDefined();
    expect(oldRecord.revoked_at).not.toBeNull();
  });

  it("returns 401 when refresh token cookie is missing", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .post("/auth/refresh")
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_token" });
  });

  it("returns 401 for unknown refresh token cookie", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .post("/auth/refresh")
      .set("Cookie", "refresh_token=made-up-token")
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_token" });
  });

  it("returns 401 with token_reused when refresh token is reused", async () => {
    const app = createAuthTestApp();
    const email = `reuse+${String(Date.now())}@example.com`;

    const reg = await request(app)
      .post("/auth/register")
      .send({ email, password: "correcthorse" })
      .expect(201);
    const oldCookie = getRefreshCookieHeader(reg);

    await request(app)
      .post("/auth/refresh")
      .set("Cookie", oldCookie)
      .expect(200);

    const res = await request(app)
      .post("/auth/refresh")
      .set("Cookie", oldCookie)
      .expect(401);

    expect(res.body).toEqual({ error: "token_reused" });
  });
});

describe("POST /auth/logout", () => {
  it("returns 204, removes the refresh token and clears the cookie", async () => {
    const app = createAuthTestApp();
    const email = `logout+${String(Date.now())}@example.com`;

    const reg = await request(app)
      .post("/auth/register")
      .send({ email, password: "correcthorse" })
      .expect(201);
    const refreshCookie = getRefreshCookieHeader(reg);

    const logout = await request(app)
      .post("/auth/logout")
      .set("Cookie", refreshCookie)
      .expect(204);

    const clearedCookieHeader = logout.headers["set-cookie"] ?? "";
    const clearedCookie = Array.isArray(clearedCookieHeader)
      ? clearedCookieHeader.join("; ")
      : clearedCookieHeader;
    expect(clearedCookie).toContain("refresh_token=");
    expect(clearedCookie).toContain("HttpOnly");
    expect(clearedCookie).toContain("Max-Age=0");

    await request(app)
      .post("/auth/refresh")
      .set("Cookie", refreshCookie)
      .expect(401);
  });

  it("returns 401 when logout cookie is missing", async () => {
    const app = createAuthTestApp();
    await request(app).post("/auth/logout").expect(401);
  });
});

describe("GET /auth/me", () => {
  it("returns 200 with current user info", async () => {
    const app = createAuthTestApp();
    const email = `me+${String(Date.now())}@example.com`;

    const reg = await request(app)
      .post("/auth/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${reg.body.access_token}`)
      .expect(200);

    expect(res.body.email).toBe(email);
    expect(res.body.role).toBe("user");
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns 401 when bearer is missing", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .get("/auth/me")
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_token" });
  });

  it("returns 401 when bearer is malformed", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer not-a-jwt")
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_token" });
  });

  it("returns 401 when bearer is signed with a different key", async () => {
    const app = createAuthTestApp();
    const wrongKey = new TextEncoder().encode("wrong-key-that-does-not-match");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("00000000-0000-0000-0000-000000000000")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(wrongKey);

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_token" });
  });
});
