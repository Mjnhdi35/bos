# BOS Music Domain

> **Status:** `PROPOSED` — domain contract. No Music module is implemented today.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- The repository contains no Music code.
- No catalog, release, track, distribution-request or royalty-relevant entity exists.

## 2. Purpose

A music product handling the catalog of recordings, releases, tracks, distribution requests and royalty-relevant facts. Distribution destinations and provider integration are owned by the Integration context; Music owns the product-side release state. Music is independent of CMS, Ecommerce, Studio, Production-TVC and Entertainment.

## 3. Owned data (proposed)

- Recording/catalog items.
- Releases and release metadata.
- Tracks and their relation to releases.
- Distribution requests (the product intent to distribute).
- Royalty-relevant facts (where Music owns them).

Music does not own: provider connection state, sync state, external-account metadata, mapping execution state (these belong to Integration), editorial content (CMS), commerce orders (Ecommerce), creative assets (Studio), TVC deliverables (Production-TVC), event rights (Entertainment).

## 4. Boundaries

- Music never reads or writes another product's tables.
- Music requests distribution through the Integration context; per-destination delivery state is owned by Integration (see `architecture/integration-model.md` §6).
- Provider SDKs are confined to Integration adapters; Music is provider-neutral.

## 5. APIs and events (proposed)

- API: catalog CRUD, release CRUD, track CRUD, distribution-request lifecycle, royalty-relevant read.
- Events: release created, release updated, distribution requested, distribution completed (per destination), distribution failed (per destination), rights changed.
- Webhooks: inbound provider callbacks arrive via Integration, not directly into Music.

A failed destination does not imply release failure; the aggregate release status is derived from destination states.

## 6. Standalone / degraded operation

- Music must operate without CMS, Ecommerce, Studio, Production-TVC or Entertainment installed.
- If the Integration context is unavailable, Music records distribution requests locally and retries when Integration is reachable; releases stay in their current state.
- If a specific provider destination is unavailable, that destination degrades only; other destinations and the release itself remain unaffected.
- If royalty-relevant data sources are unavailable, Music continues to record catalog/release state; royalty computations are deferred.

## 7. Open decisions

- `OPEN`: distribution destinations (no provider selected).
- `OPEN`: rights model and territories.
- `OPEN`: royalty computation strategy.
- `OPEN`: ingest pipeline for catalog data.
- `OPEN`: relationship to Production-TVC deliverables and Entertainment events.
