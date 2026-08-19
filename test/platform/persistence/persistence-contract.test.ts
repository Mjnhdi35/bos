/**
 * Persistence contract — every adapter must implement the same
 * CRUD + query semantics as `InMemoryRepository`. This test uses
 * the in-memory implementation as the reference oracle.
 */

import { describe, expect, it } from "vitest";
import {
  EntityRuntime,
  EventBus,
  AuditService,
  InMemoryAuditStore,
  WorkflowEngine,
  InMemoryRepository,
  refOf,
} from "../../../src/platform/runtime-index";

function buildRuntime(repo: InMemoryRepository): EntityRuntime {
  return new EntityRuntime(
    repo,
    new EventBus(),
    new AuditService(new InMemoryAuditStore()),
    new WorkflowEngine(),
    { current: () => "system" },
  );
}

describe("Persistence contract (in-memory reference)", () => {
  it("insert / findById / update / delete round-trip", async () => {
    const repo = new InMemoryRepository();
    const runtime = buildRuntime(repo);
    runtime.register("alpha", {
      name: "Article",
      version: 1,
      fields: [{ name: "title", type: "string", required: true }],
    });
    const id = await runtime.create(refOf("alpha", "Article"), { title: "Hello" });
    const found = await runtime.findById(refOf("alpha", "Article"), id);
    expect(found?.["title"]).toBe("Hello");
    await runtime.update(refOf("alpha", "Article"), id, { title: "World" });
    const after = await runtime.findById(refOf("alpha", "Article"), id);
    expect(after?.["title"]).toBe("World");
    await runtime.delete(refOf("alpha", "Article"), id);
    expect(await runtime.findById(refOf("alpha", "Article"), id)).toBeNull();
  });

  it("query with eq / neq / in / contains / startsWith", async () => {
    const repo = new InMemoryRepository();
    const runtime = buildRuntime(repo);
    runtime.register("alpha", {
      name: "Article",
      version: 1,
      fields: [{ name: "title", type: "string", required: true }],
    });
    await runtime.create(refOf("alpha", "Article"), { title: "Apple" });
    await runtime.create(refOf("alpha", "Article"), { title: "Apricot" });
    await runtime.create(refOf("alpha", "Article"), { title: "Banana" });

    const eqResult = await runtime.query(refOf("alpha", "Article"), {
      filter: {
        kind: "leaf",
        filter: { field: "title", operator: "eq", value: "Apple" },
      },
    });
    expect(eqResult.items.map((r) => r["title"])).toEqual(["Apple"]);

    const neqResult = await runtime.query(refOf("alpha", "Article"), {
      filter: {
        kind: "leaf",
        filter: { field: "title", operator: "neq", value: "Apple" },
      },
    });
    expect(neqResult.items.map((r) => r["title"]).sort()).toEqual([
      "Apricot",
      "Banana",
    ]);

    const inResult = await runtime.query(refOf("alpha", "Article"), {
      filter: {
        kind: "leaf",
        filter: { field: "title", operator: "in", value: ["Apple", "Banana"] },
      },
    });
    expect(inResult.items.map((r) => r["title"]).sort()).toEqual([
      "Apple",
      "Banana",
    ]);

    const startsResult = await runtime.query(refOf("alpha", "Article"), {
      filter: {
        kind: "leaf",
        filter: {
          field: "title",
          operator: "startsWith",
          value: "Ap",
        },
      },
    });
    expect(startsResult.items.map((r) => r["title"]).sort()).toEqual([
      "Apple",
      "Apricot",
    ]);

    const containsResult = await runtime.query(refOf("alpha", "Article"), {
      filter: {
        kind: "leaf",
        filter: {
          field: "title",
          operator: "contains",
          value: "ricot",
        },
      },
    });
    expect(containsResult.items.map((r) => r["title"])).toEqual(["Apricot"]);
  });

  it("pagination respects page + limit", async () => {
    const repo = new InMemoryRepository();
    const runtime = buildRuntime(repo);
    runtime.register("alpha", {
      name: "Article",
      version: 1,
      fields: [{ name: "title", type: "string", required: true }],
    });
    for (let i = 0; i < 5; i++) {
      await runtime.create(refOf("alpha", "Article"), { title: `T${i}` });
    }
    const page1 = await runtime.query(refOf("alpha", "Article"), {
      page: 1,
      limit: 2,
    });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(5);
    const page3 = await runtime.query(refOf("alpha", "Article"), {
      page: 3,
      limit: 2,
    });
    expect(page3.items).toHaveLength(1);
  });

  it("composite-key buckets keep alpha/Article and beta/Article independent", async () => {
    const repo = new InMemoryRepository();
    const runtime = buildRuntime(repo);
    runtime.register("alpha", {
      name: "Article",
      version: 1,
      fields: [{ name: "title", type: "string", required: true }],
    });
    runtime.register("beta", {
      name: "Article",
      version: 1,
      fields: [{ name: "title", type: "string", required: true }],
    });
    await runtime.create(refOf("alpha", "Article"), { title: "alpha-A" });
    await runtime.create(refOf("beta", "Article"), { title: "beta-A" });
    const alpha = await runtime.query(refOf("alpha", "Article"));
    const beta = await runtime.query(refOf("beta", "Article"));
    expect(alpha.items.map((r) => r["title"])).toEqual(["alpha-A"]);
    expect(beta.items.map((r) => r["title"])).toEqual(["beta-A"]);
  });
});