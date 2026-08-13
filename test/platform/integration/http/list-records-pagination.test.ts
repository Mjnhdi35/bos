import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import {
  cleanupPlatformTables,
  createPlatformTestApp,
} from "../helpers/create-platform-test-app";

beforeEach(async () => {
  await cleanupPlatformTables();
});

async function registerProductsEntity(app: Awaited<ReturnType<typeof createPlatformTestApp>>): Promise<void> {
  await request(app)
    .post("/platform/entities")
    .send({
      name: "products",
      version: 1,
      fields: [{ name: "title", type: "string", required: true }],
    })
    .expect(201);
}

async function seedProducts(
  app: Awaited<ReturnType<typeof createPlatformTestApp>>,
  count: number,
): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await request(app)
      .post("/platform/data/products")
      .send({ title: `item-${String(i).padStart(2, "0")}` })
      .expect(201);
  }
}

describe("GET /platform/data/:entity pagination", () => {
  it("returns defaults limit=100 offset=0 when no query params", async () => {
    const app = createPlatformTestApp();
    await registerProductsEntity(app);
    await seedProducts(app, 3);

    const res = await request(app).get("/platform/data/products").expect(200);

    expect(res.body.limit).toBe(100);
    expect(res.body.offset).toBe(0);
    expect(Array.isArray(res.body.records)).toBe(true);
    expect(res.body.records).toHaveLength(3);
  });

  it("returns only the requested limit slice", async () => {
    const app = createPlatformTestApp();
    await registerProductsEntity(app);
    await seedProducts(app, 5);

    const res = await request(app)
      .get("/platform/data/products?limit=2")
      .expect(200);

    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(0);
    expect(res.body.records).toHaveLength(2);
    expect(res.body.records[0].title).toBe("item-00");
    expect(res.body.records[1].title).toBe("item-01");
  });

  it("skips records by offset", async () => {
    const app = createPlatformTestApp();
    await registerProductsEntity(app);
    await seedProducts(app, 5);

    const res = await request(app)
      .get("/platform/data/products?limit=2&offset=2")
      .expect(200);

    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(2);
    expect(res.body.records).toHaveLength(2);
    expect(res.body.records[0].title).toBe("item-02");
    expect(res.body.records[1].title).toBe("item-03");
  });

  it("returns empty array when offset past end", async () => {
    const app = createPlatformTestApp();
    await registerProductsEntity(app);
    await seedProducts(app, 2);

    const res = await request(app)
      .get("/platform/data/products?offset=10")
      .expect(200);

    expect(res.body.records).toHaveLength(0);
  });

  it("rejects limit=0 with invalid_query", async () => {
    const app = createPlatformTestApp();
    await registerProductsEntity(app);

    const res = await request(app)
      .get("/platform/data/products?limit=0")
      .expect(400);

    expect(res.body.error).toBe("invalid_query");
  });

  it("rejects limit>500 with invalid_query", async () => {
    const app = createPlatformTestApp();
    await registerProductsEntity(app);

    const res = await request(app)
      .get("/platform/data/products?limit=501")
      .expect(400);

    expect(res.body.error).toBe("invalid_query");
  });

  it("rejects negative offset with invalid_query", async () => {
    const app = createPlatformTestApp();
    await registerProductsEntity(app);

    const res = await request(app)
      .get("/platform/data/products?offset=-1")
      .expect(400);

    expect(res.body.error).toBe("invalid_query");
  });

  it("rejects non-numeric limit with invalid_query", async () => {
    const app = createPlatformTestApp();
    await registerProductsEntity(app);

    const res = await request(app)
      .get("/platform/data/products?limit=abc")
      .expect(400);

    expect(res.body.error).toBe("invalid_query");
  });
});
