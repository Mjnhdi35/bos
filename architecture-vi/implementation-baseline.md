# Implementation Baseline (Baseline Triển khai)

> **Trạng thái:** `PROPOSED` — hợp nhất 27 architecture artifact thành hợp đồng triển khai có thể thi hành. Tài liệu này được derive từ architecture set; nó không đưa ra quyết định business mới. Lựa chọn mở được liệt kê ở §15. **Red-Team review gate được bypass cho phase hiện tại theo ADR-0018 (user override).**

## 1. Purpose

Baseline này hợp nhất architecture đã được duyệt thành hợp đồng mà công việc triển khai phải tôn trọng. Mọi code change được kỳ vọng trace về một section ở đây hoặc về một architecture artifact được tham chiếu. Nếu triển khai cần thay đổi invariant, cập nhật tài liệu này trư�c qua ADR.

## 2. Scope of Consolidation

Baseline này bao gồm:

- §3 — Final architecture boundaries (Product / Platform / PaaS / BaaS / Integration / External Provider / Organization / Workspace / Deployment).
- §4 — Product boundaries (sáu products: CMS, Ecommerce, Studio, Production, Entertainment, Music).
- §5 — Platform boundaries (PaaS sở hữu runtime; BaaS sở hữu generic capability).
- §6 — BaaS responsibilities.
- §7 — PaaS responsibilities.
- §8 — Integration responsibilities.
- §9 — Database ownership.
- §10 — API ownership.
- §11 — Event ownership.
- §12 — Deployment boundaries.
- §13 — Security boundaries.
- §14 — Dependency rules.
- §15 — Architecture invariants.
- §16 — Implementation domains (decomposition map).
- §17 — Atomic task list (high-level; concrete IDs ở `.engineering/TASKS.md`).
- §18 — Agent ownership matrix.
- §19 — Branch strategy.
- §20 — Verification & architecture compliance gate.
- §21 — Reference product selection (candidates).
- §22 — MVP demonstrations required.
- §23 — Do-not-overbuild guardrails.
- §24 — Conflicting decisions & resolutions.
- §25 — Open decisions.

## 3. Final Architecture Boundaries

Tám concept được mô hình hoá rõ ràng. Chúng KHÔNG thể thay thế lẫn nhau.

| Concept | Definition | Owner | Examples |
|---|---|---|---|
| **Product** | Một business application có lifecycle, dữ liệu, API, deployment riêng | Product team | CMS, Ecommerce, Studio, Production, Entertainment, Music |
| **Platform** | Lớp optional giúp chạy và vận hành product dễ dàng | Platform team | BaaS + PaaS |
| **PaaS** | Runtime / deployment substrate | Infrastructure | runtime, container, DB, network, secret, observability |
| **BaaS** | Generic backend capability | Platform | identity, storage, events, jobs, audit, billing |
| **Business Domain** | Bounded context bên trong product sở hữu business semantics | Product team | `Release`, `Order`, `Track`, `Campaign` |
| **Integration** | Adapter có thể thay thế nối product với external system | Product or platform | Connector, Provider, Webhook |
| **External Provider** | Dịch vụ bên thứ ba ngoài BOS | Vendor | Spotify, YouTube, Apple Music, Stripe, Gmail, Google Drive |
| **Organization** | Một bên business (agency, label, production company) dùng một hoặc nhiều product | Customer | Agency A, Artist X |
| **Deployment** | Một instance đang chạy của product | Operator | Store A, Agency B (mỗi cái độc lập) |

Không concept nào được phép absorb semantics của concept khác. Cụ thể: PaaS không được lưu `Release`; BaaS không được lưu `Track`; Ecommerce không được query trực tiếp database của Music.

## 4. Product Boundaries

Sáu product trong set ban đầu. Mỗi cái là một **potential standalone company**.

