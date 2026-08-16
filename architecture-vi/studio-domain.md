# Miền Studio BOS

> **Trạng thái:** `PROPOSED` — hợp đồng miền. Hiện chưa có module Studio nào được triển khai.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Kho mã không chứa mã Studio.
- Chưa tồn tại các thực thể project, task, asset hoặc approval.

## 2. Mục đích

Một sản phẩm workspace cho dự án sáng tạo, điều phối brief, task, asset, lịch trình và phê duyệt giữa một nhóm dự án. Studio độc lập với CMS, Ecommerce, Production-TVC, Entertainment và Music.

## 3. Dữ liệu sở hữu (đề xuất)

- Project (kèm mục tiêu, người sở hữu, lịch trình).
- Task và dependency.
- Tham chiếu asset (lưu trữ trong storage chung).
- Phê duyệt và nhận xét review.
- Lịch trình và milestone.

Studio không sở hữu: nội dung biên tập (CMS), đơn hàng thương mại (Ecommerce), deliverable riêng của TVC (Production-TVC), event/rights (Entertainment), catalog nhạc (Music).

## 4. Ranh giới

- Studio không đọc hoặc ghi bảng của sản phẩm khác.
- Binary asset nằm trong object storage chung; Studio chỉ ghi nhận tham chiếu.
- Nhà cung cấp asset bên ngoài tích hợp qua context Integration.

## 5. API và event (đề xuất)

- API: CRUD project, CRUD task, CRUD tham chiếu asset, luồng approval.
- Event: project được tạo, trạng thái task thay đổi, asset được upload, quyết định approval.
- Webhook: tuỳ chọn inbound từ công cụ asset bên ngoài qua Integration.

## 6. Hoạt động độc lập / suy giảm

- Studio phải hoạt động khi chưa cài CMS, Ecommerce, Production-TVC, Entertainment hoặc Music.
- Nếu substrate object storage không khả dụng, Studio chỉ ghi metadata và đánh dấu asset bị thiếu.
- Nếu công cụ bên ngoài không khả dụng, Studio tiếp tục với việc cập nhật metadata thủ công.

## 7. Quyết định đang mở

- `OPEN`: mô hình template project.
- `OPEN`: grammar của luồng approval.
- `OPEN`: mô hình asset versioning.
- `OPEN`: ngữ nghĩa dependency-graph.
- `OPEN`: tính năng time tracking / billing.