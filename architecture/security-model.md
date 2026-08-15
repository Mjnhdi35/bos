# BOS Integration Security Model

> **Status:** `PROPOSED` — security architecture for future integrations. It defines invariants without selecting a vendor, secret manager, OAuth provider or cryptographic implementation not required by current evidence.

## 1. Security objectives

The integration boundary must preserve:

- authenticated identity and explicit organization isolation;
- least-privilege authorization for users, services, Connections and provider capabilities;
- confidentiality and lifecycle control for OAuth tokens, API keys, signing secrets and private keys;
- authenticity, freshness and replay resistance for webhooks;
- auditability without secret leakage;
- failure isolation and safe recovery;
- portability on disconnect/provider migration;
- data minimization, retention and deletion obligations.

The current repository has partial Identity/Auth evidence but no implemented Integration, Organization or integration-specific authorization contract. This document is target policy, not a claim that these controls are present today.

## 2. Trust boundaries

```text
User/client
  -> BOS API/auth boundary
       -> Product module
       -> Integration application boundary
            -> Credential/token boundary
            -> Provider Adapter/Connector
                 -> External provider
            -> Webhook ingress boundary
       -> Integration-owned persistence/audit
```

Trust assumptions:

- External providers are untrusted systems whose responses, callbacks, identifiers and availability must be validated.
- Provider SDKs are third-party code and are confined to a reviewed Adapter/Connector dependency boundary.
- Product domains cannot trust provider payloads as canonical business facts without validation and mapping.
- Workers are privileged only for their assigned capability, organization scope and resource scope.
- Database access is a security boundary; no domain reads another domain's tables directly.

## 3. Identity and organization isolation

Every request, command, Sync, Webhook, event and persisted Integration record must have an attributable principal or explicit system actor. Organization scope is mandatory for tenant-owned state.

Required controls:

1. Resolve authenticated identity using the Identity contract; never infer identity from provider account IDs or client-supplied organization IDs alone.
2. Resolve effective organization membership and role/permission before reading or mutating a Connection, ExternalAccount, ExternalResource, Mapping, Credential metadata or Sync.
3. Enforce organization scope in service methods and persistence queries, not only at route middleware.
4. Use deny-by-default behavior for missing, ambiguous or stale organization context.
5. Prevent cross-organization references in a single request, mapping, Sync or event.
6. Ensure background work carries immutable organization/Connection context and rechecks authorization-relevant status before side effects.
7. Never use a global provider credential for multiple organizations unless an explicit isolation decision, data model and risk review approve it.

`organizationId` supplied in a payload is a claim to validate, not an authorization grant. Cross-organization administration, support access and break-glass access are `OPEN` policies requiring separate audit and approval rules.

## 4. Authorization model

Authorization has four dimensions:

- **Actor:** human user, service worker or approved support actor.
- **Organization:** effective tenant membership and lifecycle.
- **Resource:** Connection, ExternalAccount, ExternalResource, Mapping, Sync or product object ownership.
- **Capability:** specific operation such as read, authorize, publish, distribute, webhook-manage or disconnect.

Proposed policy:

| Action | Default policy |
|---|---|
| View provider catalog | authenticated, non-sensitive catalog read |
| Create/authorize Connection | organization owner/admin or explicitly delegated integration role |
| Read Connection/account/resource status | organization-scoped read permission |
| Create/remove Mapping | product-object permission plus integration resource permission |
| Start/write Sync | explicit product/integration capability; worker executes only scoped work |
| Disable/disconnect Connection | owner/admin or delegated integration manager; always audited |
| Access raw credential | prohibited to normal users, admins and product modules; token broker only |
| Inspect webhook raw body/signature | prohibited by default; security-limited diagnostic path only |

This matrix remains `PROPOSED` until the Identity/Organization task defines concrete roles and permissions. Implementations must add negative tests for unauthenticated, wrong organization, insufficient role, disabled Connection and cross-resource references.

## 5. Credentials, OAuth and secrets

### Credential principles

