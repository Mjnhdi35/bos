# BOS Engineering Control Plane

## Mục đích

Thư mục này là control plane cho việc phát triển BOS theo nhiều task/agent. Nó không thay thế source code, test, migration hoặc requirement nghiệp vụ. Nó ghi lại những gì repository đã chứng minh, những quyết định đã được xác nhận và phạm vi của từng task.

## Thứ tự nguồn sự thật

Khi các nguồn mâu thuẫn, ưu tiên theo thứ tự:

1. Requirement/decision mới nhất đã được xác nhận bởi người phụ trách.
2. Code và test hiện tại.
3. Migration và cấu hình runtime hiện tại.
4. Tài liệu engineering trong thư mục này.
5. Tài liệu proposal/legacy trong `docs/`.

Tài liệu không được biến trạng thái `planned` thành trạng thái `implemented`.

## Bản đồ tài liệu

| File | Trách nhiệm |
|---|---|
| `RULES.md` | Luật bất biến cho agent và nguyên tắc scope/ownership/Git. |
| `ARCHITECTURE.md` | Kiến trúc thực tế hiện tại và target có điều kiện. |
| `DOMAINS.md` | Domain map dựa trên evidence từ repository. |
| `DEPENDENCIES.md` | Compile-time, runtime và database dependency graph. |
| `ROADMAP.md` | Các wave triển khai theo gap và dependency. |
| `TASKS.md` | Task registry và contract cho task được phép triển khai. |
| `AGENT_WORKFLOW.md` | Quy trình nhận task, thực hiện, verify và hand-off. |

## Tài liệu legacy cần phân biệt

- `AGENTS.md` là instruction cấp repository và vẫn có hiệu lực.
- `docs/task-system-design.md` là proposal cho một task-management system dùng ID `TASK-NNNN`; nó không phải domain map hay task registry của BOS.
- `docs/tasks/TASK-0001-product-scope.md` mô tả một CI/CD platform khác và có ID collision với proposal cũ; không dùng nó làm nguồn sự thật cho domain BOS.

Không xóa hoặc sửa các tài liệu legacy trong task engineering control plane này. Nếu cần thay thế, phải tạo task riêng có scope rõ ràng.

## Cách dùng

1. Đọc `RULES.md` và các tài liệu liên quan đến task.
2. Chọn task có `status: planned`, dependency đã hoàn thành và ownership không xung đột.
3. Làm việc trên branch riêng theo format trong `RULES.md`.
4. Chỉ sửa các path được task cho phép.
5. Chạy verification, self-review và báo cáo bằng tiếng Việt.
6. Integration agent/human reviewer quyết định merge; agent thực hiện không tự merge.

## Nguyên tắc cập nhật

- Mỗi thay đổi kiến trúc hoặc dependency phải cập nhật tài liệu liên quan trong cùng scope.
- Không tạo tài liệu mới chỉ để mô tả một ý tưởng chưa có requirement.
- Khi phát hiện discrepancy, ghi rõ `FACT`, `REQUIREMENT`, `INFERENCE` hoặc `DECISION`.
