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
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  const reg = await request(app)
    .post("/identity/register")
    .send({ email, password })
    .expect(201);
  const userId = (await db("users").where({ email }).first()).id;
  return {
    accessToken: reg.body.access_token as string,
    refreshToken: reg.body.refresh_token as string,
    userId,
  };
}

describe("POST /identity/logout", () => {
  it("returns 204 and deletes the refresh token", async () => {
    const app = createIdentityTestApp();
    const email = `logout+${Date.now()}@example.com`;
    const { refreshToken, userId } = await register(app, email, "correcthorse");

    await request(app)
      .post("/identity/logout")
      .send({ refresh_token: refreshToken })
      .expect(204);

    const stored = await db("refresh_tokens").where({ user_id: userId });
    expect(stored.length).toBe(0);
  });

  it("returns 204 even when refresh token does not exist (idempotent)", async () => {
    const app = createIdentityTestApp();
    await request(app)
      .post("/identity/logout")
      .send({ refresh_token: "never-issued-token" })
      .expect(204);
  });

  it("returns 400 when refresh_token field is missing", async () => {
    const app = createIdentityTestApp();
    const res = await request(app)
      .post("/identity/logout")
      .send({})
      .expect(400);
    expect(res.body).toEqual({ error: "invalid_request" });
  });

  it("prevents reuse of the deleted refresh token", async () => {
    const app = createIdentityTestApp();
    const email = `noreuse+${Date.now()}@example.com`;
    const { refreshToken } = await register(app, email, "correcthorse");

    await request(app)
      .post("/identity/logout")
      .send({ refresh_token: refreshToken })
      .expect(204);

    const res = await request(app)
      .post("/identity/refresh")
      .send({ refresh_token: refreshToken })
      .expect(401);
    expect(res.body).toEqual({ error: "invalid_token" });
  });
});