| Product | Purpose | Bounded Contexts (high level) | Own DB? | Standalone? | Composes via |
|---|---|---|---|---|---|
| CMS | Content platform | Content, Page, Taxonomy, Media, Localization, Editorial Workflow, SEO | Yes | Yes | API + Events |
| Ecommerce | Commerce engine | Catalog, Pricing, Inventory, Cart, Checkout, Order, Fulfillment, Customer | Yes | Yes | API + Events + Webhooks |
| Studio | Business operations | Organization, Client, Lead, Project, Task, Resource, Approval, Invoice | Yes | Yes | API + Events |
| Production / TVC | Production operations | Campaign, Creative, PreProduction, Shoot, PostProduction, Review, Delivery | Yes | Yes | API + Events + Connectors |
| Entertainment | Entertainment distribution | Artist, Show, Channel, Rights, Audience, Sponsorship, Merchandise | Yes | Yes | API + Events |
| Music | Music business | Release, Track, Composition, Master, Rights, Royalty, Distribution, Marketing | Yes | Yes | API + Events + Connectors |

Một product KHÔNG BAO GIỜ đọc database của product khác. Cross-product read là API / event / webhook / contract. (ADR-0003, ADR-0006)

## 5. Platform Boundaries

Platform là OPTIONAL. Mọi product PHẢI hoạt động khi không có Platform. Khi được dùng, Platform được chia:

- **PaaS** trả lời: *Làm sao chạy software?*
- **BaaS** trả lời: *Generic backend capability nào một application cần?*

Cả PaaS và BaaS đều không import business type. Platform layer có thể tái sử dụng qua các product mà không cần sửa. (ADR-0008)

## 6. BaaS Responsibilities

| Capability | Owned by BaaS | Boundary note |
|---|---|---|
| Identity, Authentication, Authorization | Yes | Generic `User`, `Session`, `Token`. Không có kiểu `Artist` hay `Customer`. |
| Organization / Workspace abstraction | Yes | Generic `Organization`, `Membership`. Không có industry semantics. |
| Storage abstraction | Yes | Object store + metadata index. Asset metadata là generic (`fileKey`, `mimeType`). |
| Event primitive | Yes | `Event(name, version, payload, occurredAt, correlationId, idempotencyKey)`. |
| Webhook primitive | Yes | Generic delivery + retry; không có business semantics. |
| Job / Queue / Scheduler primitive | Yes | Generic worker + retry policy. |
| Notification primitive | Yes | Email / push; template là product-owned. |
| Search primitive | Yes | Generic index; per-product schema. |
| Audit log | Yes | Actor + action + target (generic). |
| Billing / Subscription / Usage | Yes | Generic metering; price plan là product-owned. |

BaaS **KHÔNG ĐƯỢC** biết `Artist`, `Track`, `Order`, `Royalty`, `Release`, `Campaign`, `Production`, `Episode`, `Show`, `Talent`, `Label`, `Product`, `Inventory`, v.v.

## 7. PaaS Responsibilities

| Concern | Owned by PaaS | Boundary note |
|---|---|---|
| Project / Application / Environment / Build / Artifact / Release / Rollback | Yes | Generic; không có business semantics. |
| Container / Image / Registry / Service | Yes | Generic. |
| Database (operational) | Yes | Connection / role / migration runner; không có business schema. |
| Cache / Queue (operational) | Yes | Generic. |
| Network / Domain / Certificate / Secret (operational) / Config | Yes | Operational secret, không phải user-level credential. |
| Scaling / Health / Logs / Metrics / Backup (operational) | Yes | Generic. |

PaaS KHÔNG ĐƯỢC expose field `tenant_id` cho product (product tự làm tenancy).

## 8. Integration Responsibilities

Integration concern được chia rõ ràng:

| Concern | Owner |
|---|---|
| Connector (lifecycle), Connection, Credential reference, Provider registry, Webhook ingress, generic sync | BaaS / Platform |
| ExternalAccount, ExternalResource, Mapping, business-side reconciliation, business event | Product |

Cả hai layer đồng thuận về contract được publish trong `architecture/integration-model.md` và `architecture/connector-architecture.md`.

Quy tắc cứng (ADR-0004): một product phụ thuộc vào **provider contract** (vd. `DistributionProvider`), không bao giờ vào vendor SDK. Adapter có thể pluggable theo deployment.

## 9. Database Ownership

| Database / Schema | Owner | Readers (allowed) | Writers (allowed) |
|---|---|---|---|
| `auth` / `users` / `refresh_tokens` | Platform (BaaS identity) | Platform code only | Platform code only |
| Generic Storage metadata | Platform (BaaS) | Platform code only | Platform code only |
| `cms.*` | CMS | CMS | CMS |
| `ecom.*` | Ecommerce | Ecommerce | Ecommerce |
| `studio.*` | Studio | Studio | Studio |
| `production.*` | Production | Production | Production |
| `entertainment.*` | Entertainment | Entertainment | Entertainment |
| `music.*` | Music | Music | Music |

