import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app/create-app";
import { type Knex } from "../src/infrastructure/database/knex";

function mockDb(): Knex {
  return {
    raw: vi.fn(),
  } as unknown as Knex;
}

describe("GET /health", () => {
  it("returns ok status", async () => {
    const app = createApp({ db: mockDb() });
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("GET /health/db", () => {
  it("returns 200 when DB is reachable", async () => {
    const raw = vi.fn().mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });
    const app = createApp({ db: { raw } as unknown as Knex });
    const response = await request(app).get("/health/db").expect(200);

    expect(response.body).toEqual({ status: "ok", database: "connected" });
    expect(raw).toHaveBeenCalledWith("SELECT 1");
  });

  it("returns 503 when DB is unreachable", async () => {
    const raw = vi.fn().mockRejectedValueOnce(new Error("connection refused"));
    const app = createApp({ db: { raw } as unknown as Knex });
    const response = await request(app).get("/health/db").expect(503);

    expect(response.body).toEqual({ status: "error", database: "unreachable" });
  });
});
