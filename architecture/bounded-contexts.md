# BOS Bounded Contexts

> **Status:** `PROPOSED` — bounded-context contract. The repository's current implementation is a flat modular monolith under `src/modules/**`, `src/platform/**`, `src/shared/**`, `src/infrastructure/**`. No business bounded context exists yet.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT — current code structure

- `src/shared/**` — config, JWT, bcrypt, HTTP parsing, errors, logging.
- `src/modules/auth/**` — register, login, refresh, logout, Bearer auth, refresh cookie, `/auth/me`.
- `src/modules/users/**` — user create, lookup, view, `/users`.
- `src/platform/**` — entity definition, metadata persistence, schema materialization, generic CRUD.
- `src/infrastructure/database/**` — Knex config, PostgreSQL migrations.
- `src/app/**`, `src/server.ts` — composition and startup.

## 2. REQUIREMENT — bounded-context rules

- A bounded context owns its data, schema and migrations.
- A bounded context exposes its capabilities via API, events or webhooks.
- A bounded context must not import another bounded context's internal modules.
- `shared` modules must not import a bounded-context module.
- `platform` must not depend on a specific bounded context.

## 3. Proposed bounded contexts

| Context | Path (proposed) | Owned data | Public contract surface |
|---|---|---|---|
| **Identity** | `src/modules/auth` (existing) + new authz/identity modules | `users`, `refresh_tokens`, identity claims | `/auth/**`, identity tokens, identity context |
| **Platform** | `src/platform/**` | `platform_entities`, generated tables | `/platform/**`, generic entity CRUD |
| **CMS** | `src/products/cms/**` | CMS entities, CMS revisions, CMS media refs | `/cms/**`, CMS events |
| **Ecommerce** | `src/products/ecommerce/**` | catalog, orders, payments, fulfillment | `/ecommerce/**`, ecommerce events |
| **Studio** | `src/products/studio/**` | projects, tasks, assets, approvals | `/studio/**`, studio events |
| **Production-TVC** | `src/products/production-tvc/**` | briefs, shoots, edits, deliverables | `/production-tvc/**`, production-tvc events |
| **Entertainment** | `src/products/entertainment/**` | events, sessions, programs, rights | `/entertainment/**`, entertainment events |
| **Music** | `src/products/music/**` | catalog, releases, tracks, distribution requests | `/music/**`, music events |
| **Integration** | `src/integration/**` | provider connections, sync state, mappings, credentials metadata | `/integration/**`, integration events |

Each product context stands alone; it can be deployed without sibling products.

## 4. Inter-context translation

- When two contexts need the same fact, one owns the record.
- The owning context publishes an event; consumers maintain a local projection if they need one.
- Direct cross-context SQL is forbidden.

## 5. Shared kernel

`src/shared/**` is a shared kernel: utilities only, no business invariants. It must not import any bounded context.

## 6. Conditional roadmap

A bounded context is created only when a real product requirement names it. The first business context is `OPEN`.

## 7. Open decisions

- `OPEN`: first business bounded context.
- `OPEN`: shared-kernel size policy.
- `OPEN`: integration context scope (provider-neutral only vs. also per-product orchestration).
- `OPEN`: when, if ever, a context becomes its own deployment unit.
