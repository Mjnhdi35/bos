# Mô hình Identity BOS

> **Trạng thái:** `PROPOSED` — hợp đồng identity/authn/authz cho BOS. Hiện tại chỉ có xác thực Bearer `/auth/me`, các luồng register/login/refresh/logout, refresh token hash, refresh cookie HttpOnly và `users.role` (`user|admin`) được triển khai. Mô hình authorization đầy đủ là `OPEN`.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Module Identity dưới `src/modules/auth/**`.
- Endpoint: register, login, refresh, logout, `/auth/me`.
- Access token trả về trong body response.
- Refresh token được hash trong database, gửi qua cookie `HttpOnly` có scope là `/auth`.
- Ràng buộc enum `users.role` là `user|admin`.
- Migration `refresh_tokens` tồn tại với FK tới users và trạng thái revoke.

## 2. REQUIREMENT — bất biến

- Mỗi request phân giải thành một identity đã xác thực hoặc một principal ẩn danh tường minh.
- Authorization mặc định là từ chối.
- Frontend không phải source of truth cho authorization.
- Quyết định authorization chéo sản phẩm là tường minh và theo phạm vi organization khi có liên quan.

## 3. Authentication

- **FACT:** mô hình access token + refresh token cookie.
- **PROPOSED:** access token có thời hạn ngắn; rotation refresh; phát hiện tái sử dụng khi refresh.
- **OPEN:** định dạng token và thuật toán ký (không chọn ở đây).

## 4. Authorization

Chiều authorization:

- **Actor** — user, service worker, hoặc hệ thống.
- **Organization** — xem `organization-model.md`.
- **Resource** — thực thể đang được truy cập.
- **Capability** — thao tác đang được thử (read, write, publish, v.v.).

Bảng chính sách (đề xuất):

| Hành động | Chính sách mặc định |
|---|---|
| Đọc catalog provider | user đã xác thực |
| Đọc dữ liệu sản phẩm trong organization | đọc có phạm vi |
| Ghi dữ liệu sản phẩm trong organization | ghi có phạm vi |
| Ghi chéo sản phẩm | hợp đồng chéo sản phẩm tường minh |
| Đọc credential material | không bao giờ, với bất kỳ actor nào |
| Hành động hành chính | yêu cầu role/capability |

## 5. Token và secret

- **FACT:** access token được phát hành; refresh token được hash trong DB.
- **PROPOSED:** không có secret material thô trong log, event, chi tiết lỗi, hoặc bảng sản phẩm.

## 6. Service worker

- **PROPOSED:** service worker mang context organization và capability bất biến.
- **PROPOSED:** worker không giả định identity của con người.
- **OPEN:** vòng đời service account.

## 7. Lộ trình có điều kiện

Capability Identity chỉ được triển khai khi yêu cầu sản phẩm hoặc vận hành viện dẫn tới chúng.

## 8. Quyết định đang mở

- `OPEN`: định dạng token, thuật toán ký, chiến lược xoay khoá.
- `OPEN`: từ vựng capability/role.
- `OPEN`: tích hợp identity provider bên ngoài (OIDC/SAML) — chưa chọn.
- `OPEN`: chính sách break-glass / support access.
- `OPEN`: tư thế MFA.