# Bounded Context BOS

> **Trạng thái:** `PROPOSED` — hợp đồng bounded context. Triển khai hiện tại của kho mã là một modular monolith phẳng dưới `src/modules/**`, `src/platform/**`, `src/shared/**`, `src/infrastructure/**`. Chưa có bounded context nghiệp vụ nào.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT — cấu trúc mã hiện tại

- `src/shared/**` — config, JWT, bcrypt, parse HTTP, error, logging.
- `src/modules/auth/**` — register, login, refresh, logout, Bearer auth, refresh cookie, `/auth/me`.
- `src/modules/users/**` — user create, lookup, view, `/users`.
- `src/platform/**` — định nghĩa entity, lưu trữ metadata, materialize schema, generic CRUD.
- `src/infrastructure/database/**` — cấu hình Knex, migration PostgreSQL.
- `src/app/**`, `src/server.ts` — composition và khởi động.

## 2. REQUIREMENT — quy tắc bounded context

- Một bounded context sở hữu dữ liệu, schema và migration của mình.
- Một bounded context phơi ra capability của mình qua API, event hoặc webhook.
- Một bounded context không được import internal module của bounded context khác.
- Module `shared` không được import module bounded-context.
- `platform` không được phụ thuộc vào một bounded context cụ thể.

## 3. Bounded context đề xuất

| Context | Path (đề xuất) | Dữ liệu sở hữu | Bề mặt hợp đồng công khai |
|---|---|---|---|
| **Identity** | `src/modules/auth` (hiện có) + module authz/identity mới | `users`, `refresh_tokens`, claim identity | `/auth/**`, token identity, context identity |
| **Platform** | `src/platform/**` | `platform_entities`, các bảng được generate | `/platform/**`, CRUD entity generic |
| **CMS** | `src/products/cms/**` | Thực thể CMS, revision CMS, tham chiếu media CMS | `/cms/**`, event CMS |
| **Ecommerce** | `src/products/ecommerce/**` | catalog, order, payment, fulfillment | `/ecommerce/**`, event ecommerce |
| **Studio** | `src/products/studio/**` | project, task, asset, approval | `/studio/**`, event studio |
| **Production-TVC** | `src/products/production-tvc/**` | brief, shoot, edit, deliverable | `/production-tvc/**`, event production-tvc |
| **Entertainment** | `src/products/entertainment/**` | event, session, program, rights | `/entertainment/**`, event entertainment |
| **Music** | `src/products/music/**` | catalog, release, track, yêu cầu phân phối | `/music/**`, event music |
| **Integration** | `src/integration/**` | kết nối provider, trạng thái sync, mapping, metadata credential | `/integration/**`, event integration |

Mỗi context sản phẩm đứng độc lập; có thể được triển khai mà không cần sản phẩm ngang hàng.

## 4. Dịch giữa các context

- Khi hai context cần cùng một fact, một bên sở hữu record.
- Context sở hữu phát event; consumer duy trì projection nội bộ nếu cần.
- SQL trực tiếp chéo context bị cấm.

## 5. Shared kernel

`src/shared/**` là shared kernel: chỉ tiện ích, không có bất biến nghiệp vụ. Nó không được import bất kỳ bounded context nào.

## 6. Lộ trình có điều kiện

Một bounded context chỉ được tạo khi yêu cầu sản phẩm thực sự đặt tên cho nó. Bounded context nghiệp vụ đầu tiên là `OPEN`.

## 7. Quyết định đang mở

- `OPEN`: bounded context nghiệp vụ đầu tiên.
- `OPEN`: chính sách kích thước shared-kernel.
- `OPEN`: phạm vi context integration (chỉ provider-neutral hay cả orchestration theo sản phẩm).
- `OPEN`: khi nào, nếu có, một context trở thành đơn vị triển khai riêng.