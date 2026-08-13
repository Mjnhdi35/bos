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

async function registerPostsEntity(
  app: Awaited<ReturnType<typeof createPlatformTestApp>>,
): Promise<void> {
  await request(app)
    .post("/platform/entities")
    .send({
      name: "posts",
      version: 1,
      fields: [
        { name: "title", type: "string", required: true },
        { name: "tags", type: "array", required: true, items: { type: "string" } },
        { name: "scores", type: "array", required: false, items: { type: "number" } },
      ],
    })
    .expect(201);
}

describe("array field type end-to-end", () => {
  it("registers an entity with array columns and creates physical PG array columns", async () => {
    const app = createPlatformTestApp();
    const res = await request(app)
      .post("/platform/entities")
      .send({
        name: "posts",
        version: 1,
        fields: [
          { name: "title", type: "string", required: true },
          { name: "tags", type: "array", required: true, items: { type: "string" } },
          { name: "scores", type: "array", required: false, items: { type: "number" } },
        ],
      })
      .expect(201);

    const tagsField = res.body.fields.find((f: { name: string }) => f.name === "tags");
    expect(tagsField.type).toBe("array");
    expect(tagsField.items.type).toBe("string");

    const cols = (await db("posts").columnInfo()) as Record<string, { type: string }>;
    expect(cols.tags).toBeDefined();
    expect(cols.scores).toBeDefined();
  });

  it("inserts and round-trips string array", async () => {
    const app = createPlatformTestApp();
    await registerPostsEntity(app);

    const created = await request(app)
      .post("/platform/data/posts")
      .send({ title: "first", tags: ["draft", "review"] })
      .expect(201);

    expect(Array.isArray(created.body.tags)).toBe(true);
    const tags = created.body.tags as string[];
    expect(tags).toContain("draft");
    expect(tags).toContain("review");
    expect(tags).toHaveLength(2);
  });

  it("inserts number array", async () => {
    const app = createPlatformTestApp();
    await registerPostsEntity(app);

    const created = await request(app)
      .post("/platform/data/posts")
      .send({ title: "scored", tags: ["a"], scores: [1.5, 2.5, 3] })
      .expect(201);

    expect(Array.isArray(created.body.scores)).toBe(true);
  });

  it("rejects non-array for required field", async () => {
    const app = createPlatformTestApp();
    await registerPostsEntity(app);

    const res = await request(app)
      .post("/platform/data/posts")
      .send({ title: "x", tags: "not-an-array" })
      .expect(400);

    expect(res.body.error).toBe("invalid_input");
  });

  it("rejects array with wrong item type at application layer", async () => {
    const app = createPlatformTestApp();
    await registerPostsEntity(app);

    const res = await request(app)
      .post("/platform/data/posts")
      .send({ title: "x", tags: ["ok", 42] })
      .expect(400);

    expect(res.body.error).toBe("invalid_input");
    expect(res.body.message).toMatch(/tags\[1\]/);
  });

  it("rejects number array with string items", async () => {
    const app = createPlatformTestApp();
    await registerPostsEntity(app);

    const res = await request(app)
      .post("/platform/data/posts")
      .send({ title: "x", tags: ["a"], scores: [1, "two", 3] })
      .expect(400);

    expect(res.body.error).toBe("invalid_input");
  });

  it("accepts empty array for required field (treats as default null)", async () => {
    const app = createPlatformTestApp();
    await registerPostsEntity(app);

    const res = await request(app)
      .post("/platform/data/posts")
      .send({ title: "empty", tags: [] })
      .expect(201);

    expect(Array.isArray(res.body.tags)).toBe(true);
  });

  it("supports PATCH array (replace values)", async () => {
    const app = createPlatformTestApp();
    await registerPostsEntity(app);

    const created = await request(app)
      .post("/platform/data/posts")
      .send({ title: "patch me", tags: ["a", "b"] })
      .expect(201);

    const id = String(created.body.id);

    const patched = await request(app)
      .patch(`/platform/data/posts/${id}`)
      .send({ tags: ["x"] })
      .expect(200);

    const tags = patched.body.tags as string[];
    expect(tags).toHaveLength(1);
    expect(tags[0]).toBe("x");
  });
});
