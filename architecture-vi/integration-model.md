# Mô hình Integration BOS

> **Trạng thái:** `PROPOSED` — hợp đồng kiến trúc, chỉ là tài liệu. Tài liệu này không hàm ý rằng bất kỳ capability integration nào đã được triển khai.
>
> **Phạm vi:** Ranh giới Connector, Integration, Provider, Adapter, Connection, ExternalAccount, ExternalResource, Credential, Webhook, Sync và Mapping cho BOS.

## 1. Ý đồ kiến trúc

BOS vẫn là modular monolith cho tới khi có một quyết định triển khai riêng. Integration là một capability first-class với ranh giới tường minh, không phải tập hợp các lệnh gọi provider-specific rải rác trong các module sản phẩm.

Hướng phụ thuộc mục tiêu là:

```text
Product domain
  -> Integration application contract
  -> Provider-neutral capability contract
  -> Provider adapter
  -> Connector / transport boundary
  -> External provider API or webhook
```

Các quy tắc sau là không thể thương lượng đối với hợp đồng này:

1. Product code phụ thuộc vào hợp đồng provider-neutral và canonical BOS model.
2. Product code không import trực tiếp SDK của Spotify, Gmail hay provider khác.
3. Hành vi provider-specific bị cô lập sau một Adapter và ranh giới Connector của nó.
4. Integration giao tiếp với product domain qua API, event, webhook và hợp đồng tường minh; chúng không đọc hoặc ghi bảng database của domain khác.
5. Một provider bên ngoài không bao giờ là một phần của transaction product-domain. Lệnh gọi remote có giới hạn, có thể retry và quan sát được độc lập.
6. Record provider-neutral phải giữ đủ identity nguồn và mapping metadata để hỗ trợ tính di động và đối chiếu.
7. Mô hình này là hợp đồng mục tiêu. Provider, SDK, secret manager, queue và topology triển khai cụ thể vẫn là `OPEN` trừ khi được quyết định riêng.

## 2. Thuật ngữ và quyền sở hữu

| Thực thể | Ý nghĩa | Quyền sở hữu và bất biến |
|---|---|---|
| **Provider** | Một entry catalog mô tả một hệ thống bên ngoài và các capability BOS hỗ trợ từ nó. | Integration sở hữu provider key canonical, khai báo capability và phiên bản hợp đồng. Nó không phải credential tenant. |
| **Connector** | Một ranh giới transport/runtime có giới hạn dùng để gọi một provider hoặc nhận callback của nó. Nó xử lý transport HTTP/auth, timeout, rate limit, chuẩn hoá response và chi tiết protocol provider. | Integration/infrastructure sở hữu execution policy. Một connector không được chứa quy tắc nghiệp vụ sản phẩm. |
| **Adapter** | Một triển khai anti-corruption provider-specific dịch giữa hợp đồng provider và hợp đồng capability provider-neutral. | Integration sở hữu nó. Nó có thể dùng SDK provider nội bộ chỉ khi được duyệt; phụ thuộc đó không thể rò rỉ qua ranh giới adapter. |
| **Integration** | Capability application điều phối connection, sync, mapping, xử lý webhook, retry và vòng đời provider. | Integration sở hữu trạng thái orchestration và hợp đồng. Nó không trở thành source of truth cho thực thể sản phẩm. |
| **Connection** | Một quan hệ đã cấu hình theo phạm vi organization tới một Provider, bao gồm trạng thái, capability được chọn, tham chiếu account remote và tham chiếu Credential. | Integration sở hữu vòng đời và health. Connection không giống OAuth credential hay remote resource. |
| **ExternalAccount** | Một account phía provider, workspace, channel, merchant, hồ sơ artist hoặc principal tương đương được phát hiện qua một Connection. | Integration sở hữu identity chuẩn hoá và identifier provider-native. Nó luôn theo phạm vi một organization và connection. |
| **ExternalResource** | Một object phía provider được đồng bộ hoặc addressed bởi BOS, ví dụ một track, playlist, message, order hoặc destination phân phối. | Integration sở hữu identity bên ngoài, snapshot metadata và bookkeeping sync; product object tương ứng vẫn do product-domain sở hữu. |
| **Credential** | Một tham chiếu và bản ghi vòng đời cho secret material được dùng bởi một Connection. | Security/integration sở hữu metadata và access policy. Secret material không bao giờ là trường API bình thường, payload event, giá trị log hay record product-domain. |
| **Webhook** | Một endpoint inbound callback đã đăng ký/cấu hình và trạng thái delivery/replay của nó. | Integration sở hữu verification, deduplication, trạng thái xử lý và metadata đăng ký provider-specific. |
| **Sync** | Một thao tác pull, push hoặc đối chiếu có giới hạn với scope, cursor/checkpoint, attempt, outcome và trạng thái idempotency. | Integration sở hữu trạng thái thực thi. Một sync không được biến provider bên ngoài thành coordinator transaction cho một product domain. |
| **Mapping** | Quan hệ tường minh giữa một product object/field và một ExternalResource/object/field, bao gồm phép biến đổi và mapping version. | Chủ sở hữu mapping là hợp đồng sản phẩm tích hợp; Integration persist metadata thực thi và identity provider. |

