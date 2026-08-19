/**
 * Application-level invariants:
 *   - compileApplication rejects an entity whose relation target is
 *     not declared in the same application.
 *   - runtime.register rejects a re-registration at a different
 *     version on the same composite key.
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
  compileApplication,
  registerApplication,
  refOf,
} from "../../../src/platform/runtime-index";

describe("Application compile/runtime invariants", () => {
  it("compileApplication rejects a relation target outside the application", () => {
    expect(() =>
      compileApplication({
        name: "alpha",
        version: 1,
        entities: [
          {
            name: "Order",
            version: 1,
            fields: [{ name: "user_id", type: "string", required: true }],
            relations: [
              {
                name: "user",
                kind: "many-to-one",
                target: "User",
                required: true,
              },
            ],
          },
        ],
      }),
    ).toThrow(RuntimeError);
  });

  it("runtime.register rejects version mismatch on same composite key", () => {
    const runtime = new EntityRuntime(
      new InMemoryRepository(),
      new EventBus(),
      new AuditService(new InMemoryAuditStore()),
      new WorkflowEngine(),
      { current: () => "system" },
    );
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

  it("registerApplication tracks the application metadata", () => {
    const runtime = new EntityRuntime(
      new InMemoryRepository(),
      new EventBus(),
      new AuditService(new InMemoryAuditStore()),
      new WorkflowEngine(),
      { current: () => "system" },
    );
    const compiled = registerApplication(runtime, {
      name: "alpha",
      version: 1,
      description: "Test app",
      entities: [
        {
          name: "Article",
          version: 1,
          fields: [{ name: "title", type: "string", required: true }],
        },
      ],
    });
    expect(compiled.name).toBe("alpha");
    const app = runtime.getApplication("alpha");
    expect(app?.description).toBe("Test app");
    expect(app?.entities).toEqual(["Article"]);
    void refOf;
  });
});