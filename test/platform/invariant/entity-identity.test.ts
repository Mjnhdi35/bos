/**
 * Entity-identity invariant test.
 *
 * Asserts the runtime's identity contract:
 *
 *   1. EntityRef = { applicationId, entityName }; never bare entityName.
 *   2. Two applications with the same entity name resolve to distinct
 *      composite identities (`entityRefKey`).
 *   3. `getDefinition` is composite-keyed.
 *   4. `ScopedEntityRuntime.getDefinition(entityName)` is the only
 *      accepted shorthand, and it forwards to the composite key.
 *
 * This test guards Phase 4.1 / Phase 5.2 — re-introducing a bare-name
 * fallback would silently collapse application isolation.
 */

import { describe, expect, it } from "vitest";
import {
  EntityRuntime,
  EventBus,
  AuditService,
  InMemoryAuditStore,
  WorkflowEngine,
  InMemoryRepository,
  RuntimeError,
  entityRefKey,
  refOf,
} from "../../../src/platform/runtime-index";

function buildRuntime(): EntityRuntime {
  return new EntityRuntime(
    new InMemoryRepository(),
    new EventBus(),
    new AuditService(new InMemoryAuditStore()),
    new WorkflowEngine(),
    { current: () => "system" },
  );
}

describe("EntityRef identity contract", () => {
  it("composite key is `${applicationId}/${entityName}`", () => {
    expect(entityRefKey(refOf("alpha", "Product"))).toBe("alpha/Product");
    expect(entityRefKey(refOf("beta", "Product"))).toBe("beta/Product");
  });

  it("two applications with the same entity name have different keys", () => {
    const a = entityRefKey(refOf("alpha", "Product"));
    const b = entityRefKey(refOf("beta", "Product"));
    expect(a).not.toBe(b);
  });

  it("getDefinition requires composite EntityRef (no bare-name fallback)", () => {
    const runtime = buildRuntime();
    runtime.register("alpha", { name: "Product", version: 1, fields: [] });
    expect(runtime.getDefinition(refOf("alpha", "Product"))?.name).toBe("Product");
    // The bare-name fallback removed in Phase 5.2 — bare strings must
    // not resolve. Without an EntityRef, the caller cannot express
    // scope, so `getDefinition` cannot answer.
    expect(runtime.getDefinition({} as never)).toBeNull();
    expect(runtime.getDefinition({ applicationId: "alpha" } as never)).toBeNull();
  });

  it("scopedTo(entityName).getDefinition forwards to composite key", () => {
    const runtime = buildRuntime();
    runtime.register("alpha", { name: "Product", version: 1, fields: [] });
    const alpha = runtime.scopedTo("alpha");
    expect(alpha.getDefinition("Product")?.name).toBe("Product");
    expect(alpha.getDefinition("NotPresent")).toBeNull();
  });

  it("register rejects version mismatch on the same composite key", () => {
    const runtime = buildRuntime();
    runtime.register("alpha", { name: "Product", version: 1, fields: [] });
    expect(() =>
      runtime.register("alpha", { name: "Product", version: 2, fields: [] }),
    ).toThrow(RuntimeError);
  });

  it("listEntities returns the bare entity names for the application", () => {
    const runtime = buildRuntime();
    runtime.register("alpha", { name: "Product", version: 1, fields: [] });
    runtime.register("alpha", { name: "Category", version: 1, fields: [] });
    runtime.register("beta", { name: "Product", version: 1, fields: [] });
    expect([...runtime.listEntities("alpha")].sort()).toEqual([
      "Category",
      "Product",
    ]);
    expect(runtime.listEntities("beta")).toEqual(["Product"]);
  });
});