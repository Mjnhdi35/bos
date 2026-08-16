# Mô hình Security Integration BOS

> **Trạng thái:** `PROPOSED` — kiến trúc security cho integration tương lai. Nó định nghĩa bất biến mà không chọn nhà cung cấp, secret manager, OAuth provider hay triển khai cryptographic không được yêu cầu bởi bằng chứng hiện tại.

## 1. Mục tiêu security

Ranh giới integration phải bảo tồn:

- identity đã xác thực và cô lập organization tường minh;
- authorization least-privilege cho user, service, Connection và provider capability;
- tính bảo mật và kiểm soát vòng đời cho OAuth token, API key, signing secret và private key;
- tính xác thực, freshness và khả năng chống replay cho webhook;
- khả năng kiểm toán mà không rò rỉ secret;
- cô lập thất bại và khôi phục an toàn;
- tính di động khi disconnect/migration provider;
- minimization dữ liệu, retention và nghĩa vụ deletion.

Kho mã hiện tại có bằng chứng Identity/Auth một phần nhưng không có Integration đã triển khai, Organization hay hợp đồng authorization riêng cho integration. Tài liệu này là chính sách mục tiêu, không phải khẳng định rằng các kiểm soát này hiện có.

## 2. Ranh giới tin cậy

```text
User/client
  -> BOS API/auth boundary
       -> Product module
       -> Integration application boundary
            -> Credential/token boundary
            -> Provider Adapter/Connector
                 -> External provider
            -> Webhook ingress boundary
       -> Integration-owned persistence/audit
```

Giả định tin cậy:

- Provider bên ngoài là hệ thống không tin cậy mà response, callback, identifier và availability của nó phải được xác thực.
- SDK của provider là code bên thứ ba và bị giới hạn trong một ranh giới phụ thuộc Adapter/Connector đã review.
- Product domain không thể tin payload provider là fact nghiệp vụ canonical nếu không có validation và mapping.
- Worker chỉ được ưu tiên cho capability được giao, phạm vi organization và phạm vi resource của mình.
- Truy cập database là một ranh giới security; không domain nào trực tiếp đọc bảng của domain khác.

## 3. Identity và cô lập organization

Mọi request, command, Sync, Webhook, event và record Integration đã persist phải có một principal có thể quy trách nhiệm hoặc system actor tường minh. Phạm vi organization là bắt buộc cho trạng thái thuộc tenant.

Kiểm soát bắt buộc:

1. Phân giải identity đã xác thực bằng hợp đồng Identity; không bao giờ suy ra identity từ provider account ID hay organization ID do client cung cấp một mình.
2. Phân giải membership organization hiệu lực và role/quyền trước khi đọc hoặc thay đổi một Connection, ExternalAccount, ExternalResource, Mapping, metadata Credential hoặc Sync.
3. Áp phạm vi organization trong method service và query persistence, không chỉ ở middleware route.
4. Dùng hành vi deny-by-default cho context organization thiếu, mơ hồ hoặc cũ.
5. Ngăn tham chiếu chéo organization trong một request, mapping, Sync hoặc event đơn lẻ.
6. Đảm bảo background work mang context organization/Connection bất biến và kiểm tra lại trạng thái liên quan authorization trước side effect.
7. Không bao giờ dùng một provider credential toàn cục cho nhiều organization trừ khi một quyết định cô lập tường minh, mô hình dữ liệu và review rủi ro duyệt nó.

`organizationId` được cung cấp trong payload là một claim cần xác thực, không phải một grant authorization. Hành chính chéo organization, support access và break-glass access là chính sách `OPEN` yêu cầu quy tắc kiểm toán và duyệt riêng.

## 4. Mô hình authorization

Authorization có bốn chiều:

- **Actor:** human user, service worker hoặc support actor đã duyệt.
- **Organization:** membership tenant hiệu lực và vòng đời.
- **Resource:** Connection, ExternalAccount, ExternalResource, Mapping, Sync hoặc quyền sở hữu product object.
- **Capability:** thao tác cụ thể như read, authorize, publish, distribute, webhook-manage hoặc disconnect.

Chính sách đề xuất:

| Hành động | Chính sách mặc định |
|---|---|
| Xem catalog provider | đã xác thực, đọc catalog không nhạy cảm |
| Tạo/authorize Connection | owner/admin của organization hoặc role integration được uỷ quyền tường minh |
| Đọc trạng thái Connection/account/resource | quyền đọc theo phạm vi organization |
| Tạo/xoá Mapping | quyền product object cộng quyền resource integration |
| Bắt đầu/ghi Sync | capability product/integration tường minh; worker chỉ thực thi work có phạm vi |
| Disable/disconnect Connection | owner/admin hoặc integration manager được uỷ quyền; luôn được kiểm toán |
| Truy cập credential thô | bị cấm với user thường, admin và module sản phẩm; chỉ token broker |
| Kiểm tra raw body/signature của webhook | bị cấm theo mặc định; chỉ đường chẩn đoán giới hạn security |

Ma trận này vẫn là `PROPOSED` cho tới khi task Identity/Organization định nghĩa role và quyền cụ thể. Triển khai phải thêm test âm tính cho chưa xác thực, sai organization, role không đủ, Connection bị disable và tham chiếu chéo resource.

## 5. Credential, OAuth và secret

### Nguyên tắc credential

- Giá trị credential là secret material, không bao giờ là trường domain thường.
- API/event/log chỉ chứa Credential ID, trạng thái, metadata expiry và tóm tắt scope an toàn.
- Module sản phẩm không bao giờ nhận raw access/refresh token, client secret, API key, signing secret của webhook hay private key.
- Connector nhận một credential ngắn hạn, scope theo capability thông qua ranh giới token accessor/broker chuyên dụng.
- Secret được mã hoá khi lưu và bảo vệ khi truyền; triển khai cryptographic/key management chính xác là `OPEN`.
- Truy cập secret material được log làm metadata (ai/cái gì/khi nào/mục đích), không bao giờ kèm giá trị.
- Rotation, revocation, expiry, thay đổi scope và reauthorization của refresh token là chuyển trạng thái vòng đời tường minh.
- Trao đổi token dùng authorization state một lần và kiểm soát anti-CSRF/PKCE khi flow OAuth được chọn hỗ trợ chúng; flow chính xác là `OPEN`.

### Lưu trữ và xử lý

Không lưu secret ở dạng plaintext trong PostgreSQL, snapshot được generate, source, fixture test, file environment đã commit lên Git, payload event, chi tiết error hay snapshot provider. Một quyết định lưu trữ secret tương lai phải định nghĩa encryption, key rotation, backup/restore, access policy, deletion và hành vi thất bại mà không đặt tên nhà cung cấp quá sớm.

Metadata credential nên bao gồm một ID ổn định, organization/Connection, provider, type, trạng thái, thời điểm issued/expiry, tóm tắt capability được cấp, timestamp last-used/last-refresh và lý do revocation. Nó không nên bao gồm raw token material hay provider claim không cần thiết.

### OAuth và ràng buộc external account

Ràng buộc một kết quả authorization với organization khởi tạo, actor đã xác thực, provider key, ý định Connection, context redirect/client và state một lần. Xác thực identity do provider phát hành trước khi tạo ExternalAccount. Không chấp nhận external account ID do client cung cấp làm bằng chứng quyền sở hữu.

Nếu một provider hỗ trợ nhiều account, cần chọn account tường minh và xác thực lại. Reauthorization không được âm thầm thay thế ExternalAccount hoặc mapping của một Connection đang active; dùng một chuyển tiếp tường minh và record kiểm toán.

## 6. Verification webhook và phòng thủ replay

Ingress webhook là một ranh giới input thù địch. Trước khi xử lý hoặc phát event nghiệp vụ:

1. Phân giải Connection đích bằng route/reference delivery provider không phải secret.
2. Capture raw body với giới hạn kích thước chặt trước khi parse JSON khi signature provider yêu cầu raw byte.
3. Xác minh signature/MAC bằng scheme đã tài liệu của provider và chính sách signing secret hoặc public-key ràng buộc credential.
4. Xác thực timestamp/cửa sổ freshness khi được hỗ trợ; chỉ cho phép clock skew có giới hạn.
5. Yêu cầu provider delivery ID hoặc derive một khoá replay đã tài liệu từ các trường đã xác thực; dedupe bền vững theo Connection + provider delivery ID/event reference.
6. Xác thực content type, schema/version và provider identifier bắt buộc.
7. Từ chối hoặc cách ly callback không hợp lệ/replay/không xác định mà không gọi side effect sản phẩm.
8. Persist một biên nhận đã redact và kết quả verification cho kiểm toán/đối chiếu; không log raw signature, secret hay full body theo mặc định.
9. Chỉ acknowledge theo hợp đồng provider; xử lý nghiệp vụ là bất đồng bộ khi có thể.

