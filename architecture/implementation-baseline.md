# Implementation Baseline

> **Status:** `PROPOSED` — consolidation of 27 architecture artifacts into an executable implementation contract. This document is derived from the architecture set; it does not introduce new business decisions. Open choices are listed in §15. **Red-Team review gate is bypassed for the current phase per ADR-0018 (user override).**

## 1. Purpose

This baseline consolidates the approved architecture into the contract that implementation work must respect. Every code change is expected to trace back to a section here or to a referenced architecture artifact. If implementation requires an invariant change, update this document first via ADR.

## 2. Scope of Consolidation

This baseline covers:

- §3 — Final architecture boundaries (Product / Platform / PaaS / BaaS / Integration / External Provider / Organization / Workspace / Deployment).
- §4 — Product boundaries (six products: CMS, Ecommerce, Studio, Production, Entertainment, Music).
- §5 — Platform boundaries (PaaS owns runtime; BaaS owns generic capabilities).
- §6 — BaaS responsibilities.
- §7 — PaaS responsibilities.
- §8 — Integration responsibilities.
- §9 — Database ownership.
- §10 — API ownership.
- §11 — Event ownership.
- §12 — Deployment boundaries.
- §13 — Security boundaries.
- §14 — Dependency rules.
- §15 — Architecture invariants.
- §16 — Implementation domains (decomposition map).
- §17 — Atomic task list (high-level; concrete IDs in `.engineering/TASKS.md`).
- §18 — Agent ownership matrix.
- §19 — Branch strategy.
- §20 — Verification & architecture compliance gate.
- §21 — Reference product selection (candidates).
- §22 — MVP demonstrations required.
- §23 — Do-not-overbuild guardrails.
- §24 — Conflicting decisions & resolutions.
- §25 — Open decisions.

## 3. Final Architecture Boundaries

Eight concepts are modeled explicitly. They are NOT interchangeable.

| Concept | Definition | Owner | Examples |
|---|---|---|---|
| **Product** | A business application with its own lifecycle, data, API, deployment | Product team | CMS, Ecommerce, Studio, Production, Entertainment, Music |
| **Platform** | Optional layer that makes products easy to run and operate | Platform team | BaaS + PaaS |
| **PaaS** | Runtime / deployment substrate | Infrastructure | runtime, container, DB, network, secret, observability |
| **BaaS** | Generic backend capabilities | Platform | identity, storage, events, jobs, audit, billing |
| **Business Domain** | Bounded context inside a product that owns business semantics | Product team | `Release`, `Order`, `Track`, `Campaign` |
| **Integration** | Replaceable adapter that connects a product to an external system | Product or platform | Connector, Provider, Webhook |
| **External Provider** | Third-party service outside BOS | Vendor | Spotify, YouTube, Apple Music, Stripe, Gmail, Google Drive |
| **Organization** | A business party (agency, label, production company) using one or more products | Customer | Agency A, Artist X |
| **Deployment** | A running instance of a product | Operator | Store A, Agency B (each independent) |

No concept is allowed to absorb another's semantics. Concretely: PaaS may not store `Release`; BaaS may not store `Track`; Ecommerce may not query Music's database directly.

## 4. Product Boundaries

Six products in the initial set. Each is a **potential standalone company**.

| Product | Purpose | Bounded Contexts (high level) | Own DB? | Standalone? | Composes via |
|---|---|---|---|---|---|
| CMS | Content platform | Content, Page, Taxonomy, Media, Localization, Editorial Workflow, SEO | Yes | Yes | API + Events |
| Ecommerce | Commerce engine | Catalog, Pricing, Inventory, Cart, Checkout, Order, Fulfillment, Customer | Yes | Yes | API + Events + Webhooks |
| Studio | Business operations | Organization, Client, Lead, Project, Task, Resource, Approval, Invoice | Yes | Yes | API + Events |
| Production / TVC | Production operations | Campaign, Creative, PreProduction, Shoot, PostProduction, Review, Delivery | Yes | Yes | API + Events + Connectors |
| Entertainment | Entertainment distribution | Artist, Show, Channel, Rights, Audience, Sponsorship, Merchandise | Yes | Yes | API + Events |
| Music | Music business | Release, Track, Composition, Master, Rights, Royalty, Distribution, Marketing | Yes | Yes | API + Events + Connectors |

