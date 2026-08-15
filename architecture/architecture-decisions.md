# BOS Architecture Decisions

> **Status:** `PROPOSED` — decision log scaffold. Records DECISION facts and clearly marks items that are `OPEN`. Does not record decisions that have not been taken.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted choice.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. Accepted decisions

### AD-001 — Modular monolith, not microservices
**Status:** `DECISION` (recorded in `.engineering/ARCHITECTURE.md`).
The current structural assumption is a modular monolith. Microservices are not selected.

### AD-002 — Provider-neutral integration
**Status:** `DECISION`.
Product code never imports provider SDKs. Provider SDKs are confined to the Adapter/Connector boundary.

### AD-003 — Integration/security artifacts are authoritative
**Status:** `DECISION`.
The following artifacts are the contract for integration and security:

- `architecture/integration-model.md`
- `architecture/connector-architecture.md`
- `architecture/api-contracts.md`
- `architecture/event-contracts.md`
- `architecture/security-model.md`

These documents must not be modified without explicit acceptance.

### AD-004 — No mandatory `tenant_id` column
**Status:** `DECISION`.
There is no global convention requiring `tenant_id` on every table. A bounded context may define `organization_id` where it owns organization-scoped data; that column is context-local.

### AD-005 — No shared global business database
**Status:** `DECISION`.
Each bounded context owns its data. Cross-context consistency is via API/events/webhooks.

### AD-006 — Frontend is not source of truth
**Status:** `DECISION`.
The backend domain is authoritative. Frontends render and submit; they do not enforce business invariants.

### AD-007 — Independent products
**Status:** `DECISION`.
CMS, Ecommerce, Studio, Production-TVC, Entertainment and Music are independent products. They may be deployed together or separately.

### AD-008 — Standalone and multi-instance deployments
**Status:** `DECISION`.
Both profiles are supported; nothing in the application assumes one or the other.

### AD-009 — Optional cloud and self-hosting
**Status:** `DECISION`.
Cloud and self-hosting are both valid deployment options; the application binary does not change.

### AD-010 — Generic PaaS/BaaS
**Status:** `DECISION`.
PaaS and BaaS layers carry no business semantics. They are replaceable behind boundaries.

### AD-011 — Replaceable provider adapters
**Status:** `DECISION`.
Provider adapters are replaceable; replacing one does not affect product contracts.

## 2. Open decisions (no choice made)

| ID | Topic |
|---|---|
| `OPEN-AD-001` | First business domain to implement. |
| `OPEN-AD-002` | First provider/integration target. |
| `OPEN-AD-003` | Cloud provider selection. |
| `OPEN-AD-004` | Event bus / transport selection. |
| `OPEN-AD-005` | Queue/cache substrate selection. |
| `OPEN-AD-006` | Secret store and key management. |
| `OPEN-AD-007` | OAuth provider / external IdP integration. |
| `OPEN-AD-008` | Kubernetes or other orchestration substrate. |
| `OPEN-AD-009` | Concrete security implementation (algorithm, signing, rotation). |
| `OPEN-AD-010` | Authorization capability vocabulary and roles. |
| `OPEN-AD-011` | Organization/workspace/membership schema and migration ownership. |
| `OPEN-AD-012` | Multi-region posture. |
| `OPEN-AD-013` | Audit retention policy. |
| `OPEN-AD-014` | Cross-product event catalog names and ownership. |

## 3. Conditional roadmap

No `OPEN` item becomes a `DECISION` until an explicit business/operational requirement cites it and the choice is accepted by the appropriate owner (see `.engineering/TASKS.md` task registry pattern).

## 4. Companion artifacts

- `implementation-roadmap.md` — sequencing of decisions and work.
- `ecosystem-overview.md` — overall posture.
- `bounded-contexts.md` — context boundaries.
