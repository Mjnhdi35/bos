# BOS Task Registry

## Quy ước chung

- ID duy nhất: `BOS-<DOMAIN>-<NUMBER>`.
- Branch: `agent/<domain>/<task-id>`.
- `owner: unassigned` nghĩa là chưa giao task; không agent nào tự nhận bằng cách sửa task của người khác.
- `status: planned` chưa cho phép implementation nếu dependency/contract chưa đủ.
- `status: review_required` nghĩa là agent đã verify và hand-off; chỉ human/integration owner quyết định accepted.
- Mỗi task phải nêu Required changes, Optional improvements, Out of scope, allowed paths, forbidden paths, dependencies, acceptance và verification.

## Registry

| ID | Title | Status | Owner | Branch | Depends on |
|---|---|---|---|---|---|
| `BOS-ENGINEERING-001` | Establish engineering control plane | `review_required` | `agent:mavis` | `agent/engineering/BOS-ENGINEERING-001` | none |
| `BOS-PLATFORM-001` | Lock metadata and schema materialization contract | `planned` | `unassigned` | `not-created` | `BOS-ENGINEERING-001` |
| `BOS-PLATFORM-002` | Define transactional materialization safety | `planned` | `unassigned` | `not-created` | `BOS-PLATFORM-001` |
| `BOS-PLATFORM-003` | Define container migration and bootstrap runtime path | `planned` | `unassigned` | `not-created` | `BOS-ENGINEERING-001` |
| `BOS-IDENTITY-001` | Define authn/authz boundary for modules | `planned` | `unassigned` | `not-created` | `BOS-ENGINEERING-001` |
| `BOS-DOMAIN-001` | Select and contract the first business domain | `planned` | `human/business owner` | `not-created` | `BOS-ENGINEERING-001`, `BOS-IDENTITY-001` |

---

## BOS-ENGINEERING-001 — Establish engineering control plane

### Objective

Tạo bộ tài liệu engineering tối thiểu để nhiều agent làm việc theo scope, ownership, dependency và verification thống nhất.

### Task metadata

- **Status:** `review_required`
- **Owner:** `agent:mavis`
- **Branch:** `agent/engineering/BOS-ENGINEERING-001`
- **Commit policy:** commit riêng `docs(engineering): establish BOS control plane`; không tự push/merge.

### Context

Repository đã có `AGENTS.md` và tài liệu legacy, nhưng chưa có domain map, dependency graph, roadmap hoặc task registry theo format BOS. Current code chỉ chứng minh Platform, Identity/Auth và Users là các boundary có implementation.

### Required changes

- Tạo `.engineering/README.md`.
- Tạo `.engineering/RULES.md`.
- Tạo `.engineering/ARCHITECTURE.md`.
- Tạo `.engineering/DOMAINS.md`.
- Tạo `.engineering/DEPENDENCIES.md`.
- Tạo `.engineering/ROADMAP.md`.
- Tạo `.engineering/TASKS.md`.
- Tạo `.engineering/AGENT_WORKFLOW.md`.
- Phân biệt current state, target state, evidence và discrepancy với legacy docs.

### Optional improvements

- Không có.

### Out of scope

- Không sửa `src/**`, tests, migrations, Dockerfile hoặc `.github/workflows/**`.
- Không chọn domain nghiệp vụ đầu tiên thay cho business owner.
- Không tạo agent mới, không giao task cho agent khác và không push/merge.
- Không sửa/xóa `docs/task-system-design.md` hoặc `docs/tasks/TASK-0001-product-scope.md`.

### Allowed paths

- `.engineering/**`

### Forbidden paths

- `src/**`
- `test/**`
- `package.json`, `package-lock.json`
- `src/infrastructure/database/migrations/**`
- `Dockerfile`, `docker-compose.yml`
- `.github/**`
- `docs/**`

### Dependencies

None.

### Acceptance criteria

- Có đủ 8 file control-plane yêu cầu.
- Architecture mô tả đúng code hiện tại và tách rõ target state.
- Domain map không đánh dấu domain chưa có evidence là active.
- Dependency graph phân biệt compile-time, runtime và database dependency.
- Roadmap có wave, prerequisite, risk, verification và parallelization.
- Task registry có ID, owner, branch, scope, dependency, acceptance và verification.
- Không có thay đổi ngoài `.engineering/**`.

### Tests