A product NEVER reads another's database. Cross-product reads are API / event / webhook / contract only. (ADR-0003, ADR-0006)

## 5. Platform Boundaries

The Platform is OPTIONAL. Every product MUST function without the Platform. When used, the Platform is split:

- **PaaS** answers: *How do we run software?*
- **BaaS** answers: *What generic backend capabilities does an application need?*

Neither PaaS nor BaaS imports business types. The Platform layer is reusable across products without modification. (ADR-0008)

## 6. BaaS Responsibilities

| Capability | Owned by BaaS | Boundary note |
|---|---|---|
| Identity, Authentication, Authorization | Yes | Generic `User`, `Session`, `Token`. No `Artist` or `Customer` types. |
| Organization / Workspace abstraction | Yes | Generic `Organization`, `Membership`. No industry semantics. |
| Storage abstraction | Yes | Object store + metadata index. Asset metadata is generic (`fileKey`, `mimeType`). |
| Event primitive | Yes | `Event(name, version, payload, occurredAt, correlationId, idempotencyKey)`. |
| Webhook primitive | Yes | Generic delivery + retry; no business semantics. |
| Job / Queue / Scheduler primitive | Yes | Generic worker + retry policy. |
| Notification primitive | Yes | Email / push; templates are product-owned. |
| Search primitive | Yes | Generic index; per-product schema. |
| Audit log | Yes | Actor + action + target (generic). |
| Billing / Subscription / Usage | Yes | Generic metering; price plans are product-owned. |

BaaS **MUST NOT** know `Artist`, `Track`, `Order`, `Royalty`, `Release`, `Campaign`, `Production`, `Episode`, `Show`, `Talent`, `Label`, `Product`, `Inventory`, etc.

## 7. PaaS Responsibilities

| Concern | Owned by PaaS | Boundary note |
|---|---|---|
| Project / Application / Environment / Build / Artifact / Release / Rollback | Yes | Generic; no business semantics. |
| Container / Image / Registry / Service | Yes | Generic. |
| Database (operational) | Yes | Connection / role / migration runner; no business schema. |
| Cache / Queue (operational) | Yes | Generic. |
| Network / Domain / Certificate / Secret (operational) / Config | Yes | Operational secrets, not user-level credentials. |
| Scaling / Health / Logs / Metrics / Backup (operational) | Yes | Generic. |

PaaS MUST NOT expose a `tenant_id` field to products (products do their own tenancy).

## 8. Integration Responsibilities

Integration concerns split cleanly:

| Concern | Owner |
|---|---|
| Connector (lifecycle), Connection, Credential reference, Provider registry, Webhook ingress, generic sync | BaaS / Platform |
| ExternalAccount, ExternalResource, Mapping, business-side reconciliation, business events | Product |

Both layers agree on contracts published in `architecture/integration-model.md` and `architecture/connector-architecture.md`.

The hard rule (ADR-0004): a product depends on a **provider contract** (e.g., `DistributionProvider`), never on a vendor SDK. Adapters are pluggable per deployment.

## 9. Database Ownership

| Database / Schema | Owner | Readers (allowed) | Writers (allowed) |
|---|---|---|---|
| `auth` / `users` / `refresh_tokens` | Platform (BaaS identity) | Platform code only | Platform code only |
| Generic Storage metadata | Platform (BaaS) | Platform code only | Platform code only |
| `cms.*` | CMS | CMS | CMS |
| `ecom.*` | Ecommerce | Ecommerce | Ecommerce |
| `studio.*` | Studio | Studio | Studio |
| `production.*` | Production | Production | Production |
| `entertainment.*` | Entertainment | Entertainment | Entertainment |
| `music.*` | Music | Music | Music |

