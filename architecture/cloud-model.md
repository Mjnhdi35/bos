# BOS Cloud Model

> **Status:** `PROPOSED` — cloud-deployment profile. No specific cloud provider is selected.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- Docker image compiles the application and runs it as non-root.
- Docker Compose provides local PostgreSQL/pgAdmin only.
- No cloud provider integration is implemented today.

## 2. REQUIREMENT

- Cloud deployment is an option, not the default.
- Self-hosting remains an option.
- The application binary is the same in cloud and self-hosted.
- The application does not assume any specific cloud provider API.

## 3. Topology

```text
cloud environment
  +-- bos application instance(s)
  +-- managed PostgreSQL (or self-managed)
  +-- managed object storage (generic)
  +-- managed queue/cache (optional, replaceable)
  +-- managed secret store (optional, replaceable)
  +-- observability backend (generic)
```

Cloud-specific concerns (IAM, network policy, IAM-federated identity) sit behind replaceable boundaries; product code does not call cloud SDKs.

## 4. Identity and access

- Authentication uses the identity context (see `identity-model.md`).
- Cloud IAM is for deployment-time and worker identity only; it is not a user authentication provider unless explicitly designed.

## 5. Database and storage

- **PROPOSED:** managed PostgreSQL with TLS, automated backups, point-in-time recovery.
- **OPEN:** cloud-managed DB vendor.
- **OPEN:** object storage vendor.
- **OPEN:** KMS / secret manager vendor.

## 6. Networking

- **PROPOSED:** private networking between application and database; TLS in transit.
- **OPEN:** ingress / load balancer; DNS; CDN.

## 7. Operations posture

- **PROPOSED:** structured logging with redaction; metrics with bounded labels; tracing with correlation IDs.
- **OPEN:** observability backend vendor.

## 8. Multi-region / HA posture

- `OPEN`: replication topology.
- `OPEN`: failover expectations.
- `OPEN`: data residency requirements.

## 9. Failure posture

- A managed service outage degrades capability but does not silently corrupt product data.
- Cloud-only capability is forbidden in product code; cloud services are deploy-time and runtime substrate only.

## 10. Open decisions

- `OPEN`: cloud provider selection.
- `OPEN`: managed DB vendor.
- `OPEN`: object storage vendor.
- `OPEN`: secret manager vendor.
- `OPEN`: queue/cache vendor.
- `OPEN`: observability stack.
- `OPEN`: multi-region posture.
