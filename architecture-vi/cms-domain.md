# Miền CMS BOS

> **Trạng thái:** `PROPOSED` — hợp đồng miền. Hiện chưa có module CMS nào được triển khai.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Kho mã không chứa mã CMS.
- Kho mã không có thực thể nội dung, không có migration CMS, không có route CMS.

## 2. Mục đích

Một sản phẩm Content Management System cho phép tác giả tạo, quản lý phiên bản, gắn taxonomy và publish nội dung biên tập. CMS độc lập với Ecommerce, Studio, Production-TVC, Entertainment và Music.

## 3. Dữ liệu sở hữu (đề xuất)

- Content node và revision của chúng.
- Taxonomy và tag.
- Tham chiếu media (tới media lưu ở generic storage).
- Trạng thái publish, lịch trình, biến thể locale.
- Phân công tác giả/biên tập (trong một organization/workspace).

CMS không sở hữu: catalog sản phẩm (Ecommerce), asset creative project (Studio), rights (Music, Entertainment), dữ liệu thanh toán hoặc đơn hàng (Ecommerce).

## 4. Ranh giới

- CMS không import hoặc join bảng của sản phẩm khác.
- Sản phẩm khác nhúng nội dung CMS qua API hoặc event, không qua tham chiếu trực tiếp.
- CMS không import SDK của provider; tích hợp provider (nếu cần, ví dụ DAM bên ngoài) qua context Integration.

## 5. API và event (đề xuất)

- API: list/read/create/update nội dung, quản lý revision, quản lý taxonomy, quản lý luồng publish.
- Event: nội dung được tạo, nội dung được cập nhật, nội dung được publish, nội dung được unpublish, taxonomy thay đổi.
- Webhook: callback inbound tuỳ chọn từ DAM bên ngoài, do context Integration kiểm soát.

CMS không phải nguồn chính (source of truth) cho tham chiếu chéo sản phẩm; thực thể chéo sản phẩm chỉ được tham chiếu bằng canonical ID.

## 6. Hoạt động độc lập / suy giảm

- CMS phải hoạt động khi chưa cài Ecommerce, Music, Studio, Production-TVC hoặc Entertainment.
- Nếu consumer downstream vắng mặt, CMS tiếp tục publish; event xếp hàng tại bus/substrate (`OPEN`).
- Nếu generic storage backend không khả dụng, chế độ read-only của CMS là chấp nhận được.

## 7. Quyết định đang mở

- `OPEN`: chiều sâu mô hình nội dung (phẳng vs cây).
- `OPEN`: chiến lược locale.
- `OPEN`: chính sách giữ revision.
- `OPEN`: định dạng rich-text và quy tắc nhúng.
- `OPEN`: tích hợp media pipeline.
- `OPEN`: substrate search/index.