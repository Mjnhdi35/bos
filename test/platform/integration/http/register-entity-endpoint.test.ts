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

describe("POST /platform/entities", () => {
  it("persists metadata and creates physical table", async () => {
    const app = createPlatformTestApp();
    const res = await request(app)
      .post("/platform/entities")
      .send({
        name: "products",
        version: 1,
        fields: [
          { name: "title", type: "string", required: true },
          { name: "price", type: "decimal", required: true, precision: 18, scale: 4 },
        ],
      })
      .expect(201);

    expect(res.body.name).toBe("products");
    expect(res.body.version).toBe(1);
    expect(res.body.fields).toHaveLength(2);

    const md = await db("platform_entities").where({ name: "products" }).first();
    expect(md).toBeDefined();
    expect(md.version).toBe(1);

    const tableExists = await db.schema.hasTable("products");
    expect(tableExists).toBe(true);

    const columns = await db("products").columnInfo();
    expect(columns.id).toBeDefined();
    expect(columns.title).toBeDefined();
    expect(columns.price).toBeDefined();
  });

  it("returns 409 on duplicate (name, version)", async () => {
    const app = createPlatformTestApp();
    await request(app)
      .post("/platform/entities")
      .send({
        name: "products",
        version: 1,
        fields: [{ name: "title", type: "string", required: true }],
      })
      .expect(201);

    const res = await request(app)
      .post("/platform/entities")
      .send({
        name: "products",
        version: 1,
        fields: [{ name: "title", type: "string", required: true }],
      })
      .expect(409);

    expect(res.body).toEqual({ error: "entity_already_exists" });
  });

  it("returns 400 on invalid definition", async () => {
    const app = createPlatformTestApp();
    const res = await request(app)
      .post("/platform/entities")
      .send({ name: "BadName", version: 1, fields: [] })
      .expect(400);

    expect(res.body.error).toBe("invalid_definition");
  });
});
