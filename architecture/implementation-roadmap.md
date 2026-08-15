# BOS Implementation Roadmap

> **Status:** `PROPOSED` — conditional roadmap. The repository today has only the initial Node/TypeScript/Express foundation plus partial Platform, Identity and Users. Business products are not implemented. This roadmap is conditional: nothing starts until an explicit requirement cites it.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT — verified starting point

- Node.js 24, TypeScript strict, CommonJS, ES2023, Express 5.
- PostgreSQL via Knex, Vitest + Supertest, Docker Compose, Docker image with non-root user.
- CI: typecheck, tests, coverage, secret scan, Docker build, non-root check, Trivy.
- Implementation: partial Platform, partial Identity/Auth, partial Users.
- No business product module exists.

## 2. Roadmap principles

1. Each wave is activated only when a concrete requirement cites it.
2. Each wave has explicit prerequisites and acceptance criteria.
3. Each wave ends with verified behavior (typecheck, tests, build, runtime where relevant).
4. No speculative infrastructure is added; no vendor is selected without an accepted requirement.
5. Existing integration/security artifacts remain authoritative.

## 3. Waves (conditional)

### Wave 0 — Foundation hardening (already verified)
- Status: `FACT`.
- Already in place per `.engineering/ARCHITECTURE.md` and `AGENTS.md`.

### Wave 1 — Platform contract stabilization
- Conditional on: an explicit Platform extension requirement.
- Scope candidates: metadata versioning, active-version pointer, relation/index metadata, transactional materialization.
- Prerequisites: `.engineering/ARCHITECTURE.md` FACT accepted.
- Verification: typecheck, tests, migration ordering, integration tests.

### Wave 2 — Identity/authz boundary
- Conditional on: an explicit authz requirement for `/users`, `/platform/*` and future modules.
- Scope candidates: route authorization matrix, role/capability policy, negative tests.
- Prerequisites: Platform contract decisions stable enough.
- Verification: route authorization matrix tests; deny-by-default negative tests.

### Wave 3 — Organization/workspace context
- Conditional on: a product that requires multi-user collaboration or organization isolation.
- Scope candidates: organization schema, membership, organization-scoped data access.
- Verification: ownership tests; isolation tests.

### Wave 4 — First business product
- Conditional on: business owner selection (see `OPEN-AD-001`).
- Scope: contract-first definition of the chosen product's entities, APIs, events, ownership.
- Verification: contract review; no code change without acceptance.

### Wave 5 — Integration first capability
- Conditional on: first business product needing a provider integration.
- Scope: provider capability contract, adapter, connector, sync, webhook handling per `integration-model.md`.
- Verification: contract tests with fake adapter; provider sandbox tests if approved.

### Wave 6 — Additional products
- Each additional product follows the same contract-first path.

### Wave 7 — Deployment hardening
- Conditional on: staging/production requirement.
- Scope: migration/bootstrap runtime, smoke tests, deployment contract.
- Verification: runtime smoke; health checks; migration idempotence.

## 4. Parallelization notes

- Wave 1 (Platform) and Wave 2 (Identity/authz) may run in parallel if their scopes are disjoint.
- Wave 3 (Organization) depends on Wave 2.
- Wave 4 (first product) depends on Wave 3.
- Wave 5 (integration) depends on Wave 4.

## 5. Out-of-scope guard

The roadmap must not introduce:

- a selected cloud provider;
- a selected event bus;
- a selected secret manager;
- a selected queue/cache substrate;
- a selected orchestration substrate (e.g. Kubernetes);
- a selected OAuth provider or external IdP;
- a selected first business domain;
- a selected provider SDK;
- a selected security implementation.

These remain `OPEN` until accepted.

## 6. Companion artifacts

- `architecture-decisions.md` — decision log.
- `bounded-contexts.md` — context boundaries.
- `data-ownership.md` — ownership table.
- `.engineering/TASKS.md` — task registry and contracts.
