# BOS Task Management System — Design Proposal (Revised)

> **Status:** proposal (revised after reviewer feedback)
> **For:** TASK-0001
> **Author:** agent:mavis
> **Created:** 2026-08-12
> **Revised:** 2026-08-12

## Revision Notes (vs. v1)

1. Lifecycle states reduced from 9 to 7. `cancelled` and `superseded` removed from the status enum; replaced by an orthogonal `disposition` field (`active` | `replaced` | `abandoned`).
2. `verification_passed` and `review_required` now have **distinct, sequential** semantics — technical pass vs. formal hand-off — not parallel variants.
3. New `## State History` table preserves *who / when / from / to* for every transition. Current state is no longer derivable from the `status` field alone.
4. `### Optional improvements` is explicitly **fixed at task creation** — the agent cannot invent new ones during execution.
5. Dependency semantics stated precisely: every dep must reach `status: accepted` before this task may enter `in_progress`.
6. Verification evidence reduced to its minimum sufficient form — command + exit code + one-line summary, optional log file path. No full output dumps.
7. New §7 *Execution Invariants* lists six non-negotiable rules.
8. Repository structure reduced to flat `tasks/`. No `active/` / `done/` / `archive/`.
9. New §5 *Transition Matrix* lists every from→to with the actor and required condition.
10. New §12 *What this system deliberately does NOT solve* makes the system's scope explicit and bounded.

---

## Overview

This document proposes a minimal task-management system for the `bos` repository. The system is **documentation-only**: task definitions live as Markdown files with YAML frontmatter; current state lives in the `status` frontmatter field; transition history lives in an append-only `## State History` section. No runtime database, no CLI tool, no agent framework is required.

The system exists to make agent work **auditable, scoped, and reviewable**. Every change to the repository must trace back to an explicit task with explicit scope, explicit verification, and explicit acceptance.

## Goals — the nine questions a task must answer

1. **What** is the task? (`id`, `title`, `## Objective`)
2. **Why** does it exist? (`## Context`)
3. **What is in scope?** (`## Scope > Required changes`, `### Optional improvements`)
4. **What is out of scope?** (`## Scope > Out of scope`)
5. **What must be changed?** (`## Expected changes`)
6. **What evidence is required?** (`## Verification requirements`)
7. **When must the agent stop?** (`## Stop conditions`)
8. **Who accepts the result?** (`## Acceptance criteria`, designated reviewer)
9. **What is the current state?** (`status`, `## State History`)

---

## 1. Repository Structure

```
bos/
├── AGENTS.md
├── docs/
│   └── task-system-design.md    # this proposal
└── tasks/                       # task definitions (NOT created in this task)
    ├── README.md                # explains the system to agents
    ├── _template.md             # blank skeleton (leading underscore ⇒ not a real task)
    └── TASK-NNNN-<slug>.md      # one file per task
```

**Flat by design.** No `active/`, `done/`, or `archive/` subdirectories. Frontmatter fields (`status`, `disposition`) make folder gymnastics unnecessary; agents filter by field, not by location. If the directory ever becomes unwieldy, a future task may propose partitioning — but only with evidence of the actual problem.

---

## 2. Task Identity

Format: `TASK-NNNN`, where `NNNN` is a 4-digit zero-padded sequence.

**Rules:**

- ID is assigned at task creation and never changes.
- ID is independent of the filename.
- IDs are never reused, even after a task is `accepted`, `replaced`, or `abandoned`.
- IDs are monotonically increasing. Next ID = `max(existing IDs) + 1`.

---

## 3. Task File Format

Each task is a single Markdown file with YAML frontmatter and structured body sections.

### 3.1 Frontmatter

```yaml
---
id: TASK-NNNN
title: <short title>
status: <see §4.1>
disposition: <active | replaced | abandoned>
created: <YYYY-MM-DD>
author: <human-name | agent:<id>>
depends_on: []                # list of TASK-NNNN; each must reach `accepted` before this task may enter `in_progress`
replaced_by: null             # set only when disposition = replaced
---
```

`status` records current lifecycle state. `disposition` records terminal intent (`active` by default; `replaced` when a newer task supersedes; `abandoned` when work is stopped without replacement). The two fields are orthogonal — see §4.2.

### 3.2 Body Sections

