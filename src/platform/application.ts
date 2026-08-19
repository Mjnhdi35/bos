/**
 * Application — a first-class composition of metadata.
 *
 * An `ApplicationDefinition` is a NAMED GROUPING of entity definitions
 * plus optional lifecycle metadata. It is the boundary between:
 *
 *   metadata  (what the user defines)
 *   code      (what the platform understands)
 *
 * The platform runtime has no opinion on what CMS, Ecommerce, CRM, or
 * Landing Page "is" — those are compositions expressed as
 * `ApplicationDefinition`s. A user-defined landing-page application is
 * equivalent in standing to a user-defined smoothie-store application;
 * the platform handles both identically.
 *
 * Design rule: an ApplicationDefinition does NOT contain code. It
 * contains metadata only. Code-driven domain behaviour (e.g.
 * `placeOrder`, `activateSupplier`) is provided separately via
 * `registerDomainExtension` after `registerApplication`.
 *
 * Application identity is the primary isolation boundary of the
 * runtime. Two applications with the same entity name resolve to
 * different `(applicationId, entityName)` identities and therefore to
 * different storage buckets. `registerApplication` writes each entity
 * under the application's id, so application-level collisions are
 * impossible by construction.
 */

import type {
  EntityRuntime,
  ExtendedEntityDefinition,
} from "./runtime-index";
import { RuntimeError } from "./runtime";

export type ApplicationDefinition = {
  readonly name: string;
  readonly version: number;
  readonly description?: string;
  readonly entities: readonly ExtendedEntityDefinition[];
};

export type CompiledApplication = {
  readonly name: string;
  readonly version: number;
  readonly description?: string;
  readonly entities: readonly ExtendedEntityDefinition[];
};

export function compileApplication(
  raw: Readonly<Record<string, unknown>>,
): CompiledApplication {
  const errors: string[] = [];

  const name = raw["name"];
  if (
    typeof name !== "string" ||
    !/^[a-z][a-z0-9_]*$/.test(name)
  ) {
    errors.push("application name must match /^[a-z][a-z0-9_]*$/");
  }

  const version = raw["version"];
  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 1
  ) {
    errors.push("application version must be a positive integer");
  }

  const description = raw["description"];
  if (
    description !== undefined &&
    typeof description !== "string"
  ) {
    errors.push("application description must be string if provided");
  }

  const entitiesRaw = raw["entities"];
  const entities: ExtendedEntityDefinition[] = [];
  if (!Array.isArray(entitiesRaw) || entitiesRaw.length === 0) {
    errors.push("application must declare at least one entity");
  } else {
    for (const e of entitiesRaw) {
      if (!isExtendedEntityDefinition(e)) {
        errors.push(
          `entity entry must be an object literal or pre-compiled ExtendedEntityDefinition`,
        );
        continue;
      }
      entities.push(e);
    }
  }

  const declaredNames = new Set(entities.map((e) => e.name));
  for (const e of entities) {
    if (!e.relations) continue;
    for (const rel of e.relations) {
      if (!declaredNames.has(rel.target)) {
        errors.push(
          `entity '${e.name}' relation '${rel.name}' targets '${rel.target}', which is not declared in this application`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new RuntimeError(
      `Invalid application '${String(name)}': ${errors.join("; ")}`,
    );
  }

  return {
    name: name as string,
    version: version as number,
    ...(description !== undefined
      ? { description: description as string }
      : {}),
    entities,
  };
}

function isExtendedEntityDefinition(
  x: unknown,
): x is ExtendedEntityDefinition {
  if (typeof x !== "object" || x === null) return false;
  if (!("name" in x)) return false;
  const name = (x as Record<string, unknown>).name;
  return typeof name === "string";
}

export function registerApplication(
  runtime: EntityRuntime,
  app: ApplicationDefinition | Readonly<Record<string, unknown>>,
): CompiledApplication {
  const compiled = isApplicationDefinition(app)
    ? normaliseApplication(app)
    : compileApplication(app);
  for (const def of compiled.entities) {
    runtime.register(compiled.name, def);
  }
  runtime.trackApplication({
    name: compiled.name,
    version: compiled.version,
    ...(compiled.description !== undefined
      ? { description: compiled.description }
      : {}),
    entities: compiled.entities.map((e) => e.name),
  });
  return compiled;
}

function isApplicationDefinition(
  x: unknown,
): x is ApplicationDefinition {
  return (
    typeof x === "object" &&
    x !== null &&
    "name" in x &&
    "entities" in x &&
    Array.isArray((x as { entities: unknown }).entities)
  );
}

function normaliseApplication(
  app: ApplicationDefinition,
): CompiledApplication {
  return compileApplication({
    name: app.name,
    version: app.version,
    ...(app.description !== undefined ? { description: app.description } : {}),
    entities: app.entities,
  });
}
