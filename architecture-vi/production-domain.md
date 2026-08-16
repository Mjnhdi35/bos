# Miền Production–TVC BOS

> **Trạng thái:** `PROPOSED` — hợp đồng miền. Hiện chưa có module Production-TVC nào được triển khai.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Kho mã không chứa mã Production-TVC.
- Chưa tồn tại các thực thể brief, treatment, shoot, edit hoặc deliverable.

## 2. Mục đích

Một sản phẩm quản lý sản xuất chuyên biệt cho workflow TVC/quảng cáo: brief, treatment, shoot, edit, deliverable, phê duyệt, và bàn giao cho stakeholder của brand. Production-TVC độc lập với CMS, Ecommerce, Studio, Entertainment và Music.

## 3. Dữ liệu sở hữu (đề xuất)

- Brief và yêu cầu của client.
- Treatment và storyboard.
- Shoot plan, lịch trình và shot list.
- Phiên bản edit và ghi chú review.
- Deliverable và xác nhận bàn giao.

Production-TVC không sở hữu: metadata creative project của miền không liên quan (Studio), nội dung biên tập (CMS), đơn hàng thương mại (Ecommerce), rights (Entertainment, Music).

## 4. Ranh giới

- Production-TVC không đọc hoặc ghi bảng của sản phẩm khác.
- Deliverable có thể được tham chiếu bởi sản phẩm khác qua API/canonical ID.
- Tích hợp vendor (ví dụ asset vendor) đi qua context Integration.

## 5. API và event (đề xuất)

- API: CRUD brief, CRUD treatment, CRUD shoot, CRUD phiên bản edit, CRUD deliverable.
- Event: brief được tạo, treatment được duyệt, shoot hoàn tất, edit được bàn giao, deliverable được chấp nhận.
- Webhook: callback từ vendor bên ngoài qua Integration.

## 6. Hoạt động độc lập / suy giảm

- Production-TVC phải hoạt động khi chưa cài CMS, Ecommerce, Studio, Entertainment hoặc Music.
- Nếu asset storage không khả dụng, Production-TVC tiếp tục với trạng thái chỉ metadata.
- Nếu vendor bên ngoài không khả dụng, Production-TVC tiếp tục với chuyển trạng thái thủ công.

## 7. Quyết định đang mở

- `OPEN`: catalog định dạng deliverable.
- `OPEN`: grammar của review/approval.
- `OPEN`: mô hình rights và licensing (tương tác với Music/Entertainment).
- `OPEN`: theo dõi budget/cost, nếu có.
- `OPEN`: tích hợp với công cụ sản xuất bên ngoài.