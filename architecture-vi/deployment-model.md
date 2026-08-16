# Mô hình triển khai BOS

> **Trạng thái:** `PROPOSED` — mô hình triển khai logic. Kho mã hiện có Docker Compose local cho PostgreSQL/pgAdmin và một Docker image chạy `node dist/server.js`. Chưa triển khai hạ tầng staging hay production.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Dev local: Docker Compose cung cấp PostgreSQL 16 và pgAdmin.
- Docker image: container production chạy `dist/server.js` đã biên dịch dưới user non-root `node`.
- Migration: do Knex quản lý dưới `src/infrastructure/database/migrations/**`.
- CI: typecheck, test, coverage, quét secret, build Docker, kiểm tra non-root, Trivy.

## 2. REQUIREMENT

- Hỗ trợ triển khai standalone (một instance, một database).
- Hỗ trợ nhiều deployment độc lập.
- Cả cloud và self-hosting đều là tuỳ chọn hợp lệ.
- Một deployment không giả định deployment khác tồn tại.
- Một deployment không giả định Kubernetes hay bất kỳ orchestrator cụ thể nào.
- Một deployment không giả định bất kỳ cloud provider cụ thể nào.
- Capability PaaS/BaaS là generic và có thể thay thế.

## 3. Topology triển khai (đề xuất)

```text
Standalone instance          Independent cloud instance       Self-hosted instance
  application                   application                       application
  postgres                      postgres                          postgres
  paas/baas (replaceable)       paas/baas (replaceable)          paas/baas (replaceable)
```

Cả ba topology là tuỳ chọn first-class ngang nhau. Application là giống nhau; chỉ substrate triển khai thay đổi.

## 4. Build và release

- **FACT:** `src/**/*.ts` được biên dịch bởi tsc vào `dist/`; image runtime chạy JS đã biên dịch.
- **PROPOSED:** migration runner phải là một phần của image runtime, với thứ tự khởi động được định nghĩa.
- **OPEN:** phiên bản release, image tagging, registry.

## 5. Database và storage

- **FACT:** PostgreSQL là database.
- **PROPOSED:** mỗi bounded context sở hữu bảng và migration của mình.
- **OPEN:** dịch vụ database managed so với tự quản.
- **OPEN:** nhà cung cấp object storage (generic).

## 6. Mạng và ingress

- **OPEN:** ingress controller, TLS termination, DNS.
- **OPEN:** chiến lược static asset.
- **OPEN:** CDN.

## 7. Tư thế vận hành

- Health endpoint `/health` và `/health/db` tồn tại (FACT).
- **OPEN:** tách readiness/liveness.
- **OPEN:** backend logging, metric, tracing.
- **OPEN:** backup và restore cho mỗi deployment.

## 8. Lộ trình có điều kiện

Một capability triển khai chỉ được thực hiện khi có một yêu cầu vận hành cụ thể viện dẫn tới nó.

## 9. Artifact đi kèm

- `standalone-model.md` — hồ sơ single-instance.
- `cloud-model.md` — hồ sơ cloud.
- `multi-instance-model.md` — hồ sơ các deployment độc lập.
- `data-ownership.md` — cái gì nằm ở đâu.