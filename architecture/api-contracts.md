# BOS Integration API Contracts

> **Status:** `PROPOSED` — provider-neutral API contract for future implementation. Paths and schemas are not present in the current application.

## 1. Contract principles

- APIs are the product-facing integration boundary; product code does not call provider SDKs.
- API representations use BOS identifiers and canonical statuses, not provider response shapes.
- Every organization-scoped request is authorized against the organization, Connection and capability.
- Remote work that can be slow, retryable, rate-limited or side-effecting is asynchronous.
- `202 Accepted` means work was recorded, not that the provider operation succeeded.
- Mutating requests that may be retried require an `Idempotency-Key`; the key is scoped to organization, operation and authenticated principal.
- Responses include a `correlationId`; asynchronous resources also expose `syncId` or destination-delivery IDs.
- Errors are stable, machine-readable and safe to expose. Secrets, tokens, raw provider payloads and internal stack traces never appear in API responses.
- Pagination uses opaque cursors. Provider cursors are not exposed as a product contract.

## 2. Common headers and envelope

### Request headers

| Header | Requirement |
|---|---|
| `Authorization` | Existing BOS authentication mechanism; exact token/cookie policy remains owned by Identity. |
| `Idempotency-Key` | Required for asynchronous commands and side-effecting retryable operations; rejected if missing or reused with a different request body. |
| `X-Correlation-Id` | Optional client-supplied trace ID subject to validation; BOS generates one when absent and returns it. |
| `Content-Type` | `application/json` for JSON contracts. Webhook ingress uses its provider-specific content type and bounded raw-body handling. |

### Resource envelope

```json
{
  "data": {},
  "correlationId": "corr_01..."
}
```

### Error envelope

```json
{
  "error": {
    "code": "INTEGRATION_CONNECTION_REAUTH_REQUIRED",
    "message": "The connection requires reauthorization.",
    "details": {},
    "retryable": false,
    "correlationId": "corr_01..."
  }
}
```

`message` is safe for clients but not a provider's raw error text. `details` is an allow-listed, schema-versioned object; it must not contain credentials, signed request bodies or sensitive provider data.

## 3. Resource shapes

### Provider summary

```json
{
  "key": "provider-key",
  "displayName": "Provider display name",
  "contractVersion": "1",
  "capabilities": ["RESOURCE_READ", "WEBHOOK_RECEIVE"],
  "status": "ENABLED"
}
```

Provider catalog data is read-only to normal organization users. Provider selection is not a credential.

### Connection

```json
{
  "id": "conn_01...",
  "organizationId": "org_01...",
  "providerKey": "provider-key",
  "status": "ACTIVE",
  "capabilities": ["RESOURCE_READ"],
  "externalAccountId": "acct_01...",
  "credentialStatus": "VALID",
  "lastHealthCheckAt": "2026-08-15T00:00:00.000Z",
  "createdAt": "2026-08-15T00:00:00.000Z",
  "updatedAt": "2026-08-15T00:00:00.000Z"
}
```

Never return access/refresh tokens, client secrets, private keys or credential values. `organizationId` may be omitted or redacted in a user-facing route if the route is already organization-scoped; the authorization contract must define this consistently.

### ExternalAccount and ExternalResource

```json
{
  "id": "extacct_01...",
  "connectionId": "conn_01...",
  "providerKey": "provider-key",
  "providerAccountType": "channel",
  "providerExternalId": "opaque-provider-id",
  "displayName": "Safe display name",
  "status": "ACTIVE",
  "lastSyncedAt": "2026-08-15T00:00:00.000Z"
}
```

```json
{
  "id": "extres_01...",
  "connectionId": "conn_01...",
  "externalAccountId": "extacct_01...",
  "providerKey": "provider-key",
  "resourceType": "track",
  "providerExternalId": "opaque-resource-id",
  "status": "LINKED",
  "mappingVersion": "1",
  "lastSyncedAt": "2026-08-15T00:00:00.000Z"
}
```

Provider-specific fields are not added to the shared shape without a versioned capability contract. Sensitive provider metadata is omitted or exposed only through a narrowly authorized, allow-listed projection.

### Sync

```json
{
  "id": "sync_01...",
  "connectionId": "conn_01...",
  "direction": "PUSH",
  "scope": "release",
  "status": "RUNNING",
  "attempt": 1,
  "correlationId": "corr_01...",
  "idempotencyKey": "idem_01...",
  "startedAt": "2026-08-15T00:00:00.000Z",
  "finishedAt": null,
  "error": null
}
```

`error` is an allow-listed normalized error with category/code and safe message. It does not include raw headers or provider secrets.

### Mapping

```json
{
  "id": "map_01...",
  "organizationId": "org_01...",
  "productType": "release",
  "productId": "release_01...",
  "externalResourceId": "extres_01...",
  "mappingVersion": "1",
  "status": "ACTIVE",
  "lastAppliedAt": "2026-08-15T00:00:00.000Z"
}
```

A Mapping is explicit and organization-scoped. A display-name match is never sufficient to create or mutate a Mapping.

## 4. Proposed resource endpoints

The exact route prefix and organization URL shape are `OPEN`; the following is a provider-neutral proposal.

### Provider catalog

- `GET /integration/providers`
  - Lists enabled provider summaries and capabilities available to the caller/organization.
  - Does not expose client credentials or internal adapter diagnostics.

### Connections

