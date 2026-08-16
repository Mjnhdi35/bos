# Bản đồ phụ thuộc BOS

> **Trạng thái:** `PROPOSED` — bản đồ phụ thuộc logic. Kho mã hiện chưa thực thi ranh giới package vật lý ngoài những gì `.engineering/ARCHITECTURE.md` ghi nhận.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT — tư thế phụ thuộc runtime

- Node.js 24, TypeScript strict, CommonJS, ES2023.
- Express 5 làm HTTP framework.
- PostgreSQL qua Knex.
- Vitest + Supertest.
- Docker Compose cho dev local; production image chạy `node dist/server.js` dưới user `node`.
- CI chạy typecheck, test, coverage, quét secret, build Docker, kiểm tra non-root, Trivy.

## 2. Hướng phụ thuộc ở compile-time (đề xuất)

```text
products/*  ->  platform, integration, shared
products/*  ->  other products/* only via API, events or webhooks
platform    ->  shared, infrastructure
integration ->  shared, infrastructure
shared      ->  infrastructure only
infrastructure -> third-party libs only
```

Mẫu bị cấm:

- một sản phẩm import internal module của sản phẩm khác;
- `shared` import một module sản phẩm hoặc platform;
- `platform` import một module sản phẩm;
- product code import SDK của provider.

## 3. Bề mặt phụ thuộc runtime

| Bề mặt | Owner | Ghi chú |
|---|---|---|
| HTTP framework | Platform | Express 5 — FACT |
| Database driver | Infrastructure | `pg` qua Knex — FACT |
| Auth | Identity | JWT access, refresh token hash, HttpOnly cookie — FACT |
| Logging | Platform/infrastructure | pino-http — FACT |
| Provider adapter | Integration | SDK của provider bị giới hạn ở ranh giới Adapter — DECISION |
| Queue/cache | OPEN | chưa chọn |
| Event bus | OPEN | chưa chọn |
| Object storage | PaaS/BaaS | chỉ generic |
| Secret store | OPEN | chưa chọn |

## 4. Chính sách phụ thuộc bên thứ ba

- Ưu tiên capability của Node.js; tiếp đến là dependency hiện có; dependency mới chỉ thêm khi có yêu cầu cụ thể.
- Tách riêng runtime dependency và dev dependency.
- Không có transitive vendor lock-in (ví dụ SDK của provider bị giới hạn trong Adapter).

## 5. Phụ thuộc database

- Migration nằm trong `src/infrastructure/database/migrations/**` (FACT).
- Bảng của mỗi bounded context do context đó sở hữu.
- Không có foreign key chéo context.
- Tính nhất quán chéo context qua event.

## 6. Lộ trình có điều kiện

- Một dependency chỉ được thêm khi một yêu cầu đã được chấp nhận viện dẫn tới nó.
- SDK của provider chỉ được thêm bên trong một Adapter đã được duyệt.

## 7. Quyết định đang mở

- `OPEN`: substrate queue/cache.
- `OPEN`: event bus / transport.
- `OPEN`: secret store và key management.
- `OPEN`: backend quan sát.
- `OPEN`: cơ chế feature flag, nếu có.