Cross-product reads go through API / event / webhook / contract — never through direct DB access. (ADR-0003, ADR-0006)

Migration discipline: each migration has a single owner; destructive changes require ADR.

## 10. API Ownership

- Each product exposes a stable, versioned public API.
- The frontend is a consumer, not a source of truth. (ADR-0005)
- API contracts are published under `architecture/api-contracts.md`.
- Cross-product API usage MUST be documented in the consumer product (caller side), not in the provider.

Every API has:

- Contract (request / response schema, version)
- Error model (consistent across products)
- Authentication strategy (own the strategy is product-owned; identity issuance is BaaS)
- Authorization policy (product-owned)
- Versioning policy (major only; minor / patch backward-compatible)
- Idempotency strategy (where applicable)
- Pagination convention (consistent across products)
- Filtering convention (consistent across products)

## 11. Event Ownership

Events are for **async integration boundaries**. They are not a default for everything.

Each event has:

- Name `<producer-context>.<entity>.<verb>.v<major>` (ADR-0011)
- Version (major; minor / patch backward-compatible within major)
- Producer (single, owned)
- Schema (payload)
- Event ID
- Correlation ID (for chain tracing)
- Timestamp
- Idempotency strategy

Events belong to products, not to BaaS. BaaS provides the **emission primitive**; product publishes and consumes.

## 12. Deployment Boundaries

- Each product has its own deployment unit (process / image / container / package).
- Each deployment owns its database and storage.
- Each deployment has independent configuration.
- Multiple instances of the same product MAY run concurrently (Store A and Store B).
- Optional cloud deployment is additive; self-hosting is canonical. (ADR-0015)

Detailed topology: `architecture/deployment-model.md`, `architecture/standalone-model.md`, `architecture/cloud-model.md`, `architecture/multi-instance-model.md`, `architecture/organization-model.md`.

## 13. Security Boundaries

- Identity is issued by BaaS (`/auth/*`). Products authenticate against BaaS tokens.
- Authorization is product-local.
- Each product owns its own audit log entries; generic audit primitive is BaaS.
- External credentials for connectors live in a generic credential reference table (BaaS) — the product references them by ID, never by value.
- Cross-product data isolation is enforced through separate databases and authorization, not through `tenant_id` as a precondition. (ADR-0007)
- Detailed model: `architecture/security-model.md`, `architecture/identity-model.md`.

## 14. Dependency Rules

Classify every dependency:

| Class | Rule | Example |
|---|---|---|
| **Required** | Product MUST work without it (or product cannot run) | PostgreSQL (runtime), Node.js (runtime) |
| **Optional** | Product can degrade gracefully if absent | BaaS identity (degrades to local users) |
| **External** | Provided by a third party | Connection to a Distribution provider |
| **Development-only** | Required only in dev/test | Test runner, fake SMTP |
| **Runtime** | Available in production | Express, Pino, Knex |
| **Infrastructure** | Host-provided | PostgreSQL cluster, object store |
| **Business** | Refers to another product | Ecommerce → CMS (for product content) |

Mandatory product-to-product coupling is forbidden. Optional composition is allowed and encouraged.

## 15. Architecture Invariants

The five fundamental invariants from `architecture/ecosystem-overview.md` are binding for implementation. A code change that violates any of them is refused by the architecture compliance gate (§20).

| # | Invariant | Test |
|---|---|---|
| 1 | Independent Product | New engineer can run a product with only product code + own DB + generic PostgreSQL. |
| 2 | Multiple Independent Instances | Same source produces N isolated deployments. |
| 3 | Optional Cloud | Self-hosted, our cloud, third-party cloud, hybrid — same domain model. |
| 4 | Platform Boundary | PaaS / BaaS contain no business semantics. |
| 5 | Integration Replaceability | Connectors are swappable adapters; no vendor SDK inside domain. |

Additional invariants from AGENTS.md / RULES.md (binding):

