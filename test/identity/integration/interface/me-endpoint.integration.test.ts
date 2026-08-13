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

async function registerAndLogin(
  app: ReturnType<typeof createIdentityTestApp>,
  email: string,
  password: string,
): Promise<string> {
  const reg = await request(app)
    .post("/identity/register")
    .send({ email, password })
    .expect(201);
  return reg.body.access_token as string;
}

describe("GET /identity/me", () => {
  it("returns 200 with user info when access token is valid", async () => {
    const app = createIdentityTestApp();
    const email = `me+${Date.now()}@example.com`;
    const accessToken = await registerAndLogin(app, email, "correcthorse");

    const res = await request(app)
      .get("/identity/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(email);
    expect(res.body.role).toBe("user");
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(typeof res.body.created_at === "string" || typeof res.body.createdAt === "string").toBe(true);
    expect(res.body.password_hash).toBeUndefined();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const app = createIdentityTestApp();
    const res = await request(app).get("/identity/me").expect(401);
    expect(res.body).toEqual({ error: "invalid_token" });
  });

  it("returns 401 when Authorization header is not Bearer", async () => {
    const app = createIdentityTestApp();
    const res = await request(app)
      .get("/identity/me")
      .set("Authorization", "Basic sometoken")
      .expect(401);
    expect(res.body).toEqual({ error: "invalid_token" });
  });

  it("returns 401 when access token is invalid", async () => {
    const app = createIdentityTestApp();
    const res = await request(app)
      .get("/identity/me")
      .set("Authorization", "Bearer not.a.valid.jwt")
      .expect(401);
    expect(res.body).toEqual({ error: "invalid_token" });
  });

  it("returns 401 when Bearer token is empty", async () => {
    const app = createIdentityTestApp();
    const res = await request(app)
      .get("/identity/me")
      .set("Authorization", "Bearer ")
      .expect(401);
    expect(res.body).toEqual({ error: "invalid_token" });
  });

  it("returns 401 when access token references a deleted user", async () => {
    const app = createIdentityTestApp();
    const email = `ghost+${Date.now()}@example.com`;
    const accessToken = await registerAndLogin(app, email, "correcthorse");

    // delete the user while keeping the token valid (signature-wise)
    await db("users").where({ email }).delete();

    const res = await request(app)
      .get("/identity/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(401);
    expect(res.body).toEqual({ error: "invalid_token" });
  });
});