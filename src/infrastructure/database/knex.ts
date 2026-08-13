import knex, { Knex } from "knex";
import config from "./config";

export type { Knex };
export const db: Knex = knex(config);
