---
id: TASK-0001
title: CI/CD Platform — Product Scope
phase: PHASE-000
status: implemented
disposition: active
created: 2026-08-12
author: agent:mavis
depends_on: []
replaced_by: null
---

# TASK-0001 — CI/CD Platform Product Scope

> **Project:** Production-grade CI/CD Template / Engineering Delivery Platform
> **For:** TASK-0001 (PHASE-000 — Architecture & Engineering Contract)
> **Workspace:** `bos` (current repo, used as canvas for inspection)

## Objective

Define the product scope of the CI/CD platform — explicitly stating what is in-scope, what is out-of-scope, and where the MVP boundary lies — so that every later task (architecture, principles, implementation, verification) can be evaluated against a single bounded contract.

## Context

The platform is intended to serve as a **Golden Path** for Node.js + TypeScript projects. It standardizes how source code moves from a developer's machine to production: through quality gates, security checks, immutable build artifacts, supply-chain verification, and reproducible rollback.

The contract in §13–§14 of the Agent Execution Contract already enumerates phases and an MVP milestone. This task makes the boundary **explicit and reviewable** before any architecture or implementation work begins.

The `bos` repository is used as the inspection canvas in this task. `bos` is not the platform itself; it is a Node.js + TypeScript consumer that the platform will eventually support. The current `bos` already contains a working foundation (Node 24 LTS, TypeScript, Express 5, ESLint 10, husky 9, lint-staged, commitlint, GitHub Actions CI workflow, multi-stage Dockerfile) that the platform's MVP will codify and generalize.

## Scope

### Required deliverables

1. A single Markdown scope document at `tasks/TASK-0001-product-scope.md` (this file).
2. Explicit **in-scope** and **out-of-scope** definitions for each of the nine product areas listed in the contract.
3. An explicit **MVP boundary** stating which phases and tasks are inside the first milestone and which are deferred to later expansion.
4. A list of **non-goals** — things the platform will deliberately never do — to prevent silent scope expansion.

### Out of scope (for this task)

- Any architecture decision (PHASE-000 / TASK-0002).
- Any engineering principle documentation (PHASE-000 / TASK-0003).
- Any implementation work (PHASE-001 onward).
- Any modification to `bos` source code, CI configuration, or Docker image.
- Any modification to `AGENTS.md` or `docs/task-system-design.md`.
- Installing dependencies.
- Creating or modifying any CI workflow file, Dockerfile, or release automation.

### Optional improvements

*(none)*

## MVP Boundary

Per the Agent Execution Contract §14, the MVP milestone covers the following phases:

| Phase | Name | In MVP? |
|---|---|---|
| PHASE-000 | Architecture & Engineering Contract | ✅ |
| PHASE-001 | Repository Foundation | ✅ |
| PHASE-002 | Fast CI | ✅ |
| PHASE-003 | Security | ✅ |
| PHASE-004 | Docker Build | ✅ |
| PHASE-005 | Supply Chain | ✅ |
| PHASE-006 | Artifact Verification | ✅ |
| PHASE-007 | Reproducible Build | ❌ **explicitly skipped in MVP** |
| PHASE-008 | Release | ✅ |
| PHASE-009 | Deployment | ✅ |
| PHASE-010 | Rollback | ✅ |
| PHASE-011+ | Database Safety, Integration/E2E, Preview Environments, Advanced Deployment, Identity, Reusable Platform, Service Definition, Policy as Code, Developer Experience, Observability, Failure / Chaos Testing, Template Certification | ❌ later expansion |

**MVP demonstration flow:**

```text
PR
 ↓
Quality (PHASE-002)
 ↓
Security (PHASE-003)
 ↓
Build once (PHASE-004)
 ↓
Immutable image (PHASE-004)
 ↓
SBOM (PHASE-005)
 ↓
Provenance (PHASE-005)
 ↓
Signature (PHASE-005)
 ↓
Verification (PHASE-006)
 ↓
Staging (PHASE-009)
 ↓
Approval (PHASE-009)
 ↓
Production (PHASE-009)
 ↓
Rollback (PHASE-010)
```

Anything outside this flow is out of MVP scope and may be added only after MVP acceptance.

## Scope Definitions — Nine Product Areas

### 1. CI Scope (PHASE-002)

**In-scope (MVP):**
- Parallel CI jobs: lint, format, typecheck, unit test.
- Dependency caching (GitHub Actions cache for `node_modules`).
- Node 22 + Node 24 matrix.
- Coverage gate ≥80% on lines / branches / functions / statements.
- Required status checks before merge.

