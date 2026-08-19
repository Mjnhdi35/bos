/**
 * System user + auth flow test — verifies that the runtime serves
 * /auth/* using the system-metadata User + Session entities.
 */

import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp, buildRuntime, type AppRuntime } from "../../../src/app/create-app";

async function makeApp(): Promise<{ app: Express; rt: AppRuntime }> {
  const rt = await buildRuntime();
  const app = await createApp({ runtime: rt });
  return { app, rt };
}

describe("Auth flow (system metadata)", () => {
  let app: Express;
  let rt: AppRuntime;
  beforeEach(async () => {
    ({ app, rt } = await makeApp());
  });

  it("register returns token pair and sets refresh cookie", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "a@example.com", password: "Sup3rSecret!" })
      .expect(201);
    expect(res.body.access_token).toBeTruthy();
    expect(res.body.token_type).toBe("Bearer");
    expect(res.body.expires_in).toBeGreaterThan(0);
    const cookies = (res.headers["set-cookie"] ?? []) as string[];
    expect(cookies.some((c) => c.startsWith("refresh_token="))).toBe(true);

    // Verify the user record was created via the runtime.
    const users = await rt.runtime.query({
      applicationId: "system",
      entityName: "User",
    });
    expect(users.items).toHaveLength(1);
  });

  it("login then refresh round-trip", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "b@example.com", password: "Sup3rSecret!" })
      .expect(201);

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "b@example.com", password: "Sup3rSecret!" })
      .expect(200);
    expect(login.body.access_token).toBeTruthy();

    const cookieHeader = login.headers["set-cookie"]?.[0] ?? "";
    expect(cookieHeader).toContain("refresh_token=");

    const refresh = await request(app)
      .post("/auth/refresh")
      .set("Cookie", cookieHeader)
      .expect(200);
    expect(refresh.body.access_token).toBeTruthy();
  });

  it("GET /auth/me returns the current user", async () => {
    const reg = await request(app)
      .post("/auth/register")
      .send({ email: "c@example.com", password: "Sup3rSecret!" })
      .expect(201);
    const token = reg.body.access_token as string;

    const me = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(me.body.email).toBe("c@example.com");
    expect(me.body.role).toBe("user");
  });

  it("GET /auth/me without token returns 401", async () => {
    await request(app).get("/auth/me").expect(401);
  });

  it("login with wrong password returns 401", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "d@example.com", password: "Sup3rSecret!" })
      .expect(201);
    await request(app)
      .post("/auth/login")
      .send({ email: "d@example.com", password: "wrong" })
      .expect(401);
  });
});