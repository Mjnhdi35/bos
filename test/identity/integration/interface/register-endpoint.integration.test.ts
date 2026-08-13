import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { db } from "../../../../src/infrastructure/database/knex";
import {
  cleanupIdentityTables,
  createIdentityTestApp,
} from "../helpers/create-identity-test-app";

beforeEach(async () => {
  await cleanupIdentityTables();
});

describe("POST /identity/register", () => {
  it("returns 201 with token pair on success", async () => {
    const app = createIdentityTestApp();
    const email = `register+${Date.now()}@example.com`;

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
    expect(stored.email).toBe(email);
    expect(stored.password_hash).toMatch(/^\$2b\$/);

    const refresh = await db("refresh_tokens").where({ user_id: stored.id }).first();
    expect(refresh).toBeDefined();
    expect(refresh.revoked_at).toBeNull();
  });

  it("returns 409 when email is already taken", async () => {
    const app = createIdentityTestApp();
    const email = `dup+${Date.now()}@example.com`;

    await request(app)
      .post("/identity/register")
      .send({ email, password: "correcthorse" })
      .expect(201);

    const res = await request(app)
      .post("/identity/register")
      .send({ email, password: "different" })
      .expect(409);

    expect(res.body).toEqual({ error: "email_taken" });
  });

  it("returns 400 when email is invalid", async () => {
    const app = createIdentityTestApp();
    const res = await request(app)
      .post("/identity/register")
      .send({ email: "not-an-email", password: "correcthorse" })
      .expect(400);

    expect(res.body).toEqual({ error: "invalid_request" });
  });

  it("returns 400 when password is too short", async () => {
    const app = createIdentityTestApp();
    const res = await request(app)
      .post("/identity/register")
      .send({ email: `short+${Date.now()}@example.com`, password: "short" })
      .expect(400);

    expect(res.body).toEqual({ error: "invalid_request" });
  });

  it("does not create user when validation fails", async () => {
    const app = createIdentityTestApp();
    const email = `noinsert+${Date.now()}@example.com`;

    await request(app)
      .post("/identity/register")
      .send({ email, password: "x" })
      .expect(400);

    const stored = await db("users").where({ email }).first();
    expect(stored).toBeUndefined();
  });
});
