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

async function registerUser(
  app: ReturnType<typeof createIdentityTestApp>,
  email: string,
  password: string,
): Promise<void> {
  await request(app)
    .post("/identity/register")
    .send({ email, password })
    .expect(201);
}

describe("POST /identity/login", () => {
  it("returns 200 with token pair on valid credentials", async () => {
    const app = createIdentityTestApp();
    const email = `login+${Date.now()}@example.com`;
    const password = "correcthorse";

    await registerUser(app, email, password);

    const res = await request(app)
      .post("/identity/login")
      .send({ email, password })
      .expect(200);

    expect(res.body.access_token).toMatch(/^eyJ/);
    expect(res.body.refresh_token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(res.body.token_type).toBe("Bearer");
    expect(res.body.expires_in).toBeGreaterThan(0);

    const refresh = await db("refresh_tokens")
      .where({ user_id: (await db("users").where({ email }).first()).id })
      .first();
    expect(refresh).toBeDefined();
    expect(refresh.revoked_at).toBeNull();
  });

  it("returns 401 with invalid_credentials when email is unknown", async () => {
    const app = createIdentityTestApp();
    const res = await request(app)
      .post("/identity/login")
      .send({
        email: `ghost+${Date.now()}@example.com`,
        password: "correcthorse",
      })
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_credentials" });
  });

  it("returns 401 with invalid_credentials when password is wrong", async () => {
    const app = createIdentityTestApp();
    const email = `wrong+${Date.now()}@example.com`;

    await registerUser(app, email, "correcthorse");

    const res = await request(app)
      .post("/identity/login")
      .send({ email, password: "wronghorse" })
      .expect(401);

    expect(res.body).toEqual({ error: "invalid_credentials" });
  });

  it("returns 400 when email is missing", async () => {
    const app = createIdentityTestApp();
    const res = await request(app)
      .post("/identity/login")
      .send({ password: "correcthorse" })
      .expect(400);

    expect(res.body).toEqual({ error: "invalid_request" });
  });

  it("returns 400 when password is too short", async () => {
    const app = createIdentityTestApp();
    const res = await request(app)
      .post("/identity/login")
      .send({ email: `short+${Date.now()}@example.com`, password: "x" })
      .expect(400);

    expect(res.body).toEqual({ error: "invalid_request" });
  });

  it("treats lookup by uppercase email as case-insensitive", async () => {
    const app = createIdentityTestApp();
    const base = `case+${Date.now()}`;
    await registerUser(app, `${base}@example.com`, "correcthorse");

    const res = await request(app)
      .post("/identity/login")
      .send({ email: `${base.toUpperCase()}@EXAMPLE.com`, password: "correcthorse" })
      .expect(200);

    expect(res.body.access_token).toMatch(/^eyJ/);
  });
});