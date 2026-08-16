# Quyền sở hữu dữ liệu BOS

> **Trạng thái:** `PROPOSED` — bảng quyền sở hữu. Hiện tại chỉ có metadata Platform (`platform_entities`, các bảng được generate), một phần Identity (`users`, `refresh_tokens`) và migration Platform. Dữ liệu nghiệp vụ là `OPEN`.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT — bảng hiện đang sở hữu

| Owner | Bảng |
|---|---|
| Identity | `users`, `refresh_tokens` |
| Platform | `platform_entities`, `schema_meta`, các bảng động được generate |
| Infrastructure | `_knex_migrations`, `_knex_migrations_lock` |

## 2. REQUIREMENT — quy tắc quyền sở hữu

- Mỗi bounded context sở hữu bảng và migration của mình.
- Một bounded context không được truy vấn trực tiếp bảng của context khác.
- Tính nhất quán chéo context đi qua API, event hoặc webhook.
- Không có "global business database" chia sẻ theo mặc định.

## 3. PROPOSED — quyền sở hữu trong tương lai

Platform không khai báo trước bảng miền sản phẩm. Khi một sản phẩm ứng viên được kích hoạt (lựa chọn là quyết định nghiệp vụ/con người, được ghi trong `.engineering/TASKS.md`), chủ sở hữu sản phẩm tự đưa vào bảng và migration của mình dưới path riêng. Tầng platform không sở hữu hay seed những bảng đó.

Để tham khảo, các ô quyền sở hữu khái niệm là:

| Owner | Bảng (đề xuất) |
|---|---|
| Identity | `users`, `refresh_tokens`, liên kết identity provider, claim identity |
| Platform | `platform_entities`, các bảng được generate, audit hook |
| Integration | catalog provider, trạng thái kết nối, metadata tài khoản bên ngoài, trạng thái sync, trạng thái thực thi mapping, biên nhận webhook |
| Sản phẩm (kích hoạt theo `.engineering/TASKS.md`) | do chủ sở hữu sản phẩm định nghĩa tại thời điểm kích hoạt; bảng và migration nằm dưới path riêng của sản phẩm |
| Organization | organization, workspace, membership, role binding (`OPEN` về mức độ áp dụng) |

## 4. Tính nhất quán chéo context

- Tính nhất quán chéo context là eventual.
- Context phát event chịu trách nhiệm phát event sau khi chuyển trạng thái nội bộ của nó đã bền vững.
- Context tiêu thụ event chịu trách nhiệm cho projection nội bộ của mình.

## 5. Quy ước tenant/column

- Không có cột `tenant_id` bắt buộc.
- Một context có thể dùng `organization_id` nếu nó sở hữu tường minh dữ liệu theo phạm vi organization; cột này là context-local.
- Context Identity không sở hữu `organization_id`; cột đó thuộc context Organization khi context đó tồn tại.

## 6. Audit và tính di động

- Mỗi context sở hữu bản ghi audit của mình.
- Định dạng export theo từng context; việc tích hợp export của các context vào một export organization duy nhất là `OPEN`.

## 7. Quyết định đang mở

- `OPEN`: schema organization và quyền sở hữu migration.
- `OPEN`: chính sách retention theo context.
- `OPEN`: chính sách deletion theo context.
- `OPEN`: chiến lược projection chéo context.