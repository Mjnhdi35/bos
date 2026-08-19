/**
 * Persistence factory — wires the runtime to a config-driven backend.
 *
 * The runtime reads through `EntityRepository`; this factory gives the
 * rest of the app a single place to construct the right adapter based
 * on env. The runtime itself does NOT import Knex, pg, or mysql2.
 */

import type { Knex } from "knex";
import knex, { type Knex as KnexType } from "knex";
import type { EntityRepository } from "../repository";
import { InMemoryRepository } from "../repository";
import { PostgresEntityRepository } from "./postgres/postgres-entity-repository";
import { MySqlEntityRepository } from "./mysql/mysql-entity-repository";
import { env } from "../../shared/config/env";

export type DatabaseKind = "inmemory" | "postgres" | "mysql";

export type PersistenceHandle = {
  readonly kind: DatabaseKind;
  readonly knex?: KnexType;
  readonly repository: EntityRepository;
};

export function createPersistence(databaseKind?: DatabaseKind): PersistenceHandle {
  const kind: DatabaseKind = databaseKind ?? env.DATABASE;
  if (kind === "inmemory") {
    return { kind, repository: new InMemoryRepository() };
  }
  if (kind === "postgres") {
    const k = makePostgresKnex();
    return { kind, knex: k, repository: new PostgresEntityRepository(k) };
  }
  // kind === "mysql" (the remaining DatabaseKind variant)
  const k = makeMysqlKnex();
  return { kind, knex: k, repository: new MySqlEntityRepository(k) };
}

function makePostgresKnex(): Knex {
  return knex({
    client: "pg",
    connection: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
    },
    pool: { min: 0, max: 10 },
  });
}

function makeMysqlKnex(): Knex {
  return knex({
    client: "mysql2",
    connection: {
      host: env.MYSQL_HOST,
      port: env.MYSQL_PORT,
      database: env.MYSQL_DATABASE,
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
    },
    pool: { min: 0, max: 10 },
  });
}