```markdown
# TASK-NNNN — <title>

## Objective
One sentence.

## Context
Background.

## Scope

### Required changes
Concrete must-do list.

### Optional improvements
Concrete may-do list, **fixed at task creation**. The agent may execute any, all, or none of these — but cannot invent new ones.

### Out of scope
Concrete must-NOT-do list.

## Constraints
Hard limits.

## Expected changes
Files / areas expected to change. Reviewer uses this to spot scope creep.

## Verification requirements
Concrete checks that must pass before `verification_passed`.

## Acceptance criteria
What must be true for the reviewer to mark this task `accepted`.

## Stop conditions
Conditions that force the agent to stop and ask the human.

## Dependencies
Human-readable mirror of `depends_on`.

## State History
<!-- Append-only. One row per transition. -->
| When | From | To | Actor | Note |
|---|---|---|---|---|
| <timestamp> | — | planned | <author> | task created |

## Verification evidence
<!-- Populated when status reaches `verification_passed` or `verification_failed`. -->

## Notes
Free-form notes from the agent during execution. Use prefix `OBSERVATION:` for unrelated findings, `BLOCKED:` for ambiguous tasks, `ABANDONED:` / `REPLACED BY TASK-NNNN:` for disposition changes.

## Changelog
- <YYYY-MM-DD>: <event>
```

### 3.3 Mandatory vs Optional Fields

| Field | Required? | Notes |
|---|---|---|
| `id` | yes | Stable |
| `title` | yes | Short |
| `status` | yes | Enum from §4.1 |
| `disposition` | yes | Defaults to `active` |
| `created` | yes | `YYYY-MM-DD` |
| `author` | yes | Human or `agent:<id>` |
| `depends_on` | yes | Empty array if none |
| `replaced_by` | conditional | Required when `disposition = replaced` |
| `## Objective` | yes | One sentence |
| `## Scope` (all three subsections) | yes | Lists may be empty |
| `## Verification requirements` | yes | At least one check |
| `## Acceptance criteria` | yes | At least one criterion |
| `## Stop conditions` | yes | At least one condition |
| `## State History` | yes | Initial row on creation; append-only thereafter |
| `## Changelog` | yes | At least the creation entry |
| `## Context` | optional | Recommended for non-trivial tasks |
| `## Constraints` | optional | Required when limits are non-obvious |
| `## Expected changes` | optional | Recommended |
| `## Dependencies` (body section) | optional | Mirrors `depends_on` for human readers |
| `## Verification evidence` | conditional | Populated on `verification_passed` / `verification_failed` |
| `## Notes` | optional | Free-form |

---

## 4. Task Lifecycle

### 4.1 States and Invariants

Each state has exactly one semantic invariant.

| State | Invariant — what must be true |
|---|---|
| `planned` | Task contract is complete and locked; no implementation has begun; every dep in `depends_on` is `accepted`. |
| `in_progress` | An agent has started implementation; the contract remains locked (§7 invariant 1). |
| `implemented` | Code is written within `## Expected changes`; verification has not yet been run. |
| `verification_failed` | At least one `## Verification requirements` step did not pass; the task is not done. |
| `verification_passed` | All `## Verification requirements` steps passed; `## Verification evidence` is populated; **the agent has not yet formally handed off for review. This is a technical-pass state, not an acceptance state.** |
| `review_required` | The agent has explicitly handed off the task for acceptance review; **awaiting human reviewer decision. This is the formal acceptance-pending state.** |
| `accepted` | Human reviewer has signed off; terminal; body becomes append-only. |

The distinction between `verification_passed` and `review_required` is the core of the design:

- `verification_passed` proves technical checks ran and passed. It does NOT mean a human has reviewed.
- `review_required` is the explicit hand-off. Only AFTER this transition is a human reviewer on the hook for the acceptance decision.

**The only path to `accepted` runs through `review_required`.** There is no transition from `verification_passed` directly to `accepted`. Every task must pass through explicit human hand-off before acceptance.

### 4.2 Status vs Disposition

`status` and `disposition` are orthogonal fields, but constrained by §4.4.

- `status` ∈ {planned, in_progress, implemented, verification_failed, verification_passed, review_required, accepted}
- `disposition` ∈ {active, replaced, abandoned}

Rules:

- An agent may only pick up tasks where `disposition = active`.
- `disposition` does NOT change the meaning of `status`. The two are tracked separately.
- Each disposition change MUST be recorded as a `## State History` entry.

### 4.3 Status / History Invariant

`status` (frontmatter) and `## State History` (body) MUST agree at all times.

