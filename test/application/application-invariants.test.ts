/**
 * Application invariants — verifies that compileApplication rejects
 * bad metadata and that registration tracks application metadata.
 */

import { describe, expect, it } from "vitest";
import {
  EntityRuntime,
  EventBus,
  AuditService,
  InMemoryAuditStore,
  WorkflowEngine,
  InMemoryRepository,
  compileApplication,
  registerApplication,
} from "../../src/platform/runtime-index";

describe("Application invariants", () => {
  it("compileApplication rejects bad name", () => {
    expect(() =>
      compileApplication({ name: "Bad-Name", version: 1, entities: [] }),
    ).toThrow();
  });

  it("compileApplication rejects empty entities", () => {
    expect(() =>
      compileApplication({ name: "alpha", version: 1, entities: [] }),
    ).toThrow();
  });

  it("compileApplication rejects relation target not in the application", () => {
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
    ).toThrow();
  });

  it("registerApplication tracks the application metadata", () => {
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
          name: "Article",
          version: 1,
          fields: [{ name: "title", type: "string", required: true }],
        },
      ],
    });
    const app = runtime.getApplication("alpha");
    expect(app?.name).toBe("alpha");
    expect(app?.entities).toEqual(["Article"]);
  });
});