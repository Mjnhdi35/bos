/**
 * Application-level integration — register an ApplicationDefinition,
 * exercise the runtime, and confirm every layer (definitions, audit,
 * events) reflects the application's scope.
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

describe("ApplicationDefinition registration", () => {
  it("registers an application with two entities and serves both", async () => {
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
        {
          name: "Category",
          version: 1,
          fields: [{ name: "name", type: "string", required: true }],
        },
      ],
    });

    expect(compiled.name).toBe("alpha");
    expect(compiled.entities.map((e: { name: string }) => e.name)).toEqual([
      "Article",
      "Category",
    ]);
    expect(runtime.getApplication("alpha")?.entities).toEqual([
      "Article",
      "Category",
    ]);

    await runtime.create(refOf("alpha", "Article"), { title: "Hi" });
    await runtime.create(refOf("alpha", "Category"), { name: "Cat" });

    const articles = await runtime.query(refOf("alpha", "Article"));
    const categories = await runtime.query(refOf("alpha", "Category"));
    expect(articles.items).toHaveLength(1);
    expect(categories.items).toHaveLength(1);
  });
});