Cross-product read đi qua API / event / webhook / contract — không bao giờ qua direct DB access. (ADR-0003, ADR-0006)

Migration discipline: mỗi migration có một owner duy nhất; thay đổi destructive yêu cầu ADR.

## 10. API Ownership

- Mỗi product expose một public API stable, có version.
- Frontend là consumer, không phải source of truth. (ADR-0005)
- API contract được publish dưới `architecture/api-contracts.md`.
- Cross-product API usage PHẢI được tài liệu hoá trong product consumer (caller side), không trong provider.

Mọi API có:

- Contract (request / response schema, version)
- Error model (consistent qua các product)
- Authentication strategy (bản thân strategy là product-owned; identity issuance là BaaS)
- Authorization policy (product-owned)
- Versioning policy (major only; minor / patch backward-compatible)
- Idempotency strategy (nơi áp dụng)
- Pagination convention (consistent qua các product)
- Filtering convention (consistent qua các product)

## 11. Event Ownership

Event dành cho **async integration boundary**. Chúng không phải default cho mọi thứ.

Mỗi event có:

- Name `<producer-context>.<entity>.<verb>.v<major>` (ADR-0011)
- Version (major; minor / patch backward-compatible trong major)
- Producer (đơn, owned)
- Schema (payload)
- Event ID
- Correlation ID (để trace chain)
- Timestamp
- Idempotency strategy

Event thuộc về product, không thuộc BaaS. BaaS cung cấp **emission primitive**; product publish và consume.

## 12. Deployment Boundaries

- Mỗi product có deployment unit riêng (process / image / container / package).
- Mỗi deployment sở hữu database và storage của mình.
- Mỗi deployment có configuration độc lập.
- Nhiều instance của cùng product CÓ THỂ chạy đồng thời (Store A và Store B).
- Optional cloud deployment là additive; self-hosting là canonical. (ADR-0015)

Chi tiết topology: `architecture/deployment-model.md`, `architecture/standalone-model.md`, `architecture/cloud-model.md`, `architecture/multi-instance-model.md`, `architecture/organization-model.md`.

## 13. Security Boundaries

- Identity được issue bởi BaaS (`/auth/*`). Product authenticate với BaaS token.
- Authorization là product-local.
- M�i product sở hữu audit log entry của mình; generic audit primitive là BaaS.
- External credential cho connector sống trong generic credential reference table (BaaS) — product reference chúng bằng ID, không bao giờ bằng value.
- Cross-product data isolation được enforce qua database riêng và authorization, không qua `tenant_id` làm precondition. (ADR-0007)
- Mô hình chi tiết: `architecture/security-model.md`, `architecture/identity-model.md`.

## 14. Dependency Rules

Phân loại mọi dependency:

| Class | Rule | Example |
|---|---|---|
| **Required** | Product PHẢI hoạt động khi không có nó (hoặc product không chạy được) | PostgreSQL (runtime), Node.js (runtime) |
| **Optional** | Product có thể degrade graceful khi vắng | BaaS identity (degrades to local users) |
| **External** | Cung cấp bởi bên thứ ba | Connection đến Distribution provider |
| **Development-only** | Chỉ cần trong dev/test | Test runner, fake SMTP |
| **Runtime** | Khả dụng trong production | Express, Pino, Knex |
| **Infrastructure** | Do host cung cấp | PostgreSQL cluster, object store |
| **Business** | Tham chiếu product khác | Ecommerce → CMS (for product content) |

Mandatory product-to-product coupling bị cấm. Optional composition được phép và khuyến khích.

## 15. Architecture Invariants

Năm invariant cơ bản từ `architecture/ecosystem-overview.md` là binding cho triển khai. Một code change vi phạm bất kỳ cái nào sẽ bị architecture compliance gate (§20) từ chối.

| # | Invariant | Test |
|---|---|---|
| 1 | Independent Product | Engineer mới có thể chạy một product chỉ với product code + DB riêng + generic PostgreSQL. |
| 2 | Multiple Independent Instances | Cùng source tạo N deployment cô lập. |
| 3 | Optional Cloud | Self-hosted, cloud của mình, cloud bên thứ ba, hybrid — cùng domain model. |
| 4 | Platform Boundary | PaaS / BaaS không chứa business semantics. |
| 5 | Integration Replaceability | Connector là adapter có thể hoán đổi; không có vendor SDK bên trong domain. |