- Không thêm test runtime; đây là task documentation-only.
- Kiểm tra consistency bằng file/path review và Git diff.

### Verification

- Đọc đối chiếu các file với `AGENTS.md`, `package.json`, `tsconfig`, source boundary, migrations, tests và CI.
- `git diff --check` exit 0.
- `git status` xác nhận chỉ có `.engineering/**` thay đổi.
- Không cần chạy application test vì task chỉ thêm documentation, nhưng không được làm thay đổi source/build behavior.

### Commit policy

Commit riêng, Conventional Commit phù hợp: `docs(engineering): establish BOS control plane`.

### State

`review_required`: documentation đã tạo và verify local; chờ human/integration review.

---

## BOS-PLATFORM-001 — Lock metadata and schema materialization contract

### Objective

Xác định contract không-breaking cho entity metadata, version, field types, physical table projection và generic CRUD trước khi mở rộng platform.

### Task metadata

- **Status:** `planned`
- **Owner:** `unassigned`
- **Branch:** chưa tạo; dự kiến `agent/platform/BOS-PLATFORM-001`.
- **Commit policy:** commit contract riêng; không push/merge nếu chưa được cấp quyền.

### Context

Platform hiện có metadata persistence, dynamic physical table và generic CRUD; chưa có relation/FK/index metadata, active version pointer hoặc version migration.

### Required changes

- Chỉ ra contract hiện tại cần giữ.
- Ghi rõ invariant, backward compatibility và các behavior chưa quyết định.
- Tạo acceptance/test contract trước implementation.

### Optional improvements

Không có.

### Out of scope

- Không thêm field type, relation, index hoặc version migration khi chưa có decision.
- Không sửa migration hoặc code platform trong bước contract-only.

### Allowed paths

- `.engineering/**` (task/decision contract)
- `docs/**` chỉ khi task được mở rộng rõ ràng

### Forbidden paths

- `src/platform/**`
- `src/infrastructure/database/migrations/**`
- `src/modules/**`

### Dependencies

`BOS-ENGINEERING-001` phải được review/accepted.

### Acceptance criteria

- Contract hiện tại và gap được reviewer xác nhận.
- Có decision cho các behavior ảnh hưởng public API/schema hoặc đánh dấu BLOCKED nếu chưa đủ requirement.

### Tests

- Chưa thêm test implementation ở task contract-only.
- Acceptance sử dụng contract review và test matrix được chốt trong task.

### Verification

Review source, tests, migration và API routes; không implementation trước khi contract được chấp thuận.

---

## BOS-PLATFORM-002 — Define transactional materialization safety

### Objective

Định nghĩa và triển khai an toàn cho metadata insert, physical table creation và rollback khi materialization lỗi.

### Task metadata

- **Status:** `planned`
- **Owner:** `unassigned`
- **Branch:** chưa tạo; dự kiến `agent/platform/BOS-PLATFORM-002`.
- **Commit policy:** commit implementation/test riêng; không push/merge nếu chưa được cấp quyền.

### Context

`registerEntity` hiện insert metadata rồi tạo table với best-effort metadata rollback; hai bước chưa atomic.

### Required changes

Chưa mở implementation. Trước hết phải hoàn thành `BOS-PLATFORM-001` và có decision về transaction/DDL behavior.

### Optional improvements

Không có.

### Out of scope

- Không đổi entity API hoặc field contract ngoài decision.
- Không sửa migration lịch sử.

### Allowed paths

`src/platform/**`, test platform integration, migration mới nếu contract yêu cầu.

### Forbidden paths

Các business module và unrelated infrastructure.

### Dependencies

`BOS-PLATFORM-001`.

### Acceptance criteria

Materialization failure không để metadata/table state sai theo contract đã duyệt; có regression/integration tests.

### Tests

- Regression test cho materialization failure.
- Integration test xác nhận metadata và physical table không lệch state.

### Verification

Platform integration tests, typecheck, build và database migration verification nếu có migration.

---

## BOS-PLATFORM-003 — Define container migration and bootstrap runtime path

### Objective

Xác định path chạy migration và bootstrap snapshot an toàn trong runtime image khi có requirement staging/production.

### Task metadata

- **Status:** `planned`
- **Owner:** `unassigned`
- **Branch:** chưa tạo; dự kiến `agent/platform/BOS-PLATFORM-003`.
- **Commit policy:** commit runtime/container riêng; không push/merge nếu chưa được cấp quyền.