- No accidental cross-domain database access.
- No vendor SDK leakage into domain logic.
- No mandatory cloud dependency.
- No mandatory product-to-product dependency.
- No God module / service / database.
- Schema changes use ordered, reviewable migrations.
- Architecture commits are documentation-only (ADR-0017).
- Solo maintainer mode; user is final approver (ADR-0014).

## 16. Implementation Domains (Decomposition Map)

Derived from the six products + Platform + Integration. This is the directory layout principle, not necessarily a package split (current repo is modular monolith).

```
PLATFORM (BaaS)
├── identity      (User, Session, Token, Role)         ← already partly in repo
├── organization  (Organization, Membership)            ← DEFERRED to PHASE 4
├── storage       (Asset metadata + binary reference)  ← DEFERRED
├── events        (Emission primitive + outbox)         ← DEFERRED
├── jobs          (Queue / scheduler primitive)        ← DEFERRED
├── notification  (Email / push primitive)              ← DEFERRED
├── audit         (Generic actor + action + target)     ← DEFERRED
└── billing       (Subscription / usage / metering)     ← DEFERRED

PLATFORM (PaaS)
├── runtime       (Container / image / health)          ← CURRENT Dockerfile
├── deployment    (CI / build / release pipeline)       ← CURRENT CI
├── database      (Migration runner + connection mgmt)  ← CURRENT Knex
├── network       (Routing / TLS / DNS)                 ← deferred
├── observability (Logs / metrics / traces)             ← partial (Pino)
└── secrets       (Operational secret handling)         ← deferred

PRODUCTS
├── cms           (Content + page + taxonomy + media + editorial + SEO)
├── ecommerce     (Catalog + pricing + inventory + cart + checkout + order + fulfillment)
├── studio        (Org + client + lead + project + task + resource + approval + invoice)
├── production    (Campaign + creative + preproduction + shoot + postproduction + review + delivery)
├── entertainment (Artist + show + channel + rights + audience + sponsorship)
└── music         (Release + track + composition + master + rights + royalty + distribution)

INTEGRATION
├── connector-core   (Connector contract + provider registry + retry + failure isolation)
├── oauth            (Generic OAuth abstraction + state + PKCE)
├── webhook          (Inbound + outbound webhook primitive)
├── google           (Gmail + Drive + Calendar adapters)
├── distribution     (YouTube + Spotify + Apple Music + custom distribution)
└── open-banking     (Payment adapters — Stripe / other providers; adapters only)
```

Concrete task IDs live in `.engineering/TASKS.md`.

## 17. Atomic Task List (high-level shape)

Each atomic task has one bounded responsibility, one owner, predictable files, and independent testability. (Full list in `.engineering/TASKS.md`.)

Naming convention: `BOS-<DOMAIN>-<NUMBER>` (e.g., `BOS-EVENTS-001`).

