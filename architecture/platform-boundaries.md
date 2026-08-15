# BOS Platform Boundaries

> **Status:** `PROPOSED` — boundary contract for the BOS Platform layer. Implementation today is partial: Platform metadata, schema materialization and generic CRUD exist; Organization, Workspace, Deployment context and Product context do not.

## Vocabulary

- **FACT** — verified by the repository.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted choice.
- **PROPOSED** — design contract.
- **OPEN** — not yet chosen.

## 1. FACT

- `src/platform/**` provides entity definition, metadata persistence, schema materialization, generic entity CRUD, pagination, enum/array field support.
- `platform_entities` migration exists with unique `(name, version)` and name index.
- Materialization is not yet transactional.
- Platform routes currently lack authz contract.

## 2. REQUIREMENT

- Platform must not embed any specific business-domain semantics. The target ecosystem has not selected any business domain yet; Platform stays domain-neutral regardless of which candidate is activated first.
- Platform must not depend on a specific product module.
- Platform services are reachable only through documented APIs/contracts.

## 3. Layered responsibilities

| Layer | Owns | Must not own |
|---|---|---|
| **Product** (domain modules added when a product is activated) | Product entities, product invariants, product APIs and events | Platform internals; other product internals |
| **Platform** | Entity metadata, generic CRUD scaffolding, identity-aware context, organization/workspace/deployment context, integration contracts, provider-neutral integration surface | Business rules, product schemas, provider SDK calls |
| **PaaS** | Container/orchestration substrate, network, storage primitives, queue/cache primitives, build/release | Business semantics |
| **BaaS** | Managed object storage, mail, scheduled jobs, observability primitives, managed database | Business semantics |

PaaS and BaaS are interchangeable names for the generic substrate below BOS. Neither layer is allowed to encode a product concept.

## 4. Dependency direction

```text
Product
  -> Platform application contract
  -> Integration contract (provider-neutral)
  -> PaaS/BaaS capability
```

Reverse imports are forbidden. A PaaS/BaaS capability never imports a product or platform module.

## 5. Platform services inventory (current and proposed)

- **FACT:** metadata entity registration, schema materialization, generic record CRUD, pagination.
- **PROPOSED:** organization/workspace/deployment context providers, identity context, capability-based authorization hooks, audit hooks, integration boundary, event publication boundary.
- **OPEN:** event transport, queue/cache substrate, observability backend, secret store.

## 6. Conditional roadmap

A platform capability is implemented only when a product or operational requirement cites it. No speculative capability is added.

## 7. Open decisions

- `OPEN`: identity context shape for product consumption.
- `OPEN`: capability/role vocabulary.
- `OPEN`: audit log shape and retention.
- `OPEN`: which PaaS/BaaS services become first-class vs. external.
