# BOS Production–TVC Domain

> **Status:** `PROPOSED` — domain contract. No Production-TVC module is implemented today.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- The repository contains no Production-TVC code.
- No brief, treatment, shoot, edit or deliverable entities exist.

## 2. Purpose

A production-management product specialized for TVC/ad workflows: briefs, treatments, shoots, edits, deliverables, approvals, and delivery to brand stakeholders. Production-TVC is independent of CMS, Ecommerce, Studio, Entertainment and Music.

## 3. Owned data (proposed)

- Briefs and client requirements.
- Treatments and storyboards.
- Shoot plans, schedules and shot lists.
- Edit versions and review notes.
- Deliverables and delivery confirmations.

Production-TVC does not own: creative project metadata of unrelated domains (Studio), editorial content (CMS), commerce orders (Ecommerce), rights (Entertainment, Music).

## 4. Boundaries

- Production-TVC does not read or write other products' tables.
- Deliverables may be referenced by other products via API/canonical IDs.
- Vendor integrations (e.g. asset vendors) go through the Integration context.

## 5. APIs and events (proposed)

- API: brief CRUD, treatment CRUD, shoot CRUD, edit version CRUD, deliverable CRUD.
- Events: brief created, treatment approved, shoot completed, edit delivered, deliverable accepted.
- Webhooks: external vendor callbacks via Integration.

## 6. Standalone / degraded operation

- Production-TVC must operate without CMS, Ecommerce, Studio, Entertainment or Music installed.
- If asset storage is unavailable, Production-TVC continues with metadata-only state.
- If an external vendor is unavailable, Production-TVC continues with manual state transitions.

## 7. Open decisions

- `OPEN`: deliverable format catalog.
- `OPEN`: review/approval grammar.
- `OPEN`: rights and licensing model (interaction with Music/Entertainment).
- `OPEN`: budget/cost tracking, if any.
- `OPEN`: integration with external production tooling.
