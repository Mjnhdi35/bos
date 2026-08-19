/**
 * Supplier dynamic test — proves that a new domain (Supplier) can be
 * added with its own workflow guards without modifying the runtime.
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

function buildRuntime(): EntityRuntime {
  return new EntityRuntime(
    new InMemoryRepository(),
    new EventBus(),
    new AuditService(new InMemoryAuditStore()),
    new WorkflowEngine(),
    { current: () => "system" },
  );
}

const SUPPLIER_DEF = {
  name: "Supplier",
  version: 1,
  fields: [
    { name: "name", type: "string", required: true, maxLength: 200 },
    { name: "status", type: "string", required: true },
  ],
  workflow: {
    initial: "pending",
    states: ["pending", "approved", "rejected"],
    transitions: [
      { from: "pending", to: "approved", action: "approve" },
      { from: "pending", to: "rejected", action: "reject" },
    ],
  },
};

describe("Supplier (dynamic domain)", () => {
  it("creates a Supplier with workflow.initial = pending", async () => {
    const runtime = buildRuntime();
    runtime.register("alpha", SUPPLIER_DEF);
    const id = await runtime.create(refOf("alpha", "Supplier"), {
      name: "Acme",
      status: "active",
    });
    const created = await runtime.findById(refOf("alpha", "Supplier"), id);
    expect(created?.["state"]).toBe("pending");
  });

  it("approves a Supplier via workflow transition", async () => {
    const runtime = buildRuntime();
    runtime.register("alpha", SUPPLIER_DEF);
    const id = await runtime.create(refOf("alpha", "Supplier"), {
      name: "Acme",
      status: "active",
    });
    const newState = await runtime.transition(refOf("alpha", "Supplier"), id, "approve");
    expect(newState).toBe("approved");
  });
});