- `status` is the canonical current state.
- `## State History` is the append-only transition evidence.
- Every `status` transition MUST correspond to exactly one new entry in `## State History`. Every `## State History` entry MUST correspond to exactly one `status` transition. The mapping is one-to-one.
- The `To` value of the most recent `## State History` entry MUST equal `status`.
- If `status` and the most recent `To` disagree, the task is **inconsistent**. The agent MUST STOP. It MUST NOT attempt to repair by inferring which side is correct.

### 4.4 Disposition Constraints

Each disposition has precise semantics and valid `(status, disposition)` combinations.

- `disposition = active` — the task still applies. Valid with any `status` value, including `accepted`.
- `disposition = replaced` — the task no longer applies because another task (`replaced_by: TASK-NNNN`) takes over. Requires `replaced_by` to be set in frontmatter. Valid only with a non-terminal `status`.
- `disposition = abandoned` — the task will not be continued. Requires a reason in `## Notes` (prefix `ABANDONED:`). Valid only with a non-terminal `status`.

**Invalid combination:** `status = accepted` AND `disposition ∈ {replaced, abandoned}`. Once accepted, the task is final and disposition MUST remain `active`. Replacement or abandonment cannot retroactively undo acceptance — they only describe intent for tasks that have NOT been accepted yet.

---

## 5. Transition Matrix

| From | To | Actor | Required evidence / condition |
|---|---|---|---|
| — | `planned` | author (human or agent) | File written; frontmatter and required body sections present; initial `## State History` row recorded. |
| `planned` | `in_progress` | agent | Every task in `depends_on` has `status = accepted` AND `disposition = active`; agent has read the task and confirmed the contract is clear (§7 invariant 6). |
| `in_progress` | `implemented` | agent | Code is written within `## Expected changes`. |
| `implemented` | `verification_passed` | agent | Every step in `## Verification requirements` ran and passed; `## Verification evidence` populated per §8. |
| `implemented` | `verification_failed` | agent | At least one `## Verification requirements` step did not pass; failure recorded in `## Verification evidence` and/or `## Notes`. |
| `verification_failed` | `in_progress` | agent | Re-entering fix cycle. |
| `verification_passed` | `review_required` | agent | **Explicit hand-off.** Recorded in `## State History`. Until this transition, no human is on the hook. |
| `review_required` | `accepted` | human reviewer | Reviewer's decision and any comments recorded in `## Changelog`. |
| `review_required` | `verification_failed` | human reviewer | Reviewer identified a flaw; reason recorded in `## State History` and `## Notes`. |
| `accepted` | — | — | Terminal. No further `status` transitions. |

---

## 6. Scope Control

Each task explicitly classifies its work into three buckets:

- **Required changes** — must be done. Fixed at task creation.
- **Optional improvements** — may be done. **Fixed at task creation.** The agent may execute any, all, or none of these — but cannot invent new ones.
- **Out of scope** — must NOT be done.

Rules:

1. If `### Optional improvements` is empty, the agent MUST NOT add new optional work unilaterally.
2. If the agent discovers work outside the task's scope, it records `OBSERVATION: …` in `## Notes` and proposes a separate task. It MUST NOT silently expand scope.
3. `## Expected changes` is what the reviewer uses to judge scope creep. Anything outside is suspect.

---

## 7. Execution Invariants

These rules are non-negotiable. The agent MUST follow them.

1. **Task contract is immutable during execution.** Once a task transitions out of `planned`, the body sections `## Objective`, `## Scope` (all three subsections), `## Constraints`, `## Verification requirements`, `## Acceptance criteria`, `## Stop conditions`, and `## Dependencies` cannot be modified except to fix a typo. All execution-time additions go into `## State History`, `## Verification evidence`, `## Notes`, or `## Changelog`.
2. **Scope cannot be expanded by the agent.** Items in `### Optional improvements` are fixed at task creation. New ideas become new tasks with their own contracts.
3. **Agent cannot self-accept.** Only a human reviewer can transition `review_required → accepted`. The agent does not have this authority, regardless of how thorough its verification evidence is.
4. **Verification cannot be declared passed without evidence.** Setting `status = verification_passed` requires `## Verification evidence` to be populated with at least one entry per `## Verification requirements` step.
5. **Unrelated findings are observations, not implementation work.** Anything discovered during execution that is outside the task's scope is recorded in `## Notes` (prefix `OBSERVATION:`). It is NOT fixed in this task.
6. **Invalid or ambiguous tasks must stop before implementation.** If the task contract itself is unclear, contradictory, or impossible to execute as written, the agent MUST NOT transition out of `planned`. Instead it records `BLOCKED:` in `## Notes` and asks the human for clarification.

