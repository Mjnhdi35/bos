# BOS CMS Domain

> **Status:** `PROPOSED` — domain contract. No CMS module is implemented today.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- The repository contains no CMS code.
- The repository has no content entities, no CMS migrations, no CMS routes.

## 2. Purpose

A Content Management System product that lets authors create, version, taxonomize and publish editorial content. CMS is independent of Ecommerce, Studio, Production-TVC, Entertainment and Music.

## 3. Owned data (proposed)

- Content nodes and their revisions.
- Taxonomies and tags.
- Media references (to media held in generic storage).
- Publish states, schedules, locale variants.
- Author/editor assignments (within an organization/workspace).

CMS does not own: product catalog (Ecommerce), creative project assets (Studio), rights (Music, Entertainment), payment or order data (Ecommerce).

## 4. Boundaries

- CMS does not import or join other products' tables.
- Other products embed CMS content by API or event, not by direct reference.
- CMS does not import provider SDKs; provider integration is via the Integration context if needed (e.g. external DAM).

## 5. APIs and events (proposed)

- API: list/read/create/update content, manage revisions, manage taxonomies, manage publish workflow.
- Events: content created, content updated, content published, content unpublished, taxonomy changed.
- Webhooks: optional inbound callbacks from external DAMs, gated by Integration context.

CMS is not the source of truth for cross-product references; cross-product entities are addressed by canonical IDs only.

## 6. Standalone / degraded operation

- CMS must operate without Ecommerce, Music, Studio, Production-TVC or Entertainment installed.
- If a downstream consumer is missing, CMS continues to publish; events queue at the bus/substrate (`OPEN`).
- If a generic storage backend is unavailable, CMS read-only mode is acceptable.

## 7. Open decisions

- `OPEN`: content modeling depth (flat vs. tree).
- `OPEN`: locale strategy.
- `OPEN`: revision retention policy.
- `OPEN`: rich-text format and embed rules.
- `OPEN`: media pipeline integration.
- `OPEN`: search/index substrate.
