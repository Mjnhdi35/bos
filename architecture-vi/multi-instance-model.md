# Mô hình Multi-Instance BOS

> **Trạng thái:** `PROPOSED` — hồ sơ nhiều-triển-khai-độc-lập. Hiện tại kho mã có một Docker image single-instance và Docker Compose cho dev local; không có cơ chế nào thực thi hay triển khai nhiều deployment.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Một Docker image, một runtime process (`node dist/server.js`), một kết nối PostgreSQL.
- Chưa triển khai federation, replication hay routing chéo instance.

## 2. REQUIREMENT

- Hỗ trợ nhiều deployment độc lập.
- Một deployment không giả định rằng deployment khác tồn tại.
- Một deployment không giả định hạ tầng toàn cục chia sẻ.
- Identifier (organization, resource) thuộc phạm vi deployment, hoặc canonical-nhưng-được-resolve-theo-deployment.
- Tương tác chéo deployment, nếu có, phải qua hợp đồng tường minh và có kiểm toán.

## 3. Topology

```text
deployment A (orgs A1, A2)   deployment B (orgs B1)   deployment C (single org)
   |                              |                          |
   +--- each is independent; no implicit sharing
```

Mỗi deployment chạy cùng binary application với database PostgreSQL riêng và substrate PaaS/BaaS có thể thay thế.

## 4. Kỷ luật identifier

- Resource identifier là duy nhất trong phạm vi một deployment.
- Tham chiếu chéo deployment dùng canonical ID cộng tham chiếu deployment — `OPEN` về cơ chế resolve canonical.
- Nhãn hiển thị không được dùng làm identifier.

## 5. Tương tác chéo deployment

- **PROPOSED:** API chéo deployment là tường minh và được xác thực ở cả hai đầu.
- **PROPOSED:** event giữa các deployment dùng một envelope event có tài liệu (xem `event-contracts.md`).
- **OPEN:** transport giữa các deployment.

## 6. Di chuyển dữ liệu

- Export/import là tường minh, có kiểm toán, và theo từng context.
- Không giả định "global business database"; join chéo deployment bị cấm.

## 7. Vận hành

- Mỗi deployment có observability, backup và ứng phó sự cố riêng.
- Operator multi-instance không nhận công cụ admin toàn cục theo mặc định.

## 8. Lộ trình có điều kiện

- Tính năng multi-instance chỉ được triển khai khi một yêu cầu cụ thể viện dẫn tới chúng.

## 9. Quyết định đang mở

- `OPEN`: lược đồ canonical ID xuyên suốt các deployment.
- `OPEN`: transport chéo deployment.
- `OPEN`: điều phối backup/restore theo từng deployment.
- `OPEN`: truy cập hỗ trợ xuyên suốt các deployment.