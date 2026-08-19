/**
 * Persistence invariants — verifies the contract that the in-memory
 * and SQL adapters share. Specifically:
 *   - empty query returns empty result (not crash)
 *   - non-existent id returns null (not throw)
 *   - composite-key buckets are independent
 */

import { describe, expect, it } from "vitest";
import { InMemoryRepository, refOf } from "../../../src/platform/runtime-index";

describe("Repository invariants (in-memory)", () => {
  it("query on empty bucket returns empty result", async () => {
    const repo = new InMemoryRepository();
    const result = await repo.query(refOf("alpha", "Article"), {});
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("findById on empty bucket returns null", async () => {
    const repo = new InMemoryRepository();
    const result = await repo.findById(refOf("alpha", "Article"), "missing");
    expect(result).toBeNull();
  });

  it("distinct refs produce distinct buckets", async () => {
    const repo = new InMemoryRepository();
    const r1 = refOf("alpha", "Product");
    const r2 = refOf("beta", "Product");
    await repo.insert(r1, { id: "alpha/Product_000001", name: "alpha-A" });
    expect(await repo.findById(r2, "alpha/Product_000001")).toBeNull();
    expect(await repo.findById(r1, "alpha/Product_000001")).not.toBeNull();
  });
});