### Context

Image hiện compile source thành `dist/` nhưng chưa copy `bootstrap/snapshot.json` và chưa có compiled migration runner; hiện chưa có staging/production infrastructure.

### Required changes

- Đánh giá runtime contract và startup ordering.
- Chỉ implementation sau khi deployment environment và migration ownership được xác nhận.

### Optional improvements

Không có.

### Out of scope

- Không tạo deployment workflow giả định VPS/registry.
- Không tự chạy destructive migration.

### Allowed paths

`Dockerfile`, runtime/migration source và test smoke path khi task được activate.

### Forbidden paths

VPS/CD/GHCR configuration chưa được yêu cầu.

### Dependencies

`BOS-ENGINEERING-001` và deployment requirement cụ thể.

### Acceptance criteria

Image/runtime có migration/bootstrap path rõ, repeatable và được smoke test trên PostgreSQL tạm.

### Tests

- Runtime smoke test với PostgreSQL tạm.
- Migration idempotence test.
- Health check assertion.

### Verification

Docker build, runtime smoke, migration idempotence và health check.

---

## BOS-IDENTITY-001 — Define authn/authz boundary for modules

### Objective

Xác định policy bảo vệ `/users`, `/platform/*` và các module tương lai mà không tự suy diễn role/permission requirement.

### Task metadata

- **Status:** `planned`
- **Owner:** `unassigned`
- **Branch:** chưa tạo; dự kiến `agent/identity/BOS-IDENTITY-001`.
- **Commit policy:** contract và implementation phải tách commit; không push/merge nếu chưa được cấp quyền.

### Context

Authn đã có cho `/auth/me`; platform và users routes hiện chưa có authz contract. User schema có role `user|admin`, nhưng policy sử dụng role chưa được chứng minh.

### Required changes

- Thu thập/ghi rõ requirement về public/private route, role và resource ownership.
- Tạo authz contract và negative test acceptance.

### Optional improvements

Không có.

### Out of scope

- Không tự đổi security model.
- Không tự bảo vệ hoặc mở public route trước khi contract được xác nhận.

### Allowed paths

`.engineering/**`, auth/users/platform tests khi implementation task được tách riêng.

### Forbidden paths

Breaking token/cookie contract và business domain internals.

### Dependencies

`BOS-ENGINEERING-001`.

### Acceptance criteria

Mỗi route/module có trạng thái public/protected và actor policy rõ; ambiguity được đánh dấu BLOCKED.

### Tests

- Route authorization matrix.
- Negative integration tests cho unauthenticated/insufficient-role requests.

### Verification

Review auth routes/middleware/service và test matrix; implementation chỉ sau approval.

---

## BOS-DOMAIN-001 — Select and contract the first business domain

### Objective

Chọn domain nghiệp vụ đầu tiên bằng business requirement thật và tạo contract trước implementation.

### Task metadata

- **Status:** `planned`
- **Owner:** `human/business owner`
- **Branch:** chưa tạo; dự kiến `agent/domain/BOS-DOMAIN-001` sau khi domain được chọn.
- **Commit policy:** contract commit riêng; implementation chỉ mở sau acceptance, không push/merge nếu chưa được cấp quyền.

### Context

Repository chưa có Customer/Product/Inventory/Sales/Purchase/Finance/HR/Marketing/Operations/Reporting/Franchise implementation hoặc contract đủ rõ để tự chọn.

### Required changes

- Business owner xác định domain, objective và acceptance.
- Tạo entity/invariant/API/database ownership contract.

### Optional improvements

Không có.

### Out of scope

- Không tự chọn domain theo giả định ERP.
- Không viết schema/API/business code trước khi contract được chấp thuận.

### Allowed paths

`.engineering/**` và domain path được cấp sau khi contract được accepted.

### Forbidden paths

`src/platform/**`, `src/modules/auth/**`, `src/modules/users/**` trừ dependency task riêng.

### Dependencies

`BOS-ENGINEERING-001`, `BOS-IDENTITY-001`.

### Acceptance criteria

Có một domain cụ thể, ownership, invariant, API, database boundary, dependency và test acceptance được xác nhận.

### Tests

- Contract acceptance matrix cho entity, invariant, API, database và dependency.
- Test plan cho implementation chỉ được chốt sau khi domain được chọn.

### Verification

Contract review độc lập; không coi tài liệu proposal hoặc convention ERP là acceptance.
