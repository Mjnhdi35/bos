import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../../src/infrastructure/database/knex";
import {
  countMetadata,
  deleteMetadata,
  findMetadataByName,
  findMetadataByNameAndVersion,
  insertMetadata,
  listMetadata,
} from "../../../../src/platform/metadata-repository";
import { type EntityMetadata } from "../../../../src/platform/domain/metadata";

const knex = db;

beforeEach(async () => {
  await knex("platform_entities").delete();
});

afterEach(async () => {
  await knex("platform_entities").delete();
});

function makeMetadata(name: string, version: number): EntityMetadata {
  return {
    name,
    version,
    fields: [{ name: "title", type: "string", required: true }],
    isSystem: false,
    createdAt: new Date("2026-08-13T00:00:00Z"),
    updatedAt: new Date("2026-08-13T00:00:00Z"),
  };
}

describe("metadata repository", () => {
  it("insert + findByNameAndVersion round-trips", async () => {
    const md = makeMetadata("products", 1);
    const inserted = await insertMetadata(knex, md);
    expect(inserted.name).toBe("products");
    expect(inserted.version).toBe(1);

    const found = await findMetadataByNameAndVersion(knex, "products", 1);
    expect(found?.name).toBe("products");
  });

  it("findByName returns all versions descending", async () => {
    await insertMetadata(knex, makeMetadata("products", 1));
    await insertMetadata(knex, makeMetadata("products", 2));
    const all = await findMetadataByName(knex, "products");
    expect(all.map((m) => m.version)).toEqual([2, 1]);
  });

  it("list returns everything", async () => {
    await insertMetadata(knex, makeMetadata("products", 1));
    await insertMetadata(knex, makeMetadata("orders", 1));
    const all = await listMetadata(knex);
    expect(all).toHaveLength(2);
  });

  it("deleteByNameAndVersion removes only the matching version", async () => {
    await insertMetadata(knex, makeMetadata("products", 1));
    await insertMetadata(knex, makeMetadata("products", 2));
    await deleteMetadata(knex, "products", 1);
    const remaining = await findMetadataByName(knex, "products");
    expect(remaining.map((m) => m.version)).toEqual([2]);
  });

  it("count returns row count", async () => {
    expect(await countMetadata(knex)).toBe(0);
    await insertMetadata(knex, makeMetadata("products", 1));
    expect(await countMetadata(knex)).toBe(1);
  });
});