---

## 8. Verification Model

Three distinct concepts, deliberately not conflated:

| Concept | Who | What it proves |
|---|---|---|
| **Implementation** | Agent | Code is written |
| **Verification** | Agent | Code passes the checks listed in `## Verification requirements` |
| **Acceptance** | Human reviewer | Task meets its objective from a human perspective |

The agent must not treat its own statement "done" as equivalent to "verification passed". Every `## Verification requirements` step must produce evidence.

### 8.1 What Counts as Sufficient Evidence

The task file is a contract and audit record, not a log dump. Sufficient evidence is:

- **For command-based checks:** command name + exit code + one-line summary (e.g. `npm test` → `exit 0, 5/5 passed`). Optional: path to a log file holding the full output.
- **For manual smoke tests:** the request and the relevant portion of the response (truncated), or a one-line summary plus a log path. Example: `curl localhost:3000/health` → `HTTP 200, body {"status":"ok"}`.
- **For human reviewer decision:** reviewer's identifier + decision (`accepted` / `rejected`) + reason, recorded in `## Changelog`.

Full command output is NOT required in the task file. If the reviewer wants full output, they follow the log path.

---

## 9. Failure / Stop Model

| Failure | Required action |
|---|---|
| Test fails | Move to `verification_failed`. Read the failure. Fix root cause. Re-verify. |
| Build fails | Same. Build failure is a verification failure. |
| Requirements ambiguous | STOP before transitioning out of `planned`. Mark `BLOCKED:` in `## Notes`. Ask the human. |
| Implementation conflicts with existing architecture | STOP. Do NOT silently rewrite existing code. Record `OBSERVATION:` in `## Notes`. Escalate to a separate task. |
| Unrelated problem discovered | Record `OBSERVATION:` in `## Notes`. Do NOT fix in this task. |
| Same approach keeps failing (no built-in threshold; tasks may declare one in `## Stop conditions`) | STOP. Record what was tried. Re-evaluate. Ask the human. |
| Scope exceeded | STOP. Update `## Notes`. Re-scope with the human. |

---

## 10. Agent Execution Protocol

1. **Read** the task file.
2. **Confirm workability**: `status` ∈ {planned, in_progress, verification_failed} AND `disposition = active`.
3. **Check dependencies**: every task in `depends_on` has `status = accepted`. If any dep is not `accepted`, STOP and wait.
4. **Inspect** the repository: AGENTS.md, relevant source, existing architecture.
5. **Validate the contract**: if the task itself is unclear, STOP per §7 invariant 6. Otherwise, set `status = in_progress` and append a `## State History` row.
6. **Implement** strictly within `## Scope > Required changes` and `## Scope > Optional improvements` (the latter if any). Stay inside `## Expected changes`.
7. **Periodically re-read `## Stop conditions`**. If any triggers, STOP per §9.
8. **Run verification** per `## Verification requirements`. Capture evidence per §8.
9. **Update state**:
   - All pass → `status = verification_passed`, populate `## Verification evidence`, append `## State History` row.
   - Any fail → `status = verification_failed`, record failure in `## Verification evidence` and/or `## Notes`, append `## State History` row.
10. **Hand off** if verification passed: append `## State History` row for `verification_passed → review_required`. The human reviewer is now on the hook.
11. **Wait for acceptance.** The agent does NOT transition to `accepted`. If the reviewer rejects (`review_required → verification_failed`), re-enter the fix cycle.

The agent MUST NOT:
- Transition to `accepted` itself.
- Modify the contract sections during execution.
- Invent new items in `### Optional improvements`.
- Skip verification steps.
- Edit other tasks (except its own `## State History`, `## Verification evidence`, `## Notes`, `## Changelog`).
- Bypass any stop condition declared in `## Stop conditions`.

---

## 11. Disposition: Active / Replaced / Abandoned

### 11.1 Active (default)

The agent may pick up the task. The task moves through the normal lifecycle.

### 11.2 Replaced

Set when a newer task takes over. The old task's frontmatter sets `disposition: replaced` and `replaced_by: TASK-NNNN`. The reason is recorded in `## Notes` (prefix `REPLACED BY TASK-NNNN:`). Valid only with non-terminal `status` — see §4.4.

### 11.3 Abandoned

Set when the task will not be continued. The frontmatter sets `disposition: abandoned`. The reason is recorded in `## Notes` (prefix `ABANDONED:`). Valid only with non-terminal `status` — see §4.4.