```text
PLATFORM / IDENTITY
BOS-IDENTITY-001  Define identity contract (User, Session, Token)
BOS-IDENTITY-002  Hash + bcrypt hardening (current state audit)
BOS-IDENTITY-003  Refresh-token rotation policy
BOS-IDENTITY-004  Authorization / role middleware skeleton
BOS-IDENTITY-005  Integration test: register, login, me, refresh, logout

PLATFORM / STORAGE
BOS-STORAGE-001   Define storage abstraction (binary reference + metadata)
BOS-STORAGE-002   Local filesystem adapter
BOS-STORAGE-003   Object store adapter (provider-neutral)

PLATFORM / EVENTS
BOS-EVENTS-001    Event primitive (name, version, payload, occurredAt, correlationId, idempotencyKey)
BOS-EVENTS-002    Outbox pattern (publication vs commit)
BOS-EVENTS-003    Subscriber contract + retry + dead-letter

PLATFORM / JOBS
BOS-JOBS-001      Queue / scheduler primitive (worker + retry)

PLATFORM / AUDIT
BOS-AUDIT-001     Generic audit log (actor + action + target)

PLATFORM / PAAS
BOS-PAAS-001      Production env validation at boot
BOS-PAAS-002      Compiled migration runner in production image
BOS-PAAS-003      Bootstrap snapshot for production
BOS-PAAS-004      Runtime smoke test (health + migration version)
BOS-PAAS-005      Base image digest pin + SBOM + provenance
BOS-PAAS-006      Multi-architecture image (amd64 + arm64)

REFERENCE PRODUCT — chosen per §21
<Product>-001  Domain model
<Product>-002  Aggregate(s)
<Product>-003  Repository / persistence
<Product>-004  API surface
<Product>-005  Event surface
<Product>-006  Test suite (unit + integration + e2e)
<Product>-007  Docker image + smoke
<Product>-008  Multi-instance hardening
<Product>-009  Self-hosted deployment documentation

INTEGRATION
BOS-CONN-001      Connector contract (id, type, capability, failure isolation)
BOS-CONN-002      Provider registry
BOS-CONN-003      OAuth abstraction (PKCE-aware)
BOS-CONN-004      Webhook ingress primitive
BOS-CONN-005      Webhook outbound primitive
BOS-CONN-006      First connector implementation (chosen when reference product is picked)
BOS-CONN-007      Failure isolation tests

CROSS-PRODUCT
BOS-COMP-001      Two independent instances of reference product on same Docker network
BOS-COMP-002      Optional cloud deployment path documented (without making it mandatory)
```

This list is sequential guidance for `.engineering/TASKS.md`, not a per-day schedule.

## 18. Agent Ownership Matrix

| Area | Primary Agent | Secondary Agent |
|---|---|---|
| Architecture documents | Architecture Agent | Coordinator |
| Identity / Auth | Identity Agent | Security Agent |
| Storage | Storage Agent | Platform Agent |
| Events | Events Agent | Integration Agent |
| Jobs | Jobs Agent | Platform Agent |
| Audit | Audit Agent | Security Agent |
| PaaS / runtime / Dockerfile / CI | PaaS Agent | Deployment Agent |
| Reference product (chosen) | Product Agent | API Agent |
| CMS | CMS Agent | API Agent |
| Ecommerce | Ecommerce Agent | API Agent |
| Studio | Studio Agent | API Agent |
| Production | Production Agent | API Agent |
| Entertainment | Entertainment Agent | API Agent |
| Music | Music Agent | API Agent |
| Connectors (generic) | Integration Agent | Security Agent |
| Adapters per vendor | Vendor Adapter Agent | Integration Agent |
| Tests / verification | Verification Agent | All domain agents |
| `.engineering/` triplet | Coordinator | Architecture Agent |

File ownership is enforced through path boundaries:

```
Music Agent:
  Allowed     src/modules/music/**
  Read-only   src/infrastructure/contracts/**, src/platform/** (where required)
  Forbidden   src/modules/ecommerce/**, src/modules/cms/**, src/modules/...
```

Cross-boundary changes are STOP-and-report, not silent edits.

## 19. Branch Strategy

Every implementation task uses its own branch:

```
agent/<domain>/<task-id>
```

Examples: `agent/identity/BOS-IDENTITY-001`, `agent/music/MUSIC-001`. Multiple agents never share a branch.

Main is locked to GitHub-managed updates only (release-please). No agent commits to `main`.

**NO PUSH, NO MERGE, NO RELEASE** unless explicitly authorized by the user. This is a HARD CONSTRAINT independent of any "start immediately" instruction in mission briefs.

Documentation-only commits (architecture / `.engineering/`) may be batched per phase, per ADR-0017.

## 20. Verification & Architecture Compliance Gate

Every task finishes with a structured report (matches the §29 agent reporting template):

- Implemented files
- Tests run (typecheck, unit, integration, build)
- Architecture impact (none / which invariant)
- Dependencies added or required
- Known limitations
- Next task

Before declaring a phase complete:

```text
[ ] Product remains standalone
[ ] Multiple instances are possible
[ ] Cloud remains optional
[ ] No shared DB coupling
[ ] Domain ownership is explicit
[ ] External providers use adapters
[ ] API contracts exist
[ ] Events are versioned
[ ] Credentials are isolated
[ ] Tests pass
[ ] Build passes
[ ] Typecheck passes
[ ] Security checks pass
```

