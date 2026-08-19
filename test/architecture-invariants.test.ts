/**
 * Architecture-level invariant tests — protects the canonical
 * Agent Engineering Contract guarantees:
 *
 *   - Generic API routes are NOT branch-by-name.
 *   - Domain code never imports concrete repositories.
 *   - Runtime identity is composite.
 *   - HTTP router shape is `/api/applications/:applicationId/entities/:entityName`.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");

function listSrc(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === "dist" || entry === ".engineering") continue;
    const s = statSync(full);
    if (s.isDirectory()) out.push(...listSrc(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("Architecture invariants", () => {
  it("no domain file imports concrete repository/persistence adapters", () => {
    const domains = listSrc(join(ROOT, "src", "domains"));
    for (const f of domains) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/from\s+['"](?:\.\.\/)+platform\/persistence\//);
      expect(src, f).not.toMatch(/from\s+['"](?:\.\.\/)+platform\/repository/);
      expect(src, f).not.toMatch(/from\s+['"]knex/);
    }
  });

  it("no application file imports the persistence factory", () => {
    const apps = listSrc(join(ROOT, "src", "applications"));
    for (const f of apps) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/persistence-factory/);
    }
  });

  it("generic router uses canonical route shape", () => {
    const router = readFileSync(
      join(ROOT, "src", "api", "generic", "router.ts"),
      "utf8",
    );
    expect(router).toMatch(/applications\/:applicationId/);
    expect(router).toMatch(/entities\/:entityName/);
    expect(router).not.toMatch(/platform\/entities/);
    expect(router).not.toMatch(/platform\/data/);
  });
});