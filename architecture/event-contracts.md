# BOS Integration Event Contracts

> **Status:** `PROPOSED` — event envelope and event-selection rules for future implementation. No event bus or broker is selected.

## 1. When to use an event

Use an event only when asynchronous processing is justified: a remote provider call is slow or retryable, work must continue after the request, multiple consumers need the same fact, webhook processing must be decoupled, or a destination can complete independently.

Do not emit events merely to replace a local function call, to create an internal event-sourcing model, or to hide a synchronous transaction. The current repository has no event infrastructure; transport, outbox and consumer runtime are `OPEN`.

Commands express intent (`StartSync`, `DisconnectConnection`, `DistributeRelease`). Events express a fact that has occurred (`SyncCompleted`, `ConnectionDisabled`). A command is not a success event.

## 2. Required event envelope

Every integration event must contain all of the following fields:

```json
{
  "name": "integration.sync.completed",
  "version": "1",
  "producer": "bos.integration",
  "schema": "https://bos.invalid/contracts/events/integration.sync.completed/1",
  "eventId": "evt_01...",
  "occurredAt": "2026-08-15T00:00:00.000Z",
  "timestamp": "2026-08-15T00:00:00.000Z",
  "correlationId": "corr_01...",
  "causationId": "cmd_01...",
  "idempotencyKey": "idem_01...",
  "organizationId": "org_01...",
  "subject": {
    "type": "sync",
    "id": "sync_01..."
  },
  "payload": {}
}
```

Required semantics:

- `name`: stable, lowercase, dot-delimited event name; not a class name.
- `version`: integer/string major schema version; incompatible payload changes require a new version.
- `producer`: bounded producer identity, not a host name or provider secret.
- `schema`: immutable schema identifier resolved by deployment/configuration; exact registry technology is `OPEN`.
- `eventId`: globally unique event identity for deduplication.
- `occurredAt`: when the business fact occurred; `timestamp`: when the envelope was emitted/persisted. Both are required to distinguish delayed/replayed facts.
- `correlationId`: joins request, Sync, webhook and downstream work.
- `causationId`: direct command/event/webhook receipt cause where known.
- `idempotencyKey`: operation/replay identity; never contains a token.
- `organizationId`: mandatory for organization-owned facts; system-wide catalog events must use an explicit non-tenant subject policy rather than a fake tenant ID.
- `subject`: stable type and ID for authorization/filtering.
- `payload`: versioned, canonical, minimal and free of secrets.

`timestamp` and all date-time fields use UTC RFC 3339 strings. Event size, retention, transport ordering and delivery guarantees are `OPEN` but must be specified per deployment.

## 3. Payload rules

1. Events contain facts, not live database joins or provider SDK objects.
2. Include stable BOS IDs, provider key, Connection/ExternalAccount/ExternalResource IDs where relevant, canonical status, normalized error category and safe diagnostic reference.
3. Do not include access/refresh tokens, client secrets, private keys, cookies, webhook signatures, raw authorization headers or unredacted provider payloads.
4. Do not include mutable display-name data unless needed and explicitly versioned.
5. Consumers must tolerate duplicate delivery, delay, reordering and unknown additive fields.
6. Consumers must authorize using organization and subject context; possession of an event is not authorization to read another organization's data.
7. Events are not a substitute for querying current resource state. A consumer may re-read through the owning API after validating event scope.
8. An event is published only after its required state transition is durable, using an outbox or equivalent once that mechanism is selected.

## 4. Proposed event catalog

Names are proposals and only become implementation contracts after the first use case is accepted.

### Connection lifecycle

`integration.connection.created`

Payload minimum: `connectionId`, `providerKey`, `capabilities`, `status`, actor/service reference.

`integration.connection.authorized`

Payload minimum: `connectionId`, `providerKey`, `externalAccountId`, granted capability/scope summary (never raw scopes if sensitive), `status`.

`integration.connection.status_changed`

Payload minimum: `connectionId`, previous/current status, safe reason code, effective time.

`integration.connection.disconnected`

Payload minimum: `connectionId`, provider key, revocation outcome, retained-data policy reference.

### External account/resource

`integration.external_account.discovered`

Payload minimum: `connectionId`, `externalAccountId`, provider account type, opaque provider ID, normalized display projection.

`integration.external_resource.discovered`

Payload minimum: `connectionId`, `externalAccountId`, `externalResourceId`, resource type, opaque provider ID, snapshot/version reference.

`integration.external_resource.status_changed`

Payload minimum: `externalResourceId`, previous/current status, normalized reason and source Sync.

### Sync

`integration.sync.requested`

Payload minimum: `syncId`, `connectionId`, direction, scope, idempotency key, requested target/destination IDs.

`integration.sync.completed`

Payload minimum: `syncId`, `connectionId`, direction, scope, result summary, affected resource IDs/counts, checkpoint reference.

`integration.sync.failed`

Payload minimum: `syncId`, `connectionId`, normalized error category/code, retryable flag, attempt, next-action hint, affected destination/resource ID.