### 11.4 Append-only after acceptance

For `status = accepted` tasks, the body sections `## Objective`, `## Scope`, `## Constraints`, `## Verification requirements`, `## Acceptance criteria`, `## Stop conditions`, and `## Dependencies` MUST NOT be modified. Only `## State History`, `## Changelog`, and `## Notes` may receive new entries.

---

## 12. What this system deliberately does NOT solve

This section is explicit so the design is not silently extended.

- **CI pipelines.** A separate task designs CI (lint, typecheck, test, build gates).
- **Branch / merge automation.** Git workflow is orthogonal. AGENTS.md already covers commit conventions.
- **Agent orchestration.** No framework, queue, or scheduling is specified. Operational decisions (which agent picks which task, in what order) are out of scope.
- **Databases for task storage.** Tasks are Markdown files in git. No DB.
- **Task UI.** Reading a Markdown file (in an editor, via `cat`, or via `grep`) is the UI. No Kanban, no dashboard.
- **Runtime enforcement.** Nothing here prevents an agent from violating the rules. This is a social / documentation discipline. Technical enforcement (linters, pre-commit hooks, CI gates) is a separate concern.
- **Priority / scheduling.** Tasks have no priority field, no due dates, no ordering beyond `depends_on`.
- **Cross-task analytics.** No metrics, dashboards, or progress rollups are computed from task files.

---

## 13. Example: A Real BOS Task

Below is a fully populated TASK-0002 demonstrating the format.

```markdown
---
id: TASK-0002
title: Add GET /version endpoint returning build metadata
status: planned
disposition: active
created: 2026-08-12
author: agent:mavis
depends_on: []
replaced_by: null
---

# TASK-0002 — Add GET /version endpoint

## Objective
Add a `GET /version` endpoint that returns the current commit SHA, build time, and Node.js version, so deployment verification scripts can confirm which build is running.

## Context
Today the API only exposes `/health`. Operators have no way to confirm which commit is live without SSHing into the server and reading `.git/HEAD`. A `/version` endpoint solves this without exposing runtime secrets.

## Scope

### Required changes
- Add a `GET /version` route handler in `src/app.ts`.
- Return JSON with: `commit` (short SHA, env-injected at build), `built_at` (ISO 8601, env-injected), `node` (process.version).
- Add a Vitest + supertest in `test/version.test.ts` asserting shape and HTTP 200.
- Update AGENTS.md `## Current API surface` to list the new endpoint.

### Optional improvements
- Include `package.json` version field.
- Include uptime in seconds.

### Out of scope
- Do not expose full commit message, author, or branch — short SHA only.
- Do not add any other endpoints.
- Do not wire up rate limiting / auth (separate task).

## Constraints
- Must not require any new npm dependency.
- Endpoint must respond in < 50 ms locally.
- Must work even if the commit SHA env var is missing (return `unknown`).

## Expected changes
- `src/app.ts` (route handler)
- `test/version.test.ts` (new file)
- `AGENTS.md` (`## Current API surface` update)

## Verification requirements
1. `npm run typecheck` exits 0.
2. `npm test` exits 0 with new test included.
3. `npm run build` exits 0.
4. Manual: `npm run dev` then `curl localhost:3000/version` returns JSON with the three fields.

## Acceptance criteria
- Reviewer can `curl localhost:3000/version` and confirm the response matches the format described in Objective.
- Test suite remains green.
- AGENTS.md `## Current API surface` lists the endpoint.

## Stop conditions
- If the build env vars cannot be injected via the current `npm run build` script without adding a build dependency, STOP and propose an alternative (e.g. read `.git/HEAD` at startup).
- If any existing test breaks, STOP and investigate before proceeding.

## Dependencies
None.

## State History
| When | From | To | Actor | Note |
|---|---|---|---|---|
| 2026-08-12 10:00 | — | planned | author:minh | task created |

## Verification evidence
<!-- populated when status = verification_passed or verification_failed -->

## Notes

## Changelog
- 2026-08-12: created.
```

---

## 14. Open Questions

The design commits to defaults for everything it can. One architectural question remains for the reviewer.

1. **Who counts as a "human reviewer" for the `review_required → accepted` transition?**
   - Default assumed by this design: any human with repo write access.
   - Alternative: a designated reviewer role or list (e.g. CODEOWNERS).
   - If the team wants stricter reviewer authority, that is a separate task (e.g. `TASK-0003-design-reviewer-role`).