# BOS Entertainment Domain

> **Status:** `PROPOSED` — domain contract. No Entertainment module is implemented today.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- The repository contains no Entertainment code.
- No event, venue/session, program, right or attendance entity exists.

## 2. Purpose

An entertainment product handling events, programs, venues/sessions, rights and audience attendance. Entertainment is independent of CMS, Ecommerce, Studio, Production-TVC and Music.

## 3. Owned data (proposed)

- Events, programs, sessions, venues/spaces.
- Rights and licensing facts (where Entertainment owns them).
- Attendance, ticketing, audience records.
- Event-related editorial references (consumed from CMS).

Entertainment does not own: editorial content (CMS), commerce orders (Ecommerce), creative assets (Studio), TVC deliverables (Production-TVC), music catalog (Music).

## 4. Boundaries

- Entertainment does not read or write other products' tables.
- Ticketing/rights providers integrate via the Integration context.
- Commerce integration is by API/event; Ecommerce owns orders and payments.

## 5. APIs and events (proposed)

- API: event CRUD, program CRUD, session CRUD, rights CRUD, attendance query.
- Events: event created, event published, session scheduled, ticket issued, attendance recorded.
- Webhooks: ticketing/vendor callbacks via Integration.

## 6. Standalone / degraded operation

- Entertainment must operate without CMS, Ecommerce, Studio, Production-TVC or Music installed.
- If a ticketing provider is unavailable, Entertainment records intent locally and reconciles on reauthorization.
- If attendance source is unavailable, Entertainment continues to record events/sessions.

## 7. Open decisions

- `OPEN`: rights/clearance model.
- `OPEN`: ticketing provider(s).
- `OPEN`: attendance capture method.
- `OPEN`: venue/space model.
- `OPEN`: program hierarchy and scheduling.
