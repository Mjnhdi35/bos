# BOS Organization Model

> **Status:** `PROPOSED` — organization/workspace/deployment/tenant distinction. Today the repository has only partial Identity and Users. There is no Organization, Workspace, Deployment or Tenant concept in the data model.

## Vocabulary

- **FACT** — verified.
- **REQUIREMENT** — invariant.
- **DECISION** — accepted.
- **PROPOSED** — design rule.
- **OPEN** — not yet chosen.

## 1. FACT

- `users` table exists with `role` enum (`user|admin`).
- No `organizations`, `workspaces`, `deployments` or `tenants` tables exist.
- No mandatory `tenant_id` column convention exists in the schema.

## 2. Terms and distinctions

| Term | Meaning | Lifetime |
|---|---|---|
| **Organization** | A logical owner of business data. Multiple users can act on its behalf. | Long-lived; survives product changes. |
| **Workspace** | A working container inside an organization where a set of users collaborates on a bounded scope. | Medium-lived; can be created/archived. |
| **Deployment** | A running instance of BOS hosting one or more organizations. | Instance lifetime. |
| **Tenant** | The slice of state an organization owns inside a specific deployment. | Equals organization within deployment; not a global cross-deployment identity. |

Important distinctions:

- An Organization is a logical concept; it is not tied to a deployment.
- A Workspace is scoped to one Organization.
- A Deployment hosts multiple Organizations; an Organization may exist in multiple Deployments via replication/projection — `OPEN`.
- `tenant_id` is not a mandatory column; it is used only where a context explicitly requires deployment-time partitioning.

## 3. REQUIREMENT

- An organization owns its data.
- A workspace cannot exist without an organization.
- A deployment does not leak data across organizations.
- Cross-organization operations require explicit contract and audit.
- Products must not assume a single global organization.

## 4. PROPOSED

- Organization membership drives authorization.
- Workspace membership scopes product actions within the organization.
- Deployment context provides isolation boundaries (DB row-level or schema-level — `OPEN`).
- Cross-deployment organization references are by canonical IDs only.

## 5. DECISION

- No mandatory `tenant_id` column across all tables.
- Products define their own membership model; no shared "global user directory".

## 6. Conditional roadmap

- An organization/workspace model is implemented only when a product requirement cites it.
- Multi-organization support is conditional; a single-organization deployment remains a valid option.

## 7. Open decisions

- `OPEN`: organization membership roles.
- `OPEN`: workspace roles vs. organization roles.
- `OPEN`: cross-deployment organization projection (replication, federation, or none).
- `OPEN`: organization-level audit retention.
- `OPEN`: organization-level data export/import format.
