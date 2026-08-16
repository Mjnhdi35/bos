# BOS Standalone Model

> **Trạng thái:** `PROPOSED` — profile triển khai single-instance.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Local dev chạy ứng dụng với Docker Compose PostgreSQL.
- Ứng dụng có health endpoint và dùng Knex migration.
- Chưa có business product nào chạy trong profile này.

## 2. REQUIREMENT

- Standalone nghĩa là một application instance, một PostgreSQL database, không cần external dependency.
- Một standalone deployment phải vận hành được khi offline khỏi bất kỳ cloud service nào.
- Tất cả capability cần thiết chạy trong cùng process (modular monolith).

## 3. Topology

```text
single host
  +-- bos application (modular monolith, compiled)
  +-- PostgreSQL (one logical database, many schemas)
  +-- optional generic PaaS/BaaS (replaceable)
```

## 4. Storage

- **FACT:** PostgreSQL là database.
- **PROPOSED:** generic object storage, generic queue/cache, cả hai có thể thay thế.
- **OPEN:** secret store; nếu không có, deployment chạy không có nó.

## 5. Identity và access

- Authentication dùng cùng identity context như multi-instance (xem `identity-model.md`).
- Authorization policy là per-deployment; không giả định cross-deployment principal.

## 6. Migration và bootstrap

- **FACT:** migration do Knex quản lý.
- **PROPOSED:** migration chạy trước khi ứng dụng bắt đầu phục vụ request.
- **PROPOSED:** bootstrap data (vd. `bootstrap/snapshot.json`) chỉ load khi cần; image phải ship snapshot nếu vậy.

## 7. Operational expectation

- Deployment expose `/health` và `/health/db`.
- Log ghi local; observability backend là optional và `OPEN`.
- Backup strategy do operator định nghĩa; ứng dụng không giả định cloud-native snapshot.

## 8. Failure posture

- Nếu một generic PaaS/BaaS không khả dụng, deployment tiếp tục ở degraded mode theo product.
- Không có implicit dependency lên instance khác; sibling instance không tồn tại trong profile này.

## 9. Open decision

- `OPEN`: backup/restore tooling.
- `OPEN`: monitoring stack.
- `OPEN`: log shipping.