- Credential values are secret material, never ordinary domain fields.
- APIs/events/logs contain only a Credential ID, status, expiry metadata and safe scope summary.
- Product modules never receive raw access/refresh tokens, client secrets, API keys, webhook signing secrets or private keys.
- The Connector obtains a short-lived, capability-scoped credential through a dedicated token accessor/broker boundary.
- Secrets are encrypted at rest and protected in transit; exact cryptographic/key-management implementation is `OPEN`.
- Access to secret material is logged as metadata (who/what/when/purpose), never with the value.
- Refresh token rotation, revocation, expiry, scope changes and reauthorization are explicit lifecycle transitions.
- Token exchange uses a one-time authorization state and anti-CSRF/PKCE controls where the selected OAuth flow supports them; exact flow is `OPEN`.

### Storage and handling

Do not store secrets in PostgreSQL plaintext, generated snapshots, source, test fixtures, environment files committed to Git, event payloads, error details or provider snapshots. A future secret storage decision must define encryption, key rotation, backup/restore, access policy, deletion and failure behavior without naming a vendor prematurely.

Credential metadata should include a stable ID, organization/Connection, provider, type, status, issued/expiry times, granted capability summary, last-used/last-refresh timestamps and revocation reason. It should not include raw token material or unnecessary provider claims.

### OAuth and external account binding

Bind an authorization result to the initiating organization, authenticated actor, provider key, Connection intent, redirect/client context and one-time state. Validate provider-issued identity before creating ExternalAccount. Do not accept a client-supplied external account ID as proof of ownership.

If a provider supports multiple accounts, explicit account selection and revalidation are required. Reauthorization must not silently replace an active Connection's ExternalAccount or mappings; use an explicit transition and audit record.

## 6. Webhook verification and replay defense

Webhook ingress is a hostile-input boundary. Before processing or emitting a business event:

1. Resolve the target Connection using a non-secret provider delivery route/reference.
2. Capture the raw body with strict size limits before JSON parsing when the provider signature requires raw bytes.
3. Verify signature/MAC using the provider's documented scheme and a credential-bound signing secret or public-key policy.
4. Validate timestamp/freshness window when supported; allow only bounded clock skew.
5. Require a provider delivery ID or derive a documented replay key from authenticated fields; deduplicate durably by Connection + provider delivery ID/event reference.
6. Validate content type, schema/version and required provider identifiers.
7. Reject or quarantine invalid/replayed/unknown callbacks without invoking product side effects.
8. Persist a redacted receipt and verification outcome for audit/reconciliation; do not log raw signature, secret or full body by default.
9. Acknowledge only according to the provider contract; business processing is asynchronous where possible.

Algorithm, key rotation, timestamp window, receipt retention and response code are provider-specific and `OPEN` until the first provider contract is accepted. Never disable verification to improve webhook delivery.

## 7. Data isolation and minimization

Integration data classes:

- **Secret:** tokens, keys, signing secrets and private material. Restricted to token/verification boundary.
- **Sensitive provider data:** raw webhook bodies, provider snapshots, account claims and remote metadata. Integration-owned, minimized and access-controlled.
- **Tenant operational data:** Connection, Sync, Mapping and status metadata. Organization-scoped and auditable.
- **Product data:** releases, tracks, orders and business entities. Product owner remains authoritative.
- **Audit data:** security-relevant lifecycle and access facts, separated from verbose payload logging.

Rules:

- Store only provider fields required for the accepted capability, reconciliation or portability requirement.
- Use opaque BOS IDs; treat provider IDs as sensitive identifiers and do not expose them broadly without need.
- Do not copy raw provider payloads into product tables.
- Do not use provider snapshots as a permanent business archive without retention approval.
- Encrypt sensitive data at rest/in transit and restrict database/application roles by ownership.
- Define retention/deletion/legal-hold behavior before collecting webhook bodies or personal data.
- Disconnect should revoke/disable credential use promptly, stop new work, preserve only approved audit/portability state and handle provider-side deletion according to product policy.
- Exports are organization-scoped, redacted by data class and must never contain active secret material.

## 8. Least privilege and runtime isolation

Service workers and connectors receive:

- one organization/Connection scope per job where practical;
- only the capability needed by the operation;
- only the product fields and external fields needed for the mapping;
- no direct access to unrelated domain tables;
- no ability to enumerate all organizations or Credentials;
- no unrestricted network egress beyond the approved Connector policy, subject to deployment capabilities.

