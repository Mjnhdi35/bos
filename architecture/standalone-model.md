# BOS Standalone Model

> **Status:** `PROPOSED` — single-instance deployment profile.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- Local dev runs the application against a Docker Compose PostgreSQL.
- The application has health endpoints and uses Knex migrations.
- No business product runs in this profile yet.

## 2. REQUIREMENT

- Standalone means one application instance, one PostgreSQL database, no external dependencies required.
- A standalone deployment must be operable offline from any cloud service.
- All required capabilities run inside the same process (modular monolith).

## 3. Topology

```text
single host
  +-- bos application (modular monolith, compiled)
  +-- PostgreSQL (one logical database, many schemas)
  +-- optional generic PaaS/BaaS (replaceable)
```

## 4. Storage

- **FACT:** PostgreSQL is the database.
- **PROPOSED:** generic object storage, generic queue/cache, both replaceable.
- **OPEN:** secret store; if not present, the deployment runs without it.

## 5. Identity and access

- Authentication uses the same identity context as multi-instance (see `identity-model.md`).
- Authorization policy is per-deployment; no cross-deployment principal is assumed.

## 6. Migration and bootstrap

- **FACT:** migrations are Knex-managed.
- **PROPOSED:** migrations run before the application starts serving requests.
- **PROPOSED:** bootstrap data (e.g. `bootstrap/snapshot.json`) is loaded only when required; image must ship the snapshot if so.

## 7. Operational expectations

- The deployment exposes `/health` and `/health/db`.
- Logs are written locally; observability backend is optional and `OPEN`.
- Backup strategy is operator-defined; the application does not assume cloud-native snapshots.

## 8. Failure posture

- If a generic PaaS/BaaS is unavailable, the deployment continues in degraded mode per product.
- No implicit dependency on another instance; sibling instances do not exist in this profile.

## 9. Open decisions

- `OPEN`: backup/restore tooling.
- `OPEN`: monitoring stack.
- `OPEN`: log shipping.