**Out-of-scope (MVP):**
- Integration / E2E tests in CI (PHASE-012, later).
- Preview / per-PR environments (PHASE-013, later).
- Performance / load benchmarks.
- Mutation testing.

### 2. CD Scope (PHASE-009)

**In-scope (MVP):**
- Automatic staging deployment on merge to `main`.
- Production deployment gated by explicit human approval.
- Production deployment by **immutable digest** (never by mutable tag).
- Post-deployment verification (health-check probe).
- Environment model: `staging` and `production`.

**Out-of-scope (MVP):**
- Rolling, blue/green, canary strategies (PHASE-014, later).
- Multi-region or multi-cloud deployment.
- Auto-scaling decisions (orchestrator concern, not CI/CD).
- Edge / CDN purge coordination.

### 3. Security Scope (PHASE-003)

**In-scope (MVP):**
- Secret detection (gitleaks or equivalent).
- Dependency review (Dependabot / `npm audit`).
- Static analysis with CodeQL.
- Workflow-file security review (zizmor or equivalent).
- Least-privilege permissions per job — **no `write-all` unless explicitly justified** (invariant).
- Fail-closed on any security finding.

**Out-of-scope (MVP):**
- Runtime application security (WAF, RASP).
- Penetration testing.
- Compliance reporting (SOC 2, ISO 27001, etc.).
- Secrets manager integration (out-of-band infra, not CI).

### 4. Supply-chain Scope (PHASE-005)

**In-scope (MVP):**
- SBOM generation per artifact (CycloneDX or SPDX).
- SLSA build-level provenance.
- Cosign signing, keyless via GitHub OIDC.
- GitHub artifact attestation.
- Image vulnerability scanning post-build.

**Out-of-scope (MVP):**
- Reproducible build (PHASE-007 — explicitly skipped in MVP).
- Cross-vendor transparency log (sigstore/rekor) — verify-only later.
- Hardware-backed signing keys (HSM, YubiKey).
- VEX (Vulnerability Exploitability eXchange) documents.

### 5. Release Scope (PHASE-008)

**In-scope (MVP):**
- Conventional Commit parsing.
- Semantic versioning (`major.minor.patch`).
- Automated `CHANGELOG.md` generation.
- GitHub Release artifact publication.
- Version ↔ immutable artifact digest mapping.

**Out-of-scope (MVP):**
- CalVer or in-house versioning schemes.
- Marketing-tagged releases (`@latest`, `@next` aliases).
- Custom release-notes templating beyond Conventional Commits.
- Long-term support (LTS) branch policy.

### 6. Deployment Scope (PHASE-009)

**In-scope (MVP):**
- Two environments: `staging` and `production`.
- Auto-deploy to `staging` on `main`.
- Manual approval gate for `production`.
- Deploy by digest, not by tag.
- Post-deploy health-check probe with pass/fail signal.

**Out-of-scope (MVP):**
- Database migration coordination (PHASE-011, later).
- Multi-region deployment.
- Edge deployment.
- Progressive delivery beyond staging/production binary.

### 7. Rollback Scope (PHASE-010)

**In-scope (MVP):**
- Deployment history (audit trail of digest + timestamp + actor).
- Manual rollback (operator action).
- Automatic rollback on health-check failure post-deploy.
- **Rollback never rebuilds source** — promotes a previously verified artifact (invariant).

**Out-of-scope (MVP):**
- Cross-region rollback.
- Database rollback (complements PHASE-011, out of MVP).
- Time-travel debugging / state snapshots.
- Auto-promotion of previous tag on incident.

### 8. Observability Scope (PHASE-020)

**In-scope (MVP):**
- CI duration, queue time, failure rate.
- Deployment frequency, lead time for changes, change failure rate, time to restore (the DORA four).
- Deployment audit trail persisted with the artifact.

**Out-of-scope (MVP):**
- Custom metrics dashboards.
- Alert routing (PagerDuty / Slack integrations).
- APM / distributed tracing for the platform itself.
- Log aggregation (Splunk, ELK, Datadog Logs).
- SLO / error-budget tracking.

### 9. Developer Experience Scope (PHASE-019)

**In-scope (MVP):**
- Reusable CI / Docker / Security / Release / Deployment workflows callable by consumer projects (PHASE-016 — required as a foundation for consumer adoption).
- Configuration validation before CI runs (pre-flight local check).
- Conventional-Commit-aware local commit message helper (commitlint already in `bos`).

