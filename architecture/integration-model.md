# BOS Integration Model

> **Status:** `PROPOSED` — architecture contract, documentation-only. This document does not imply that any integration capability is implemented.
>
> **Scope:** Connector, Integration, Provider, Adapter, Connection, ExternalAccount, ExternalResource, Credential, Webhook, Sync and Mapping boundaries for BOS.

## 1. Architectural intent

BOS remains a modular monolith until a separate deployment decision is made. Integration is a first-class capability with explicit boundaries, not a collection of provider-specific calls spread through product modules.

The target dependency direction is:

```text
Product domain
  -> Integration application contract
  -> Provider-neutral capability contract
  -> Provider adapter
  -> Connector / transport boundary
  -> External provider API or webhook
```

The following rules are non-negotiable for this contract:

1. Product code depends on provider-neutral contracts and canonical BOS models.
2. Product code does not import Spotify, Gmail, or another provider SDK directly.
3. Provider-specific behavior is isolated behind an Adapter and its Connector boundary.
4. Integrations communicate with product domains through APIs, events, webhooks and explicit contracts; they do not read or write another domain's database tables.
5. An external provider is never part of a product-domain transaction. Remote calls are bounded, retryable and independently observable.
6. Provider-neutral records must retain enough source identity and mapping metadata to support portability and reconciliation.
7. This model is a target contract. Concrete providers, SDKs, secret managers, queues and deployment topology remain `OPEN` unless separately decided.

## 2. Terms and ownership

| Entity | Meaning | Ownership and invariants |
|---|---|---|
| **Provider** | A catalog entry describing an external system and the capabilities BOS supports from it. | Integration owns the canonical provider key, capability declaration and contract version. It is not a tenant credential. |
| **Connector** | A bounded transport/runtime boundary used to call a provider or receive its callbacks. It handles HTTP/auth transport, timeouts, rate limits, response normalization and provider protocol details. | Integration/infrastructure owns execution policy. A connector must not contain product business rules. |
| **Adapter** | A provider-specific anti-corruption implementation translating between the provider contract and a provider-neutral capability contract. | Integration owns it. It may use a provider SDK internally only when approved; that dependency cannot leak across the adapter boundary. |
| **Integration** | The application capability that coordinates connections, sync, mapping, webhook processing, retries and provider lifecycle. | Integration owns orchestration state and contracts. It does not become the source of truth for product entities. |
| **Connection** | An organization-scoped configured relationship to one Provider, including status, selected capabilities, remote account reference and Credential reference. | Integration owns lifecycle and health. A connection is not the same thing as an OAuth credential or a remote resource. |
| **ExternalAccount** | A provider-side account, workspace, channel, merchant, artist profile or equivalent principal discovered through a Connection. | Integration owns the normalized identity and provider-native identifier. It is always scoped to an organization and connection. |
| **ExternalResource** | A provider-side object synchronized or addressed by BOS, such as a track, playlist, message, order or distribution destination. | Integration owns external identity, snapshot metadata and sync bookkeeping; the corresponding product object remains product-domain owned. |
| **Credential** | A reference and lifecycle record for secret material used by a Connection. | Security/integration owns metadata and access policy. Secret material is never a normal API field, event payload, log value or product-domain record. |
| **Webhook** | A registered inbound callback endpoint/configuration and its delivery/replay state. | Integration owns verification, deduplication, processing status and provider-specific subscription metadata. |
| **Sync** | A bounded pull, push or reconciliation operation with scope, cursor/checkpoint, attempt, outcome and idempotency state. | Integration owns execution state. A sync must not make an external provider the transaction coordinator for a product domain. |
| **Mapping** | Explicit relation between a product object/field and an ExternalResource/object/field, including transformation and mapping version. | The mapping owner is the integrating product contract; Integration persists execution metadata and provider identity. |

All persisted records should have an immutable BOS identifier, organization scope where applicable, created/updated timestamps, lifecycle status and optimistic version. Provider-native IDs are not suitable as BOS primary identifiers.

## 3. Relationship model

```text
Provider 1 --- n Connection
Connection 1 --- n ExternalAccount
Connection 1 --- n Credential (current + historical metadata)
Connection 1 --- n Webhook
Connection 1 --- n Sync
Connection 1 --- n ExternalResource
Product object 1 --- n Mapping --- 1 ExternalResource
Provider 1 --- n Adapter contract versions
Adapter 1 --- 1 Connector runtime boundary (or an explicitly documented connector set)
```

Required relationship rules:

- Every Connection belongs to exactly one organization and Provider.
- Every ExternalAccount, ExternalResource, Webhook, Sync and Mapping is reachable through an organization-scoped Connection or product ownership check.
- A Mapping must identify both sides using stable IDs and a mapping version; it must not rely on a display name.
- A Connection may have multiple ExternalAccounts and destinations. One remote account failure must not mutate another destination's state.
- Deleting or disabling a Connection stops new work and makes credential use fail closed; retained audit and portability records follow the approved retention policy.

## 4. Lifecycle contracts

### 4.1 Connection lifecycle

```text
PENDING_AUTH -> ACTIVE -> DEGRADED -> REAUTH_REQUIRED
                  |          |              |
                  +--------> DISABLED <-----+
                  |
                  +--------> REVOKED
```

- `PENDING_AUTH`: configuration exists but no usable credential is available.
- `ACTIVE`: health check and authorization permit the declared capabilities.
- `DEGRADED`: transient provider, rate-limit or partial capability issue; work may continue according to capability policy.
- `REAUTH_REQUIRED`: authorization is absent, expired or insufficient; no blind retry.
- `DISABLED`: intentionally stopped by an authorized actor or policy.
- `REVOKED`: provider or organization has permanently revoked access.

