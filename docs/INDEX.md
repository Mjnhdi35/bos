# BOS Source Code Index

This is the canonical map of every source file under `src/`, `test/`,
`docs/`, and `architecture/`. Use it to locate the right entry point
before opening files.

---

## §1. Runtime & Platform (`src/platform/`)

The metadata-driven runtime. Phase 1–6 hardened the contract.

| File                                            | Purpose                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/platform/runtime.ts`                       | Public types: `EntityRef`, `ExtendedEntityDefinition`, Query DSL, errors, `compileDefinition`     |
| `src/platform/runtime-index.ts`                 | Barrel re-export — the public API of the runtime                                                 |
| `src/platform/entity-runtime.ts`                | `EntityRuntime` + `ScopedEntityRuntime`; identity-keyed CRUD/query/transition/audit              |
| `src/platform/repository.ts`                    | `EntityRepository` interface + `InMemoryRepository`; filter/sort helpers                         |
| `src/platform/audit.ts`                         | `AuditStore`, `AuditService`, `InMemoryAuditStore` — append-only audit, applicationId-aware       |
| `src/platform/event-bus.ts`                     | `EventBus`, `EventHandler` — synchronous in-memory event publication, applicationId on every event |
| `src/platform/workflow.ts`                      | `WorkflowEngine`, `WorkflowError` — guard-validated state transitions                            |
| `src/platform/validator.ts`                     | `ValidatorRegistry`, `validateRecord`, `ValidationError` — field-level validation                |
| `src/platform/application.ts`                   | `ApplicationDefinition`, `compileApplication`, `registerApplication` — first-class app boundary |
| `src/platform/setup.ts`                         | `createRuntimeContext` — convenience builder for tests / scripts                                 |
| `src/platform/system-bootstrap.ts`              | `bootstrapSystemMetadata` — registers `system` (User + Session) on first call                     |
| `src/platform/persistence/persistence-factory.ts` | Dispatches `inmemory` / `postgres` / `mysql` based on `env.DATABASE`                          |
| `src/platform/persistence/postgres/postgres-entity-repository.ts` | Postgres adapter; physical table `app__<applicationId>__<entityName>`         |
| `src/platform/persistence/mysql/mysql-entity-repository.ts`       | MySQL adapter; same table naming convention                                       |
| `src/platform/persistence/shared/sql-translator.ts`               | `applyFilter` / `applySort` for Knex — `data->>field` JSON lookups                |
| `src/platform/domain/field-def.ts`              | `FieldDef`, `validateFieldDef`                                                                    |
| `src/platform/domain/field-type.ts`             | `FieldType` enum                                                                                  |
| `src/platform/domain/relation-def.ts`           | `RelationDef`, `relationForeignKeyName`, `validateRelation`                                       |
| `src/platform/domain/workflow-def.ts`           | `WorkflowDef`, `WorkflowState`, `WorkflowAction`, `WorkflowTransition`                            |
| `src/platform/domain/definition.ts`             | Legacy alias barrel — kept for compatibility                                                       |

---

## §2. Generic API (`src/api/generic/`)  — Phase 5–6

Thirteen canonical routes mounted at `/api`. Domain-agnostic: zero
imports from `src/domains/**` or `src/applications/**`.

| Route                                                                     | Handler                          |
| ------------------------------------------------------------------------- | -------------------------------- |
| `GET    /api/applications`                                                | `handlers.applications.listApplications` |
| `GET    /api/applications/:applicationId`                                 | `getApplication`                 |
| `GET    /api/applications/:applicationId/entities`                         | `listEntities`                   |
| `GET    /api/applications/:applicationId/entities/:entityName/definition`  | `handlers.records.getDefinition`  |
| `POST   /api/applications/:applicationId/entities/:entityName`            | `createRecord`                   |
| `GET    /api/applications/:applicationId/entities/:entityName`            | `listRecords`                    |
| `POST   /api/applications/:applicationId/entities/:entityName/_query`     | `queryRecords` (body form)       |
| `GET    /api/applications/:applicationId/entities/:entityName/:id`        | `getRecord`                      |
| `PATCH  /api/applications/:applicationId/entities/:entityName/:id`        | `updateRecord`                   |
| `DELETE /api/applications/:applicationId/entities/:entityName/:id`        | `deleteRecord`                   |
| `POST   /api/applications/:applicationId/entities/:entityName/:id/transition`         | `transitionActionBody` (body form)  |
| `POST   /api/applications/:applicationId/entities/:entityName/:id/transition/:action` | `transitionAction` (path-param)      |
| `GET    /api/applications/:applicationId/entities/:entityName/:id/audit`  | `auditTrail`                     |

| File                                          | Purpose                                                              |
| --------------------------------------------- | -------------------------------------------------------------------- |
| `src/api/generic/router.ts`                   | `mountGenericApi(runtime)` — wires all 13 routes                     |
| `src/api/generic/handlers/applications.ts`    | Application-list handlers + `serializeDefinition` helper              |
| `src/api/generic/handlers/records.ts`         | Record handlers + error mapping (`ValidationError` → 422, etc.)       |
| `src/api/generic/query-parser.ts`             | URL + body query DSL parser (operator suffix validation)             |
| `src/api/generic/errors.ts`                   | `badRequest`, `notFound`, `validationFailed`, `conflict`              |

---

## §3. Auth (`src/modules/auth/`)  — Phase 6 (system metadata)

Identity is now metadata, not hard-coded SQL. The auth runtime
mounts at `/auth/*`; the same generic path serves the underlying
records.

| File                                      | Purpose                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `src/modules/auth/auth.runtime.ts`        | `AuthRuntime` — register/login/refresh/logout/me, all via runtime  |
| `src/modules/auth/auth.controller.ts`     | HTTP handlers                                                      |
| `src/modules/auth/auth.middleware.ts`     | Bearer-token middleware populating `req.user`                       |
| `src/modules/auth/auth.routes.ts`         | `createAuthRouter(auth)` — wires the four routes                   |
| `src/modules/auth/auth.schema.ts`         | zod schemas                                                        |
| `src/modules/auth/auth.cookies.ts`        | HttpOnly refresh-token cookie helpers                              |

---

## §4. Applications (`src/applications/`) — metadata only

| File                                       | Purpose                                                            |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `src/applications/system.ts`               | `SYSTEM_USER_DEFINITION`, `SYSTEM_SESSION_DEFINITION`, `SYSTEM_APPLICATION` |
| `src/applications/landing-page.ts`         | Landing Page (CMS) application — `LandingPage` entity + workflow   |
| `src/applications/smoothie-store.ts`       | Smoothie Store (Ecommerce) — Product/Category/Customer/Order/OrderItem |

---

## §5. Domain extensions (`src/domains/`)

Optional, metadata-agnostic glue. Domain code lives here so the
runtime can stay generic.

| File                          | Purpose                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `src/domains/ecommerce.ts`    | Smoothie-Store domain wiring                                       |
| `src/domains/cms.ts`          | Landing-Page CMS domain wiring                                     |
| `src/domains/supplier.ts`     | Supplier domain wiring                                             |
| `src/domains/index.ts`        | Barrel re-export                                                   |

---

## §6. Server (`src/app/`, `src/server.ts`)

| File                          | Purpose                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `src/server.ts`               | Process entry point — `createApp()` then `listen()`                |
| `src/app/create-app.ts`       | `createApp`, `buildRuntime` — wires every layer                     |

---

## §7. Shared utilities (`src/shared/`)

| File                          | Purpose                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `src/shared/errors.ts`        | `HttpError` base class with stable `status` + `code`               |
| `src/shared/http.ts`          | `asyncHandler`, `parseBody`, `readParam` — Express 5 helpers       |
| `src/shared/bcrypt.ts`        | bcrypt wrappers                                                    |
| `src/shared/jwt.ts`           | `signAccessToken`, `verifyAccessToken`, `parseTtl`                 |
| `src/shared/credential.ts`    | `CredentialSchema` (zod)                                           |
| `src/shared/config/env.ts`    | zod-validated `env` with `DATABASE` enum + MySQL fields            |
| `src/shared/logging/logger.ts`| pino logger singleton                                              |

---

## §8. Tests (`test/`) — 21 files, 96 passed, 3 skipped (DB env)

| File                                                                   | Coverage                                  |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| `test/health.test.ts`                                                  | `/health` and `/health/db`                |
| `test/setup.ts`                                                        | `.env` loader                             |
| `test/architecture-invariants.test.ts`                                  | Domain imports, generic router shape      |
| `test/api/generic/phase-6-generic-api.test.ts`                          | All 13 routes end-to-end (25 tests)        |
| `test/api/generic/system-user.test.ts`                                  | Auth flow + system metadata               |
| `test/api/generic/landing-page-http.test.ts`                            | Landing Page editorial lifecycle           |
| `test/application/application.test.ts`                                  | Single-application registration           |
| `test/application/application-isolation.test.ts`                       | Cross-app isolation end-to-end             |
| `test/application/application-invariants.test.ts`                       | `compileApplication` invariants           |
| `test/platform/invariant/entity-identity.test.ts`                      | Composite key + bare-name rejection        |
| `test/platform/invariant/generic-api.contract.test.ts`                 | Static grep — generic API does NOT import domain/, kne/, persistence |
| `test/platform/invariant/application-isolation.test.ts`                 | Five-layer isolation (Phase 4.1 / 5.2)    |
| `test/platform/invariant/application-invariants.test.ts`                | compileApplication, version mismatch       |
| `test/platform/invariant/phase-5.2-application-isolation.test.ts`       | Phase 5.2 executable proof                 |
| `test/platform/unit/platform-runtime.test.ts`                          | Runtime CRUD + workflow + audit + events   |
| `test/platform/unit/dynamic-entity.test.ts`                             | Add entities without recompile             |
| `test/platform/unit/cross-domain.test.ts`                               | Two apps on one runtime                    |
| `test/platform/unit/supplier-dynamic.test.ts`                           | Supplier dynamic registration             |
| `test/platform/persistence/persistence-helpers.ts`                      | env-aware DB connection helpers            |
| `test/platform/persistence/persistence-contract.test.ts`                | In-memory reference contract               |
| `test/platform/persistence/persistence-cross-db.test.ts`                | Postgres + MySQL adapters (env-gated)      |
| `test/platform/persistence/persistence-startup.test.ts`                 | Auto-create on first write                 |
| `test/platform/persistence/persistence-invariants.test.ts`              | Repository contract invariants             |

---

## §9. Configuration / Postman / Docker

| File                                   | Purpose                                       |
| -------------------------------------- | --------------------------------------------- |
| `docker-compose.yml`                   | Postgres + pgAdmin stack                       |
| `.env.example`                         | Runtime env template                           |
| `postman/bos.postman_collection.json`  | Phase-6 generic API + auth E2E                |
| `postman/bos.postman_environment.json` | Postman env (baseUrl)                         |
| `.gitignore`                           | Excludes `node_modules/`, `dist/`, `.env`, `coverage/`, `.engineering/`, `bootstrap/` |

---

## §10. Documentation (`docs/`)

| File                                  | Purpose                                              |
| ------------------------------------- | ---------------------------------------------------- |
| `docs/INDEX.md`                       | This file                                            |
| `docs/task-system-design.md`          | Design rationale                                     |
| `docs/tasks/`                         | Per-task notes                                       |

---

## §11. Engineering control plane (`.engineering/`)

Local-only artefacts: phase backups, snapshots, recovery scripts.
`.gitignore` excludes the whole directory. **Do not commit.**

| Directory                                       | Purpose                                  |
| ----------------------------------------------- | ---------------------------------------- |
| `.engineering/phase-5.1-legacy-backup/`         | Phase 5.1 cleanup backup (recoverable)   |
| `.engineering/snapshot-status.txt`              | Recovery session marker                  |