**Out-of-scope (MVP):**
- `delivery` CLI tool with `init / validate / ci / build / verify / deploy / rollback` subcommands (PHASE-019, later expansion).
- Web UI / dashboard.
- IDE plugins.
- Onboarding wizards.
- Marketplace / plugin ecosystem.

## Non-Goals (What This Platform Will Never Do)

These are stated explicitly to bound the platform's lifetime and prevent silent expansion:

1. The platform will not be a runtime orchestrator (Kubernetes / Nomad / Nomad-driver etc. are out of scope).
2. The platform will not host or ship application code itself — it operates on consumer repositories via reusable workflows and contracts.
3. The platform will not replace the consumer project's source-control policy — commit message format, branch protection, and merge strategy are consumer-owned.
4. The platform will not implement application-level concerns (auth, business logic, persistence) — only delivery.
5. The platform will not provide a hosted SaaS — it is a self-hosted GitHub Actions–based template.
6. The platform will not introduce an agent framework or agent runtime — the Agent Execution Contract in this conversation governs agent behavior; the platform produces artifacts, not agents.

## Constraints

- **No new dependencies** are introduced in this task. The deliverable is documentation only.
- **No commit** is made. Per Rule 4 of the Agent Execution Contract, the agent MUST NOT commit without explicit permission.
- **No source code** is modified.
- **No architecture decision** is implied — only scope boundaries.

## Verification requirements

This task's acceptance is verified by reading the document and checking that the following questions have unambiguous answers:

1. Are all nine product areas defined?
2. For each area, is "in-scope" explicit?
3. For each area, is "out-of-scope" explicit?
4. Is the MVP boundary unambiguous (which phases are in, which are out)?
5. Are non-goals stated as things the platform will never do?
6. Is the demonstrable MVP flow named and verifiable against the master plan?

## Acceptance criteria

- [PASS] All nine product areas (CI, CD, Security, Supply-chain, Release, Deployment, Rollback, Observability, Developer Experience) have explicit in-scope and out-of-scope lists.
- [PASS] MVP boundary lists exactly the phases named in Agent Execution Contract §14 (PHASE-000–006, 008, 009, 010), explicitly excluding PHASE-007.
- [PASS] Non-goals section names at least six things the platform will never do.
- [PASS] Document is reviewable in isolation — a human reviewer can decide "yes, this is the scope" without reading the contract.

## Stop conditions

- The contract's nine areas are unbounded or contradictory → STOP and ask.
- MVP boundary is unclear or conflicts with §14 → STOP and ask.
- A new product area is requested that is not in §13 → STOP and ask; out of scope for this task.

## Expected changes

- New file: `tasks/TASK-0001-product-scope.md`.
- New directory: `tasks/` (created implicitly by the file above).
- No other files changed.

## State History

<!-- Append-only. One row per transition. -->

| When | From | To | Actor | Note |
|---|---|---|---|---|
| 2026-08-12 | — | implemented | agent:mavis | scope document produced; awaiting human acceptance |

## Verification evidence

- File exists at `tasks/TASK-0001-product-scope.md` (to be confirmed by `ls` / `git status` at acceptance time).
- All nine product areas present (verified by reading the document).
- MVP boundary table present (verified by reading the document).
- Non-goals section present with at least six entries (verified by reading the document).

## Dependencies

None. This task has no dependencies.

## Notes

- **Note A — collision with old TASK-0001.** The earlier `docs/task-system-design.md` (committed at `20be4ea`) describes a different TASK-0001 — the `bos` task-management system. That task is accepted and orthogonal. This new TASK-0001 belongs to the CI/CD Platform project. The ID collision is intentional in the contract but does not cause a real conflict because the two documents live in different directories and serve different projects.
- **Note B — current `bos` state.** `bos` already implements a subset of MVP scope (Node 24, TypeScript, ESLint, husky, lint-staged, commitlint, GitHub Actions CI, multi-stage Dockerfile). The platform's MVP will codify and generalize this pattern, not invent a new one.
- **Note C — PHASE-007.** Reproducible Build is explicitly excluded from MVP per §14. The platform will NOT claim "reproducible build" support at MVP acceptance. Any later addition of PHASE-007 must go through TASK-0001-style scope expansion.

## Changelog

- 2026-08-12: TASK-0001 (CI/CD Platform Product Scope) created and implemented by `agent:mavis`. Awaiting human acceptance.
