# BOS Architecture Principles

> **Status:** `PROPOSED` — guiding principles. They are not yet enforced by implemented code paths beyond what `.engineering/ARCHITECTURE.md` already documents.

## Vocabulary

- **FACT** — verified by the repository today.
- **REQUIREMENT** — invariant that must hold.
- **DECISION** — explicit choice already made.
- **PROPOSED** — design rule not yet implemented.
- **OPEN** — direction not yet chosen.

## 1. FACT — repository state behind these principles

- Modular monolith with `src/shared`, `src/modules/auth`, `src/modules/users`, `src/platform`, `src/infrastructure/database`, `src/app`.
- Migrations are Knex/PostgreSQL.
- No business product module is implemented.

## 2. Non-negotiable principles

1. **Bounded context owns its data.** No product reads or writes another product's tables.
2. **Products integrate via contracts.** APIs, events, webhooks and explicit schemas — not shared schemas.
3. **Provider neutrality.** No product module imports provider SDKs directly.
4. **Replaceability.** Adapters, storage backends, queue/cache layers are replaceable behind a boundary.
5. **No business semantics in generic layers.** PaaS/BaaS and platform layers carry no business meaning.
6. **Frontend is not source of truth.** Front-ends render and submit; the backend/domain is authoritative.
7. **Standalone first.** Every product must work without a sibling product installed.
8. **Optional cloud.** Cloud and self-hosting are both valid; nothing in product code may assume one.
9. **Explicit data ownership.** `data-ownership.md` is the source of truth.
10. **No mandatory tenant column.** Tenant-style scoping is conditional, not global.

## 3. PROPOSED — design rules

- Prefer compile-time boundaries (typed contracts) over runtime reflection.
- Prefer additive, versioned changes to breaking changes.
- Prefer idempotent operations; reject non-idempotent retries by default.
- Prefer deferred/bounded remote work over inline cross-system transactions.
- Prefer canonical IDs and opaque provider identifiers side by side.
- Prefer deny-by-default authorization; explicit allow by capability and scope.

## 4. DECISION — already accepted

- The integration/security artifact set is authoritative.
- Modular monolith remains the structural assumption until a separate deployment decision.
- No microservices, event bus, Kubernetes, secret store, OAuth provider, queue, cache vendor, cloud or first domain is selected here.

## 5. OPEN — items deferred to follow-up decisions

- Specific cross-product event catalog.
- Authorization policy granularity (role, capability, resource).
- Audit retention and deletion policy.
- Multi-region and replication strategy.
- Disaster-recovery expectations for each product.

## 6. Relationship to other artifacts

- `ecosystem-overview.md` — what BOS is and is not.
- `platform-boundaries.md` / `product-boundaries.md` — where principles apply.
- `bounded-contexts.md` — ownership rules.
- `data-ownership.md` — concrete ownership table.
