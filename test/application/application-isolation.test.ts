/**
 * Application isolation end-to-end — exercises create/query/audit
 * across two applications with the same entity name and verifies
 * that the identity contract holds at every layer.
 */

import { describe, expect, it } from "vitest";
import {
  EntityRuntime,
  EventBus,
  AuditService,
  InMemoryAuditStore,
  WorkflowEngine,
  InMemoryRepository,
  registerApplication,
  refOf,
} from "../../src/platform/runtime-index";

describe("Application isolation end-to-end", () => {
  it("two apps with same entity name do not collide", async () => {
    const runtime = new EntityRuntime(
      new InMemoryRepository(),
      new EventBus(),
      new AuditService(new InMemoryAuditStore()),
      new WorkflowEngine(),
      { current: () => "system" },
    );

    registerApplication(runtime, {
      name: "alpha",
      version: 1,
      entities: [
        {
          name: "Product",
          version: 1,
          fields: [{ name: "name", type: "string", required: true }],
        },
      ],
    });
    registerApplication(runtime, {
      name: "beta",
      version: 1,
      entities: [
        {
          name: "Product",
          version: 1,
          fields: [{ name: "name", type: "string", required: true }],
        },
      ],
    });

    const aId = await runtime.create(refOf("alpha", "Product"), { name: "alpha-product" });
    const bId = await runtime.create(refOf("beta", "Product"), { name: "beta-product" });
    // Ids share the entity-name prefix but the counter is composite-keyed
    // so the records resolve to different storage buckets.
    expect(aId.startsWith("Product_")).toBe(true);
    expect(bId.startsWith("Product_")).toBe(true);
    // Same id text, different buckets — alpha's Product_000001 is
    // distinct from beta's Product_000001.
    const aRec = await runtime.findById(refOf("alpha", "Product"), aId);
    const bRec = await runtime.findById(refOf("beta", "Product"), bId);
    expect(aRec?.["name"]).toBe("alpha-product");
    expect(bRec?.["name"]).toBe("beta-product");
    expect(aRec?.["id"]).toBe(bRec?.["id"]); // textual equality is fine
    // Cross-application find: alpha's Product_000001 in beta's bucket
    // returns beta's record (same id, different record).
    const cross = await runtime.findById(refOf("beta", "Product"), aId);
    expect(cross?.["name"]).toBe("beta-product");

    const aItems = await runtime.query(refOf("alpha", "Product"));
    const bItems = await runtime.query(refOf("beta", "Product"));
    expect(aItems.items.map((r: Record<string, unknown>) => r["name"])).toEqual(["alpha-product"]);
    expect(bItems.items.map((r: Record<string, unknown>) => r["name"])).toEqual(["beta-product"]);

    const audit = await runtime.queryAudit();
    expect(audit.every((e: { applicationId: string }) => typeof e.applicationId === "string")).toBe(true);
  });
});