Thuật toán, key rotation, cửa sổ timestamp, retention biên nhận và response code là provider-specific và `OPEN` cho tới khi hợp đồng provider đầu tiên được chấp nhận. Không bao giờ disable verification để cải thiện delivery webhook.

## 7. Cô lập và minimization dữ liệu

Các lớp dữ liệu Integration:

- **Secret:** token, key, signing secret và private material. Bị giới hạn ở ranh giới token/verification.
- **Dữ liệu provider nhạy cảm:** raw webhook body, snapshot provider, account claim và metadata remote. Do Integration sở hữu, được minimize và kiểm soát truy cập.
- **Dữ liệu vận hành tenant:** metadata Connection, Sync, Mapping và trạng thái. Theo phạm vi organization và có thể kiểm toán.
- **Dữ liệu sản phẩm:** release, track, order và thực thể nghiệp vụ. Chủ sở hữu sản phẩm vẫn là authoritative.
- **Dữ liệu kiểm toán:** fact vòng đời và truy cập liên quan security, tách khỏi payload log dài dòng.

Quy tắc:

- Chỉ lưu trường provider cần thiết cho capability đã chấp nhận, đối chiếu hoặc yêu cầu tính di động.
- Dùng BOS ID opaque; coi provider ID là identifier nhạy cảm và không phơi chúng rộng rãi nếu không cần.
- Không copy raw payload provider vào bảng sản phẩm.
- Không dùng snapshot provider làm archive nghiệp vụ vĩnh viễn nếu không có duyệt retention.
- Mã hoá dữ liệu nhạy cảm khi lưu/truyền và giới hạn role database/application theo quyền sở hữu.
- Định nghĩa hành vi retention/deletion/legal-hold trước khi thu thập webhook body hoặc dữ liệu cá nhân.
- Disconnect nên thu hồi/disable việc dùng credential ngay, dừng work mới, chỉ giữ trạng thái kiểm toán/tính di động đã duyệt và xử lý deletion phía provider theo chính sách sản phẩm.
- Export theo phạm vi organization, redact theo data class và không bao giờ chứa secret material đang hoạt động.

## 8. Least privilege và cô lập runtime

Service worker và connector nhận:

- một phạm vi organization/Connection mỗi job khi thực tế;
- chỉ capability cần thiết cho thao tác;
- chỉ các trường sản phẩm và trường external cần thiết cho mapping;
- không có quyền truy cập trực tiếp bảng domain không liên quan;
- không có khả năng liệt kê tất cả organization hoặc Credential;
- không có egress mạng không giới hạn ngoài Connector policy đã duyệt, tuỳ theo capability triển khai.

Role database nên tách quyền sở hữu read/write application, đặc quyền migration và chẩn đoán vận hành khi thiết kế hạ tầng được đưa vào. Provider adapter nên phụ thuộc vào một interface Connector/token hẹp thay vì cấu hình toàn cục hay credential mutable phạm vi process.

## 9. Audit và quan sát

Audit hành động và thay đổi trạng thái nhạy cảm security:

- Connection create/authorize/reauthorize/disable/disconnect;
- kết quả issue/refresh/revoke/use Credential (chỉ metadata);
- thay đổi capability/scope;
- verification webhook success/failure/replay;
- Mapping create/remove và thất bại authorization chéo resource;
- Sync start/cancel/retry/kết quả cuối;
- support/break-glass access nếu được duyệt.

Mỗi record audit bao gồm actor/service identity, organization, hành động, type/ID đích, kết quả, reason code, correlation ID, timestamp và tham chiếu policy/version. Nó loại trừ giá trị secret, bearer token, raw signed body và payload cá nhân/provider không cần thiết.