A health check must not be treated as proof that every capability is available. Capability-level authorization and provider status are evaluated separately.

### 4.2 Sync lifecycle

```text
REQUESTED -> RUNNING -> SUCCEEDED
                    \-> PARTIAL
                    \-> FAILED_RETRYABLE -> RUNNING (bounded retry)
                    \-> FAILED_TERMINAL
                    \-> CANCELLED
```

Each Sync records scope, direction (`pull`, `push`, `reconcile`), Connection, target/destination where relevant, attempt count, checkpoint/cursor reference, error classification, correlation ID and idempotency key. Checkpoints are opaque provider-neutral values; secret or raw token material is excluded.

### 4.3 ExternalResource and Mapping state

ExternalResource records should distinguish `DISCOVERED`, `LINKED`, `SYNCING`, `SYNCED`, `STALE`, `CONFLICT`, `UNAVAILABLE` and `ARCHIVED`. Mapping state is independent from the resource's last fetch state. A provider outage must not delete a previously valid mapping or product record.

## 5. Product integration boundary

Product domains use a small application port, for example:

- request a provider capability using a canonical product payload;
- query connection/resource/mapping status through an API contract;
- request an asynchronous Sync when the operation can be slow, retryable or provider-dependent;
- consume documented events for completion/failure/state changes;
- receive verified inbound facts through Integration events or a normalized callback contract.

Product domains do not:

- construct provider URLs, OAuth parameters or SDK clients;
- persist provider tokens;
- inspect provider response shapes;
- use Integration tables as a shared database;
- infer success from a request being accepted (`202`); they use the Sync/event contract.

A synchronous operation is allowed only when the provider call is short, bounded, idempotent or safely read-only, and the API can return a complete result within its latency budget. Long-running exports, publishing, distribution, bulk reconciliation and retryable writes are asynchronous.

## 6. Independent destination state — Music distribution example

Music distribution is modeled as one product release with many independent destination projections:

```text
Release (product-owned)
  -> Distribution request (integration/product contract)
       -> Destination delivery: provider/account A
       -> Destination delivery: provider/account B
       -> Destination delivery: provider/account C
```

Each destination delivery has its own Connection, ExternalAccount/resource reference, Mapping, Sync state, retry budget, last error, remote status and audit trail. The aggregate distribution view is derived from destination states and may be `PENDING`, `PARTIAL`, `SUCCEEDED`, `FAILED` or `CANCELLED`; it does not erase the per-destination truth.

Rules:

- A failure, timeout, rate limit or authorization error at one destination does not roll back or block already successful destinations.
- Retrying one destination does not replay successful destinations unless explicitly requested and idempotency permits it.
- Product release metadata remains product-owned; Integration owns delivery state and provider translation.
- A provider outage must degrade that destination only and expose an actionable status through API/events.
- Cross-destination "all or nothing" is not promised unless a future business requirement introduces a compensating workflow; external systems cannot participate in a shared transaction.

## 7. Persistence and data boundary

`PROPOSED` logical ownership (physical schema is out of scope for this document):

- Integration-owned state: Provider, Connection, ExternalAccount, ExternalResource, Credential metadata, Webhook, Sync, Mapping execution metadata and delivery/audit references.
- Product-owned state: release, track, catalog, order or other business entity and its business invariants.
- Shared identifiers: immutable IDs and documented API/event payloads only.

No domain may join another domain's tables, issue ad-hoc SQL against integration-owned tables, or treat provider snapshots as canonical product state without a product decision. If a transaction needs both domains, use an API command, an event/outbox contract or an explicit reconciliation job.

## 8. Failure and operational isolation

The Integration boundary must classify failures as:

- `AUTHORIZATION`: re-auth/revoke; do not retry blindly;
- `VALIDATION`: provider rejected payload; terminal until input/mapping changes;
- `NOT_FOUND`: remote object/account disappeared; reconcile or mark stale;
- `RATE_LIMITED`: honor provider retry guidance and bounded backoff;
- `TIMEOUT` / `NETWORK`: retry only idempotent work within a budget;
- `PROVIDER_5XX` / `UNAVAILABLE`: isolate provider/connection and retry with backoff;
- `INTERNAL`: alert and preserve diagnostic correlation without secrets.

Every remote call has a timeout, bounded retry policy, correlation ID and idempotency strategy appropriate to the operation. Retries are per Connection/Sync/destination, not process-global. Circuit breaking, queue technology and dead-letter storage are `OPEN` decisions.

## 9. Open decisions

- `OPEN`: first provider and first product use case; no provider SDK or vendor selected.
- `OPEN`: whether adapters are in one modular-monolith package or separately deployable later; current contract assumes in-process module boundaries.
- `OPEN`: event transport, durable job execution and outbox implementation.
- `OPEN`: exact retention/deletion rules for provider snapshots, webhook payloads and audit records.
- `OPEN`: capability vocabulary and canonical schemas for the first domain.
- `OPEN`: whether Connections may be organization-shared, user-owned, or both; this affects authorization and OAuth UX.
- `OPEN`: conflict resolution policy for bidirectional Mapping and Sync.

## 10. Acceptance criteria for implementation

Before implementation of a provider integration, the owning task must identify:

1. Provider capability contract and version.
2. Adapter/Connector ownership and dependency boundary.
3. Connection, Credential, ExternalAccount and ExternalResource lifecycle.
4. API and event schemas, idempotency and correlation behavior.
5. Webhook verification and replay handling, if inbound callbacks exist.
6. Organization/authz matrix and least-privilege provider scopes.
7. Failure classification, retry/isolation and destination-state behavior.
8. Contract tests with a fake adapter and provider-specific integration tests where justified.
9. Portability/export and disconnect behavior.

Until those decisions are accepted, this document remains a proposal rather than a signal to add code or dependencies.
