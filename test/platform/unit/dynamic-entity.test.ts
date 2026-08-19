/**
 * Dynamic-entity test — verifies that adding a NEW entity to a
 * registered application does not require any runtime recompile or
 * new code path. The same generic CRUD round-trips through the
 * EntityRuntime.
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

describe("Dynamic entity registration", () => {
  it("supports registering new entities without runtime restart", async () => {
    const runtime = buildRuntime();
    registerApplication(runtime, {
      name: "alpha",
      version: 1,
      entities: [
        {
          name: "Article",
          version: 1,
          fields: [{ name: "title", type: "string", required: true }],
        },
        {
          name: "Comment",
          version: 1,
          fields: [{ name: "body", type: "text", required: true }],
        },
      ],
    });
    expect([...runtime.listEntities("alpha")].sort()).toEqual(["Article", "Comment"]);

    const articleId = await runtime.create(refOf("alpha", "Article"), {
      title: "Hello",
    });
    const commentId = await runtime.create(refOf("alpha", "Comment"), {
      body: "First!",
    });
    expect(articleId).toMatch(/^Article_\d{6}$/);
    expect(commentId).toMatch(/^Comment_\d{6}$/);
  });

  it("supports a brand-new application without touching other applications", async () => {
    const runtime = buildRuntime();
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
    registerApplication(runtime, {
      name: "invoicing",
      version: 1,
      entities: [
        {
          name: "Invoice",
          version: 1,
          fields: [
            { name: "amount", type: "number", required: true },
            { name: "currency", type: "string", required: true },
          ],
        },
      ],
    });
    expect(
      runtime.listApplications().map((a: { name: string }) => a.name).sort(),
    ).toEqual(["alpha", "invoicing"]);
    const id = await runtime.create(refOf("invoicing", "Invoice"), {
      amount: 1000,
      currency: "USD",
    });
    expect(id).toMatch(/^Invoice_\d{6}$/);
  });
});