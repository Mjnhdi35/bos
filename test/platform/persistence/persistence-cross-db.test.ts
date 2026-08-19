/**
 * Cross-database persistence test — verifies Postgres and MySQL
 * adapters match the in-memory reference semantics, when those
 * databases are reachable.
 *
 * The test runs against whichever backend POSTGRES_URL / MYSQL_URL
 * is set. If neither is set, all sub-tests are skipped gracefully
 * (NOT failures — they describe an integration environment).
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
import { MySqlEntityRepository } from "../../../src/platform/persistence/mysql/mysql-entity-repository";
import {
  dispose,
  tryConnectPostgres,
  tryConnectMysql,
} from "./persistence-helpers";

const ARTICLE_DEF = {
  name: "Article",
  version: 1,
  fields: [{ name: "title", type: "string", required: true }],
};

describe("Postgres adapter (skipped if POSTGRES_URL unset)", () => {
  const info = tryConnectPostgres();
  if (info.skipReason || !info.knex) {
    it.skip(`skipped: ${info.skipReason ?? "no knex"}`, () => {});
    return;
  }

  it("round-trip CRUD + query", async () => {
    const k = info.knex;
    if (!k) throw new Error("missing knex instance for postgres adapter");
    const repo = new PostgresEntityRepository(k);
    const runtime = new EntityRuntime(
      repo,
      new EventBus(),
      new AuditService(new InMemoryAuditStore()),
      new WorkflowEngine(),
      { current: () => "system" },
    );
    runtime.register("alpha", ARTICLE_DEF);

    await k.schema.dropTableIfExists("app__alpha__Article");
    const id = await runtime.create(refOf("alpha", "Article"), { title: "Pg" });
    const found = await runtime.findById(refOf("alpha", "Article"), id);
    expect(found?.["title"]).toBe("Pg");

    await runtime.update(refOf("alpha", "Article"), id, { title: "Pg2" });
    const after = await runtime.findById(refOf("alpha", "Article"), id);
    expect(after?.["title"]).toBe("Pg2");

    const result = await runtime.query(refOf("alpha", "Article"));
    expect(result.items).toHaveLength(1);

    await runtime.delete(refOf("alpha", "Article"), id);
    expect(await runtime.findById(refOf("alpha", "Article"), id)).toBeNull();

    await k.schema.dropTableIfExists("app__alpha__Article");
    await dispose(info);
  });
});

describe("MySQL adapter (skipped if MYSQL_URL unset)", () => {
  const info = tryConnectMysql();
  if (info.skipReason || !info.knex) {
    it.skip(`skipped: ${info.skipReason ?? "no knex"}`, () => {});
    return;
  }

  it("round-trip CRUD + query", async () => {
    const k = info.knex;
    if (!k) throw new Error("missing knex instance for mysql adapter");
    const repo = new MySqlEntityRepository(k);
    const runtime = new EntityRuntime(
      repo,
      new EventBus(),
      new AuditService(new InMemoryAuditStore()),
      new WorkflowEngine(),
      { current: () => "system" },
    );
    runtime.register("alpha", ARTICLE_DEF);

    await k.schema.dropTableIfExists("app__alpha__Article");
    const id = await runtime.create(refOf("alpha", "Article"), { title: "My" });
    const found = await runtime.findById(refOf("alpha", "Article"), id);
    expect(found?.["title"]).toBe("My");

    await runtime.update(refOf("alpha", "Article"), id, { title: "My2" });
    const after = await runtime.findById(refOf("alpha", "Article"), id);
    expect(after?.["title"]).toBe("My2");

    const result = await runtime.query(refOf("alpha", "Article"));
    expect(result.items).toHaveLength(1);

    await runtime.delete(refOf("alpha", "Article"), id);
    expect(await runtime.findById(refOf("alpha", "Article"), id)).toBeNull();

    await k.schema.dropTableIfExists("app__alpha__Article");
    await dispose(info);
  });
});