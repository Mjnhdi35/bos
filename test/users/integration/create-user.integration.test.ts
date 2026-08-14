import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { db } from "../../../src/infrastructure/database/knex";
import {
  cleanupUsersTable,
  createUsersTestApp,
} from "./helpers/create-users-test-app";

beforeEach(async () => {
  await cleanupUsersTable();
});

describe("POST /users", () => {
  it("returns 201 with user info on success", async () => {
    const app = createUsersTestApp();
    const email = `create+${String(Date.now())}@example.com`;

    const res = await request(app)
      .post("/users")
      .send({ email, password: "correcthorse" })
      .expect(201);

    expect(res.body.email).toBe(email);
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.createdAt).toEqual(expect.any(String));
    expect(res.body.updatedAt).toEqual(expect.any(String));
    expect(res.body.password_hash).toBeUndefined();
    expect(res.body.password).toBeUndefined();

    const stored = await db("users").where({ email }).first();
    expect(stored).toBeDefined();
    expect(stored.password_hash).toMatch(/^\$2[aby]\$/);
    expect(stored.password_hash).not.toBe("correcthorse");
  });

  it("returns 409 when email is already taken", async () => {
    const app = createUsersTestApp();
    const email = `dup+${String(Date.now())}@example.com`;

    await request(app)
      .post("/users")
      .send({ email, password: "correcthorse" })
      .expect(201);

    const res = await request(app)
      .post("/users")
      .send({ email, password: "different1" })
      .expect(409);

    expect(res.body).toEqual({ error: "email_taken" });
  });

  it("returns 400 when email is invalid", async () => {
    const app = createUsersTestApp();
    const res = await request(app)
      .post("/users")
      .send({ email: "not-an-email", password: "correcthorse" })
      .expect(400);

    expect(res.body).toEqual({ error: "invalid_request" });
  });

  it("returns 400 when password is too short", async () => {
    const app = createUsersTestApp();
    const res = await request(app)
      .post("/users")
      .send({ email: `short+${String(Date.now())}@example.com`, password: "short" })
      .expect(400);

    expect(res.body).toEqual({ error: "invalid_request" });
  });

  it("normalizes email to lowercase before persisting", async () => {
    const app = createUsersTestApp();
    const base = `mixed+${String(Date.now())}`;
    const emailUpper = `${base.toUpperCase()}@EXAMPLE.COM`;
    const emailLower = `${base}@example.com`;

    await request(app)
      .post("/users")
      .send({ email: emailUpper, password: "correcthorse" })
      .expect(201);

    const stored = await db("users").where({ email: emailLower }).first();
    expect(stored).toBeDefined();
  });

  it("does not leak password in any error path", async () => {
    const app = createUsersTestApp();
    const res = await request(app)
      .post("/users")
      .send({ email: "leak@example.com", password: "x" })
      .expect(400);

    expect(JSON.stringify(res.body)).not.toContain("x");
  });
});
