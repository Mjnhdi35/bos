# BOS Ecommerce Domain

> **Status:** `PROPOSED` — domain contract. No Ecommerce module is implemented today.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- The repository contains no Ecommerce code.
- No catalog, order, payment, fulfillment, cart or pricing data exists.

## 2. Purpose

A commerce product handling catalog, pricing, cart, order capture, payment orchestration and fulfillment orchestration. Ecommerce is independent of CMS, Studio, Production-TVC, Entertainment and Music.

## 3. Owned data (proposed)

- Catalog items, variants, attributes.
- Prices and price lists.
- Carts (per actor/session).
- Orders and order lines.
- Payment intents and recorded payment events (no secret card data).
- Fulfillment records (handoff, shipment, delivery states).
- Returns, refunds (within commerce scope).

Ecommerce does not own: editorial content (CMS), creative assets (Studio), rights (Music, Entertainment), production schedules (Production-TVC).

## 4. Boundaries

- Ecommerce does not join other products' tables.
- Other products expose commerce-relevant facts (e.g. a sellable Music release) via API/events; Ecommerce owns the resulting order.
- Payment provider integration is via the Integration context only; Ecommerce never calls provider SDKs directly.

## 5. APIs and events (proposed)

- API: catalog CRUD, cart operations, order lifecycle, payment recording, fulfillment updates.
- Events: cart updated, order placed, order paid, order fulfilled, order refunded.
- Webhooks: payment provider callbacks via Integration.

Payment secrets never appear in Ecommerce APIs, events or logs.

## 6. Standalone / degraded operation

- Ecommerce must operate without CMS, Music, Studio, Production-TVC or Entertainment installed.
- If a payment provider is unavailable, Ecommerce records orders as pending payment and resumes on reauthorization; no silent failure.
- If fulfillment integrations are unavailable, Ecommerce continues order capture and queues fulfillment state changes.

## 7. Open decisions

- `OPEN`: tax rules.
- `OPEN`: pricing engine and price-list model.
- `OPEN`: payment provider(s).
- `OPEN`: shipping/carrier integration.
- `OPEN`: refund/return policy engine.
- `OPEN`: PCI scope posture.
