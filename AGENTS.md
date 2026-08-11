# AGENTS.md

## Mission

BOS is a production-oriented Business Operating System for Smoothie Studio.

Optimize for:

- correctness
- simplicity
- security
- maintainability
- resource efficiency
- explicit verification

Do not optimize for code volume, abstraction count, or complexity.

## Non-Negotiable Rules

1. Inspect existing code before changing it.
2. Preserve working behavior unless there is evidence it must change.
3. Make the smallest change that solves the actual problem.
4. Do not change architecture based on personal preference.
5. Do not add dependencies without a concrete requirement.
6. Do not modify unrelated files.
7. Do not weaken types, tests, or validation to make a task pass.
8. Do not hide failures.
9. Do not silently expand task scope.
10. Verify before claiming completion.

## Technology Baseline

Backend:

- Node.js 24 LTS
- TypeScript
- Express 5
- CommonJS

Testing:

- Vitest
- Supertest

Planned infrastructure includes:

- PostgreSQL
- Redis
- Docker
- Docker Compose

Do not replace these technologies without an explicit project decision.

## TypeScript

Production code is compiled before execution.

Current compiler requirements:

- strict mode
- CommonJS
- ES2023 target
- source maps
- declaration output
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`

Do not weaken compiler safety to silence errors.

## Dependencies

Before adding a dependency:

1. Check whether Node.js provides the capability.
2. Check existing dependencies.
3. Consider runtime and operational cost.
4. Add only what is justified.

Keep runtime dependencies separate from development/test dependencies.

Do not add packages merely because they are popular or "best practice".

## Tests

Tests must verify behavior.

Use:

- unit tests for isolated logic
- integration tests for boundaries
- E2E tests only for important user journeys

Do not write tests solely to increase coverage.

**Coverage is evidence of exercised code, not proof of correctness.**

## Verification

For application changes, run relevant checks:

```bash id="v6q0bd"
npm run typecheck
npm test
npm run test:coverage
npm run build
```

Verify runtime behavior when applicable.

Never claim:

```text id="3q7qcl"
build passed
```

means:

```text id="v4t8jx"
runtime verified
```

Treat each verification result independently.

## Build

Development may use `tsx`.

Production executes compiled files from `dist/`.

Expected flow:

```text id="x0l5t3"
src/*.ts
   ↓
tsc
   ↓
dist/*.js
   ↓
Node.js
```

Do not make production depend on development-only tooling.

## Git

Before committing:

```bash id="9p6n8c"
git status
git diff
```

Do not commit:

- `node_modules/`
- `dist/`
- `coverage/`
- secrets
- credentials
- local environment files
- temporary generated files

Do not rewrite history unless explicitly requested.

## Security

Never hard-code secrets.

Never expose credentials, tokens, private keys, or passwords in:

- source code
- logs
- tests
- documentation
- commits

Security-sensitive changes require explicit verification.

## Database

PostgreSQL schema changes use migrations.

Migrations must be:

- ordered
- deterministic
- reviewable
- tested

Never edit an already-applied migration to change database history.

## Cache and Redis

Caching is a system concern, not automatically a Redis concern.

Before adding a cache, define:

- purpose
- storage layer
- key
- TTL
- invalidation
- fallback behavior
- resource cost

Redis must not become persistent business truth unless explicitly designed for that purpose.

## Docker

Production containers should contain only required runtime artifacts.

Do not copy development-only files such as:

- `AGENTS.md`
- tests
- coverage
- development tooling

Use a non-root runtime user where practical.

## Scope

Every task has:

```text id="7b0ovd"
Required changes
Optional improvements
Unrelated observations
```

Implement required changes only unless authorized otherwise.

Report optional improvements separately.

## Failure / Loop Prevention

If an approach repeatedly fails, stop.

Do not respond to failure by:

- adding random dependencies
- introducing hacks
- disabling tests
- weakening types
- bypassing validation
- modifying unrelated code
- repeating the same failed approach

Report:

```text id="t6l4e8"
Problem:
Evidence:
Attempted:
Failure:
Hypothesis:
Next step:
```

## Documentation

Documentation must describe the current system.

When something changes:

1. update affected documentation
2. remove obsolete instructions
3. avoid duplicating the same information unnecessarily

Do not turn `AGENTS.md` into an architecture document.

## Project State

The initial Node/TypeScript/Express foundation has been verified:

- typecheck passes
- tests pass
- V8 coverage works
- build passes
- runtime health endpoint verified

## Final Rule

**Do less, but verify what you do.**

Evidence beats assumption.

Correctness beats cleverness.

Explicit project decisions beat agent preference.

Small verified changes beat speculative refactors.