BLOCKER / HIGH findings block the phase. MEDIUM / LOW are tracked but do not block.

A verification agent is assigned independently (not the implementing agent) for each completed phase.

## 21. Reference Product Selection

The first reference product is chosen based on **architecture value**, not personal preference. Good candidates (per `architecture/implementation-roadmap.md` §6 — `OPEN` decision, awaiting user choice):

| Candidate | Why it exercises architecture |
|---|---|
| **Ecommerce** | Multi-instance (Store A/B/C), payment integration, fulfillment, customer lifecycle, multi-tenant stance without `tenant_id` prerequisite |
| **Music** | Distribution to multiple DSPs via Connector contracts, rights + royalty + composition + master distinction, complex external integrations |
| **Studio** | Operations across organization + client + project + resource + approval + invoice; integrates with Google Workspace via connectors |

Selection is pending user decision (`OPEN` in `implementation-roadmap.md` §16).

## 22. Required MVP Demonstrations

The implementation is not complete until these scenarios pass:

| MVP | Scenario | Demonstration |
|---|---|---|
| 1 | Two independent Ecommerce stores | Run Store A and Store B with different DBs and config; verify isolation. |
| 2 | Standalone Music | Music runs without Spotify, YouTube, Apple Music. |
| 3 | Music distribution | Music connects to YouTube + Spotify + Apple Music via connector contracts; one provider failure does not break the release. |
| 4 | Agency | Studio + Production running together; connect Gmail + Google Drive + Google Calendar through connector framework. |
| 5 | External Artist | Agency deployment ↔ Artist deployment via API / events only; no shared database. |
| 6 | Custom Artist Website | Music API consumed by a non-BOS frontend; the Music UI is not a dependency. |
| 7 | Cloud | One product deployed through the optional PaaS path; same product also runs self-hosted. |

Each MVP is gated by the architecture compliance gate.

## 23. Do-Not-Overbuild Guardrails

This project validates architecture, not feature richness. Implementation MUST NOT prematurely implement:

- Every provider (Spotify, Apple Music, YouTube, Stripe, ...).
- Every payment gateway.
- Every social platform.
- Every advanced feature.
- Every enterprise feature.

The implementation must prove the architecture with one well-chosen vertical slice (§21) and the MVP demonstrations (§22) before widening.

Vertical slice preference:

```
User
  ↓
Organization
  ↓
Product
  ↓
Business Domain
  ↓
Database
  ↓
API
  ↓
Event
  ↓
Optional Integration
  ↓
Deployment
```

If this works for one product, the architecture has evidence.

## 24. Conflicting Decisions & Resolutions

The following conflicts were detected during consolidation. Each is resolved per ADR-0018 (user explicitly overrode the Red-Team gate for this phase; architecture content is treated as approved baseline, not as PROPOSED-to-be-reviewed).

### C1. ADR-0010 vs User Override

- ADR-0010 says Critic / Red-Team review is a gate before integration.
- User instruction says Red-Team gate is bypassed for the current phase.
- **Resolution**: Resolved by ADR-0018. Red-Team gate is bypassed for this phase only. Architecture content is treated as approved baseline, but any future change to a `PROPOSED` ADR (e.g., ADR-0011 / ADR-0016 / ADR-0017) still requires user approval.

### C2. ADR-0011 Status

- ADR-0011 (event naming convention) is `PROPOSED` in `architecture-decisions.md`.
- This baseline adopts the convention as binding. ADR-0018 promotes it to `ACCEPTED`.

### C3. ADR-0016 Status

- ADR-0016 (Red-Team findings classification) is `PROPOSED`. It remains relevant for future reviews.
- ADR-0018 keeps its vocabulary; only the gate is bypassed for this phase.

### C4. ADR-0017 Status

- ADR-0017 (architecture commits are documentation-only) is `PROPOSED`. Adopted as binding by ADR-0018.

