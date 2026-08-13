import * as fs from "node:fs";
import * as path from "node:path";
import { type Knex } from "../infrastructure/database/knex";
import {
  type EntityDefinition,
  validateEntityDefinition,
} from "./domain/definition";
import { type EntityMetadata } from "./domain/metadata";
import { countMetadata, insertMetadata } from "./metadata-repository";
import { createPhysicalTable } from "./schema-materializer";

export type Snapshot = {
  readonly entities: readonly EntityDefinition[];
};

export type SnapshotLoadResult = {
  readonly loaded: number;
  readonly skipped: boolean;
};

export async function loadSnapshot(
  knex: Knex,
  snapshotPath: string,
): Promise<SnapshotLoadResult> {
  const existing = await countMetadata(knex);
  if (existing > 0) return { loaded: 0, skipped: true };

  const absolute = path.isAbsolute(snapshotPath)
    ? snapshotPath
    : path.resolve(process.cwd(), snapshotPath);
  if (!fs.existsSync(absolute)) return { loaded: 0, skipped: false };

  const raw = JSON.parse(fs.readFileSync(absolute, "utf8")) as unknown;
  if (raw === null || typeof raw !== "object") {
    throw new Error("snapshot root must be object");
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.entities)) {
    throw new Error("snapshot.entities must be array");
  }

  const now = new Date();
  let loaded = 0;
  for (const e of obj.entities) {
    const def = validateEntityDefinition(e);
    const metadata: EntityMetadata = {
      name: def.name,
      version: def.version,
      fields: def.fields,
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    };
    await insertMetadata(knex, metadata);
    await createPhysicalTable(knex, metadata);
    loaded += 1;
  }
  return { loaded, skipped: false };
}
