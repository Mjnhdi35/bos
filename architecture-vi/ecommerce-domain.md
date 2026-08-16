# Miền Ecommerce BOS

> **Trạng thái:** `PROPOSED` — hợp đồng miền. Hiện chưa có module Ecommerce nào được triển khai.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Kho mã không chứa mã Ecommerce.
- Không tồn tại dữ liệu catalog, order, payment, fulfillment, cart hay pricing.

## 2. Mục đích

Một sản phẩm commerce xử lý catalog, pricing, cart, ghi nhận order, điều phối payment và điều phối fulfillment. Ecommerce độc lập với CMS, Studio, Production-TVC, Entertainment và Music.

## 3. Dữ liệu sở hữu (đề xuất)

- Catalog item, variant, attribute.
- Giá và price list.
- Cart (theo actor/session).
- Order và order line.
- Payment intent và payment event đã ghi (không có dữ liệu thẻ bí mật).
- Hồ sơ fulfillment (handoff, shipment, trạng thái delivery).
- Return, refund (trong phạm vi commerce).

Ecommerce không sở hữu: nội dung biên tập (CMS), creative asset (Studio), rights (Music, Entertainment), lịch sản xuất (Production-TVC).

## 4. Ranh giới

- Ecommerce không join bảng của sản phẩm khác.
- Sản phẩm khác phơi ra fact liên quan đến commerce (ví dụ một Music release có thể bán) qua API/event; Ecommerce sở hữu order phát sinh.
- Tích hợp payment provider chỉ qua context Integration; Ecommerce không bao giờ gọi trực tiếp SDK của provider.

## 5. API và event (đề xuất)

- API: CRUD catalog, thao tác cart, vòng đời order, ghi payment, cập nhật fulfillment.
- Event: cart được cập nhật, order được đặt, order được thanh toán, order được fulfill, order được hoàn tiền.
- Webhook: callback của payment provider qua Integration.

Secret payment không bao giờ xuất hiện trong API, event hoặc log của Ecommerce.

## 6. Hoạt động độc lập / suy giảm

- Ecommerce phải hoạt động khi chưa cài CMS, Music, Studio, Production-TVC hoặc Entertainment.
- Nếu payment provider không khả dụng, Ecommerce ghi order ở trạng thái pending payment và tiếp tục khi quyền truy cập được khôi phục; không im lặng thất bại.
- Nếu tích hợp fulfillment không khả dụng, Ecommerce tiếp tục ghi nhận order và xếp hàng các thay đổi trạng thái fulfillment.

## 7. Quyết định đang mở

- `OPEN`: quy tắc thuế.
- `OPEN`: pricing engine và mô hình price list.
- `OPEN`: (các) payment provider.
- `OPEN`: tích hợp shipping/carrier.
- `OPEN`: engine chính sách refund/return.
- `OPEN`: tư thế phạm vi PCI.