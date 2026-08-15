# BOS Deployment Model

> **Status:** `PROPOSED` — logical deployment model. The repository today has local Docker Compose for PostgreSQL/pgAdmin and a Docker image that runs `node dist/server.js`. No staging or production infrastructure is implemented.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- Local dev: Docker Compose provides PostgreSQL 16 and pgAdmin.
- Docker image: production container runs compiled `dist/server.js` as non-root user `node`.
- Migrations: Knex-managed under `src/infrastructure/database/migrations/**`.
- CI: typecheck, tests, coverage, secret scan, Docker build, non-root check, Trivy.

## 2. REQUIREMENT

- Standalone deployment is supported (one instance, one database).
- Multiple independent deployments are supported.
- Both cloud and self-hosting are valid options.
- A deployment does not assume another deployment exists.
- A deployment does not assume Kubernetes or any specific orchestrator.
- A deployment does not assume any specific cloud provider.
- PaaS/BaaS capabilities are generic and replaceable.

## 3. Deployment topology (proposed)

```text
Standalone instance          Independent cloud instance       Self-hosted instance
  application                   application                       application
  postgres                      postgres                          postgres
  paas/baas (replaceable)       paas/baas (replaceable)          paas/baas (replaceable)
```

All three topologies are equal first-class options. The application is identical; only the deployment substrate changes.

## 4. Build and release

- **FACT:** `src/**/*.ts` is compiled by tsc into `dist/`; runtime image runs the compiled JS.
- **PROPOSED:** migration runner must be part of the runtime image, with a defined startup ordering.
- **OPEN:** release versioning, image tagging, registry.

## 5. Database and storage

- **FACT:** PostgreSQL is the database.
- **PROPOSED:** each bounded context owns its tables and migrations.
- **OPEN:** managed database service vs. self-managed.
- **OPEN:** object storage provider (generic).

## 6. Network and ingress

- **OPEN:** ingress controller, TLS termination, DNS.
- **OPEN:** static asset strategy.
- **OPEN:** CDN.

## 7. Operations posture

- Health endpoints `/health` and `/health/db` exist (FACT).
- **OPEN:** readiness/liveness separation.
- **OPEN:** logging, metrics, tracing backends.
- **OPEN:** backup and restore for each deployment.

## 8. Conditional roadmap

A deployment capability is implemented only when a concrete operational requirement cites it.

## 9. Companion artifacts

- `standalone-model.md` — single-instance profile.
- `cloud-model.md` — cloud profile.
- `multi-instance-model.md` — independent-deployments profile.
- `data-ownership.md` — what lives where.
