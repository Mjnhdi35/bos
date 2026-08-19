/**
 * Phase 5.2 executable isolation proof — each application layer
 * independently upholds the isolation contract.
 *
 *   1. Identity: composite keys, no bare-name fallback.
 *   2. Repository: distinct buckets per composite key.
 *   3. Audit: distinct query results per applicationId.
 *   4. Relations: cross-application targets rejected.
 *   5. Counters: id generation is per composite key.
 */

import { describe, expect, it } from "vitest";
import {
  EntityRuntime,
  EventBus,
  AuditService,
  InMemoryAuditStore,
  WorkflowEngine,
  InMemoryRepository,
  CrossApplicationRelationError,
  RuntimeError,
  entityRefKey,
  refOf,
} from "../../../src/platform/runtime-index";

function freshRuntime(): EntityRuntime {
  return new EntityRuntime(
    new InMemoryRepository(),
    new EventBus(),
    new AuditService(new InMemoryAuditStore()),
    new WorkflowEngine(),
    { current: () => "system" },
  );
}

describe("Phase 5.2 — application isolation executable proof", () => {
  it("layer 1: identity keys are unique per composite", () => {
    expect(entityRefKey(refOf("alpha", "Product"))).not.toBe(
      entityRefKey(refOf("beta", "Product")),
    );
    expect(entityRefKey(refOf("alpha", "Product"))).not.toBe(
      entityRefKey(refOf("alpha", "Category")),
    );
  });

  it("layer 2: repository buckets are distinct", async () => {
    const runtime = freshRuntime();
    runtime.register("alpha", {
      name: "Product",
      version: 1,
      fields: [{ name: "name", type: "string", required: true }],
    });
    runtime.register("beta", {
      name: "Product",
      version: 1,
      fields: [{ name: "name", type: "string", required: true }],
    });
    await runtime.create(refOf("alpha", "Product"), { name: "a" });
    await runtime.create(refOf("beta", "Product"), { name: "b" });
    const alpha = await runtime.query(refOf("alpha", "Product"));
    const beta = await runtime.query(refOf("beta", "Product"));
    expect(alpha.items).toHaveLength(1);
    expect(beta.items).toHaveLength(1);
    expect(alpha.items[0]?.["name"]).toBe("a");
    expect(beta.items[0]?.["name"]).toBe("b");
  });

  it("layer 3: audit query filters by applicationId", async () => {
    const runtime = freshRuntime();
    runtime.register("alpha", {
      name: "Product",
      version: 1,
      fields: [{ name: "name", type: "string", required: true }],
    });
    runtime.register("beta", {
      name: "Product",
      version: 1,
      fields: [{ name: "name", type: "string", required: true }],
    });
    await runtime.create(refOf("alpha", "Product"), { name: "a" });
    await runtime.create(refOf("beta", "Product"), { name: "b" });
    const alphaAudit = await runtime.queryAudit({ applicationId: "alpha" });
    const betaAudit = await runtime.queryAudit({ applicationId: "beta" });
    expect(alphaAudit.every((e) => e.applicationId === "alpha")).toBe(true);
    expect(betaAudit.every((e) => e.applicationId === "beta")).toBe(true);
  });

  it("layer 4: relation targets outside source app are rejected", async () => {
    const runtime = freshRuntime();
    runtime.register("alpha", {
      name: "Order",
      version: 1,
      fields: [{ name: "user_id", type: "string", required: true }],
      relations: [
        { name: "user", kind: "many-to-one", target: "User", required: true },
      ],
    });
    await expect(
      runtime.create(refOf("alpha", "Order"), { user_id: "anything" }),
    ).rejects.toBeInstanceOf(CrossApplicationRelationError);
  });

  it("layer 5: id counters reset per composite key", async () => {
    const runtime = freshRuntime();
    runtime.register("alpha", {
      name: "Product",
      version: 1,
      fields: [{ name: "name", type: "string", required: true }],
    });
    runtime.register("beta", {
      name: "Product",
      version: 1,
      fields: [{ name: "name", type: "string", required: true }],
    });
    const a1 = await runtime.create(refOf("alpha", "Product"), { name: "a1" });
    const a2 = await runtime.create(refOf("alpha", "Product"), { name: "a2" });
    const b1 = await runtime.create(refOf("beta", "Product"), { name: "b1" });
    const b2 = await runtime.create(refOf("beta", "Product"), { name: "b2" });
    expect(a1).toMatch(/^Product_000001$/);
    expect(a2).toMatch(/^Product_000002$/);
    expect(b1).toMatch(/^Product_000001$/);
    expect(b2).toMatch(/^Product_000002$/);
  });

  it("runtime.register throws RuntimeError on version mismatch (sanity)", () => {
    const runtime = freshRuntime();
    runtime.register("alpha", {
      name: "Product",
      version: 1,
      fields: [],
    });
    expect(() =>
      runtime.register("alpha", {
        name: "Product",
        version: 2,
        fields: [],
      }),
    ).toThrow(RuntimeError);
  });
});