Database roles should separate application read/write ownership, migration privileges and operational diagnostics when infrastructure design is introduced. Provider adapters should depend on a narrow Connector/token interface rather than global configuration or process-wide mutable credentials.

## 9. Audit and observability

Audit security-sensitive actions and state changes:

- Connection create/authorize/reauthorize/disable/disconnect;
- Credential issue/refresh/revoke/use outcome (metadata only);
- capability/scope changes;
- webhook verification success/failure/replay;
- Mapping create/remove and cross-resource authorization failures;
- Sync start/cancel/retry/final outcome;
- support/break-glass access if approved.

Each audit record includes actor/service identity, organization, action, target type/ID, result, reason code, correlation ID, timestamp and policy/version reference. It excludes secret values, bearer tokens, raw signed bodies and unnecessary personal/provider payloads.

Operational logs and audit records are different stores/streams if their access and retention differ. Correlation IDs enable tracing without making payload logging necessary. Metrics must use bounded labels; do not label by raw token, email, arbitrary provider payload or high-cardinality external ID without an explicit decision.

## 10. Failure isolation and security behavior

- Authorization failure: fail closed; no retry.
- Expired/revoked credential: transition Connection to `REAUTH_REQUIRED`/`REVOKED`; do not retry blindly.
- Provider outage/rate limit: isolate by provider/Connection/destination and use bounded retry/circuit policy.
- Invalid provider payload: quarantine and alert; never coerce into a successful product state.
- Webhook replay: dedupe and audit; never reapply side effects.
- Secret-store unavailable: fail closed for writes/authenticated remote calls; do not fall back to plaintext or cached unrestricted secrets.
- Event delivery failure: retain durable state/outbox outcome and retry according to transport policy; do not claim product completion from an unconfirmed event.
- Music distribution: each destination has independent authorization, retry and audit state; one destination's security/provider failure cannot leak data or alter another destination.

## 11. Portability and provider exit

Portability is a security and availability requirement:

- product records remain usable if a provider is unavailable or disconnected;
- mappings retain canonical BOS identity independent of provider-native IDs;
- organization admins can export non-secret Connection/resource/mapping/sync metadata in a documented format;
- exports exclude active/recoverable secrets and redact provider data according to classification;
- adapter replacement uses canonical contracts and mapping versions rather than provider SDK types;
- provider migration/revocation does not silently delete product truth;
- remote deletion/disconnect effects are explicit, audited and reversible only where the provider permits.

The export format, retention period, provider-side deletion semantics and migration tooling are `OPEN`.

## 12. Security verification gates

Before production implementation of any Connector/Integration:

1. Threat model trust boundaries, assets, abuse cases and failure states.
2. Authn/authz matrix with wrong-organization and disabled-Connection negative tests.
3. Credential lifecycle tests covering issue, refresh, rotation, expiry, revoke and secret redaction.
4. Webhook signature, freshness, malformed input, unknown Connection and replay tests.
5. API/event contract tests proving no secret fields and correct organization/correlation/idempotency fields.
6. Retry/idempotency tests proving remote side effects are not duplicated unexpectedly.
7. Independent-destination tests for music distribution or any fan-out operation.
8. Audit assertions for sensitive actions and checks that logs/events omit secret material.
9. Data retention, export, disconnect and provider outage acceptance.
10. Dependency and supply-chain review for any SDK or security library.

## 13. Open decisions

- `OPEN`: concrete Organization/role/permission model and support-access policy.
- `OPEN`: OAuth grant/PKCE/redirect architecture per first provider.
- `OPEN`: secret storage, encryption/key management, rotation and backup/restore.
- `OPEN`: webhook authentication schemes and key rotation mechanism.
- `OPEN`: event transport, outbox, worker isolation and audit storage.
- `OPEN`: data classification, retention, deletion and legal-hold requirements.
- `OPEN`: network egress controls and production runtime identity model.
- `OPEN`: first provider capabilities and provider-specific scopes.

No vendor, secret manager, OAuth provider or algorithm is selected by this proposal without a concrete requirement and review decision.
