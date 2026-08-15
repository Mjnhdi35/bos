# BOS Studio Domain

> **Status:** `PROPOSED` — domain contract. No Studio module is implemented today.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- The repository contains no Studio code.
- No project, task, asset or approval entities exist.

## 2. Purpose

A creative-project workspace product that coordinates briefs, tasks, assets, schedules and approvals across a project team. Studio is independent of CMS, Ecommerce, Production-TVC, Entertainment and Music.

## 3. Owned data (proposed)

- Projects (with goals, owners, schedules).
- Tasks and dependencies.
- Asset references (held in generic storage).
- Approvals and review comments.
- Schedules and milestones.

Studio does not own: editorial content (CMS), commerce orders (Ecommerce), TVC-specific deliverables (Production-TVC), event/rights (Entertainment), music catalog (Music).

## 4. Boundaries

- Studio does not read or write other products' tables.
- Asset binaries live in generic object storage; Studio records references.
- External asset vendors integrate via the Integration context.

## 5. APIs and events (proposed)

- API: project CRUD, task CRUD, asset reference CRUD, approval flow.
- Events: project created, task status changed, asset uploaded, approval decided.
- Webhooks: optional inbound from external asset tools via Integration.

## 6. Standalone / degraded operation

- Studio must operate without CMS, Ecommerce, Production-TVC, Entertainment or Music installed.
- If the object storage substrate is unavailable, Studio records metadata only and flags missing assets.
- If an external tool is unavailable, Studio continues with manual metadata updates.

## 7. Open decisions

- `OPEN`: project template model.
- `OPEN`: approval workflow grammar.
- `OPEN`: asset versioning model.
- `OPEN`: dependency-graph semantics.
- `OPEN`: time tracking / billing features.
