/**
 * Persistence helpers — environment-aware fixtures.
 *
 * The persistence tests connect to a real database when one is
 * configured (POSTGRES_URL / MYSQL_URL) and skip gracefully otherwise.
 * The in-memory tests use `InMemoryRepository`.
 */

import type { Knex } from "knex";
import knex from "knex";

export type PersistenceBackend = "inmemory" | "postgres" | "mysql";

export type ConnectionInfo = {
  readonly backend: PersistenceBackend;
  readonly knex?: Knex;
  readonly skipReason?: string;
};

export function tryConnectPostgres(): ConnectionInfo {
  const url = process.env["POSTGRES_URL"];
  if (!url) {
    return { backend: "postgres", skipReason: "POSTGRES_URL not set" };
  }
  try {
    const k = knex({
      client: "pg",
      connection: url,
      pool: { min: 0, max: 4 },
    });
    return { backend: "postgres", knex: k };
  } catch (e) {
    return {
      backend: "postgres",
      skipReason: `connection error: ${(e as Error).message}`,
    };
  }
}

export function tryConnectMysql(): ConnectionInfo {
  const url = process.env["MYSQL_URL"];
  if (!url) {
    return { backend: "mysql", skipReason: "MYSQL_URL not set" };
  }
  try {
    const k = knex({
      client: "mysql2",
      connection: url,
      pool: { min: 0, max: 4 },
    });
    return { backend: "mysql", knex: k };
  } catch (e) {
    return {
      backend: "mysql",
      skipReason: `connection error: ${(e as Error).message}`,
    };
  }
}

export async function dispose(info: ConnectionInfo): Promise<void> {
  if (info.knex) await info.knex.destroy();
}