Invariant b� sung từ AGENTS.md / RULES.md (binding):

- Không có accidental cross-domain database access.
- Không có vendor SDK leakage vào domain logic.
- Không có mandatory cloud dependency.
- Không có mandatory product-to-product dependency.
- Không có God module / service / database.
- Schema change dùng ordered, reviewable migration.
- Architecture commit là documentation-only (ADR-0017).
- Solo maintainer mode; user là final approver (ADR-0014).

## 16. Implementation Domains (Decomposition Map)

Derived từ sáu product + Platform + Integration. Đây là nguyên lý layout thư mục, không nhất thiết là package split (repo hiện tại là modular monolith).

```
PLATFORM (BaaS)
├── identity      (User, Session, Token, Role)         ← already partly in repo
├── organization  (Organization, Membership)            ← DEFERRED to PHASE 4
├── storage       (Asset metadata + binary reference)  ← DEFERRED
├── events        (Emission primitive + outbox)         ← DEFERRED
├── jobs          (Queue / scheduler primitive)        ← DEFERRED
├── notification  (Email / push primitive)              ← DEFERRED
├── audit         (Generic actor + action + target)     ← DEFERRED
└── billing       (Subscription / usage / metering)     ← DEFERRED

PLATFORM (PaaS)
├── runtime       (Container / image / health)          ← CURRENT Dockerfile
├── deployment    (CI / build / release pipeline)       ← CURRENT CI
├── database      (Migration runner + connection mgmt)  ← CURRENT Knex
├── network       (Routing / TLS / DNS)                 ← deferred
├── observability (Logs / metrics / traces)             ← partial (Pino)
└── secrets       (Operational secret handling)         ← deferred

PRODUCTS
├── cms           (Content + page + taxonomy + media + editorial + SEO)
├── ecommerce     (Catalog + pricing + inventory + cart + checkout + order + fulfillment)
├── studio        (Org + client + lead + project + task + resource + approval + invoice)
├── production    (Campaign + creative + preproduction + shoot + postproduction + review + delivery)
├── entertainment (Artist + show + channel + rights + audience + sponsorship)
└── music         (Release + track + composition + master + rights + royalty + distribution)

INTEGRATION
├── connector-core   (Connector contract + provider registry + retry + failure isolation)
├── oauth            (Generic OAuth abstraction + state + PKCE)
├── webhook          (Inbound + outbound webhook primitive)
├── google           (Gmail + Drive + Calendar adapters)
├── distribution     (YouTube + Spotify + Apple Music + custom distribution)
└── open-banking     (Payment adapters — Stripe / other providers; adapters only)
```

Concrete task ID sống trong `.engineering/TASKS.md`.

## 17. Atomic Task List (high-level shape)

Mỗi atomic task có một bounded responsibility, một owner, file dự đoán được, và testability độc lập. (Full list trong `.engineering/TASKS.md`.)

Naming convention: `BOS-<DOMAIN>-<NUMBER>` (vd., `BOS-EVENTS-001`).

