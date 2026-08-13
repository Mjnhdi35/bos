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

async function register(
  app: ReturnType<typeof createIdentityTestApp>,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const reg = await request(app)
    .post("/identity/register")
    .send({ email, password })
    .expect(201);
  return {
    accessToken: reg.body.access_token as string,
    refreshToken: reg.body.refresh_token as string,
  };
}

describe("POST /identity/refresh", () => {
  it("returns 200 with new token pair on valid refresh token", async () => {
    const app = createIdentityTestApp();
    const email = `refresh+${Date.now()}@example.com`;
    const { refreshToken } = await register(app, email, "correcthorse");

    const res = await request(app)
      .post("/identity/refresh")
      .send({ refresh_token: refreshToken })
      .expect(200);

    expect(res.body.access_token).toMatch(/^eyJ/);
    expect(res.body.refresh_token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(res.body.token_type).toBe("Bearer");
    expect(res.body.refresh_token).not.toBe(refreshToken);
  });

  it("marks old refresh token as revoked after use", async () => {
    const app = createIdentityTestApp();
    const email = `revoke+${Date.now()}@example.com`;
    const { refreshToken } = await register(app, email, "correcthorse");
    const userId = (await db("users").where({ email }).first()).id;

    await request(app)
      .post("/identity/refresh")
      .send({ refresh_token: refreshToken })
      .expect(200);

    const stored = await db("refresh_tokens")
      .where({ user_id: userId })
      .whereNull("revoked_at");
    expect(stored.length).toBe(1);
  });

  it("returns 401 with invalid_token when refresh token is unknown", async () => {
    const app = createIdentityTestApp();
    const res = await request(app)
      .post("/identity/refresh")
      .send({ refresh_token: "totally-bogus-token" })
      .expect(401);
    expect(res.body).toEqual({ error: "invalid_token" });
  });

  it("returns 401 with token_reused when refresh token was already used", async () => {
    const app = createIdentityTestApp();
    const email = `reuse+${Date.now()}@example.com`;
    const { refreshToken } = await register(app, email, "correcthorse");

    // first refresh consumes the token
    await request(app)
      .post("/identity/refresh")
      .send({ refresh_token: refreshToken })
      .expect(200);

    // second use of the same refresh token = reuse → token_reused
    const res = await request(app)
      .post("/identity/refresh")
      .send({ refresh_token: refreshToken })
      .expect(401);
    expect(res.body).toEqual({ error: "token_reused" });
  });

  it("revokes all user tokens when a refresh token is reused", async () => {
    const app = createIdentityTestApp();
    const email = `revokeall+${Date.now()}@example.com`;
    const { refreshToken } = await register(app, email, "correcthorse");
    const userId = (await db("users").where({ email }).first()).id;

    // first refresh consumes the original
    await request(app)
      .post("/identity/refresh")
      .send({ refresh_token: refreshToken })
      .expect(200);

    // second use of the original triggers reuse detection → revoke all
    await request(app)
      .post("/identity/refresh")
      .send({ refresh_token: refreshToken })
      .expect(401);

    const active = await db("refresh_tokens")
      .where({ user_id: userId })
      .whereNull("revoked_at");
    expect(active.length).toBe(0);
  });

  it("returns 400 when refresh_token field is missing", async () => {
    const app = createIdentityTestApp();
    const res = await request(app)
      .post("/identity/refresh")
      .send({})
      .expect(400);
    expect(res.body).toEqual({ error: "invalid_request" });
  });
});