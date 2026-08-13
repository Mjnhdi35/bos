import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import {
  cleanupPlatformTables,
  createPlatformTestApp,
} from "../helpers/create-platform-test-app";

beforeEach(async () => {
  await cleanupPlatformTables();
});

describe("GET /platform/entities", () => {
  it("lists registered entities", async () => {
    const app = createPlatformTestApp();
    await request(app)
      .post("/platform/entities")
      .send({
        name: "products",
        version: 1,
        fields: [{ name: "title", type: "string", required: true }],
      })
      .expect(201);

    const res = await request(app).get("/platform/entities").expect(200);
    expect(res.body.entities).toHaveLength(1);
    expect(res.body.entities[0].name).toBe("products");
  });
});
