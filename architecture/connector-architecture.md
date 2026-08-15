# BOS Connector Architecture

> **Status:** `PROPOSED` — target boundary for provider integrations. No connector or provider is implemented by this document.

## 1. Purpose and boundary

A Connector is the narrow boundary between BOS integration logic and an external provider transport. It isolates protocol, authentication transport, rate limits, timeouts, pagination, webhook registration and provider-specific error shapes. It is not a generic plugin framework and it must not contain product business rules.

```text
Product module
  -> Integration use case / canonical contract
  -> Provider capability port
  -> Provider Adapter
  -> Connector interface
  -> Provider API / webhook endpoint
```

Provider SDKs, if selected later, may be used only inside the corresponding Adapter/Connector package. Product modules, shared utilities and unrelated domains must not import those SDKs or provider response types.

## 2. Components

### Provider registry

The registry resolves a stable provider key and contract/capability version to an approved Adapter factory. It is configuration and code registration, not tenant state. It must reject unknown or disabled providers explicitly.

### Adapter

The Adapter translates canonical BOS commands/queries into provider operations and normalizes provider responses into provider-neutral results. It owns:

- provider-specific field mapping and validation;
- provider capability/version negotiation;
- provider error classification;
- remote idempotency/header conventions;
- provider SDK calls, if any.

It must not own organization authorization decisions, product invariants, or secret persistence.

### Connector

The Connector owns transport mechanics:

- request construction from a short-lived credential/session supplied by the credential boundary;
- HTTPS/TLS and request timeout policy;
- safe response parsing and size limits;
- pagination/cursor mechanics where provider-neutral;
- rate-limit signal extraction;
- bounded retries only when operation policy permits;
- telemetry with redaction;
- webhook delivery ingress/registration transport.

The Connector returns normalized transport outcomes; it does not decide whether a product release is valid or whether a customer may perform an operation.

### Credential boundary

A Connector receives a capability-limited credential handle or an authorized token accessor, never a credential value in a product request or event. Token refresh, rotation, revocation and secret storage are security/integration responsibilities. The exact secret storage system is `OPEN`.

## 3. Canonical connector contract

The following is a conceptual TypeScript-like contract, not implementation code:

```ts
interface ProviderAdapter {
  providerKey: string;
  contractVersion: string;
  capabilities(): ReadonlySet<Capability>;
  execute<TRequest, TResult>(
    operation: CanonicalOperation<TRequest>,
    context: ConnectorContext,
  ): Promise<ProviderResult<TResult>>;
}

interface ConnectorContext {
  organizationId: string;
  connectionId: string;
  correlationId: string;
  idempotencyKey?: string;
  deadline: string;
  credentialHandle: string;
}
```

The real implementation must enforce strict types and avoid leaking provider-specific generic objects into product modules. `ProviderResult` must distinguish success, retryable failure, terminal failure, authorization failure and rate-limit outcome. It must carry provider request/reference metadata only when safe to retain.

Minimum operation context:

- `organizationId` and `connectionId` for isolation/audit;
- `correlationId` for request-to-sync-to-event tracing;
- operation-specific `idempotencyKey` for writes;
- absolute deadline/timeout budget;
- capability and contract version;
- credential handle, never raw secret material;
- actor/service identity for authorization and audit.

## 4. Capability model

Capabilities are explicit, versioned and allow-listed, for example:

- `ACCOUNT_READ`
- `RESOURCE_READ`
- `RESOURCE_WRITE`
- `PUBLISH`
- `DISTRIBUTE`
- `WEBHOOK_RECEIVE`
- `WEBHOOK_MANAGE`
- `SYNC_PULL`
- `SYNC_PUSH`

This list is illustrative; the first product requirement must define the accepted vocabulary. An Adapter must advertise only capabilities it implements and is authorized to invoke. A Connection can enable a subset. Capability checks occur before remote calls and again at credential/token scope evaluation where applicable.

## 5. Provider-neutral versus provider-specific data

Provider-neutral contract fields should include stable BOS IDs, provider key, external ID, canonical status, timestamps, normalized error category, correlation/idempotency references and safe metadata.

Provider-specific fields are confined to the Adapter/Connector boundary. If persistence is required for reconciliation, store a versioned, redacted provider snapshot in Integration-owned state with an explicit retention policy. Do not expose arbitrary provider JSON as the product API contract by default.

Provider-native IDs are opaque strings. Do not parse them, derive authorization from them, or use them as BOS IDs. Provider account/resource type and contract version must be stored alongside them.

## 6. Request execution rules

1. Validate organization, Connection state, capability and authorization before creating work.
2. Create a correlation ID and operation-specific idempotency key before the first remote attempt.
3. Enforce an absolute deadline and bounded response size.
4. Use a retry policy derived from operation semantics, not a blanket retry interceptor.
5. Retry only classified transient failures and only when duplicate side effects are prevented or accepted by contract.
6. Respect provider rate-limit reset guidance with upper bounds.
7. Never log authorization headers, cookies, raw payload secrets, refresh tokens, access tokens or signed webhook bodies.
8. Persist Sync/attempt outcome before publishing completion/failure events where durable state is required.
9. Treat provider success as an external fact; product state changes still pass through the product's API/domain contract.
10. On adapter/connector failure, preserve a stable normalized error code and safe diagnostic reference.

## 7. Webhook connector boundary

Inbound webhooks follow this path:

```text
Provider callback
  -> ingress route
  -> raw-body capture (bounded)
  -> signature/timestamp verification
  -> provider adapter normalization
  -> dedupe by provider delivery ID + Connection
  -> durable webhook receipt state
  -> async processing/event
```

The ingress route must return the provider-required acknowledgement only after authenticity and basic shape checks appropriate to the provider. Business processing should not depend on holding the provider connection open. Invalid signatures, stale timestamps, unknown Connections and replayed delivery IDs are rejected or ignored according to the provider contract and audited without exposing raw secrets.

Verification details are provider-specific and belong in the Adapter/Connector. The security model defines the invariant; no algorithm, vendor or key store is selected here.

## 8. Adapter test contract

Every Adapter should have:

- contract tests against a fake Connector covering capability advertisement, normalization, idempotency and error classification;
- fixture tests for provider success, malformed response, rate limit, authorization failure, timeout and duplicate callback;
- isolation tests proving organization/Connection context cannot cross boundaries;
- webhook signature and replay tests when applicable;
- portability tests for export/disconnect without provider availability;
- provider integration tests only when a real sandbox and credentials are approved.

No production code should be required to instantiate a provider SDK merely to test product-domain behavior.

## 9. Deployment and dependency posture

The current assumption is an in-process modular-monolith boundary. A later decision may move a high-risk or high-volume connector behind a service boundary, but that is not required by this contract. Do not add a queue, event broker, SDK, circuit-breaker library or secret manager until a concrete requirement and operational decision justify it.

`OPEN` decisions:

- first provider and capability set;
- SDK versus direct HTTP implementation;
- connector process isolation threshold;
- durable job/outbox and event transport;
- per-provider rate-limit budgets;
- remote idempotency support and fallback strategy;
- secret storage and key rotation mechanism;
- supported webhook authentication schemes.

## 10. Review gates

A Connector/Adapter is implementation-ready only when its task includes:

- canonical capability and API/event contract versions;
- ownership and allowed dependency imports;
- organization/authz and provider-scope matrix;
- timeout/retry/idempotency/rate-limit policy;
- credential lifecycle and redaction rules;
- webhook verification/replay policy;
- failure isolation behavior, including independent destinations;
- fake-adapter contract tests and operational observability requirements;
- disconnect/export and provider migration behavior.
