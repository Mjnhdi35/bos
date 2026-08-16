# Miền Entertainment BOS

> **Trạng thái:** `PROPOSED` — hợp đồng miền. Hiện chưa có module Entertainment nào được triển khai.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Kho mã không chứa mã Entertainment.
- Chưa tồn tại các thực thể event, venue/session, program, right hoặc attendance.

## 2. Mục đích

Một sản phẩm entertainment xử lý event, program, venue/session, quyền (rights) và sự tham dự của khán giả. Entertainment độc lập với CMS, Ecommerce, Studio, Production-TVC và Music.

## 3. Dữ liệu sở hữu (đề xuất)

- Event, program, session, venue/space.
- Quyền và sự kiện licensing (nơi Entertainment sở hữu chúng).
- Attendance, ticketing, hồ sơ khán giả.
- Tham chiếu biên tập liên quan đến event (tiêu thụ từ CMS).

Entertainment không sở hữu: nội dung biên tập (CMS), đơn hàng thương mại (Ecommerce), creative asset (Studio), deliverable TVC (Production-TVC), catalog nhạc (Music).

## 4. Ranh giới

- Entertainment không đọc hoặc ghi bảng của sản phẩm khác.
- Nhà cung cấp ticketing/rights tích hợp qua context Integration.
- Tích hợp commerce qua API/event; Ecommerce sở hữu order và thanh toán.

## 5. API và event (đề xuất)

- API: CRUD event, CRUD program, CRUD session, CRUD rights, truy vấn attendance.
- Event: event được tạo, event được publish, session được lên lịch, vé được phát hành, attendance được ghi nhận.
- Webhook: callback từ ticketing/vendor qua Integration.

## 6. Hoạt động độc lập / suy giảm

- Entertainment phải hoạt động khi chưa cài CMS, Ecommerce, Studio, Production-TVC hoặc Music.
- Nếu nhà cung cấp ticketing không khả dụng, Entertainment ghi intent ở local và đối chiếu khi quyền truy cập được khôi phục.
- Nếu nguồn attendance không khả dụng, Entertainment tiếp tục ghi nhận event/session.

## 7. Quyết định đang mở

- `OPEN`: mô hình rights/clearance.
- `OPEN`: (các) nhà cung cấp ticketing.
- `OPEN`: phương thức thu thập attendance.
- `OPEN`: mô hình venue/space.
- `OPEN`: hệ thống phân cấp và lịch trình program.