Mọi record được persist nên có một BOS identifier bất biến, phạm vi organization khi áp dụng, timestamp created/updated, trạng thái vòng đời và version optimistic. Provider-native ID không phù hợp làm primary identifier BOS.

## 3. Mô hình quan hệ

```text
Provider 1 --- n Connection
Connection 1 --- n ExternalAccount
Connection 1 --- n Credential (current + historical metadata)
Connection 1 --- n Webhook
Connection 1 --- n Sync
Connection 1 --- n ExternalResource
Product object 1 --- n Mapping --- 1 ExternalResource
Provider 1 --- n Adapter contract versions
Adapter 1 --- 1 Connector runtime boundary (or an explicitly documented connector set)
```

Quy tắc quan hệ bắt buộc:

- Mọi Connection thuộc về đúng một organization và Provider.
- Mọi ExternalAccount, ExternalResource, Webhook, Sync và Mapping có thể truy cập qua một Connection theo phạm vi organization hoặc kiểm tra quyền sở hữu sản phẩm.
- Một Mapping phải xác định cả hai phía bằng ID ổn định và mapping version; nó không được dựa trên display name.
- Một Connection có thể có nhiều ExternalAccount và destination. Một thất bại account remote không được thay đổi trạng thái của destination khác.
- Xoá hoặc disable một Connection dừng work mới và làm cho việc dùng credential fail closed; record kiểm toán và tính di động được giữ theo chính sách retention đã duyệt.

## 4. Hợp đồng vòng đời

### 4.1 Vòng đời Connection

```text
PENDING_AUTH -> ACTIVE -> DEGRADED -> REAUTH_REQUIRED
                  |          |              |
                  +--------> DISABLED <-----+
                  |
                  +--------> REVOKED
```

- `PENDING_AUTH`: cấu hình tồn tại nhưng chưa có credential khả dụng.
- `ACTIVE`: health check và authorization cho phép các capability đã khai báo.
- `DEGRADED`: sự cố provider, rate-limit hoặc capability không đầy đủ thoáng qua; work có thể tiếp tục theo capability policy.
- `REAUTH_REQUIRED`: authorization vắng, hết hạn hoặc không đủ; không retry mù.
- `DISABLED`: bị dừng tường minh bởi một actor hoặc chính sách được authorize.
- `REVOKED`: provider hoặc organization đã thu hồi quyền truy cập vĩnh viễn.

Một health check không được coi là bằng chứng rằng mọi capability đều khả dụng. Authorization cấp capability và trạng thái provider được đánh giá riêng.

### 4.2 Vòng đời Sync

```text
REQUESTED -> RUNNING -> SUCCEEDED
                    \-> PARTIAL
                    \-> FAILED_RETRYABLE -> RUNNING (bounded retry)
                    \-> FAILED_TERMINAL
                    \-> CANCELLED
```

Mỗi Sync ghi scope, direction (`pull`, `push`, `reconcile`), Connection, target/destination khi có liên quan, attempt count, tham chiếu checkpoint/cursor, phân loại error, correlation ID và idempotency key. Checkpoint là giá trị provider-neutral opaque; secret hay raw token material bị loại trừ.

### 4.3 Trạng thái ExternalResource và Mapping

Record ExternalResource nên phân biệt `DISCOVERED`, `LINKED`, `SYNCING`, `SYNCED`, `STALE`, `CONFLICT`, `UNAVAILABLE` và `ARCHIVED`. Trạng thái Mapping độc lập với trạng thái fetch gần nhất của resource. Một sự cố provider không được xoá một mapping hoặc record sản phẩm đã từng hợp lệ.

## 5. Ranh giới tích hợp sản phẩm

Product domain dùng một application port nhỏ, ví dụ:

- yêu cầu một capability provider bằng canonical product payload;
- truy vấn trạng thái connection/resource/mapping qua hợp đồng API;
- yêu cầu một Sync bất đồng bộ khi thao tác có thể chậm, retry được hoặc phụ thuộc provider;
- tiêu thụ event đã tài liệu cho completion/failure/state change;
- nhận fact inbound đã verify qua event Integration hoặc hợp đồng callback chuẩn hoá.

Product domain không được:

- xây dựng URL provider, tham số OAuth hay client SDK;
- persist provider token;
- kiểm tra hình thức response provider;
- dùng bảng Integration làm database chia sẻ;
- suy ra success từ việc một request được chấp nhận (`202`); chúng dùng hợp đồng Sync/event.

Một thao tác đồng bộ chỉ được phép khi lệnh gọi provider ngắn, có giới hạn, idempotent hoặc an toàn read-only, và API có thể trả về kết quả đầy đủ trong latency budget của nó. Export, publish, phân phối, đối chiếu bulk chạy lâu và write có thể retry là bất đồng bộ.

## 6. Trạng thái destination độc lập — ví dụ phân phối Music

Phân phối Music được mô hình hoá là một release sản phẩm với nhiều projection destination độc lập:

```text
Release (product-owned)
  -> Distribution request (integration/product contract)
       -> Destination delivery: provider/account A
       -> Destination delivery: provider/account B
       -> Destination delivery: provider/account C
```

Mỗi destination delivery có Connection riêng, tham chiếu ExternalAccount/resource, Mapping, trạng thái Sync, retry budget, last error, remote status và audit trail. View phân phối tổng hợp được derive từ trạng thái destination và có thể là `PENDING`, `PARTIAL`, `SUCCEEDED`, `FAILED` hoặc `CANCELLED`; nó không xoá sự thật theo từng destination.

Quy tắc:

- Một failure, timeout, rate limit hoặc authorization error tại một destination không rollback hoặc chặn các destination đã thành công.
- Retry một destination không replay các destination thành công trừ khi được yêu cầu tường minh và idempotency cho phép.
- Metadata release sản phẩm vẫn do sản phẩm sở hữu; Integration sở hữu trạng thái delivery và dịch provider.
- Một sự cố provider phải suy giảm chỉ destination đó và phơi ra một trạng thái actionable qua API/event.
- "All or nothing" chéo destination không được hứa trừ khi một yêu cầu nghiệp vụ tương lai đưa vào workflow bù; hệ thống bên ngoài không thể tham gia một transaction chia sẻ.

## 7. Persistence và ranh giới dữ liệu

`PROPOSED` quyền sở hữu logic (schema vật lý nằm ngoài phạm vi tài liệu này):

- Trạng thái do Integration sở hữu: Provider, Connection, ExternalAccount, ExternalResource, metadata Credential, Webhook, Sync, metadata thực thi Mapping và tham chiếu delivery/audit.
- Trạng thái do sản phẩm sở hữu: release, track, catalog, order hoặc thực thể nghiệp vụ khác và bất biến nghiệp vụ của nó.
- Identifier chia sẻ: chỉ các ID bất biến và payload API/event đã tài liệu.

Không domain nào được join bảng của domain khác, phát SQL ad-hoc chống bảng do Integration sở hữu, hoặc coi snapshot provider là trạng thái canonical sản phẩm nếu không có quyết định sản phẩm. Nếu một transaction cần cả hai domain, dùng một command API, hợp đồng event/outbox hoặc job đối chiếu tường minh.

## 8. Cô lập thất bại và vận hành

Ranh giới Integration phải phân loại failure là:

- `AUTHORIZATION`: re-auth/revoke; không retry mù;
- `VALIDATION`: provider từ chối payload; terminal cho tới khi input/mapping thay đổi;
- `NOT_FOUND`: object/account remote biến mất; đối chiếu hoặc đánh dấu stale;
- `RATE_LIMITED`: tôn trọng hướng dẫn retry của provider và backoff có giới hạn;
- `TIMEOUT` / `NETWORK`: retry chỉ work idempotent trong một budget;
- `PROVIDER_5XX` / `UNAVAILABLE`: cô lập provider/connection và retry với backoff;
- `INTERNAL`: cảnh báo và giữ correlation chẩn đoán không có secret.

Mọi lệnh gọi remote có timeout, retry policy có giới hạn, correlation ID và chiến lược idempotency phù hợp với thao tác. Retry là theo Connection/Sync/destination, không phải toàn cục process. Circuit breaking, công nghệ queue và dead-letter storage là quyết định `OPEN`.

## 9. Quyết định đang mở

- `OPEN`: provider đầu tiên và use case sản phẩm đầu tiên; chưa chọn SDK hay nhà cung cấp provider.
- `OPEN`: liệu adapter nằm trong một package modular-monolith hay có thể triển khai riêng sau; hợp đồng hiện tại giả định ranh giới module trong process.
- `OPEN`: transport event, thực thi job bền vững và triển khai outbox.
- `OPEN`: quy tắc retention/deletion chính xác cho snapshot provider, payload webhook và record kiểm toán.
- `OPEN`: từ vựng capability và schema canonical cho domain đầu tiên.
- `OPEN`: liệu Connection có thể được chia sẻ trong organization, sở hữu bởi user, hay cả hai; điều này ảnh hưởng authorization và UX OAuth.
- `OPEN`: chính sách giải quyết xung đột cho Mapping và Sync hai chiều.

## 10. Tiêu chí chấp nhận cho triển khai

Trước khi triển khai một provider integration, task sở hữu phải xác định:

1. Hợp đồng capability provider và version.
2. Quyền sở hữu Adapter/Connector và ranh giới phụ thuộc.
3. Vòng đời Connection, Credential, ExternalAccount và ExternalResource.
4. Schema API và event, idempotency và hành vi correlation.
5. Verification webhook và xử lý replay, nếu có inbound callback.
6. Ma trận organization/authz và provider scope least-privilege.
7. Phân loại failure, retry/cô lập và hành vi trạng thái destination.
8. Contract test với fake adapter và integration test provider-specific khi được biện minh.
9. Hành vi tính di động/export và disconnect.

Cho tới khi những quyết định đó được chấp nhận, tài liệu này vẫn là đề xuất thay vì tín hiệu để thêm code hay phụ thuộc.