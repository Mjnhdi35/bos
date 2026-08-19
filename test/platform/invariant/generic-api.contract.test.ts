/**
 * Generic API contract test — checks that the generic API ONLY depends
 * on EntityRuntime and never on any domain-specific token.
 *
 * This is a static source-grep test that protects architectural
 * invariants:
 *
 *   - The generic API does NOT import `src/domains/**` or
 *     `src/applications/**`.
 *   - The generic API does NOT branch by application or entity name.
 *   - The generic API does NOT import concrete repositories, Knex,
 *     pg, mysql2.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const GENERIC_API_DIR = join(ROOT, "src", "api", "generic");

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (entry.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("Generic API architectural invariants", () => {
  const files = listSourceFiles(GENERIC_API_DIR);

  it("has at least router + handlers + errors + query-parser", () => {
    expect(files.some((f) => f.endsWith("router.ts"))).toBe(true);
    expect(files.some((f) => f.endsWith("errors.ts"))).toBe(true);
    expect(files.some((f) => f.endsWith("query-parser.ts"))).toBe(true);
    expect(files.some((f) => f.endsWith("records.ts"))).toBe(true);
    expect(files.some((f) => f.endsWith("applications.ts"))).toBe(true);
  });

  it("does not import from src/domains or src/applications", () => {
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      // `../domains` or `../../domains` or absolute
      expect(src, f).not.toMatch(/from\s+['"](?:\.\.\/)+domains/);
      expect(src, f).not.toMatch(/from\s+['"](?:\.\.\/)+applications/);
    }
  });

  it("does not import concrete repositories or DB drivers", () => {
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/from\s+['"](?:\.\.\/)+platform\/(?:persistence|repository|entity-data-store|metadata-repository)/);
      expect(src, f).not.toMatch(/from\s+['"]knex/);
      expect(src, f).not.toMatch(/from\s+['"]pg/);
      expect(src, f).not.toMatch(/from\s+['"]mysql2/);
    }
  });

  it("does not branch by application or entity name", () => {
    // The generic API must not contain `if (applicationId === "alpha")`
    // style strings. Allow comments that explain the rule.
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      // Strip single-line comments first
      const noComments = src
        .replace(/\/\/[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      expect(noComments, f).not.toMatch(/applicationId\s*===\s*['"]/);
      expect(noComments, f).not.toMatch(/entityName\s*===\s*['"]/);
    }
  });

  it("does not contain domain-specific tokens", () => {
    const FORBIDDEN = [
      "Product",
      "Category",
      "Customer",
      "Order",
      "LandingPage",
      "Session",
      "User",
      "smoothie",
      "landing",
    ];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const noComments = src
        .replace(/\/\/[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      for (const tok of FORBIDDEN) {
        // Allow "User" / "Session" only if it appears in a comment. We
        // already stripped comments; any remaining occurrence is a
        // domain-specific token. Allow lowercase versions only in
        // comments / identifiers that the parser accepts.
        expect(noComments, `${f}: ${tok}`).not.toMatch(new RegExp(`\\b${tok}\\b`));
      }
    }
  });

  it("router depends only on EntityRuntime (via entity-runtime)", () => {
    const router = readFileSync(join(GENERIC_API_DIR, "router.ts"), "utf8");
    expect(router).toMatch(/from\s+['"](?:\.\.\/)+platform\/entity-runtime/);
  });
});