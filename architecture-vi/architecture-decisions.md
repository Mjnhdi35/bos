# Quyết định kiến trúc BOS

> **Trạng thái:** `PROPOSED` — khung nhật ký quyết định. Ghi lại các fact DECISION và đánh dấu rõ các mục là `OPEN`. Không ghi lại những quyết định chưa được đưa ra.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — lựa chọn đã được chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. Quyết định đã chấp nhận

### AD-001 — Modular monolith, không microservices
**Trạng thái:** `DECISION` (đã ghi trong `.engineering/ARCHITECTURE.md`).
Giả định cấu trúc hiện tại là một modular monolith. Microservices không được chọn.

### AD-002 — Tích hợp provider-neutral
**Trạng thái:** `DECISION`.
Product code không bao giờ import SDK của provider. SDK của provider bị giới hạn ở ranh giới Adapter/Connector.

### AD-003 — Artifact integration/security là authoritative
**Trạng thái:** `DECISION`.
Các artifact sau là hợp đồng cho integration và security:

- `architecture/integration-model.md`
- `architecture/connector-architecture.md`
- `architecture/api-contracts.md`
- `architecture/event-contracts.md`
- `architecture/security-model.md`

Các tài liệu này không được sửa đổi mà không có sự chấp nhận tường minh.

### AD-004 — Không có cột `tenant_id` bắt buộc
**Trạng thái:** `DECISION`.
Không có quy ước toàn cục yêu cầu `tenant_id` trên mỗi bảng. Một bounded context có thể định nghĩa `organization_id` khi nó sở hữu dữ liệu theo phạm vi organization; cột đó là context-local.

### AD-005 — Không có global business database chia sẻ
**Trạng thái:** `DECISION`.
Mỗi bounded context sở hữu dữ liệu của mình. Tính nhất quán chéo context qua API/event/webhook.

### AD-006 — Frontend không phải source of truth
**Trạng thái:** `DECISION`.
Backend domain là authoritative. Frontend render và submit; chúng không áp dụng bất biến nghiệp vụ.

### AD-007 — Sản phẩm độc lập
**Trạng thái:** `DECISION`.
CMS, Ecommerce, Studio, Production-TVC, Entertainment và Music là các sản phẩm độc lập. Chúng có thể được triển khai cùng nhau hoặc riêng.

### AD-008 — Triển khai standalone và multi-instance
**Trạng thái:** `DECISION`.
Cả hai hồ sơ đều được hỗ trợ; không gì trong application giả định hồ sơ này hay hồ sơ kia.

### AD-009 — Cloud và self-hosting tuỳ chọn
**Trạng thái:** `DECISION`.
Cloud và self-hosting đều là tuỳ chọn triển khai hợp lệ; binary application không thay đổi.

### AD-010 — PaaS/BaaS generic
**Trạng thái:** `DECISION`.
Tầng PaaS và BaaS không mang ngữ nghĩa nghiệp vụ. Chúng có thể thay thế đằng sau ranh giới.

### AD-011 — Provider adapter có thể thay thế
**Trạng thái:** `DECISION`.
Provider adapter có thể thay thế; việc thay thế không ảnh hưởng hợp đồng sản phẩm.

## 2. Quyết định đang mở (chưa có lựa chọn)

| ID | Chủ đề |
|---|---|
| `OPEN-AD-001` | Miền nghiệp vụ đầu tiên để triển khai. |
| `OPEN-AD-002` | Đích provider/integration đầu tiên. |
| `OPEN-AD-003` | Chọn cloud provider. |
| `OPEN-AD-004` | Chọn event bus / transport. |
| `OPEN-AD-005` | Chọn substrate queue/cache. |
| `OPEN-AD-006` | Secret store và key management. |
| `OPEN-AD-007` | OAuth provider / tích hợp IdP bên ngoài. |
| `OPEN-AD-008` | Kubernetes hoặc substrate orchestration khác. |
| `OPEN-AD-009` | Triển khai security cụ thể (thuật toán, ký, xoay vòng). |
| `OPEN-AD-010` | Từ vựng capability authorization và role. |
| `OPEN-AD-011` | Schema organization/workspace/membership và quyền sở hữu migration. |
| `OPEN-AD-012` | Tư thế multi-region. |
| `OPEN-AD-013` | Chính sách retention audit. |
| `OPEN-AD-014` | Tên và quyền sở hữu catalog event chéo sản phẩm. |

## 3. Lộ trình có điều kiện

Không mục `OPEN` nào trở thành `DECISION` cho tới khi một yêu cầu nghiệp vụ/vận hành tường minh viện dẫn tới nó và lựa chọn được chấp nhận bởi owner phù hợp (xem mẫu task registry `.engineering/TASKS.md`).

## 4. Artifact đi kèm

- `implementation-roadmap.md` — trình tự quyết định và công việc.
- `ecosystem-overview.md` — tư thế tổng thể.
- `bounded-contexts.md` — ranh giới context.