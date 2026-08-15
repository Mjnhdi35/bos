# BOS Ecosystem Overview

> **Status:** `PROPOSED` — documentation-only. No ecosystem capability is implemented by this document.

## Vocabulary used in this artifact set

- **FACT** — verified by the current repository (source, tests, migrations, CI, runtime).
- **REQUIREMENT** — externally stated or inferred business invariant that must hold.
- **DECISION** — explicit choice already accepted in the control plane.
- **PROPOSED** — design contract not yet backed by implementation.
- **OPEN** — direction, vendor, technology or policy not yet chosen.

## 1. What BOS is

BOS is a Business Operating System platform for Smoothie Studio. It hosts independent business products (CMS, Ecommerce, Studio, Production-TVC, Entertainment, Music) on a shared but generic foundation.

BOS is not:

- a single product;
- a tenant-only SaaS;
- a replacement for product-domain storage.

## 2. Layered view

```text
Smoothie Studio business products
  CMS | Ecommerce | Studio | Production-TVC | Entertainment | Music
     |
     | product-to-product contracts (API, events, webhooks)
     |
BOS Platform
  identity, organization, workspace, deployment context,
  generic platform services (entities, metadata, integrations)
     |
BOS PaaS / BaaS capabilities
  generic, business-semantics-free infrastructure:
  object storage, queue, cache, mail, scheduled jobs, observability
     |
Deployment substrate
  standalone instance OR independent cloud/self-hosted instances
```

The PaaS/BaaS layer must not encode business semantics. Products own their data and contracts.

## 3. FACT — current verified state

- Node.js 24, TypeScript strict, CommonJS, ES2023.
- Express 5 as HTTP framework.
- PostgreSQL via Knex; Vitest + Supertest; Docker Compose for local dev.
- CI covers typecheck, tests, coverage, secret scan, Docker build, non-root check, Trivy.
- Implementation present: partial Platform, partial Identity/Auth, partial Users.
- Business products (CMS, Ecommerce, Studio, Production-TVC, Entertainment, Music) are not implemented.

## 4. REQUIREMENT — invariants

- CMS, Ecommerce, Studio, Production-TVC, Entertainment and Music are independent products.
- A deployment may be standalone or one of multiple independent deployments.
- Cloud and self-hosting are both supported options.
- Products integrate via explicit API, events, webhooks and contracts.
- There is no shared global business database by default.
- Provider adapters are replaceable.
- PaaS/BaaS layers carry no business semantics.
- Each bounded context owns its data.
- Frontends are not the source of truth.
- No mandatory `tenant_id` column across products.

## 5. DECISION

- BOS is a modular monolith today. Microservices are not selected.
- Integration/security contracts in `architecture/integration-model.md`, `connector-architecture.md`, `api-contracts.md`, `event-contracts.md` and `security-model.md` are authoritative.

## 6. PROPOSED — what the ecosystem should look like

- Products expose canonical APIs and events to other products.
- A product may run without another product being installed.
- Cross-product consistency is achieved through contract, not shared schema.
- The platform offers generic services only; product semantics live in product modules.

## 7. OPEN

- First business product to onboard (no selection here).
- Any specific cloud, event bus, queue, cache or storage vendor.
- Kubernetes or other orchestration substrate.
- Any concrete security implementation, secret store or OAuth provider.

## 8. Companion artifacts

- `architecture/architecture-principles.md` — values and non-negotiables.
- `architecture/platform-boundaries.md`, `architecture/product-boundaries.md`.
- `architecture/domain-map.md`, `architecture/bounded-contexts.md`.
- `architecture/deployment-model.md`, `architecture/standalone-model.md`, `architecture/cloud-model.md`, `architecture/multi-instance-model.md`.
- `architecture/identity-model.md`, `architecture/organization-model.md`, `architecture/data-ownership.md`.
- Per-domain: `cms-domain.md`, `ecommerce-domain.md`, `studio-domain.md`, `production-domain.md`, `entertainment-domain.md`, `music-domain.md`.
- `architecture/dependency-map.md`, `architecture/architecture-decisions.md`, `architecture/implementation-roadmap.md`.
