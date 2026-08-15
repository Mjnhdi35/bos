# BOS Dependency Graph

## Compile-time dependency hiện tại

```text
src/server.ts
  -> src/app/create-app.ts
       -> src/modules/auth/**
       -> src/modules/users/**
       -> src/platform/**
       -> src/infrastructure/database/**
       -> src/shared/**

src/modules/auth/**
  -> src/modules/users/**
  -> src/infrastructure/database/**
  -> src/shared/**

src/modules/users/**
  -> src/infrastructure/database/**
  -> src/shared/**

src/platform/**
  -> src/infrastructure/database/**
  -> src/shared/**

src/infrastructure/database/**
  -> src/shared/config/env.ts

src/shared/**
  -> không phụ thuộc module/domain cụ thể
```

Đây là graph được suy ra từ imports đã inspect. Không thấy cycle compile-time trong boundary hiện tại.

## Runtime dependency

| Consumer | Dependency | Vai trò |
|---|---|---|
| Express app | PostgreSQL | health DB, auth/users persistence, platform metadata/data |
| Auth | JWT secret/config | sign/verify access token |
| Auth | refresh_tokens | rotation, revoke, reuse detection |
| App startup | `bootstrap/snapshot.json` nếu có | seed platform metadata khi metadata table rỗng |
| Docker healthcheck | `/health` | kiểm tra HTTP process đang phục vụ |
| CI verify | PostgreSQL service | migration và integration test |

## Database dependency

```text
users
  -> refresh_tokens (FK users.id, ON DELETE CASCADE)

platform_entities
  -> generated physical tables (created from metadata at runtime)

schema_meta
  -> foundation table; không có consumer runtime rõ ràng trong code đã inspect
```

`platform_entities` là metadata persistence; generated table là projection/runtime storage. Việc tạo metadata và physical table hiện chưa dùng một transaction chung.

## API dependency

- `POST /auth/register`, `POST /auth/login` tạo user/token state.
- `GET /auth/me` phụ thuộc Bearer access token và user lookup.
- `/auth/refresh` và `/auth/logout` phụ thuộc refresh cookie.
- `/users` hiện có create-user API nhưng chưa có authz contract.
- `/platform/*` hiện có entity metadata và generic record APIs nhưng chưa có authz contract.

## Dependency rules cho target state

1. Shared chỉ cung cấp cross-cutting primitives; không import ngược domain.
2. Auth có thể cung cấp identity/access contract; business domain không đọc trực tiếp refresh-token internals.
3. Business domain phụ thuộc contract của Organization/Identity khi requirement yêu cầu, không phụ thuộc database table của nhau.
4. Platform không phụ thuộc business domain.
5. Không chấp nhận cycle compile-time, runtime hoặc ownership cycle. Nếu phát hiện cycle có ảnh hưởng behavior, dừng task và tạo architectural decision.
6. Migration của core domain phải được owner domain kiểm soát; task khác không tự sửa migration ngoài scope.

## Parallelization implications

Có thể chạy song song khi không sửa chung path và không phụ thuộc behavior:

- Documentation/control-plane work.
- Contract discovery cho các domain chưa có code, nếu mỗi task có owner/path riêng.
- Security/build hardening độc lập với domain feature.

Không chạy song song nếu cùng sửa:

- `src/app/create-app.ts` route composition;
- `src/infrastructure/database/migrations/` cùng một schema area;
- shared auth contract;
- platform metadata/schema materializer;
- cùng một domain module.
