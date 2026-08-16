# Mô hình Cloud BOS

> **Trạng thái:** `PROPOSED` — hồ sơ triển khai cloud. Chưa chọn cloud provider cụ thể.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Docker image build application và chạy với quyền non-root.
- Docker Compose chỉ cung cấp PostgreSQL/pgAdmin local.
- Hiện chưa triển khai tích hợp cloud provider.

## 2. REQUIREMENT

- Triển khai cloud là một tuỳ chọn, không phải mặc định.
- Self-hosting vẫn là một tuỳ chọn.
- Binary application giống nhau giữa cloud và self-hosted.
- Application không giả định bất kỳ API cloud provider cụ thể nào.

## 3. Topology

```text
cloud environment
  +-- bos application instance(s)
  +-- managed PostgreSQL (or self-managed)
  +-- managed object storage (generic)
  +-- managed queue/cache (optional, replaceable)
  +-- managed secret store (optional, replaceable)
  +-- observability backend (generic)
```

Mối quan tâm riêng của cloud (IAM, network policy, identity liên kết IAM) nằm sau ranh giới có thể thay thế; product code không gọi cloud SDK.

## 4. Identity và truy cập

- Xác thực dùng context identity (xem `identity-model.md`).
- Cloud IAM chỉ dùng cho identity ở thời điểm deploy và worker; nó không phải nhà cung cấp xác thực người dùng trừ khi được thiết kế tường minh.

## 5. Database và storage

- **PROPOSED:** managed PostgreSQL với TLS, backup tự động, point-in-time recovery.
- **OPEN:** nhà cung cấp DB managed trên cloud.
- **OPEN:** nhà cung cấp object storage.
- **OPEN:** nhà cung cấp KMS / secret manager.

## 6. Mạng

- **PROPOSED:** mạng riêng giữa application và database; TLS trên đường truyền.
- **OPEN:** ingress / load balancer; DNS; CDN.

## 7. Tư thế vận hành

- **PROPOSED:** logging có cấu trúc với redaction; metric với label có giới hạn; tracing với correlation ID.
- **OPEN:** nhà cung cấp backend quan sát.

## 8. Tư thế multi-region / HA

- `OPEN`: topology replication.
- `OPEN`: kỳ vọng failover.
- `OPEN`: yêu cầu data residency.

## 9. Tư thế khi lỗi

- Một sự cố của managed service làm suy giảm capability nhưng không âm thầm làm hỏng dữ liệu sản phẩm.
- Capability chỉ-cloud bị cấm trong product code; dịch vụ cloud chỉ là substrate ở thời điểm deploy và runtime.

## 10. Quyết định đang mở

- `OPEN`: chọn cloud provider.
- `OPEN`: nhà cung cấp managed DB.
- `OPEN`: nhà cung cấp object storage.
- `OPEN`: nhà cung cấp secret manager.
- `OPEN`: nhà cung cấp queue/cache.
- `OPEN`: stack quan sát.
- `OPEN`: tư thế multi-region.