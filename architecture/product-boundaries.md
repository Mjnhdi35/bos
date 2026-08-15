# BOS Product Boundaries

> **Status:** `PROPOSED` — product-layer boundary contract. No business product is implemented today.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted choice.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- The repository contains zero product modules. There is no CMS, Ecommerce, Studio, Production-TVC, Entertainment or Music code yet.

## 2. REQUIREMENT

- Each product is an independent bounded context.
- Each product must work standalone (no required sibling).
- Products do not read or write another product's tables.
- Products expose API, events and webhooks; consumers integrate via contracts.
- A product does not import provider SDKs directly.

## 3. Product responsibilities

| Responsibility | Owns | Must not own |
|---|---|---|
| Domain model | Entities, value objects, invariants of the product | Entities of another product |
| Persistence | Its database tables and migrations | Tables owned by another product |
| API | Canonical request/response for its capabilities | Provider-specific response shapes |
| Events | Facts it emits about its state changes | Facts about another product |
| Webhooks | Inbound contracts it accepts | Inbound contracts owned by another product |
| Provider integration | Via Integration contracts only | Direct provider SDK calls |

## 4. Inter-product integration rules

- Product A needs product B's fact → A consumes an event or calls an API; never reads B's table.
- Product A writes a fact → A owns the row, emits an event, exposes an API; never writes to B's table.
- A shared "global business DB" is **not** a default. If two products need the same record, one owns it and the other subscribes.

## 5. Frontend posture

- Frontends are thin clients.
- The product API is authoritative. No business invariant is enforced client-side.
- A frontend cannot be a source of truth; it cannot persist cross-product state on the user's device.

## 6. Standalone / degraded operation

- Each product defines what "degraded" means (e.g. CMS without ecommerce recommendations, Music without external distribution).
- A product outage does not cascade automatically; sibling products must explicitly subscribe to events.
- Each product specifies the minimum platform services it needs and what it does without them.

## 7. Open decisions

- `OPEN`: which product is first.
- `OPEN`: cross-product event catalog names and ownership.
- `OPEN`: shared reference data policy (where two products both need to read the same fact).
- `OPEN`: shared UI/component rules, if any.
