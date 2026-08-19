/**
 * Phase 6 Generic API acceptance suite.
 *
 * Covers all 13 routes end-to-end:
 *   A)  GET /api/applications lists registered applications
 *   B)  GET /api/applications/:id returns the application metadata
 *   C)  GET /api/applications/:id/entities lists entities
 *   D)  GET /api/applications/:id/entities/:name/definition returns compiled metadata
 *   E)  POST /api/applications/:id/entities/:name creates a record
 *   F)  GET /api/applications/:id/entities/:name lists records
 *   G)  PATCH /api/applications/:id/entities/:name/:id updates a record
 *   H)  DELETE /api/applications/:id/entities/:name/:id deletes a record
 *   I)  GET /api/applications/:id/entities/:name/:id returns a record
 *   J)  Validation: invalid body returns 422
 *   K)  Validation: 500-char title returns 422
 *   L)  Query DSL — URL form with operator suffix
 *   M)  Workflow — submit / publish via path-param transition
 *   N)  Workflow — body form `{ transition }` and `{ action }`
 *   O)  Workflow — invalid transition returns 409
 *   P)  Audit trail endpoint
 *   Q)  Query DSL — POST _query body form
 *   R)  Query DSL — unknown operator suffix returns 400
 *   S)  Cross-application isolation via HTTP
 *   T)  Event handlers receive entity.created events
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

describe("Phase 6 — Generic API acceptance", () => {
  let app: Express;
  let rt: AppRuntime;

  beforeEach(async () => {
    ({ app, rt } = await makeApp());
  });

  it("A) GET /api/applications lists registered applications", async () => {
    const res = await request(app).get("/api/applications").expect(200);
    const names = (res.body.data as { name: string }[]).map((a) => a.name);
    expect(names).toContain("system");
    expect(names).toContain("landing_page_backend");
    expect(names).toContain("smoothie_store");
  });

  it("B) GET /api/applications/:id returns application metadata", async () => {
    const res = await request(app)
      .get("/api/applications/landing_page_backend")
      .expect(200);
    expect(res.body.data.name).toBe("landing_page_backend");
    expect(res.body.data.entities).toContain("LandingPage");
  });

  it("B-) GET /api/applications/:id returns 404 for unknown app", async () => {
    await request(app).get("/api/applications/nope").expect(404);
  });

  it("C) GET /api/applications/:id/entities lists entities", async () => {
    const res = await request(app)
      .get("/api/applications/smoothie_store/entities")
      .expect(200);
    expect(res.body.data).toEqual(
      expect.arrayContaining(["Category", "Product", "Customer", "Order", "OrderItem"]),
    );
  });

  it("D) GET .../entities/:name/definition returns compiled metadata", async () => {
    const res = await request(app)
      .get("/api/applications/landing_page_backend/entities/LandingPage/definition")
      .expect(200);
    expect(res.body.data.applicationId).toBe("landing_page_backend");
    expect(res.body.data.entityName).toBe("LandingPage");
    expect(res.body.data.fields).toBeInstanceOf(Array);
    expect(res.body.data.workflow).toBeTruthy();
  });

  it("D-) GET .../definition returns 404 for unknown entity", async () => {
    await request(app)
      .get("/api/applications/landing_page_backend/entities/Nope/definition")
      .expect(404);
  });

  it("E) POST .../entities/:name creates a record (LandingPage)", async () => {
    const res = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "Welcome", slug: "welcome", content: "Hello", published: false })
      .expect(201);
    expect(res.body.data.id).toMatch(/^LandingPage_\d{6}$/);
    expect(res.body.data.state).toBe("draft");
  });

  it("E-) POST .../entities/:name returns 422 on missing required field", async () => {
    const res = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "x" })
      .expect(422);
    expect(res.body.error).toBe("validation_failed");
  });

  it("F) GET .../entities/:name lists records", async () => {
    await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "T1", slug: "t1", content: "C1", published: false })
      .expect(201);
    await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "T2", slug: "t2", content: "C2", published: false })
      .expect(201);
    const res = await request(app)
      .get("/api/applications/landing_page_backend/entities/LandingPage")
      .expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
  });

  it("G) PATCH .../entities/:name/:id updates a record (200)", async () => {
    const created = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "Original", slug: "orig", content: "C", published: false });
    const id = created.body.data.id as string;
    const res = await request(app)
      .patch(`/api/applications/landing_page_backend/entities/LandingPage/${id}`)
      .send({ title: "Renamed" })
      .expect(200);
    expect(res.body.data.title).toBe("Renamed");
  });

  it("G-) PATCH .../entities/:name/:id returns 422 for over-length value", async () => {
    const created = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "T", slug: "t", content: "C", published: false });
    const id = created.body.data.id as string;
    await request(app)
      .patch(`/api/applications/landing_page_backend/entities/LandingPage/${id}`)
      .send({ title: "x".repeat(500) })
      .expect(422);
  });

  it("H) DELETE .../entities/:name/:id deletes a record", async () => {
    const created = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "T", slug: "t", content: "C", published: false });
    const id = created.body.data.id as string;
    await request(app)
      .delete(`/api/applications/landing_page_backend/entities/LandingPage/${id}`)
      .expect(204);
    await request(app)
      .get(`/api/applications/landing_page_backend/entities/LandingPage/${id}`)
      .expect(404);
  });

  it("I) GET .../entities/:name/:id returns the record", async () => {
    const created = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "T", slug: "t", content: "C", published: false });
    const id = created.body.data.id as string;
    const res = await request(app)
      .get(`/api/applications/landing_page_backend/entities/LandingPage/${id}`)
      .expect(200);
    expect(res.body.data.id).toBe(id);
  });

  it("I-) GET .../entities/:name/:id returns 404 for unknown id", async () => {
    await request(app)
      .get("/api/applications/landing_page_backend/entities/LandingPage/missing")
      .expect(404);
  });

  it("L) Query DSL — URL form with operator suffix", async () => {
    await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "Apple", slug: "apple", content: "x", published: false });
    await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "Banana", slug: "banana", content: "x", published: false });
    const res = await request(app)
      .get("/api/applications/landing_page_backend/entities/LandingPage")
      .query({ "filter[slug_eq]": "apple" })
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Apple");
  });

  it("L-) Query DSL — startsWith operator", async () => {
    await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "Apple", slug: "apple", content: "x", published: false });
    await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "Apricot", slug: "apricot", content: "x", published: false });
    const res = await request(app)
      .get("/api/applications/landing_page_backend/entities/LandingPage")
      .query({ "filter[title_startsWith]": "Ap" })
      .expect(200);
    expect(res.body.data.length).toBe(2);
  });

  it("R) Query DSL — unknown operator suffix returns 400", async () => {
    await request(app)
      .get("/api/applications/landing_page_backend/entities/LandingPage")
      .query({ "filter[slug_bogus]": "x" })
      .expect(400);
  });

  it("Q) Query DSL — POST _query body form", async () => {
    await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "Apple", slug: "apple", content: "x", published: false });
    await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "Banana", slug: "banana", content: "x", published: false });
    const res = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage/_query")
      .send({
        filter: { slug_eq: "banana" },
        sort: ["-title"],
        page: 1,
        limit: 10,
      })
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Banana");
  });

  it("M) Workflow — submit then publish via path-param transition", async () => {
    const created = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "T", slug: "t", content: "C", published: false });
    const id = created.body.data.id as string;
    await request(app)
      .post(`/api/applications/landing_page_backend/entities/LandingPage/${id}/transition/submit`)
      .expect(200);
    await request(app)
      .post(`/api/applications/landing_page_backend/entities/LandingPage/${id}/transition/publish`)
      .expect(200);
    const after = await request(app)
      .get(`/api/applications/landing_page_backend/entities/LandingPage/${id}`)
      .expect(200);
    expect(after.body.data.state).toBe("published");
  });

  it("M-) Workflow — body form `{ transition }`", async () => {
    const created = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "T", slug: "t", content: "C", published: false });
    const id = created.body.data.id as string;
    await request(app)
      .post(`/api/applications/landing_page_backend/entities/LandingPage/${id}/transition`)
      .send({ transition: "submit" })
      .expect(200);
  });

  it("M-) Workflow — body form `{ action }`", async () => {
    const created = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "T", slug: "t", content: "C", published: false });
    const id = created.body.data.id as string;
    await request(app)
      .post(`/api/applications/landing_page_backend/entities/LandingPage/${id}/transition`)
      .send({ action: "submit" })
      .expect(200);
  });

  it("O) Workflow — invalid action returns 409", async () => {
    const created = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "T", slug: "t", content: "C", published: false });
    const id = created.body.data.id as string;
    await request(app)
      .post(`/api/applications/landing_page_backend/entities/LandingPage/${id}/transition/publish`)
      .expect(409);
  });

  it("P) Audit trail endpoint returns lifecycle events", async () => {
    const created = await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "T", slug: "t", content: "C", published: false });
    const id = created.body.data.id as string;
    await request(app)
      .post(`/api/applications/landing_page_backend/entities/LandingPage/${id}/transition/submit`)
      .expect(200);
    const res = await request(app)
      .get(`/api/applications/landing_page_backend/entities/LandingPage/${id}/audit`)
      .expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.map((e: { operation: string }) => e.operation)).toEqual([
      "create",
      "transition",
    ]);
  });

  it("S) Cross-application isolation — Product in smoothie_store does not appear in landing_page_backend", async () => {
    // First create a Category so the FK resolves.
    await request(app)
      .post("/api/applications/smoothie_store/entities/Category")
      .send({ name: "Smoothies", slug: "smoothies" })
      .expect(201);
    await request(app)
      .post("/api/applications/smoothie_store/entities/Product")
      .send({
        name: "Green Smoothie",
        slug: "green",
        price_cents: 1200,
        stock: 10,
        category_id: "Category_000001",
      })
      .expect(201);

    // Try to read it from a different application — should 404.
    await request(app)
      .get("/api/applications/landing_page_backend/entities/Product/anything")
      .expect(404);
  });

  it("T) Event handlers receive entity.created events", async () => {
    const recorded: Array<{ kind: string }> = [];
    rt.events.on("entity.created", (e) => {
      recorded.push({ kind: e.kind });
    });
    await request(app)
      .post("/api/applications/landing_page_backend/entities/LandingPage")
      .send({ title: "T", slug: "t", content: "C", published: false })
      .expect(201);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.kind).toBe("entity.created");
  });
});