# BOS Identity Model

> **Status:** `PROPOSED` — identity/authn/authz contract for BOS. Today only `/auth/me` Bearer authentication, register/login/refresh/logout flows, hashed refresh tokens, HttpOnly refresh cookie and `users.role` (`user|admin`) are implemented. The full authorization model is `OPEN`.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- Identity module under `src/modules/auth/**`.
- Endpoints: register, login, refresh, logout, `/auth/me`.
- Access token returned in response body.
- Refresh token hashed in database, delivered via `HttpOnly` cookie scoped to `/auth`.
- `users.role` enum constraint `user|admin`.
- `refresh_tokens` migration exists with FK to users and revoke state.

## 2. REQUIREMENT — invariants

- Every request resolves to an authenticated identity or an explicit anonymous principal.
- Authorization is deny by default.
- Frontend is not the source of truth for authorization.
- Cross-product authorization decisions are explicit and organization-scoped where relevant.

## 3. Authentication

- **FACT:** access token + refresh token cookie model.
- **PROPOSED:** access token lifetime kept short; refresh rotation; reuse detection on refresh.
- **OPEN:** token format and signing algorithm (no selection here).

## 4. Authorization

Authorization dimensions:

- **Actor** — user, service worker, or system.
- **Organization** — see `organization-model.md`.
- **Resource** — the entity being accessed.
- **Capability** — the operation being attempted (read, write, publish, etc.).

Policy table (proposed):

| Action | Default policy |
|---|---|
| Read provider catalog | authenticated user |
| Read product data within organization | scoped read |
| Write product data within organization | scoped write |
| Cross-product writes | explicit cross-product contract |
| Read credential material | never, by any actor |
| Administrative actions | role/capability required |

## 5. Tokens and secrets

- **FACT:** access tokens issued; refresh tokens hashed in DB.
- **PROPOSED:** no raw secret material in logs, events, error details, or product tables.

## 6. Service workers

- **PROPOSED:** service workers carry immutable organization and capability context.
- **PROPOSED:** workers do not assume human identity.
- **OPEN:** service-account lifecycle.

## 7. Conditional roadmap

Identity capabilities are implemented only when a product or operational requirement cites them.

## 8. Open decisions

- `OPEN`: token format, signing algorithm, key rotation strategy.
- `OPEN`: capability/role vocabulary.
- `OPEN`: external identity provider integration (OIDC/SAML) — none selected.
- `OPEN`: break-glass / support access policy.
- `OPEN`: MFA posture.
