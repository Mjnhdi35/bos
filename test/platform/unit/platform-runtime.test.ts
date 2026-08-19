/**
 * EntityRuntime unit test — exercises CRUD + workflow + audit + events
 * against the in-memory repository. No HTTP layer involved.
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  AuditService,
  EntityRuntime,
  EventBus,
  InMemoryAuditStore,
  InMemoryRepository,
  ValidationError,
  WorkflowEngine,
  WorkflowError,
  CrossApplicationRelationError,
  refOf,
  type EntityEvent,
} from "../../../src/platform/runtime-index";

function buildRuntime(): {
  runtime: EntityRuntime;
  events: EventBus;
  auditStore: InMemoryAuditStore;
} {
  const events = new EventBus();
  const auditStore = new InMemoryAuditStore();
  const audit = new AuditService(auditStore);
  const workflow = new WorkflowEngine();
  const runtime = new EntityRuntime(
    new InMemoryRepository(),
    events,
    audit,
    workflow,
    { current: () => "test-actor" },
  );
  return { runtime, events, auditStore };
}

const ARTICLE_DEF = {
  name: "Article",
  version: 1,
  fields: [
    { name: "title", type: "string", required: true, maxLength: 200 },
    { name: "slug", type: "string", required: true, maxLength: 200 },
  ],
  workflow: {
    initial: "draft",
    states: ["draft", "review", "published"],
    transitions: [
      { from: "draft", to: "review", action: "submit" },
      { from: "review", to: "published", action: "publish" },
      { from: "review", to: "draft", action: "reject" },
    ],
  },
};

describe("EntityRuntime (in-memory)", () => {
  let runtime: EntityRuntime;
  let events: EventBus;
  let auditStore: InMemoryAuditStore;

  beforeEach(() => {
    ({ runtime, events, auditStore } = buildRuntime());
    runtime.register("alpha", ARTICLE_DEF);
  });

  it("create assigns workflow.initial to the state field", async () => {
    const id = await runtime.create(refOf("alpha", "Article"), {
      title: "Hello",
      slug: "hello",
    });
    const created = await runtime.findById(refOf("alpha", "Article"), id);
    expect(created).not.toBeNull();
    expect(created?.["state"]).toBe("draft");
  });

  it("create fails validation on missing required fields", async () => {
    await expect(
      runtime.create(refOf("alpha", "Article"), { title: "" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("create fails validation on title > maxLength", async () => {
    await expect(
      runtime.create(refOf("alpha", "Article"), {
        title: "x".repeat(201),
        slug: "ok",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("transition moves between states and emits events", async () => {
    const seen: EntityEvent[] = [];
    events.on("entity.created", (e) => {
      seen.push(e);
    });
    events.on("workflow.transitioned", (e) => {
      seen.push(e);
    });

    const id = await runtime.create(refOf("alpha", "Article"), {
      title: "Hi",
      slug: "hi",
    });
    await runtime.transition(refOf("alpha", "Article"), id, "submit");
    await runtime.transition(refOf("alpha", "Article"), id, "publish");

    const after = await runtime.findById(refOf("alpha", "Article"), id);
    expect(after?.["state"]).toBe("published");
    expect(seen.some((e) => e.kind === "entity.created")).toBe(true);
    expect(seen.some((e) => e.kind === "workflow.transitioned")).toBe(true);
  });

  it("transition fails for invalid from/action", async () => {
    const id = await runtime.create(refOf("alpha", "Article"), {
      title: "Hi",
      slug: "hi",
    });
    await expect(
      runtime.transition(refOf("alpha", "Article"), id, "publish"),
    ).rejects.toBeInstanceOf(WorkflowError);
  });

  it("update fails for non-existent record", async () => {
    await expect(
      runtime.update(refOf("alpha", "Article"), "alpha/Article_999999", {
        title: "x",
      }),
    ).rejects.toThrow();
  });

  it("delete removes the record and emits an event", async () => {
    const id = await runtime.create(refOf("alpha", "Article"), {
      title: "Hi",
      slug: "hi",
    });
    await runtime.delete(refOf("alpha", "Article"), id);
    expect(await runtime.findById(refOf("alpha", "Article"), id)).toBeNull();
  });

  it("audit trail captures create/update/delete/transition", async () => {
    const id = await runtime.create(refOf("alpha", "Article"), {
      title: "Hi",
      slug: "hi",
    });
    await runtime.update(refOf("alpha", "Article"), id, { title: "Hello" });
    await runtime.transition(refOf("alpha", "Article"), id, "submit");
    await runtime.delete(refOf("alpha", "Article"), id);

    const trail = await runtime.auditTrail(refOf("alpha", "Article"), id);
    expect(trail).toHaveLength(4);
    expect(trail.map((e) => e.operation)).toEqual([
      "create",
      "update",
      "transition",
      "delete",
    ]);
  });

  it("cross-application relation rejected with CrossApplicationRelationError", async () => {
    runtime.register("alpha", {
      name: "Order",
      version: 1,
      fields: [
        { name: "user_id", type: "string", required: true },
      ],
      relations: [
        { name: "user", kind: "many-to-one", target: "User", required: true },
      ],
    });
    await expect(
      runtime.create(refOf("alpha", "Order"), { user_id: "system/User_1" }),
    ).rejects.toBeInstanceOf(CrossApplicationRelationError);
  });

  it("query returns only records matching the filter", async () => {
    await runtime.create(refOf("alpha", "Article"), { title: "A", slug: "a" });
    await runtime.create(refOf("alpha", "Article"), { title: "B", slug: "b" });
    const result = await runtime.query(refOf("alpha", "Article"), {
      filter: {
        kind: "leaf",
        filter: { field: "slug", operator: "eq", value: "a" },
      },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.["title"]).toBe("A");
  });

  it("scope to application isolates query from other applications", async () => {
    runtime.register("beta", {
      name: "Article",
      version: 1,
      fields: [
        { name: "title", type: "string", required: true },
      ],
    });
    await runtime.create(refOf("alpha", "Article"), { title: "A", slug: "a" });
    await runtime.create(refOf("beta", "Article"), { title: "B" });
    const alphaQ = await runtime.scopedTo("alpha").query("Article");
    const betaQ = await runtime.scopedTo("beta").query("Article");
    expect(alphaQ.items).toHaveLength(1);
    expect(betaQ.items).toHaveLength(1);
    expect(alphaQ.items[0]?.["slug"]).toBe("a");
    expect(betaQ.items[0]?.["title"]).toBe("B");
  });

  it("auditStore tracks all entries with applicationId", async () => {
    await runtime.create(refOf("alpha", "Article"), { title: "A", slug: "a" });
    const entries = await auditStore.query({ applicationId: "alpha" });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.applicationId).toBe("alpha");
  });
});