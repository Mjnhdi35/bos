# Mô hình Organization BOS

> **Trạng thái:** `PROPOSED` — phân biệt organization/workspace/deployment/tenant. Hiện tại kho mã chỉ có một phần Identity và Users. Không có khái niệm Organization, Workspace, Deployment hay Tenant trong data model.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Bảng `users` tồn tại với enum `role` (`user|admin`).
- Không có bảng `organizations`, `workspaces`, `deployments` hay `tenants`.
- Không có quy ước cột `tenant_id` bắt buộc trong schema.

## 2. Thuật ngữ và phân biệt

| Thuật ngữ | Ý nghĩa | Vòng đời |
|---|---|---|
| **Organization** | Chủ sở hữu logic của dữ liệu nghiệp vụ. Nhiều user có thể hành động thay mặt. | Tồn tại lâu dài; vượt qua thay đổi sản phẩm. |
| **Workspace** | Một container làm việc trong organization, nơi một nhóm user cộng tác trong một phạm vi giới hạn. | Tồn tại trung bình; có thể tạo/archive. |
| **Deployment** | Một instance đang chạy của BOS, host một hoặc nhiều organization. | Vòng đời instance. |
| **Tenant** | Phần trạng thái mà một organization sở hữu trong một deployment cụ thể. | Bằng organization trong deployment; không phải identity toàn cục chéo deployment. |

Phân biệt quan trọng:

- Organization là khái niệm logic; không gắn với một deployment.
- Workspace thuộc phạm vi một Organization.
- Một Deployment host nhiều Organization; một Organization có thể tồn tại trong nhiều Deployment qua replication/projection — `OPEN`.
- `tenant_id` không phải cột bắt buộc; nó chỉ được dùng khi một context tường minh yêu cầu phân vùng ở thời điểm deploy.

## 3. REQUIREMENT

- Một organization sở hữu dữ liệu của mình.
- Một workspace không thể tồn tại nếu không có organization.
- Một deployment không làm rò rỉ dữ liệu giữa các organization.
- Thao tác chéo organization yêu cầu hợp đồng tường minh và kiểm toán.
- Sản phẩm không được giả định một organization toàn cục duy nhất.

## 4. PROPOSED

- Membership trong organization điều khiển authorization.
- Membership trong workspace giới hạn hành động sản phẩm trong organization.
- Context deployment cung cấp ranh giới cô lập (DB row-level hoặc schema-level — `OPEN`).
- Tham chiếu organization chéo deployment chỉ bằng canonical ID.

## 5. DECISION

- Không có cột `tenant_id` bắt buộc trên mọi bảng.
- Sản phẩm tự định nghĩa mô hình membership; không có "global user directory" chia sẻ.

## 6. Lộ trình có điều kiện

- Mô hình organization/workspace chỉ được triển khai khi yêu cầu sản phẩm viện dẫn tới nó.
- Hỗ trợ multi-organization là có điều kiện; triển khai single-organization vẫn là tuỳ chọn hợp lệ.

## 7. Quyết định đang mở

- `OPEN`: role membership trong organization.
- `OPEN`: role workspace so với role organization.
- `OPEN`: projection organization chéo deployment (replication, federation, hoặc không).
- `OPEN`: retention audit cấp organization.
- `OPEN`: định dạng export/import dữ liệu cấp organization.