`integration.sync.cancelled`

Payload minimum: `syncId`, cancellation actor/reason, completed-side-effect summary if known.

### Mapping and webhook

`integration.mapping.created`

Payload minimum: `mappingId`, product subject, `externalResourceId`, mapping version and status.

`integration.mapping.removed`

Payload minimum: `mappingId`, product subject, external resource subject, reason and effective time.

`integration.webhook.received`

Payload minimum: `webhookReceiptId`, `connectionId`, provider delivery ID/reference, verification result, normalized event type and received time. Never include signature or raw body by default.

`integration.webhook.rejected`

Payload minimum: receipt ID, Connection/reference, normalized rejection reason (`INVALID_SIGNATURE`, `REPLAY`, `UNKNOWN_CONNECTION`, `MALFORMED`) and correlation ID.

## 5. Music distribution events and independent destinations

Distribution events must identify the destination delivery, not only the aggregate release:

```json
{
  "name": "integration.distribution.destination.completed",
  "version": "1",
  "producer": "bos.integration",
  "schema": "https://bos.invalid/contracts/events/integration.distribution.destination.completed/1",
  "eventId": "evt_01...",
  "occurredAt": "2026-08-15T00:00:00.000Z",
  "timestamp": "2026-08-15T00:00:00.000Z",
  "correlationId": "corr_01...",
  "causationId": "sync_01...",
  "idempotencyKey": "idem_01...",
  "organizationId": "org_01...",
  "subject": { "type": "distribution-destination", "id": "delivery_01..." },
  "payload": {
    "productType": "release",
    "productId": "release_01...",
    "connectionId": "conn_a",
    "externalAccountId": "acct_a",
    "destinationStatus": "SUCCEEDED"
  }
}
```

A failed destination emits its own failure event and does not emit a false aggregate success. Aggregate status is derived/updated separately and must retain per-destination outcomes. Consumers must not treat one destination failure as authorization to retry all destinations.

## 6. Delivery and consumer contract

Until a transport is selected, the following delivery semantics are required:

- at-least-once delivery is the safe default assumption;
- every consumer implements dedupe using `eventId` plus consumer identity, with business idempotency where needed;
- consumers tolerate duplicate, delayed and out-of-order events;
- consumer side effects record processed event identity atomically with the relevant state transition where possible;
- poison/malformed events are quarantined or marked failed without infinite retry;
- retry policy distinguishes transient consumer failure from invalid contract/security failure;
- access control applies before processing and before any follow-up API read;
- no consumer calls a provider directly unless it is itself the approved Integration boundary.

Event publishing must be observable using producer, event name/version, event ID, correlation ID, organization-safe metrics, publish outcome and redaction-safe error code. Logging full payloads is prohibited unless an approved data-classification policy explicitly allows a redacted subset.

## 7. Schema evolution

- Version schemas independently from API and provider contracts.
- Add optional fields only when old consumers can ignore them safely.
- Do not change field meaning, type, requiredness or enum semantics in place.
- Breaking changes create a new event version/name and a migration/dual-publish plan if required.
- Producers may publish multiple versions only under an explicit transition decision.
- Consumers reject unsupported major versions safely and alert; they do not guess.
- Schema validation occurs at producer and consumer boundaries; implementation technology is `OPEN`.

## 8. Outbox, ordering and transaction boundary

The preferred target is a transactional state change plus an outbox record owned by the same module/database boundary, followed by asynchronous publication. The exact outbox schema and publisher are `OPEN` and must not be invented as shared infrastructure in a product task.

No cross-domain database transaction is implied. A product command creates/updates product state through the product owner; Integration state and events are separate transitions linked by correlation/causation IDs. Consumers reconcile when delivery is delayed or a remote provider was unavailable.

Ordering is guaranteed only within a documented subject/partition if the selected transport supports it. Consumers must not assume global ordering.

## 9. Security and privacy requirements

- Tenant/organization scoping is present in every applicable envelope and enforced by producer/consumer.
- Event authorization is least privilege; workers receive only the capabilities and fields required for their operation.
- Secret material is prohibited in payload, headers recorded as metadata and logs.
- Webhook-derived events are emitted only after verification and replay checks, with verification result represented safely.
- Audit events and business events are distinct when retention/access requirements differ.
- Export/retention/deletion policy for events is `OPEN`, but must account for personal data, provider obligations and replay needs.

## 10. Open decisions and acceptance gates

- `OPEN`: transport/broker, delivery guarantee and partition key.
- `OPEN`: schema registry/validation implementation.
- `OPEN`: outbox ownership and publisher retry/dead-letter strategy.
- `OPEN`: retention, deletion and personal-data minimization policy.
- `OPEN`: first event catalog and consumer list.
- `OPEN`: whether webhooks are normalized into events synchronously or via a durable receipt worker.

Before implementation, each event must have an approved schema, producer/consumer owner, trigger/state transition, dedupe key, ordering assumption, authorization rule, retry/dead-letter policy and contract test matrix.
