import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { db } from "../../../../src/infrastructure/database/knex";
import {
  cleanupPlatformTables,
  createPlatformTestApp,
} from "../helpers/create-platform-test-app";

beforeEach(async () => {
  await cleanupPlatformTables();
});

describe("enum field type end-to-end", () => {
  it("registers an entity with enum, persists metadata, creates physical column", async () => {
    const app = createPlatformTestApp();
    const res = await request(app)
      .post("/platform/entities")
      .send({
        name: "tasks",
        version: 1,
        fields: [
          { name: "title", type: "string", required: true },
          {
            name: "status",
            type: "enum",
            required: true,
            values: ["draft", "active", "archived"],
          },
        ],
      })
      .expect(201);

    expect(res.body.is_system).toBe(false);
    const statusField = res.body.fields.find((f: { name: string }) => f.name === "status");
    expect(statusField.type).toBe("enum");
    expect(statusField.values).toEqual(["draft", "active", "archived"]);

    const cols = (await db("tasks").columnInfo()) as Record<string, { type: string }>;
    const statusCol = cols.status;
    expect(statusCol).toBeDefined();
    if (statusCol) {
      expect(statusCol.type).toMatch(/varchar|character varying/);
    }

    const cons = await db.raw<{ rows: { conname: string; contype: string }[] }>(
      "SELECT conname, contype FROM pg_constraint WHERE conrelid = 'tasks'::regclass",
    );
    const check = cons.rows.find(
      (r) => r.conname === "chk_tasks_status" && r.contype === "c",
    );
    expect(check).toBeDefined();
  });

  it("accepts record with valid enum value", async () => {
    const app = createPlatformTestApp();
    await request(app)
      .post("/platform/entities")
      .send({
        name: "tasks",
        version: 1,
        fields: [
          { name: "title", type: "string", required: true },
          {
            name: "status",
            type: "enum",
            required: true,
            values: ["draft", "active", "archived"],
          },
        ],
      })
      .expect(201);

    const created = await request(app)
      .post("/platform/data/tasks")
      .send({ title: "first", status: "active" })
      .expect(201);

    expect(created.body.status).toBe("active");
  });

  it("rejects record with invalid enum value at application layer", async () => {
    const app = createPlatformTestApp();
    await request(app)
      .post("/platform/entities")
      .send({
        name: "tasks",
        version: 1,
        fields: [
          { name: "title", type: "string", required: true },
          {
            name: "status",
            type: "enum",
            required: true,
            values: ["draft", "active", "archived"],
          },
        ],
      })
      .expect(201);

    const res = await request(app)
      .post("/platform/data/tasks")
      .send({ title: "first", status: "unknown" })
      .expect(400);

    expect(res.body.error).toBe("invalid_input");
    expect(res.body.message).toContain("status");
  });

  it("rejects record with invalid enum value at DB CHECK constraint (bypassing app)", async () => {
    const app = createPlatformTestApp();
    await request(app)
      .post("/platform/entities")
      .send({
        name: "tasks",
        version: 1,
        fields: [
          { name: "title", type: "string", required: true },
          {
            name: "status",
            type: "enum",
            required: true,
            values: ["draft", "active", "archived"],
          },
        ],
      })
      .expect(201);

    await expect(
      db("tasks").insert({ title: "bypass", status: "garbage" }),
    ).rejects.toThrow(/chk_tasks_status/);
  });

  it("rejects patch with invalid enum value", async () => {
    const app = createPlatformTestApp();
    await request(app)
      .post("/platform/entities")
      .send({
        name: "tasks",
        version: 1,
        fields: [
          { name: "title", type: "string", required: true },
          {
            name: "status",
            type: "enum",
            required: true,
            values: ["draft", "active", "archived"],
          },
        ],
      })
      .expect(201);

    const created = await request(app)
      .post("/platform/data/tasks")
      .send({ title: "first", status: "active" })
      .expect(201);

    const id = String(created.body.id);

    const res = await request(app)
      .patch(`/platform/data/tasks/${id}`)
      .send({ status: "bogus" })
      .expect(400);

    expect(res.body.error).toBe("invalid_input");
  });

  it("rejects enum registration with empty values", async () => {
    const app = createPlatformTestApp();
    const res = await request(app)
      .post("/platform/entities")
      .send({
        name: "tasks",
        version: 1,
        fields: [
          { name: "status", type: "enum", required: true, values: [] },
        ],
      })
      .expect(400);

    expect(res.body.error).toBe("invalid_definition");
  });
});