- `GET /integration/connections`
  - Lists connections visible to the authenticated organization principal.
  - Supports opaque cursor pagination and filters by provider/status.
- `POST /integration/connections`
  - Creates a `PENDING_AUTH` Connection and returns the provider authorization initiation metadata, or a bounded authorization URL if the OAuth design approves that response.
  - Does not accept arbitrary provider token values.
- `GET /integration/connections/{connectionId}`
  - Returns safe Connection status, capability and health metadata.
- `POST /integration/connections/{connectionId}/authorize/complete`
  - Completes an approved authorization exchange using a one-time state/code contract; exact OAuth flow is `OPEN`.
- `POST /integration/connections/{connectionId}/health-check`
  - Synchronous only when bounded and read-only; otherwise returns a Sync resource.
- `POST /integration/connections/{connectionId}/disable`
  - Stops new work and makes credential use fail closed; does not destroy audit/portability records by default.
- `POST /integration/connections/{connectionId}/disconnect`
  - Revokes/deletes provider authorization where supported and transitions the Connection; external deletion behavior must be explicitly selected by product policy.

### External accounts/resources

- `GET /integration/connections/{connectionId}/external-accounts`
- `POST /integration/connections/{connectionId}/external-accounts/sync`
- `GET /integration/external-resources`
- `GET /integration/external-resources/{externalResourceId}`
- `POST /integration/external-resources/sync`

List/read routes return canonical projections and safe status. Provider filters and provider-native IDs must not bypass organization/Connection authorization.

### Mappings and Sync

- `GET /integration/mappings`
- `POST /integration/mappings`
- `DELETE /integration/mappings/{mappingId}`
- `GET /integration/syncs/{syncId}`
- `POST /integration/syncs/{syncId}/cancel`

`POST /integration/mappings` validates ownership of the product object and ExternalResource, mapping version and capability before persistence. Cancellation is best-effort: already-completed remote effects remain visible and are reconciled.

## 5. Asynchronous command contract

A command endpoint that starts work returns:

```http
HTTP/1.1 202 Accepted
Location: /integration/syncs/sync_01...
```

```json
{
  "data": {
    "syncId": "sync_01...",
    "status": "REQUESTED",
    "correlationId": "corr_01..."
  },
  "correlationId": "corr_01..."
}
```

The caller observes final state via `GET /integration/syncs/{syncId}` or the documented event contract. A `202` response must never be described as provider success.

Idempotency rules:

- same organization + principal + operation + key + equivalent request returns the original result/resource;
- same key with a different request body returns `409 INTEGRATION_IDEMPOTENCY_CONFLICT`;
- key retention window is `OPEN` but must cover the maximum retry/replay window;
- idempotency state is durable enough to survive process restart;
- remote provider idempotency and BOS idempotency are separate controls and both are documented per Adapter.

## 6. Music distribution API shape

A product domain may request distribution through a product-facing command or an Integration command contract. The API must identify destinations explicitly:

```json
{
  "productType": "release",
  "productId": "release_01...",
  "destinations": [
    { "connectionId": "conn_a", "externalAccountId": "acct_a" },
    { "connectionId": "conn_b", "externalAccountId": "acct_b" }
  ],
  "mappingVersion": "1"
}
```

The response returns an aggregate operation plus destination delivery IDs/statuses. Each destination transitions independently. One destination's error is not a transaction failure for other destinations, and retry/cancel endpoints address a specific Sync or delivery where possible.

## 7. Authorization matrix (proposed)

| Operation | Organization member | Integration admin/owner | Service worker |
|---|---:|---:|---:|
| List provider catalog | read | read | read |
| List/read own organization Connections | read | read | scoped read |
| Create/authorize/disable/disconnect Connection | no by default | yes | only via approved command |
| Read ExternalAccount/Resource/Mapping | scoped read | scoped read | scoped read/write |
| Create/delete Mapping | policy-dependent | yes | scoped execution |
| Start/cancel Sync | policy-dependent | yes | internal execution |
| Read raw credential material | never | never | never; token accessor only |
| Read webhook body/raw signature | never by default | no; security/audit scope only | redacted processing only |

This matrix is a proposal pending the Identity/Organization contract. Deny by default when actor, organization or resource ownership is ambiguous.

## 8. Contract versioning and compatibility

- Every API contract has a major version and schema identifier.
- Additive fields are optional until a client migration is complete; removing/renaming fields is a breaking version change.
- Canonical enum values are append-only where possible; unknown values must fail safely or map to `UNKNOWN` without claiming success.
- Provider contract versions are separate from public API versions.
- Event payload versions are separate from API resource versions.
- A Connection records the provider/adapter contract version used for its last successful operation where needed for replay/reconciliation.

## 9. Open decisions and implementation gates

- `OPEN`: route prefix and organization URL strategy.
- `OPEN`: organization/role/permission model; current repository has partial auth and no proven integration authz policy.
- `OPEN`: OAuth grant variants, redirect/state/PKCE requirements and callback ownership.
- `OPEN`: first capabilities and canonical product payloads.
- `OPEN`: event transport, outbox and worker runtime.
- `OPEN`: idempotency retention and sync pagination/checkpoint storage.
- `OPEN`: provider-native remote deletion/disconnect policy.

Before adding an endpoint, the owning task must provide request/response JSON Schema or equivalent strict type contract, authz/tenant matrix, idempotency behavior, error table, event linkage, audit requirements and contract tests.
