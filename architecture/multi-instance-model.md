# BOS Multi-Instance Model

> **Status:** `PROPOSED` — multiple-independent-deployments profile. Today the repository has a single-instance Docker image and Docker Compose local dev; nothing enforces or implements multiple deployments.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- One Docker image, one runtime process (`node dist/server.js`), one PostgreSQL connection.
- No federation, replication or cross-instance routing is implemented.

## 2. REQUIREMENT

- Multiple independent deployments are supported.
- A deployment does not assume another deployment exists.
- A deployment does not assume shared global infrastructure.
- Identifiers (organization, resource) are deployment-scoped or canonical-but-deployment-resolved.
- Cross-deployment interaction, if any, is by explicit contract and audit.

## 3. Topology

```text
deployment A (orgs A1, A2)   deployment B (orgs B1)   deployment C (single org)
   |                              |                          |
   +--- each is independent; no implicit sharing
```

Each deployment runs the same application binary with its own PostgreSQL database and replaceable PaaS/BaaS substrate.

## 4. Identifier discipline

- Resource identifiers are unique within a deployment.
- Cross-deployment references use canonical IDs plus a deployment reference — `OPEN` on canonical resolution.
- Display labels must not be used as identifiers.

## 5. Cross-deployment interaction

- **PROPOSED:** cross-deployment APIs are explicit and authenticated at both ends.
- **PROPOSED:** events between deployments use a documented event envelope (see `event-contracts.md`).
- **OPEN:** transport between deployments.

## 6. Data movement

- Export/import is explicit, audited, and per-context.
- A "global business database" is not assumed; cross-deployment joins are forbidden.

## 7. Operations

- Each deployment has its own observability, backup, and incident response.
- A multi-instance operator does not get a global admin tool by default.

## 8. Conditional roadmap

- Multi-instance features are implemented only when a requirement cites them.

## 9. Open decisions

- `OPEN`: canonical ID scheme across deployments.
- `OPEN`: cross-deployment transport.
- `OPEN`: per-deployment backup/restore coordination.
- `OPEN`: support access across deployments.
