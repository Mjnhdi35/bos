# Ranh giới sản phẩm BOS

> **Trạng thái:** `PROPOSED` — hợp đồng ranh giới tầng sản phẩm. Hiện chưa có sản phẩm nghiệp vụ nào được triển khai.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — lựa chọn đã được chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Kho mã không chứa module sản phẩm nào. Chưa có mã CMS, Ecommerce, Studio, Production-TVC, Entertainment hay Music.

## 2. REQUIREMENT

- Mỗi sản phẩm là một bounded context độc lập.
- Mỗi sản phẩm phải hoạt động standalone (không yêu cầu sibling bắt buộc).
- Sản phẩm không đọc hoặc ghi bảng của sản phẩm khác.
- Sản phẩm phơi ra API, event và webhook; consumer tích hợp qua hợp đồng.
- Một sản phẩm không import trực tiếp SDK của provider.

## 3. Trách nhiệm của sản phẩm

| Trách nhiệm | Sở hữu | Không được sở hữu |
|---|---|---|
| Domain model | Thực thể, value object, bất biến của sản phẩm | Thực thể của sản phẩm khác |
| Persistence | Bảng database và migration của mình | Bảng do sản phẩm khác sở hữu |
| API | Request/response canonical cho capability của mình | Hình thức response đặc thù provider |
| Event | Sự kiện về thay đổi trạng thái của mình mà nó phát ra | Sự kiện về sản phẩm khác |
| Webhook | Hợp đồng inbound mà nó chấp nhận | Hợp đồng inbound do sản phẩm khác sở hữu |
| Tích hợp provider | Chỉ qua hợp đồng Integration | Gọi trực tiếp SDK của provider |

## 4. Quy tắc tích hợp liên sản phẩm

- Sản phẩm A cần fact của sản phẩm B → A tiêu thụ event hoặc gọi API; không bao giờ đọc bảng của B.
- Sản phẩm A ghi một fact → A sở hữu row, phát event, phơi API; không bao giờ ghi vào bảng của B.
- Một "global business DB" chia sẻ **không** phải mặc định. Nếu hai sản phẩm cần cùng một record, một bên sở hữu và bên kia subscribe.

## 5. Tư thế frontend

- Frontend là client mỏng.
- API sản phẩm là authoritative. Không bất biến nghiệp vụ nào được áp dụng phía client.
- Frontend không thể là source of truth; không thể persist trạng thái chéo sản phẩm trên thiết bị người dùng.

## 6. Hoạt động độc lập / suy giảm

- Mỗi sản phẩm định nghĩa "degraded" nghĩa là gì (ví dụ CMS không có gợi ý ecommerce, Music không có phân phối bên ngoài).
- Một sự cố sản phẩm không tự động lan sang; sản phẩm ngang hàng phải subscribe event một cách tường minh.
- Mỗi sản phẩm chỉ ra dịch vụ nền tảng tối thiểu mà nó cần và nó hoạt động thế nào khi không có chúng.

## 7. Quyết định đang mở

- `OPEN`: sản phẩm nào đi trước.
- `OPEN`: tên và quyền sở hữu của catalog event chéo sản phẩm.
- `OPEN`: chính sách dữ liệu tham chiếu chia sẻ (khi hai sản phẩm cùng cần đọc cùng một fact).
- `OPEN`: quy tắc UI/component chia sẻ, nếu có.