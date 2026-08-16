# BOS Roadmap

## Cách đọc roadmap

Roadmap này đi từ evidence hiện tại:

```text
CURRENT STATE -> GAP -> TARGET STATE -> DEPENDENCY -> IMPLEMENTATION ORDER
```

Các domain nghiệp vụ chưa có requirement cụ thể không được tự chọn implementation order. Chúng chỉ có task discovery/contract cho đến khi người phụ trách xác định mục tiêu.

## Current baseline

- Node/TypeScript/Express/PostgreSQL foundation đã chạy.
- Auth và Users có register/login/me/refresh/logout, nhưng authz policy cho các module khác chưa xác định.
- Platform metadata-driven generic CRUD đã có persistence, materialization, pagination, enum và array.
- CI có quality checks, Docker build, secret scan, Docker build check, non-root check và Trivy scan.
- Chưa có staging/production infrastructure.
- Chưa có business domain implementation ngoài Identity/Users/Platform capability.

## Wave 0 — Engineering control plane

**Objective:** tạo cách làm việc có ownership, scope, dependency và hand-off rõ ràng.

**Prerequisites:** repository discovery.

**Deliverables:** `.engineering/` rules, architecture, domain map, dependency graph, roadmap, task registry và workflow.

**Risk:** tài liệu legacy mô tả task system/CI-CD khác có thể gây nhầm source of truth.

**Verification:** đối chiếu docs với code/config/migration hiện tại; không sửa source code; Git diff chỉ chứa control-plane docs.

**Task:** `BOS-ENGINEERING-001`.

## Wave 1 — Platform contract và runtime safety

**Objective:** khóa các contract nền tảng trước khi nhiều domain phụ thuộc vào platform.

**Prerequisites:** Wave 0 accepted/reviewed; platform owner được chỉ định.

**Candidate deliverables:**

- contract cho metadata, entity version và physical schema;
- quyết định về transaction/materialization rollback;
- quyết định về auth boundary cho platform routes;
- runtime migration/bootstrap path cho image khi có requirement deployment.

**Risks:** đổi core contract có thể ảnh hưởng generic CRUD và migration; không tự chọn breaking behavior.

**Verification:** contract tests, migration tests, materialization failure tests, runtime smoke test khi path được xác định.

**Parallelization:** contract discovery có thể song song; implementation trên `src/platform/**` và migration area phải một owner.

**Tasks:** `BOS-PLATFORM-001`, `BOS-PLATFORM-002`, `BOS-PLATFORM-003`.

## Wave 2 — Identity/access boundary

**Objective:** xác định và triển khai policy bảo vệ route/module dựa trên requirement được xác nhận.

**Prerequisites:** Wave 0; decision về role/permission và resource ownership.

**Candidate deliverables:**

- authn/authz contract;
- route guard policy;
- regression tests cho public/protected routes;
- không thay đổi cookie/token contract ngoài scope.

**Risks:** security model là core contract; nếu requirement mơ hồ phải BLOCK, không tự suy diễn.

**Verification:** integration tests, negative authorization tests, typecheck/build.

**Task:** `BOS-IDENTITY-001` (discovery/contract trước, implementation sau nếu được phê duyệt).

## Wave 3 — First business domain discovery và implementation

**Objective:** chọn domain đầu tiên bằng business requirement thật, sau đó tạo contract và implementation nhỏ nhất.

**Prerequisites:** Wave 0; Identity boundary đủ dùng; human xác định domain và acceptance.

**Candidate sequence:**

```text
business requirement
  -> domain contract
  -> entity/invariant/schema
  -> API/service
  -> integration test
```

Không mặc định Customer, Sales, Finance hay Product là domain đầu tiên.

**Risks:** domain chọn sai hoặc contract chưa rõ sẽ tạo migration/API rework.

**Verification:** acceptance criteria nghiệp vụ + test + migration verification.

**Task:** `BOS-DOMAIN-001`.

## Wave 4 — Dependent domains và cross-domain integration

**Objective:** triển khai domain phụ thuộc theo dependency graph đã được chấp thuận.

**Prerequisites:** first domain contracts accepted; shared identifiers và service contracts rõ.

**Deliverables:** domain modules độc lập, integration contracts, cross-domain tests.

**Risks:** import trực tiếp internals, database coupling, dependency cycle.

**Verification:** contract tests, integration tests, dependency review, migration review.

**Status:** chưa tạo feature task vì chưa có domain requirement.

## Wave 5 — Operational hardening

**Objective:** đưa artifact/runtime từ CI-ready đến staging/production-ready khi hạ tầng thật tồn tại.

**Prerequisites:** staging/VPS/registry requirement, runtime migration path, secret management decision.

**Candidate deliverables:**

- runtime migration/bootstrap;
- container smoke test với PostgreSQL;
- pinned base image/digest;
- SBOM/provenance/signature policy;
- immutable artifact promotion và rollback contract;
- production env validation.

**Risks:** triển khai giả định hạ tầng chưa tồn tại; migration/data safety.

**Verification:** build, CVE/secret scan, runtime smoke, deploy/rollback rehearsal trên staging.

**Status:** deferred; chưa có infrastructure requirement.

## Gate giữa các wave

Không chuyển wave nếu chưa có:

- task contract và owner;
- dependency đã accepted/reviewed;
- allowed/forbidden paths;
- acceptance criteria;
- verification plan;
- không có conflict ownership.
