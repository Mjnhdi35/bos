# BOS Engineering Rules

## Context

- Luôn inspect repository, Git state và file liên quan trước khi thay đổi.
- Repository là source of truth; không dùng context cũ để ghi đè trạng thái hiện tại.
- Phân biệt `FACT`, `REQUIREMENT`, `INFERENCE` và `DECISION` trong task/report.
- Không biến proposal thành implementation.

## Scope

Mỗi task phải có ba nhóm:

- **Required changes**: bắt buộc.
- **Optional improvements**: chỉ làm nếu đã được ghi trong contract task.
- **Unrelated observations**: chỉ ghi nhận, không tự sửa.

Agent chỉ được sửa allowed paths của task. Nếu vấn đề ngoài scope không blocking, ghi nhận và tạo/propose task riêng. Nếu blocking, dừng và báo `BLOCKED`.

## Architecture

- Giữ Node.js 24, TypeScript strict, Express 5, CommonJS và PostgreSQL.
- Ưu tiên modular monolith, boundary rõ ràng, abstraction vừa đủ.
- Không tự đưa vào microservices, CQRS, event sourcing, plugin framework, generic framework nội bộ hoặc repository abstraction nhiều tầng.
- Không đổi public API, security model, schema contract hoặc architecture lớn nếu chưa có requirement/decision.
- Không tạo domain chỉ vì một hệ thống ERP thường có domain đó.

## Code

- Bắt chước convention hiện tại trước khi giới thiệu pattern mới.
- Không refactor unrelated code.
- Không thêm dependency nếu Node.js hoặc dependency hiện tại đã đáp ứng được.
- Không làm yếu type, validation hoặc test để làm CI xanh.
- Không log secret, token, password hoặc credential.

## Database

- Schema change phải dùng migration mới, ordered và reviewable.
- Không sửa migration đã được coi là applied.
- Destructive change cần authorization rõ ràng.
- Không drop table/column, xóa dữ liệu, reset database dùng chung hoặc đổi breaking schema/API contract khi chưa được cấp quyền.
- Metadata và physical schema phải được mô tả riêng; không coi projection là business truth nếu chưa có decision.

## Testing và verification

- Feature mới phải có test kiểm tra behavior; bug fix phải có regression test.
- Chạy các check liên quan: `npm run typecheck`, `npm test`, `npm run build`; chạy migration/runtime check khi task yêu cầu.
- Test pass, typecheck pass và build pass là ba evidence khác nhau; không suy ra runtime hoặc requirement đã đúng từ một check duy nhất.
- Không bỏ test, disable lint hoặc che failure.

## Git

- Mỗi task làm trên branch riêng: `agent/<domain>/<task-id>`.
- Không làm việc trực tiếp trên `main`.
- Trước commit phải chạy `git status`, `git diff`, `git diff --check`.
- Commit nhỏ, logic và dùng Conventional Commit; không dùng message chung chung như `update`, `fix`, `changes`, `final`, `work`.
- Không commit generated artifacts, secret, credential, `node_modules/`, `dist/`, `coverage/` hoặc file tạm.
- Không tự push, merge, reset, revert hoặc rewrite history nếu chưa được cấp quyền.
- Không reset/xóa thay đổi unknown hoặc thay đổi của agent khác.

## Ownership và giao tiếp

- Một path quan trọng chỉ có một owner tại một thời điểm.
- Agent không sửa trực tiếp path thuộc ownership của task khác; tạo dependency request/task mới.
- Integration agent chịu trách nhiệm lấy branch, kiểm tra diff, conflict và merge readiness.
- Toàn bộ giải thích/report cho người dùng bằng tiếng Việt; technical terms có thể giữ nguyên tiếng Anh.
- Report phải nêu rõ đã làm, file thay đổi, test/verification, vấn đề còn tồn tại, phần ngoài scope và commit.