```text
PLATFORM / IDENTITY
BOS-IDENTITY-001  Define identity contract (User, Session, Token)
BOS-IDENTITY-002  Hash + bcrypt hardening (current state audit)
BOS-IDENTITY-003  Refresh-token rotation policy
BOS-IDENTITY-004  Authorization / role middleware skeleton
BOS-IDENTITY-005  Integration test: register, login, me, refresh, logout

PLATFORM / STORAGE
BOS-STORAGE-001   Define storage abstraction (binary reference + metadata)
BOS-STORAGE-002   Local filesystem adapter
BOS-STORAGE-003   Object store adapter (provider-neutral)

PLATFORM / EVENTS
BOS-EVENTS-001    Event primitive (name, version, payload, occurredAt, correlationId, idempotencyKey)
BOS-EVENTS-002    Outbox pattern (publication vs commit)
BOS-EVENTS-003    Subscriber contract + retry + dead-letter

PLATFORM / JOBS
BOS-JOBS-001      Queue / scheduler primitive (worker + retry)

PLATFORM / AUDIT
BOS-AUDIT-001     Generic audit log (actor + action + target)

PLATFORM / PAAS
BOS-PAAS-001      Production env validation at boot
BOS-PAAS-002      Compiled migration runner in production image
BOS-PAAS-003      Bootstrap snapshot for production
BOS-PAAS-004      Runtime smoke test (health + migration version)
BOS-PAAS-005      Base image digest pin + SBOM + provenance
BOS-PAAS-006      Multi-architecture image (amd64 + arm64)

REFERENCE PRODUCT — chosen per §21
<Product>-001  Domain model
<Product>-002  Aggregate(s)
<Product>-003  Repository / persistence
<Product>-004  API surface
<Product>-005  Event surface
<Product>-006  Test suite (unit + integration + e2e)
<Product>-007  Docker image + smoke
<Product>-008  Multi-instance hardening
<Product>-009  Self-hosted deployment documentation

INTEGRATION
BOS-CONN-001      Connector contract (id, type, capability, failure isolation)
BOS-CONN-002      Provider registry
BOS-CONN-003      OAuth abstraction (PKCE-aware)
BOS-CONN-004      Webhook ingress primitive
BOS-CONN-005      Webhook outbound primitive
BOS-CONN-006      First connector implementation (chosen when reference product is picked)
BOS-CONN-007      Failure isolation tests

CROSS-PRODUCT
BOS-COMP-001      Two independent instances of reference product on same Docker network
BOS-COMP-002      Optional cloud deployment path documented (without making it mandatory)
```

List này là sequential guidance cho `.engineering/TASKS.md`, không phải schedule per-day.

## 18. Agent Ownership Matrix

| Area | Primary Agent | Secondary Agent |
|---|---|---|
| Architecture documents | Architecture Agent | Coordinator |
| Identity / Auth | Identity Agent | Security Agent |
| Storage | Storage Agent | Platform Agent |
| Events | Events Agent | Integration Agent |
| Jobs | Jobs Agent | Platform Agent |
| Audit | Audit Agent | Security Agent |
| PaaS / runtime / Dockerfile / CI | PaaS Agent | Deployment Agent |
| Reference product (chosen) | Product Agent | API Agent |
| CMS | CMS Agent | API Agent |
| Ecommerce | Ecommerce Agent | API Agent |
| Studio | Studio Agent | API Agent |
| Production | Production Agent | API Agent |
| Entertainment | Entertainment Agent | API Agent |
| Music | Music Agent | API Agent |
| Connectors (generic) | Integration Agent | Security Agent |
| Adapters per vendor | Vendor Adapter Agent | Integration Agent |
| Tests / verification | Verification Agent | All domain agents |
| `.engineering/` triplet | Coordinator | Architecture Agent |

File ownership được enforce qua path boundary:

```
Music Agent:
  Allowed     src/modules/music/**
  Read-only   src/infrastructure/contracts/**, src/platform/** (where required)
  Forbidden   src/modules/ecommerce/**, src/modules/cms/**, src/modules/...
```

Cross-boundary change là STOP-and-report, không silent edit.

## 19. Branch Strategy

Mọi implementation task dùng branch riêng:

```
agent/<domain>/<task-id>
```

Ví dụ: `agent/identity/BOS-IDENTITY-001`, `agent/music/MUSIC-001`. Nhiều agent không bao giờ share branch.

Main bị khoá cho GitHub-managed update only (release-please). Không agent nào commit vào `main`.

**NO PUSH, NO MERGE, NO RELEASE** trừ khi user explicitly authorize. Đây là HARD CONSTRAINT độc lập với mọi chỉ dẫn "start immediately" trong mission brief.

Documentation-only commit (architecture / `.engineering/`) có thể batch theo phase, theo ADR-0017.

## 20. Verification & Architecture Compliance Gate

Mọi task kết thúc với structured report (khớp §29 agent reporting template):

- Implemented files
- Tests run (typecheck, unit, integration, build)
- Architecture impact (none / which invariant)
- Dependencies added or required
- Known limitations
- Next task

Trước khi tuyên bố phase complete:

```text
[ ] Product remains standalone
[ ] Multiple instances are possible
[ ] Cloud remains optional
[ ] No shared DB coupling
[ ] Domain ownership is explicit
[ ] External providers use adapters
[ ] API contracts exist
[ ] Events are versioned
[ ] Credentials are isolated
[ ] Tests pass
[ ] Build passes
[ ] Typecheck passes
[ ] Security checks pass
```

BLOCKER / HIGH finding block phase. MEDIUM / LOW được track nhưng không block.

Một verification agent được giao độc lập (không phải implementing agent) cho mỗi phase hoàn thành.

## 21. Reference Product Selection

Reference product đầu tiên được chọn dựa trên **architecture value**, không phải sở thích cá nhân. Candidate tốt (theo `architecture/implementation-roadmap.md` §6 — `OPEN` decision, đang chờ user choice):

| Candidate | Tại sao nó exercise architecture |
|---|---|
| **Ecommerce** | Multi-instance (Store A/B/C), payment integration, fulfillment, customer lifecycle, multi-tenant stance không có `tenant_id` prerequisite |
| **Music** | Distribution đến nhiều DSP qua Connector contract, rights + royalty + composition + master distinction, complex external integration |
| **Studio** | Operations qua organization + client + project + resource + approval + invoice; tích hợp với Google Workspace qua connector |

Selection đang chờ user decision (`OPEN` trong `implementation-roadmap.md` §16).

## 22. Required MVP Demonstrations

Triển khai không complete cho đến khi các scenario này pass:

| MVP | Scenario | Demonstration |
|---|---|---|
| 1 | Hai Ecommerce store độc lập | Chạy Store A và Store B với DB và config khác nhau; verify isolation. |
| 2 | Standalone Music | Music chạy không có Spotify, YouTube, Apple Music. |
| 3 | Music distribution | Music connect YouTube + Spotify + Apple Music qua connector contract; một provider failure không break release. |
| 4 | Agency | Studio + Production chạy cùng nhau; connect Gmail + Google Drive + Google Calendar qua connector framework. |
| 5 | External Artist | Agency deployment ↔ Artist deployment qua API / event only; không có shared database. |
| 6 | Custom Artist Website | Music API được consume bởi non-BOS frontend; Music UI không phải dependency. |
| 7 | Cloud | Một product được deploy qua optional PaaS path; cùng product cũng chạy self-hosted. |

Mỗi MVP được gate bởi architecture compliance gate.

## 23. Do-Not-Overbuild Guardrails

Project này validate architecture, không phải feature richness. Triển khai KHÔNG ĐƯỢC prematurely implement:

- Mọi provider (Spotify, Apple Music, YouTube, Stripe, ...).
- Mọi payment gateway.
- Mọi social platform.
- Mọi advanced feature.
- Mọi enterprise feature.

Triển khai phải prove architecture với một well-chosen vertical slice (§21) và các MVP demonstration (§22) trước khi mở rộng.

Vertical slice preference:

```
User
  ↓
Organization
  ↓
Product
  ↓
Business Domain
  ↓
Database
  ↓
API
  ↓
Event
  ↓
Optional Integration
  ↓
Deployment
```

Nếu cái này work cho một product, architecture có evidence.

## 24. Conflicting Decisions & Resolutions

Conflict sau được phát hiện trong quá trình consolidate. Mỗi cái được resolve theo ADR-0018 (user đã explicitly override Red-Team gate cho phase này; architecture content được coi là approved baseline, không phải PROPOSED-to-be-reviewed).

### C1. ADR-0010 vs User Override

- ADR-0010 nói Critic / Red-Team review là gate trước integration.
- User instruction nói Red-Team gate được bypass cho phase hiện tại.
- **Resolution**: Được resolve bởi ADR-0018. Red-Team gate được bypass chỉ cho phase này. Architecture content được coi là approved baseline, nhưng mọi thay đổi tương lai cho một `PROPOSED` ADR (vd., ADR-0011 / ADR-0016 / ADR-0017) vẫn yêu cầu user approval.

### C2. ADR-0011 Status

- ADR-0011 (event naming convention) là `PROPOSED` trong `architecture-decisions.md`.
- Baseline này adopt convention là binding. ADR-0018 promote nó lên `ACCEPTED`.

### C3. ADR-0016 Status

- ADR-0016 (Red-Team findings classification) là `PROPOSED`. Nó vẫn relevant cho future review.
- ADR-0018 giữ vocabulary của nó; chỉ gate được bypass cho phase này.