Log vận hành và record audit là các store/stream khác nhau nếu access và retention của chúng khác nhau. Correlation ID cho phép truy vết mà không cần log payload. Metric phải dùng label có giới hạn; không label bằng raw token, email, payload provider tuỳ ý hay external ID có cardinality cao nếu không có quyết định tường minh.

## 10. Cô lập thất bại và hành vi security

- Authorization failure: fail closed; không retry.
- Credential expired/revoked: chuyển Connection sang `REAUTH_REQUIRED`/`REVOKED`; không retry mù.
- Provider outage/rate limit: cô lập theo provider/Connection/destination và dùng retry/circuit policy có giới hạn.
- Invalid provider payload: cách ly và cảnh báo; không ép thành trạng thái sản phẩm thành công.
- Webhook replay: dedupe và audit; không áp dụng lại side effect.
- Secret store không khả dụng: fail closed cho write/lệnh gọi remote đã xác thực; không fallback sang plaintext hay secret không giới hạn đã cache.
- Event delivery failure: giữ trạng thái bền vững/kết quả outbox và retry theo transport policy; không khẳng định completion sản phẩm từ một event chưa xác nhận.
- Phân phối Music: mỗi destination có authorization, retry và trạng thái audit độc lập; một thất bại security/provider của destination không thể rò rỉ dữ liệu hoặc thay đổi destination khác.

## 11. Tính di động và thoát provider

Tính di động là một yêu cầu security và availability:

- record sản phẩm vẫn dùng được nếu một provider không khả dụng hoặc đã disconnect;
- mapping giữ identity BOS canonical độc lập với provider-native ID;
- admin organization có thể export metadata Connection/resource/mapping/sync không phải secret ở định dạng đã tài liệu;
- export loại trừ secret đang hoạt động/có thể khôi phục và redact dữ liệu provider theo phân loại;
- thay thế adapter dùng hợp đồng canonical và mapping version thay vì kiểu SDK provider;
- migration/revocation provider không xoá âm thầm sự thật sản phẩm;
- side effect remote deletion/disconnect là tường minh, được kiểm toán và chỉ có thể đảo ngược khi provider cho phép.

Định dạng export, retention period, ngữ nghĩa deletion phía provider và tooling migration là `OPEN`.

## 12. Cổng verification security

Trước khi triển khai production bất kỳ Connector/Integration:

1. Mô hình hoá threat boundary tin cậy, tài sản, use case lạm dụng và trạng thái thất bại.
2. Ma trận authn/authz với test âm tính sai-organization và Connection bị disable.
3. Test vòng đời Credential bao gồm issue, refresh, rotation, expiry, revoke và redaction secret.
4. Test signature, freshness, input lỗi hình dạng, Connection không xác định và replay webhook.
5. Contract test API/event chứng minh không có trường secret và trường organization/correlation/idempotency đúng.
6. Test retry/idempotency chứng minh side effect remote không bị trùng ngoài ý muốn.
7. Test destination độc lập cho phân phối music hoặc bất kỳ thao tác fan-out.
8. Khẳng định audit cho hành động nhạy cảm và kiểm tra rằng log/event bỏ qua secret material.
9. Chấp nhận retention, export, disconnect và provider outage dữ liệu.
10. Review dependency và supply-chain cho bất kỳ SDK hay thư viện security.

## 13. Quyết định đang mở

- `OPEN`: mô hình Organization/role/quyền cụ thể và chính sách support-access.
- `OPEN`: kiến trúc OAuth grant/PKCE/redirect theo provider đầu tiên.
- `OPEN`: lưu trữ secret, encryption/key management, rotation và backup/restore.
- `OPEN`: scheme xác thực webhook và cơ chế xoay vòng khoá.
- `OPEN`: transport event, outbox, cô lập worker và lưu trữ audit.
- `OPEN`: phân loại dữ liệu, retention, deletion và yêu cầu legal-hold.
- `OPEN`: kiểm soát egress mạng và mô hình identity runtime production.
- `OPEN`: capability provider đầu tiên và scope provider-specific.

Không nhà cung cấp, secret manager, OAuth provider hay thuật toán nào được chọn bởi đề xuất này nếu không có yêu cầu cụ thể và quyết định review.