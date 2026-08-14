# BOS Domain Map

> Chỉ đánh dấu domain là `active` hoặc `partial` khi có code/test/requirement trong repository. Domain không có evidence được ghi là `planned / chưa xác định`, không suy diễn từ danh sách ERP.

## Domain inventory

| Domain | Trạng thái | Evidence hiện tại | Ownership hiện tại | Dependency đã biết |
|---|---|---|---|---|
| Platform/Core | `partial` | `src/platform/**`, `platform_entities` migration, generic CRUD tests | Platform code owner | PostgreSQL, shared errors/http, Knex |
| Identity / Access | `partial` | `src/modules/auth/**`, JWT, bcrypt, refresh token tests | Auth module owner; user records ở Users | Users, PostgreSQL, shared config/crypto |
| Users | `partial` | `src/modules/users/**`, users migrations, integration tests | Users module owner | PostgreSQL, shared errors/crypto |
| Organization | `planned / chưa xác định` | Chưa có implementation, schema hoặc contract | Chưa xác định | Chưa xác định |
| Customer | `planned / chưa xác định` | Chưa có implementation, schema hoặc contract | Chưa xác định | Chưa xác định |
| Product | `planned / chưa xác định` | Chưa có implementation, schema hoặc contract | Chưa xác định | Chưa xác định |
| Inventory | `planned / chưa xác định` | Chưa có implementation, schema hoặc contract | Chưa xác định | Chưa xác định |
| Sales | `planned / chưa xác định` | Chưa có implementation, schema hoặc contract | Chưa xác định | Chưa xác định |
| Purchase / Supplier | `planned / chưa xác định` | Chưa có implementation, schema hoặc contract | Chưa xác định | Chưa xác định |
| Finance | `planned / chưa xác định` | Chưa có implementation, schema hoặc contract | Chưa xác định | Chưa xác định |
| HR | `planned / chưa xác định` | Chưa có implementation, schema hoặc contract | Chưa xác định | Chưa xác định |
| Marketing | `planned / chưa xác định` | Chưa có implementation, schema hoặc contract | Chưa xác định | Chưa xác định |
| Operations | `planned / chưa xác định` | Chưa có implementation, schema hoặc contract | Chưa xác định | Chưa xác định |
| Reporting | `planned / chưa xác định` | Chưa có implementation, schema hoặc contract | Chưa xác định | Chưa xác định |
| Franchise | `planned / chưa xác định` | Chưa có implementation, schema hoặc contract | Chưa xác định | Chưa xác định |
| Knowledge / Risk / Compliance | `planned / chưa xác định` | Chưa có implementation, schema hoặc contract | Chưa xác định | Chưa xác định |

## Domain contract tối thiểu

Một domain chỉ được chuyển khỏi `planned / chưa xác định` khi có:

- objective nghiệp vụ được xác nhận;
- ownership cụ thể;
- entity và invariant chính;
- API/service contract;
- database ownership và migration strategy;
- dependency với Identity/Organization/domain khác;
- test acceptance tương ứng.

## Active/partial domain notes

### Platform/Core

Mục đích hiện tại là cung cấp metadata-driven entity definition và generic CRUD. Entity name/version/fields được validate; metadata lưu trong PostgreSQL; schema materializer tạo physical table; record data store thực hiện create/read/list/update/delete. `enum` dùng PostgreSQL `CHECK`, `array` dùng PostgreSQL array type.

Chưa có relation/FK metadata, metadata index, active version pointer, version migration hoặc auth policy cho platform routes.

### Identity / Access và Users

Auth hỗ trợ register/login/me/refresh/logout. Access token là Bearer token trong response body; refresh token là `HttpOnly` cookie và token hash được lưu trong `refresh_tokens`. User có role `user|admin` ở schema hiện tại, nhưng authorization policy ngoài `/auth/me` chưa được chứng minh.

## Domain boundary cấm

- Domain mới không import trực tiếp repository/controller của domain khác.
- Platform không được chứa business rule riêng của Customer/Sales/Finance/etc.
- Shared không được trở thành nơi chứa business state.
- Cross-domain dependency phải đi qua contract được ghi trong task/decision.