### C4. ADR-0017 Status

- ADR-0017 (architecture commit là documentation-only) là `PROPOSED`. Được adopt là binding bởi ADR-0018.

### C5. Vendor Names trong Architecture Prose

- ADR-0013 cấm vendor name trong target architecture prose.
- Nhiều tài liệu (vd., `integration-model.md`, `connector-architecture.md`) đề cập Google / Spotify / YouTube / Apple Music / Stripe / v.v. như **examples of external provider categories**, không phải binding decision.
- **Resolution**: ADR-0013 áp dụng cho **internal binding và contract**, không cho **external provider categorization example** trong ecosystem-level document. Text phải giữ provider-neutral theo nghĩa không có architecture decision nào phụ thuộc vào một vendor cụ thể. Vendor example trong `integration-model.md`, `connector-architecture.md`, `cms-domain.md`, `ecommerce-domain.md`, `music-domain.md` v.v. là tài liệu hoá chỗ một contract có thể bind, không phải binding cho vendor đó. Concrete provider được quyết per deployment trong connector binding.

### C6. Deferred Runtime Concerns

- Nhiều concern Dockerfile / Docker build / SBOM / provenance / base image digest pin đang open.
- **Resolution**: Được track như `BOS-PAAS-005` và các PAAS task tương tự. Explicitly deferred từ architecture-approval phase; chúng sống trong PHASE 3 (BaaS / PaaS hardening) theo `implementation-roadmap.md`.

## 25. Open Decisions

Track những cái này cho đến khi có user input hoặc thêm evidence:

- `OPEN` — Reference product cho first vertical slice (Ecommerce / Music / Studio).
- `OPEN` — Event transport (in-process / outbox + broker / webhook-fanout) — depends on platform choice.
- `OPEN` — Secret manager và key handling — depends on cloud choice.
- `OPEN` — BaaS primitive nào ship v1 vs v2 — depends on reference product.
- `OPEN` — Multi-tenant vs single-tenant PaaS / BaaS — depends on cloud decision.
- `OPEN` — Connector để ship trước (depends on reference product).
- `OPEN` — ADR numbering convention (centralized vs per-domain sequence).
- `OPEN` — Release cadence per product.

---

## Appendix A — Source Mapping

| Section trong baseline này | Source artifact(s) |
|---|---|
| §3 Boundaries | `ecosystem-overview.md`, `platform-boundaries.md`, `product-boundaries.md` |
| §4 Product boundaries | `cms-domain.md`, `ecommerce-domain.md`, `studio-domain.md`, `production-domain.md`, `entertainment-domain.md`, `music-domain.md` |
| §5 Platform boundaries | `platform-boundaries.md`, `bounded-contexts.md` |
| §6 BaaS | `platform-boundaries.md`, `bounded-contexts.md` |
| §7 PaaS | `platform-boundaries.md`, `deployment-model.md` |
| §8 Integration | `integration-model.md`, `connector-architecture.md` |
| §9 Database | `data-ownership.md`, `multi-instance-model.md` |
| §10 API | `api-contracts.md`, `bounded-contexts.md` |
| §11 Events | `event-contracts.md` |
| §12 Deployment | `deployment-model.md`, `standalone-model.md`, `cloud-model.md`, `multi-instance-model.md`, `organization-model.md` |
| §13 Security | `security-model.md`, `identity-model.md` |
| §14 Deps | `dependency-map.md`, `bounded-contexts.md` |
| §15 Invariants | `architecture-principles.md`, `ecosystem-overview.md`, `architecture-decisions.md` |
| §16 Implementation domains | derived (this doc) |
| §17 Tasks | derived (this doc) → `.engineering/TASKS.md` |
| §18 Ownership | derived (this doc) |
| §19 Branching | `implementation-roadmap.md`, `.engineering/AGENT_WORKFLOW.md` |
| §20 Compliance gate | `architecture-principles.md`, `architecture-decisions.md` (ADR-0016) |
| §21 Reference product | `implementation-roadmap.md` §6 |
| §22 MVP | `ecosystem-overview.md` scenario set |
| §23 Do-not-overbuild | `implementation-roadmap.md` cross-cutting |
| §24 Conflicts | `architecture-decisions.md` |
| §25 Open | `ecosystem-overview.md` §9 |