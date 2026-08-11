import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app";

describe("GET /health", () => {
  it("returns ok status", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toEqual({
      status: "ok",
    });
  });
});
