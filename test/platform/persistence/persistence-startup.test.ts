/**
 * Persistence-startup test — when the runtime starts with a Postgres
 * or MySQL backend, the repository should auto-create the physical
 * table on first write.
 */

import { describe, expect, it } from "vitest";
import {
  EntityRuntime,
  EventBus,
  AuditService,
  InMemoryAuditStore,
  WorkflowEngine,
  refOf,
} from "../../../src/platform/runtime-index";
import { PostgresEntityRepository } from "../../../src/platform/persistence/postgres/postgres-entity-repository";
import { dispose, tryConnectPostgres } from "./persistence-helpers";

describe("Persistence startup (Postgres auto-create)", () => {
  const info = tryConnectPostgres();
  if (info.skipReason || !info.knex) {
    it.skip(`skipped: ${info.skipReason ?? "no knex"}`, () => {});
    return;
  }

  it("creates a physical table on first insert", async () => {
    const k = info.knex;
    if (!k) throw new Error("missing knex instance for postgres adapter");
    await k.schema.dropTableIfExists("app__alpha__Article");
    const repo = new PostgresEntityRepository(k);
    const runtime = new EntityRuntime(
      repo,
      new EventBus(),
      new AuditService(new InMemoryAuditStore()),
      new WorkflowEngine(),
      { current: () => "system" },
    );
    runtime.register("alpha", {
      name: "Article",
      version: 1,
      fields: [{ name: "title", type: "string", required: true }],
    });
    expect(await k.schema.hasTable("app__alpha__Article")).toBe(false);
    await runtime.create(refOf("alpha", "Article"), { title: "First" });
    expect(await k.schema.hasTable("app__alpha__Article")).toBe(true);

    await k.schema.dropTableIfExists("app__alpha__Article");
    await dispose(info);
  });
});