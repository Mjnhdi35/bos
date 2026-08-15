# BOS Data Ownership

> **Status:** `PROPOSED` — ownership table. Today only Platform metadata (`platform_entities`, generated tables), partial Identity (`users`, `refresh_tokens`) and Platform migrations exist. Business data is `OPEN`.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT — current owned tables

| Owner | Tables |
|---|---|
| Identity | `users`, `refresh_tokens` |
| Platform | `platform_entities`, `schema_meta`, generated dynamic tables |
| Infrastructure | `_knex_migrations`, `_knex_migrations_lock` |

## 2. REQUIREMENT — ownership rules

- Each bounded context owns its tables and migrations.
- A bounded context must not query another context's tables directly.
- Cross-context consistency is via API, events or webhooks.
- No "shared global business database" by default.

## 3. PROPOSED — future ownership

Platform does not pre-declare product-domain tables. When a product candidate is activated (selection is a human/business decision recorded in `.engineering/TASKS.md`), the product owner introduces its own tables and migrations under its own path. The platform layer does not own or seed those tables.

For reference, the conceptual ownership slots are:

| Owner | Tables (proposed) |
|---|---|
| Identity | `users`, `refresh_tokens`, identity-provider links, identity claims |
| Platform | `platform_entities`, generated tables, audit hooks |
| Integration | provider catalog, connection state, external-account metadata, sync state, mapping execution state, webhook receipts |
| Product (activated per `.engineering/TASKS.md`) | defined by the product owner at activation time; tables and migrations live under the product's own path |
| Organization | organization, workspace, membership, role bindings (`OPEN` for adoption) |

## 4. Cross-context consistency

- Cross-context consistency is eventual.
- A context publishing an event is responsible for publishing the event after its own state transition is durable.
- A context consuming an event is responsible for its local projection.

## 5. Tenant/column conventions

- No mandatory `tenant_id` column.
- A context may use `organization_id` if it explicitly owns organization-scoped data; the column is context-local.
- The Identity context does not own `organization_id`; that belongs to the Organization context when it exists.

## 6. Audit and portability

- Each context owns its audit records.
- Export format is per context; the integration of context exports into a single organization export is `OPEN`.

## 7. Open decisions

- `OPEN`: organization schema and migration ownership.
- `OPEN`: retention policy per context.
- `OPEN`: deletion policy per context.
- `OPEN`: cross-context projection strategy.
