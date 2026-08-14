import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createHash } from "node:crypto";
import { db } from "../../../src/infrastructure/database/knex";
import {
  cleanupAuthTables,
  createAuthTestApp,
} from "./helpers/create-auth-test-app";

beforeEach(async () => {
  await cleanupAuthTables();
});

describe("POST /identity/register", () => {
  it("returns 201 with token pair on success", async () => {
    const app = createAuthTestApp();
    const email = `register+${String(Date.now())}@example.com`;

    const res = await request(app)
      .post("/identity/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    expect(res.body.access_token).toMatch(/^eyJ/);
    expect(res.body.refresh_token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(res.body.token_type).toBe("Bearer");
    expect(res.body.expires_in).toBeGreaterThan(0);

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
      .post("/identity/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    const res = await request(app)
      .post("/identity/register")
      .send({ email, password: "different1" })
      .expect(409);

    expect(res.body).toEqual({ error: "email_taken" });
  });

  it("returns 400 when email is invalid", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .post("/identity/register")
      .send({ email: "not-an-email", password: "correcthorse" })
      .expect(400);

    expect(res.body).toEqual({ error: "invalid_request" });
  });

  it("returns 400 when password is too short", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .post("/identity/register")
      .send({ email: `short+${String(Date.now())}@example.com`, password: "short" })
      .expect(400);

    expect(res.body).toEqual({ error: "invalid_request" });
  });
});

describe("POST /identity/login", () => {
  it("returns 200 with token pair on success", async () => {
    const app = createAuthTestApp();
    const email = `login+${String(Date.now())}@example.com`;

    await request(app)
      .post("/identity/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    const res = await request(app)
      .post("/identity/login")
      .send({ email, password: "correcthorse" })
      .expect(200);

    expect(res.body.access_token).toMatch(/^eyJ/);
    expect(res.body.refresh_token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns 401 when password is wrong", async () => {
    const app = createAuthTestApp();
    const email = `wrong+${String(Date.now())}@example.com`;

    await request(app)
      .post("/identity/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    const res = await request(app)
      .post("/identity/login")
      .send({ email, password: "wrongwrong" })
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_credentials" });
  });

  it("returns 401 when email does not exist", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .post("/identity/login")
      .send({ email: "ghost@example.com", password: "correcthorse" })
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_credentials" });
  });

  it("returns 401 when email is malformed (does not leak existence)", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .post("/identity/login")
      .send({ email: "not-an-email", password: "correcthorse" })
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_credentials" });
  });
});

describe("POST /identity/refresh", () => {
  it("rotates refresh token and returns 200", async () => {
    const app = createAuthTestApp();
    const email = `refresh+${String(Date.now())}@example.com`;

    const reg = await request(app)
      .post("/identity/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    const oldRefresh = reg.body.refresh_token;

    const res = await request(app)
      .post("/identity/refresh")
      .send({ refresh_token: oldRefresh })
      .expect(200);

    expect(res.body.refresh_token).not.toBe(oldRefresh);
    expect(res.body.access_token).toMatch(/^eyJ/);

    const oldHash = createHash("sha256").update(String(oldRefresh)).digest("hex");
    const oldRecord = await db("refresh_tokens").where({ token_hash: oldHash }).first();
    expect(oldRecord).toBeDefined();
    expect(oldRecord.revoked_at).not.toBeNull();
  });

  it("returns 401 for unknown refresh token", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .post("/identity/refresh")
      .send({ refresh_token: "made-up-token" })
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_token" });
  });

  it("returns 401 with token_reused when refresh token is reused", async () => {
    const app = createAuthTestApp();
    const email = `reuse+${String(Date.now())}@example.com`;

    const reg = await request(app)
      .post("/identity/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    const oldRefresh = reg.body.refresh_token;

    await request(app)
      .post("/identity/refresh")
      .send({ refresh_token: oldRefresh })
      .expect(200);

    const res = await request(app)
      .post("/identity/refresh")
      .send({ refresh_token: oldRefresh })
      .expect(401);

    expect(res.body).toEqual({ error: "token_reused" });
  });
});

describe("POST /identity/logout", () => {
  it("returns 204 and removes the refresh token", async () => {
    const app = createAuthTestApp();
    const email = `logout+${String(Date.now())}@example.com`;

    const reg = await request(app)
      .post("/identity/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    await request(app)
      .post("/identity/logout")
      .send({ refresh_token: reg.body.refresh_token })
      .expect(204);

    await request(app)
      .post("/identity/refresh")
      .send({ refresh_token: reg.body.refresh_token })
      .expect(401);
  });

  it("returns 204 even for unknown token (idempotent)", async () => {
    const app = createAuthTestApp();
    await request(app)
      .post("/identity/logout")
      .send({ refresh_token: "ghost-token" })
      .expect(204);
  });
});

describe("GET /identity/me", () => {
  it("returns 200 with current user info", async () => {
    const app = createAuthTestApp();
    const email = `me+${String(Date.now())}@example.com`;

    const reg = await request(app)
      .post("/identity/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    const res = await request(app)
      .get("/identity/me")
      .set("Authorization", `Bearer ${reg.body.access_token}`)
      .expect(200);

    expect(res.body.email).toBe(email);
    expect(res.body.role).toBe("user");
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns 401 when bearer is missing", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .get("/identity/me")
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_token" });
  });

  it("returns 401 when bearer is malformed", async () => {
    const app = createAuthTestApp();
    const res = await request(app)
      .get("/identity/me")
      .set("Authorization", "Bearer not-a-jwt")
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_token" });
  });
});
