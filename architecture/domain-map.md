# BOS Domain Map

> **Status:** `PROPOSED` — domain map for the product layer. No business product is implemented today; this map is a contract for what those products will own when they appear.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- Implementation today includes Platform (partial), Identity/Auth (partial), Users (partial).
- No CMS, Ecommerce, Studio, Production-TVC, Entertainment or Music product module exists.

## 2. REQUIREMENT

- Each domain is independent.
- A domain's data is owned by that domain.
- Domains cross only via API, events or webhooks.

## 3. Domain list (proposed)

| Domain | One-line purpose | Owned data (proposed) |
|---|---|---|
| **CMS** | Authoring, structuring and publishing editorial content. | Content nodes, revisions, taxonomies, media references, publish states. |
| **Ecommerce** | Catalog, pricing, cart, order, payment and fulfillment orchestration. | Catalog items, variants, prices, carts, orders, payments, fulfillments. |
| **Studio** | Creative project management for production-like workflows. | Projects, tasks, assets, approvals, schedules. |
| **Production-TVC** | TVC/ad production planning and execution. | Briefs, treatments, shoots, edits, deliverables, approvals. |
| **Entertainment** | Events, releases, audiences, ticketing/rights distribution. | Events, venues/sessions, programs, rights, attendance. |
| **Music** | Catalog, releases, distribution destinations and royalty-relevant records. | Catalog items, releases, tracks, distribution destinations, mappings (with Integration), royalty-relevant facts. |

## 4. Cross-domain interactions (proposed, illustrative)

- **Ecommerce ↔ CMS** — content pages may embed catalog references; catalog pages may pull editorial copy.
- **Ecommerce ↔ Music** — a release may become a sellable product; music provides rights and metadata.
- **Studio ↔ Production-TVC** — a project becomes a TVC shoot; deliverables become assets.
- **Entertainment ↔ CMS** — events surface in editorial content.
- **Entertainment ↔ Ecommerce** — ticketing/merchandise flow.

These are illustrative interactions; concrete contracts are `OPEN`.

## 5. Domain ownership rules

- A domain owns its entities and invariants.
- A domain does not query another domain's tables.
- Cross-domain consistency is via events and APIs.

## 6. Domain status

| Domain | Implementation status |
|---|---|
| CMS | not started |
| Ecommerce | not started |
| Studio | not started |
| Production-TVC | not started |
| Entertainment | not started |
| Music | not started |

## 7. Open decisions

- `OPEN`: which domain is first.
- `OPEN`: cross-domain reference data policy.
- `OPEN`: shared UI library vs product-local UI.
- `OPEN`: cross-domain event catalog names.
