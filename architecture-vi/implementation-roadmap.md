# Lộ trình triển khai BOS

> **Trạng thái:** `PROPOSED` — lộ trình có điều kiện. Hôm nay kho mã chỉ có nền tảng Node/TypeScript/Express ban đầu cộng thêm Platform, Identity và Users (một phần). Sản phẩm nghiệp vụ chưa được triển khai. Lộ trình này là có điều kiện: không có gì bắt đầu cho tới khi một yêu cầu tường minh viện dẫn tới nó.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT — điểm khởi đầu đã xác minh

- Node.js 24, TypeScript strict, CommonJS, ES2023, Express 5.
- PostgreSQL qua Knex, Vitest + Supertest, Docker Compose, Docker image với user non-root.
- CI: typecheck, test, coverage, quét secret, build Docker, kiểm tra non-root, Trivy.
- Triển khai: Platform (một phần), Identity/Auth (một phần), Users (một phần).
- Không có module sản phẩm nghiệp vụ.

## 2. Nguyên tắc của lộ trình

1. Mỗi wave chỉ được kích hoạt khi có một yêu cầu cụ thể viện dẫn tới nó.
2. Mỗi wave có điều kiện tiên quyết và tiêu chí chấp nhận tường minh.
3. Mỗi wave kết thúc với hành vi đã xác minh (typecheck, test, build, runtime khi có liên quan).
4. Không thêm hạ tầng suy đoán; không chọn nhà cung cấp nếu không có yêu cầu đã chấp nhận.
5. Artifact integration/security hiện có vẫn là authoritative.

## 3. Wave (có điều kiện)

### Wave 0 — Hardening nền tảng (đã xác minh)
- Trạng thái: `FACT`.
- Đã đặt tại chỗ theo `.engineering/ARCHITECTURE.md` và `AGENTS.md`.

### Wave 1 — Ổn định hợp đồng Platform
- Có điều kiện trên: một yêu cầu mở rộng Platform tường minh.
- Ứng viên phạm vi: version metadata, con trỏ active-version, metadata quan hệ/index, materialize transactional.
- Điều kiện tiên quyết: `.engineering/ARCHITECTURE.md` FACT được chấp nhận.
- Xác minh: typecheck, test, thứ tự migration, integration test.

### Wave 2 — Ranh giới Identity/authz
- Có điều kiện trên: yêu cầu authz tường minh cho `/users`, `/platform/*` và module tương lai.
- Ứng viên phạm vi: ma trận authorization cho route, chính sách role/capability, test âm tính.
- Điều kiện tiên quyết: quyết định hợp đồng Platform đủ ổn định.
- Xác minh: test ma trận authorization cho route; test âm tính deny-by-default.

### Wave 3 — Context Organization/workspace
- Có điều kiện trên: một sản phẩm yêu cầu cộng tác nhiều người dùng hoặc cô lập theo organization.
- Ứng viên phạm vi: schema organization, membership, truy cập dữ liệu theo phạm vi organization.
- Xác minh: test ownership; test cô lập.

### Wave 4 — Sản phẩm nghiệp vụ đầu tiên
- Có điều kiện trên: lựa chọn của business owner (xem `OPEN-AD-001`).
- Phạm vi: định nghĩa contract-first cho entity, API, event, quyền sở hữu của sản phẩm được chọn.
- Xác minh: review hợp đồng; không thay đổi code khi chưa chấp nhận.

### Wave 5 — Capability integration đầu tiên
- Có điều kiện trên: sản phẩm nghiệp vụ đầu tiên cần tích hợp provider.
- Phạm vi: hợp đồng capability provider, adapter, connector, sync, xử lý webhook theo `integration-model.md`.
- Xác minh: test hợp đồng với fake adapter; test sandbox provider nếu được duyệt.

### Wave 6 — Sản phẩm bổ sung
- Mỗi sản phẩm bổ sung theo cùng đường contract-first.

### Wave 7 — Hardening triển khai
- Có điều kiện trên: yêu cầu staging/production.
- Phạm vi: runtime migration/bootstrap, smoke test, hợp đồng triển khai.
- Xác minh: smoke runtime; health check; idempotence migration.

## 4. Ghi chú song song hoá

- Wave 1 (Platform) và Wave 2 (Identity/authz) có thể chạy song song nếu phạm vi rời nhau.
- Wave 3 (Organization) phụ thuộc Wave 2.
- Wave 4 (sản phẩm đầu tiên) phụ thuộc Wave 3.
- Wave 5 (integration) phụ thuộc Wave 4.

## 5. Rào chắn ngoài phạm vi

Lộ trình không được đưa vào:

- một cloud provider đã chọn;
- một event bus đã chọn;
- một secret manager đã chọn;
- một substrate queue/cache đã chọn;
- một substrate orchestration đã chọn (ví dụ Kubernetes);
- một OAuth provider hoặc IdP bên ngoài đã chọn;
- một business domain đầu tiên đã chọn;
- một SDK provider đã chọn;
- một triển khai security đã chọn.

Những mục này vẫn là `OPEN` cho tới khi được chấp nhận.

## 6. Artifact đi kèm

- `architecture-decisions.md` — nhật ký quyết định.
- `bounded-contexts.md` — ranh giới context.
- `data-ownership.md` — bảng quyền sở hữu.
- `.engineering/TASKS.md` — task registry và hợp đồng.