### C5. Vendor Names in Architecture Prose

- ADR-0013 forbids vendor names in target architecture prose.
- Several documents (e.g., `integration-model.md`, `connector-architecture.md`) mention Google / Spotify / YouTube / Apple Music / Stripe / etc. as **examples of external provider categories**, not as binding decisions.
- **Resolution**: ADR-0013 applies to **internal binding and contracts**, not to **external provider categorization examples** in ecosystem-level documents. The text must remain provider-neutral in the sense that no architectural decision depends on a specific vendor. Vendor examples in `integration-model.md`, `connector-architecture.md`, `cms-domain.md`, `ecommerce-domain.md`, `music-domain.md` etc. are documentation of where a contract could bind, not binding to that vendor. Concrete providers are decided per deployment during connector binding.

### C6. Deferred Runtime Concerns

- Several Dockerfile / Docker build / SBOM / provenance / base image digest pin concerns are open.
- **Resolution**: Tracked as `BOS-PAAS-005` and similar PAAS tasks. Explicitly deferred from the architecture-approval phase; they live in PHASE 3 (BaaS / PaaS hardening) per `implementation-roadmap.md`.

## 25. Open Decisions

Track these until user input or further evidence is available:

- `OPEN` — Reference product for first vertical slice (Ecommerce / Music / Studio).
- `OPEN` — Event transport (in-process / outbox + broker / webhook-fanout) — depends on platform choice.
- `OPEN` — Secret manager and key handling — depends on cloud choice.
- `OPEN` — Which BaaS primitives ship as v1 vs v2 — depends on reference product.
- `OPEN` — Multi-tenant vs single-tenant PaaS / BaaS — depends on cloud decision.
- `OPEN` — Connectors to ship first (depends on reference product).
- `OPEN` — ADR numbering convention (centralized vs per-domain sequence).
- `OPEN` — Release cadence per product.

---

## Appendix A — Source Mapping

| Section in this baseline | Source artifact(s) |
|---|---|
| §3 Boundaries | `ecosystem-overview.md`, `platform-boundaries.md`, `product-boundaries.md` |
| §4 Product boundaries | `cms-domain.md`, `ecommerce-domain.md`, `studio-domain.md`, `production-domain.md`, `entertainment-domain.md`, `music-domain.md` |
| §5 Platform boundaries | `platform-boundaries.md`, `bounded-contexts.md` |
| §6 BaaS | `platform-boundaries.md`, `bounded-contexts.md` |
| §7 PaaS | `platform-boundaries.md`, `deployment-model.md` |
| §8 Integration | `integration-model.md`, `connector-architecture.md` |
| §9 Database | `data-ownership.md`, `multi-instance-model.md` |
| §10 API | `api-contracts.md`, `bounded-contexts.md` |
| §11 Events | `event-contracts.md` |
| §12 Deployment | `deployment-model.md`, `standalone-model.md`, `cloud-model.md`, `multi-instance-model.md`, `organization-model.md` |
| §13 Security | `security-model.md`, `identity-model.md` |
| §14 Deps | `dependency-map.md`, `bounded-contexts.md` |
| §15 Invariants | `architecture-principles.md`, `ecosystem-overview.md`, `architecture-decisions.md` |
| §16 Implementation domains | derived (this doc) |
| §17 Tasks | derived (this doc) → `.engineering/TASKS.md` |
| §18 Ownership | derived (this doc) |
| §19 Branching | `implementation-roadmap.md`, `.engineering/AGENT_WORKFLOW.md` |
| §20 Compliance gate | `architecture-principles.md`, `architecture-decisions.md` (ADR-0016) |
| §21 Reference product | `implementation-roadmap.md` §6 |
| §22 MVP | `ecosystem-overview.md` scenario set |
| §23 Do-not-overbuild | `implementation-roadmap.md` cross-cutting |
| §24 Conflicts | `architecture-decisions.md` |
| §25 Open | `ecosystem-overview.md` §9 |
