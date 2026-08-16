# BOS Agent Workflow

## Quy trình chuẩn

```text
RECEIVE TASK
  -> INSPECT CONTEXT
  -> CONFIRM BRANCH
  -> CHECK DEPENDENCIES
  -> CONFIRM OWNERSHIP/SCOPE
  -> IMPLEMENT
  -> TEST
  -> TYPECHECK
  -> BUILD nếu liên quan
  -> SELF REVIEW
  -> COMMIT
  -> REPORT
  -> WAIT FOR INTEGRATION
```

## 1. Receive task

- Đọc task trong `.engineering/TASKS.md` và requirement liên quan.
- Xác định ID, owner, status, branch, allowed paths, forbidden paths và acceptance criteria.
- Không tự tìm hoặc tự nhận task khác.

## 2. Inspect context

Đọc vừa đủ:

- `AGENTS.md`;
- `.engineering/RULES.md`;
- architecture/domain/dependency docs liên quan;
- code, test, migration và config thuộc scope;
- Git status và recent commits.

Nếu repository state khác task context, repository thắng; ghi discrepancy trước khi code.

## 3. Confirm branch và ownership

Branch phải theo:

```text
agent/<domain>/<task-id>
```

Nếu branch sai, working tree có thay đổi unknown hoặc path đang có agent khác sở hữu, dừng để xử lý ownership. Không reset hoặc xóa thay đổi.

## 4. Check dependencies

- Dependency phải đạt trạng thái cho phép task bắt đầu.
- Không đoán contract của dependency chưa hoàn thành.
- Nếu dependency thiếu hoặc mâu thuẫn, báo `BLOCKED`.

## 5. Confirm scope

Phân loại mọi phát hiện thành:

- Required changes;
- Optional improvements đã ghi sẵn;
- Unrelated observations.

Không thêm optional work mới trong lúc thực hiện. Scope expansion cần task/authorization mới.

## 6. Implement

- Sửa nhỏ nhất đáp ứng acceptance.
- Giữ module boundary và dependency direction.
- Migration phải explicit; destructive/security/core contract change cần authorization.
- Không sửa path ngoài ownership.

## 7. Verify

Chạy check phù hợp với task:

```text
npm run typecheck
npm test
npm run build
```

Với database/runtime/security task, chạy thêm migration, smoke, Docker hoặc scan tương ứng. Ghi command, exit code và kết quả ngắn gọn; không nói build pass là runtime pass.

## 8. Self-review và commit

Trước commit:

```text
git status
git diff
git diff --check
```

Kiểm tra scope, test, dependency, migration và generated files. Commit chỉ chứa thay đổi của task, dùng Conventional Commit.

## 9. Report và hand-off

Report bằng tiếng Việt theo mẫu:

### Đã làm

...

### File thay đổi

...

### Kiểm thử và verification

...

### Vấn đề còn tồn tại

...

### Phần ngoài scope phát hiện được

...

### Commit

...

Agent implementation không tự merge/accept. Sau hand-off, integration agent/human reviewer kiểm tra diff, conflict, dependency và main-branch health.

## Parallel work

Chỉ chạy song song khi:

- allowed paths không overlap;
- không có runtime/schema/API contract phụ thuộc nhau;
- mỗi task có owner/branch riêng;
- integration point đã được ghi rõ.

Nếu hai task cùng cần sửa `src/app/create-app.ts`, shared auth contract, platform materializer hoặc cùng migration area, phải chạy tuần tự hoặc có integration decision trước.
