# Nguyên lý Kiến trúc BOS

> **Trạng thái:** `PROPOSED` — nguyên lý dẫn đường. Chúng chưa được enforced bởi code path hiện thực nào ngoài những gì `.engineering/ARCHITECTURE.md` đã tài liệu hóa.

## Từ vựng

- **FACT** — đã xác minh bởi repository hôm nay.
- **REQUIREMENT** — bất biến phải giữ.
- **DECISION** — lựa chọn rõ ràng đã được đưa ra.
- **PROPOSED** — quy tắc thiết kế chưa hiện thực.
- **OPEN** — hướng chưa được chọn.

## 1. FACT — trạng thái repository đằng sau các nguyên lý

- Modular monolith với `src/shared`, `src/modules/auth`, `src/modules/users`, `src/platform`, `src/infrastructure/database`, `src/app`.
- Migration là Knex/PostgreSQL.
- Chưa có business product module nào được hiện thực.

## 2. Nguyên lý không thể thương lượng

1. **Bounded context sở hữu dữ liệu của mình.** Không sản phẩm nào đọc hay ghi bảng của sản phẩm khác.
2. **Sản phẩm tích h�p qua contract.** API, event, webhook và schema rõ ràng — không qua schema chia s�.
3. **Provider neutrality.** Không product module nào import trực tiếp provider SDK.
4. **Khả thay thế.** Adapter, storage backend, queue/cache layer có thể thay thế sau ranh giới.
5. **Không có business semantics trong generic layer.** Tầng PaaS/BaaS và platform không mang ý nghĩa business.
6. **Frontend không phải source of truth.** Front-end chỉ render và submit; backend/domain là chuẩn.
7. **Standalone trước.** Mỗi sản phẩm phải hoạt động khi chưa cài sibling product.
8. **Cloud là optional.** Cloud và self-hosting đều hợp lệ; không gì trong code sản phẩm được giả định một trong hai.
9. **Data ownership rõ ràng.** `data-ownership.md` là source of truth.
10. **Không có cột tenant bắt buộc.** Tenant-style scoping là điều kiện, không phải toàn cục.

## 3. PROPOSED — quy tắc thiết kế

- Ưu tiên ranh giới compile-time (typed contract) hơn runtime reflection.
- Ưu tiên thay đổi additive, có version hơn breaking change.
- Ưu tiên operation idempotent; mặc định reject retry không idempotent.
- Ưu tiên remote work deferred/bounded hơn inline cross-system transaction.
- Ưu tiên canonical ID và opaque provider identifier đặt cạnh nhau.
- Ưu tiên authorization deny-by-default; explicit allow theo capability và scope.

## 4. DECISION — đã được chấp nhận

- Bộ artifact integration/security là chuẩn.
- Modular monolith vẫn là giả định cấu trúc cho đến khi có quyết định triển khai riêng.
- Không có microservices, event bus, Kubernetes, secret store, OAuth provider, queue, cache vendor, cloud hay first domain nào được chọn ở đây.

## 5. OPEN — mục deferred cho quyết định tiếp theo

- Cross-product event catalog cụ thể.
- Authorization policy granularity (role, capability, resource).
- Audit retention và deletion policy.
- Multi-region và replication strategy.
- Disaster-recovery expectation cho mỗi sản phẩm.

## 6. Quan hệ với artifact khác

- `ecosystem-overview.md` — BOS là gì và không phải gì.
- `platform-boundaries.md` / `product-boundaries.md` — nguyên lý áp dụng ở đâu.
- `bounded-contexts.md` — quy tắc ownership.
- `data-ownership.md` — bảng ownership cụ thể.
