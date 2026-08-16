# BOS Architecture

> Tài liệu này mô tả kiến trúc đã được repository chứng minh. Phần `TARGET STATE` là hướng phát triển có điều kiện, không phải implementation đã tồn tại.

## FACT — Current state

### Technology và runtime

- Node.js 24, TypeScript strict, CommonJS, ES2023.
- Express 5 là HTTP framework.
- PostgreSQL là database runtime; Knex quản lý connection và migration.
- Vitest và Supertest dùng cho test.
- Docker Compose cung cấp PostgreSQL 16 và pgAdmin cho local development.
- Production build compile `src/**/*.ts` thành `dist/`; runtime image chạy `node dist/server.js` bằng user `node`.

### Application composition

`src/server.ts` gọi `createApp()` trong `src/app/create-app.ts`. `createApp()`:

1. lấy database/logger mặc định hoặc dependency được inject cho test;
2. load `bootstrap/snapshot.json` nếu database chưa có metadata;
3. đăng ký JSON parser và `pino-http`;
4. đăng ký `/health` và `/health/db`;
5. gắn users, auth và platform routers;
6. xử lý `HttpError` và lỗi chưa xử lý ở error middleware.

Application composition hiện nằm ở một file, chưa có container/framework dependency injection riêng.

### Module boundaries hiện tại

| Boundary | Path | Trách nhiệm đã thấy |
|---|---|---|
| Shared | `src/shared/**` | config/env, JWT, bcrypt, HTTP parsing, errors, logging |
| Identity/Auth | `src/modules/auth/**` | register, login, refresh, logout, Bearer authentication, refresh cookie, `/auth/me` |
| Users | `src/modules/users/**` | tạo user, tìm theo email/id, user view và `/users` route |
| Platform | `src/platform/**` | entity definition, metadata persistence, schema materialization, generic entity CRUD, pagination, enum/array field support |
| Infrastructure/Database | `src/infrastructure/database/**` | Knex config/instance và PostgreSQL migrations |
| API composition | `src/app/**`, `src/server.ts` | route composition, health endpoints, process startup |

Đây là modular monolith dạng flat structure. Repository chưa chứng minh application/domain/infrastructure là các package hoặc layer độc lập hoàn toàn.

### Request/data flow

```text
HTTP request
  -> Express router
  -> controller/handler
  -> module/platform service
  -> Knex repository/data store
  -> PostgreSQL
```

Platform registration có flow riêng:

```text
entity definition
  -> validation
  -> platform_entities metadata row
  -> PostgreSQL physical table
  -> generic record CRUD
```

Metadata là state persistent trong `platform_entities`; physical table là projection/materialization được tạo từ metadata. Hai bước hiện chưa được bao trong một transaction chung.

### Database hiện tại

Migrations hiện có:

- `schema_meta` foundation table;
- `users` và lower-email index;
- `refresh_tokens` với FK `users` và revoke state;
- `users.role` với check `user|admin`;
- `platform_entities` với unique `(name, version)` và name index.

Business tables cụ thể ngoài user/auth và generated platform tables chưa được repository định nghĩa.

### Security/runtime observations

- Access token trả trong response body.
- Refresh token được hash trong database và gửi qua `HttpOnly` cookie với path `/auth`.
- `/auth/me` có Bearer guard.
- Platform routes hiện chưa có auth guard.
- Users create route hiện chưa có auth guard.
- Runtime Docker image hiện chưa copy `bootstrap/snapshot.json` và chưa có compiled migration runner; đây là limitation đã biết, không được che bằng documentation.
- CI hiện có application checks, secret scan, Docker build check, image build, non-root check và Trivy vulnerability scan.

## INFERENCE — Boundary rules cần giữ

Các rule sau là suy luận từ cấu trúc hiện tại, dùng để ngăn drift chứ chưa phải feature contract:

- `src/modules/auth` không được truy cập internals của `src/platform`.
- `src/platform` không được phụ thuộc business module cụ thể.
- `src/shared` không được import ngược module/domain.
- Database migration là nơi thay đổi schema cố định; generated platform table không thay thế migration cho core tables.
- Route composition thuộc `src/app`; module router tự khai báo path của module như convention hiện tại.

## TARGET STATE — Có điều kiện

BOS nên tiếp tục là modular monolith với các capability sau, chỉ triển khai khi có requirement tương ứng:

1. **Platform/core capability**: metadata contract, schema materialization, generic persistence và lifecycle/version rules rõ ràng.
2. **Identity/access capability**: authn/authz contract, ownership của user/role và boundary bảo vệ từng module.
3. **Business domains**: mỗi domain có contract, ownership và database boundary riêng; không truy cập internals domain khác.
4. **Cross-domain integration**: dependency đi qua service/contract được xác nhận, không import vòng.
5. **Operational hardening**: migration/bootstrap runtime, smoke test, artifact verification và deployment contract khi có staging/production.

Target state không mặc định có microservices, event bus, Redis, CQRS hoặc plugin framework. Mỗi capability cần một task/decision riêng và evidence từ requirement.

## Known architectural gaps

- Chưa có authz policy cho platform/users.
- Chưa có relation/FK/index metadata contract.
- Chưa có active version pointer hoặc schema version migration contract.
- Materialization chưa transactional hoàn toàn.
- Chưa có runtime migration/bootstrap path cho production image.
- Chưa có business domain contract để chọn domain đầu tiên.
- Chưa có explicit integration layer giữa các business domains vì chưa có business domains active.
