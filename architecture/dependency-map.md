# BOS Dependency Map

> **Status:** `PROPOSED` — logical dependency map. Physical package boundaries are not enforced by the repository today beyond what `.engineering/ARCHITECTURE.md` records.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT — runtime dependency posture

- Node.js 24, TypeScript strict, CommonJS, ES2023.
- Express 5 as HTTP framework.
- PostgreSQL via Knex.
- Vitest + Supertest.
- Docker Compose for local dev; production image runs `node dist/server.js` as user `node`.
- CI runs typecheck, tests, coverage, secret scan, Docker build, non-root check, Trivy.

## 2. Compile-time dependency direction (proposed)

```text
products/*  ->  platform, integration, shared
products/*  ->  other products/* only via API, events or webhooks
platform    ->  shared, infrastructure
integration ->  shared, infrastructure
shared      ->  infrastructure only
infrastructure -> third-party libs only
```

Forbidden patterns:

- a product importing another product's internal module;
- `shared` importing a product or platform module;
- `platform` importing a product module;
- product code importing a provider SDK.

## 3. Runtime dependency surfaces

| Surface | Owner | Notes |
|---|---|---|
| HTTP framework | Platform | Express 5 — FACT |
| Database driver | Infrastructure | `pg` via Knex — FACT |
| Auth | Identity | JWT access, hashed refresh tokens, HttpOnly cookie — FACT |
| Logging | Platform/infrastructure | pino-http — FACT |
| Provider adapters | Integration | provider SDKs confined to Adapter boundary — DECISION |
| Queue/cache | OPEN | not selected |
| Event bus | OPEN | not selected |
| Object storage | PaaS/BaaS | generic only |
| Secret store | OPEN | not selected |

## 4. Third-party dependency policy

- Node.js capability first; existing dependency second; new dependency only with a concrete requirement.
- Runtime vs. dev dependency separation.
- No transitive vendor lock-in (e.g. provider SDKs confined to Adapter).

## 5. Database dependency

- Migrations live in `src/infrastructure/database/migrations/**` (FACT).
- Each bounded context's tables are owned by that context.
- No cross-context foreign keys.
- Cross-context consistency via events.

## 6. Conditional roadmap

- A dependency is added only when an accepted requirement cites it.
- Provider SDKs are added only inside an approved Adapter.

## 7. Open decisions

- `OPEN`: queue/cache substrate.
- `OPEN`: event bus / transport.
- `OPEN`: secret store and key management.
- `OPEN`: observability backend.
- `OPEN`: feature-flag mechanism, if any.
