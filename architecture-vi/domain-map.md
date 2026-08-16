# Bản đồ miền BOS

> **Trạng thái:** `PROPOSED` — bản đồ miền cho tầng sản phẩm. Hiện chưa có sản phẩm nghiệp vụ nào được triển khai; bản đồ này là hợp đồng cho những gì các sản phẩm đó sẽ sở hữu khi xuất hiện.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Triển khai hiện tại gồm Platform (một phần), Identity/Auth (một phần), Users (một phần).
- Không có module sản phẩm CMS, Ecommerce, Studio, Production-TVC, Entertainment hay Music nào tồn tại.

## 2. REQUIREMENT

- Mỗi miền là độc lập.
- Dữ liệu của một miền do miền đó sở hữu.
- Các miền chỉ giao tiếp qua API, event hoặc webhook.

## 3. Danh sách miền (đề xuất)

| Miền | Mục đích một dòng | Dữ liệu sở hữu (đề xuất) |
|---|---|---|
| **CMS** | Tạo, cấu trúc và publish nội dung biên tập. | Content node, revision, taxonomy, tham chiếu media, trạng thái publish. |
| **Ecommerce** | Điều phối catalog, pricing, cart, order, payment và fulfillment. | Catalog item, variant, giá, cart, order, payment, fulfillment. |
| **Studio** | Quản lý creative project cho workflow dạng sản xuất. | Project, task, asset, approval, lịch trình. |
| **Production-TVC** | Hoạch định và thực thi sản xuất TVC/quảng cáo. | Brief, treatment, shoot, edit, deliverable, approval. |
| **Entertainment** | Event, release, khán giả, phân phối ticketing/rights. | Event, venue/session, program, rights, attendance. |
| **Music** | Catalog, release, đích phân phối và hồ sơ liên quan đến royalty. | Catalog item, release, track, đích phân phối, mapping (với Integration), fact liên quan royalty. |

## 4. Tương tác chéo miền (đề xuất, minh hoạ)

- **Ecommerce ↔ CMS** — trang nội dung có thể nhúng tham chiếu catalog; trang catalog có thể kéo copy biên tập.
- **Ecommerce ↔ Music** — một release có thể trở thành sản phẩm bán được; music cung cấp rights và metadata.
- **Studio ↔ Production-TVC** — một project trở thành TVC shoot; deliverable trở thành asset.
- **Entertainment ↔ CMS** — event hiển thị trong nội dung biên tập.
- **Entertainment ↔ Ecommerce** — luồng ticketing/merchandise.

Đây là các tương tác minh hoạ; hợp đồng cụ thể là `OPEN`.

## 5. Quy tắc quyền sở hữu miền

- Một miền sở hữu thực thể và bất biến của mình.
- Một miền không truy vấn bảng của miền khác.
- Tính nhất quán chéo miền qua event và API.

## 6. Trạng thái miền

| Miền | Trạng thái triển khai |
|---|---|
| CMS | chưa bắt đầu |
| Ecommerce | chưa bắt đầu |
| Studio | chưa bắt đầu |
| Production-TVC | chưa bắt đầu |
| Entertainment | chưa bắt đầu |
| Music | chưa bắt đầu |

## 7. Quyết định đang mở

- `OPEN`: miền nào đi trước.
- `OPEN`: chính sách dữ liệu tham chiếu chéo miền.
- `OPEN`: UI library chia sẻ so với UI theo từng sản phẩm.
- `OPEN`: tên catalog event chéo miền.