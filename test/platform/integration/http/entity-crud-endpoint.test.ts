import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import {
  cleanupPlatformTables,
  createPlatformTestApp,
} from "../helpers/create-platform-test-app";

beforeEach(async () => {
  await cleanupPlatformTables();
});

describe("Dynamic entity full CRUD lifecycle", () => {
  it("create → read → list → update → delete", async () => {
    const app = createPlatformTestApp();

    // 1. Create entity via metadata API
    await request(app)
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

    // 2. Create record
    const created = await request(app)
      .post("/platform/data/products")
      .send({ title: "Smoothie", price: 12.5 })
      .expect(201);
    expect(created.body.id).toBeDefined();
    expect(created.body.title).toBe("Smoothie");
    expect(Number(created.body.price)).toBe(12.5);

    const id = String(created.body.id);

    // 3. Read record
    const read = await request(app)
      .get(`/platform/data/products/${id}`)
      .expect(200);
    expect(read.body.title).toBe("Smoothie");

    // 4. List records
    const list = await request(app)
      .get("/platform/data/products")
      .expect(200);
    expect(list.body.records).toHaveLength(1);

    // 5. Update record
    const updated = await request(app)
      .patch(`/platform/data/products/${id}`)
      .send({ price: 15.0 })
      .expect(200);
    expect(Number(updated.body.price)).toBe(15.0);

    // 6. Delete record
    await request(app)
      .delete(`/platform/data/products/${id}`)
      .expect(204);

    // 7. Verify gone
    await request(app)
      .get(`/platform/data/products/${id}`)
      .expect(404);
  });

  it("returns 400 when required field missing on create", async () => {
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
      .post("/platform/data/products")
      .send({})
      .expect(400);
    expect(res.body.error).toBe("invalid_input");
  });

  it("returns 404 when CRUD target entity not registered", async () => {
    const app = createPlatformTestApp();
    const res = await request(app)
      .post("/platform/data/unknown_entity")
      .send({ foo: "bar" })
      .expect(404);
    expect(res.body.error).toBe("entity_not_found");
  });
});
