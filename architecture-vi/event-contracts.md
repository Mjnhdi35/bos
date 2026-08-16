# Hợp đồng event Integration BOS

> **Trạng thái:** `PROPOSED` — envelope event và quy tắc chọn event cho triển khai tương lai. Chưa chọn event bus hay broker.

## 1. Khi nào dùng event

Chỉ dùng event khi xử lý bất đồng bộ được biện minh: lệnh gọi provider remote chậm hoặc có thể retry, work phải tiếp tục sau request, nhiều consumer cần cùng một fact, xử lý webhook phải được tách rời, hoặc một destination có thể hoàn tất độc lập.

Không phát event chỉ để thay một lệnh gọi hàm local, để tạo mô hình event-sourcing nội bộ, hoặc để giấu một transaction đồng bộ. Kho mã hiện tại không có hạ tầng event; transport, outbox và consumer runtime là `OPEN`.

Command biểu thị ý định (`StartSync`, `DisconnectConnection`, `DistributeRelease`). Event biểu thị một fact đã xảy ra (`SyncCompleted`, `ConnectionDisabled`). Một command không phải event success.

## 2. Envelope event bắt buộc

Mỗi event integration phải chứa tất cả các trường sau:

```json
{
  "name": "integration.sync.completed",
  "version": "1",
  "producer": "bos.integration",
  "schema": "https://bos.invalid/contracts/events/integration.sync.completed/1",
  "eventId": "evt_01...",
  "occurredAt": "2026-08-15T00:00:00.000Z",
  "timestamp": "2026-08-15T00:00:00.000Z",
  "correlationId": "corr_01...",
  "causationId": "cmd_01...",
  "idempotencyKey": "idem_01...",
  "organizationId": "org_01...",
  "subject": {
    "type": "sync",
    "id": "sync_01..."
  },
  "payload": {}
}
```

Ngữ nghĩa bắt buộc:

- `name`: tên event ổn định, chữ thường, phân tách bằng dấu chấm; không phải tên class.
- `version`: integer/string major schema version; thay đổi payload không tương thích yêu cầu version mới.
- `producer`: identity producer có giới hạn, không phải tên host hay secret provider.
- `schema`: schema identifier bất biến được resolve bởi deployment/configuration; công nghệ registry chính xác là `OPEN`.
- `eventId`: identity event toàn cục duy nhất để deduplication.
- `occurredAt`: khi fact nghiệp vụ xảy ra; `timestamp`: khi envelope được phát ra/persist. Cả hai bắt buộc để phân biệt fact bị trì hoãn/replay.
- `correlationId`: nối request, Sync, webhook và work downstream.
- `causationId`: command/event/webhook receipt cause trực tiếp khi biết.
- `idempotencyKey`: identity operation/replay; không bao giờ chứa token.
- `organizationId`: bắt buộc cho fact thuộc organization; event catalog toàn hệ thống phải dùng chính sách subject non-tenant tường minh thay vì tenant ID giả.
- `subject`: type và ID ổn định cho authorization/filter.
- `payload`: có version, canonical, tối thiểu và không có secret.

`timestamp` và mọi trường date-time dùng chuỗi UTC RFC 3339. Kích thước event, retention, thứ tự transport và delivery guarantee là `OPEN` nhưng phải được chỉ ra theo deployment.

## 3. Quy tắc payload

1. Event chứa fact, không phải live database join hay object SDK provider.
2. Bao gồm BOS ID ổn định, provider key, ID Connection/ExternalAccount/ExternalResource khi có liên quan, trạng thái canonical, danh mục error chuẩn hoá và tham chiếu chẩn đoán an toàn.
3. Không bao gồm access/refresh token, client secret, private key, cookie, chữ ký webhook, raw authorization header hay payload provider chưa được redact.
4. Không bao gồm dữ liệu display-name mutable trừ khi cần và được version tường minh.
5. Consumer phải chịu được duplicate delivery, delay, reorder và trường additive không xác định.
6. Consumer phải authorize bằng organization và context subject; việc sở hữu một event không phải authorization để đọc dữ liệu organization khác.
7. Event không phải sự thay thế cho việc truy vấn trạng thái resource hiện tại. Consumer có thể đọc lại qua API sở hữu sau khi xác thực scope event.
8. Event chỉ được phát sau khi chuyển trạng thái bắt buộc đã bền vững, dùng outbox hoặc tương đương một khi cơ chế đó được chọn.

## 4. Catalog event đề xuất

Tên là đề xuất và chỉ trở thành hợp đồng triển khai sau khi use case đầu tiên được chấp nhận.

### Vòng đời Connection

`integration.connection.created`

Tối thiểu payload: `connectionId`, `providerKey`, `capabilities`, `status`, tham chiếu actor/service.

`integration.connection.authorized`

Tối thiểu payload: `connectionId`, `providerKey`, `externalAccountId`, tóm tắt capability/scope được cấp (không bao giờ là raw scope nếu nhạy cảm), `status`.

`integration.connection.status_changed`

Tối thiểu payload: `connectionId`, trạng thái trước/sau, reason code an toàn, thời điểm hiệu lực.

`integration.connection.disconnected`

Tối thiểu payload: `connectionId`, provider key, kết quả revocation, tham chiếu chính sách dữ liệu được giữ.

### External account/resource

`integration.external_account.discovered`

Tối thiểu payload: `connectionId`, `externalAccountId`, loại account provider, provider ID opaque, projection display chuẩn hoá.

`integration.external_resource.discovered`

Tối thiểu payload: `connectionId`, `externalAccountId`, `externalResourceId`, resource type, provider ID opaque, tham chiếu snapshot/version.

`integration.external_resource.status_changed`

Tối thiểu payload: `externalResourceId`, trạng thái trước/sau, lý do chuẩn hoá và Sync nguồn.

### Sync

`integration.sync.requested`

Tối thiểu payload: `syncId`, `connectionId`, direction, scope, idempotency key, ID đích/destination được yêu cầu.

`integration.sync.completed`

Tối thiểu payload: `syncId`, `connectionId`, direction, scope, tóm tắt kết quả, ID/số lượng resource bị ảnh hưởng, tham chiếu checkpoint.

`integration.sync.failed`

Tối thiểu payload: `syncId`, `connectionId`, category/code error chuẩn hoá, retryable flag, attempt, hint next-action, ID destination/resource bị ảnh hưởng.

`integration.sync.cancelled`

Tối thiểu payload: `syncId`, actor/lý do cancel, tóm tắt side effect đã hoàn tất nếu biết.

### Mapping và webhook

`integration.mapping.created`

Tối thiểu payload: `mappingId`, subject sản phẩm, `externalResourceId`, mapping version và trạng thái.

`integration.mapping.removed`

Tối thiểu payload: `mappingId`, subject sản phẩm, subject resource bên ngoài, lý do và thời điểm hiệu lực.

`integration.webhook.received`

Tối thiểu payload: `webhookReceiptId`, `connectionId`, provider delivery ID/reference, kết quả verification, loại event chuẩn hoá và thời điểm nhận. Không bao giờ bao gồm signature hay raw body theo mặc định.

`integration.webhook.rejected`

Tối thiểu payload: receipt ID, Connection/reference, lý do từ chối chuẩn hoá (`INVALID_SIGNATURE`, `REPLAY`, `UNKNOWN_CONNECTION`, `MALFORMED`) và correlation ID.

## 5. Event phân phối Music và destination độc lập

Event phân phối phải xác định delivery đích, không chỉ release tổng hợp:

```json
{
  "name": "integration.distribution.destination.completed",
  "version": "1",
  "producer": "bos.integration",
  "schema": "https://bos.invalid/contracts/events/integration.distribution.destination.completed/1",
  "eventId": "evt_01...",
  "occurredAt": "2026-08-15T00:00:00.000Z",
  "timestamp": "2026-08-15T00:00:00.000Z",
  "correlationId": "corr_01...",
  "causationId": "sync_01...",
  "idempotencyKey": "idem_01...",
  "organizationId": "org_01...",
  "subject": { "type": "distribution-destination", "id": "delivery_01..." },
  "payload": {
    "productType": "release",
    "productId": "release_01...",
    "connectionId": "conn_a",
    "externalAccountId": "acct_a",
    "destinationStatus": "SUCCEEDED"
  }
}
```

Một destination thất bại phát event thất bại riêng và không phát event success tổng hợp sai. Trạng thái tổng hợp được derive/cập nhật riêng và phải giữ kết quả theo từng destination. Consumer không được coi một thất bại destination là authorization để retry toàn bộ destination.

## 6. Delivery và hợp đồng consumer

Cho tới khi một transport được chọn, ngữ nghĩa delivery sau là bắt buộc:

- at-least-once delivery là giả định mặc định an toàn;
- mọi consumer triển khai dedupe bằng `eventId` cộng identity consumer, với idempotency nghiệp vụ khi cần;
- consumer chịu được event trùng, trì hoãn và ngoài thứ tự;
- side effect consumer ghi identity event đã xử lý một cách atomic với chuyển trạng thái liên quan khi có thể;
- event poison/lỗi hình dạng bị cách ly hoặc đánh dấu failed mà không retry vô hạn;
- retry policy phân biệt transient consumer failure với invalid contract/security failure;
- kiểm soát truy cập áp dụng trước khi xử lý và trước mọi API read tiếp theo;
- không consumer nào gọi provider trực tiếp trừ khi nó tự nó là ranh giới Integration đã được duyệt.

Phát hành event phải quan sát được bằng producer, event name/version, event ID, correlation ID, metric an toàn theo organization, kết quả publish và error code an toàn redact. Log full payload bị cấm trừ khi chính sách data-classification đã duyệt cho phép tường minh một tập con đã redact.

## 7. Tiến hoá schema

- Version schema độc lập với API và hợp đồng provider.
- Chỉ thêm trường tuỳ chọn khi consumer cũ có thể bỏ qua chúng một cách an toàn.
- Không thay đổi ý nghĩa, kiểu, tính bắt buộc hay ngữ nghĩa enum tại chỗ.
- Thay đổi phá vỡ tạo một version/tên event mới và kế hoạch migration/dual-publish nếu cần.
- Producer có thể phát nhiều version chỉ theo một quyết định chuyển tiếp tường minh.
- Consumer từ chối an toàn major version không được hỗ trợ và cảnh báo; chúng không đoán.
- Validation schema xảy ra ở ranh giới producer và consumer; công nghệ triển khai là `OPEN`.

## 8. Outbox, thứ tự và ranh giới transaction

Mục tiêu ưu tiên là một chuyển trạng thái transactional cộng bản ghi outbox do cùng module/database boundary sở hữu, tiếp theo là publish bất đồng bộ. Schema outbox chính xác và publisher là `OPEN` và không được phát minh như hạ tầng chia sẻ trong một task sản phẩm.

Không có transaction database chéo domain nào được ngụ ý. Một command sản phẩm tạo/cập nhật trạng thái sản phẩm qua chủ sở hữu sản phẩm; trạng thái Integration và event là chuyển tiếp riêng được nối bằng correlation/causation ID. Consumer đối chiếu khi delivery bị trì hoãn hoặc provider remote không khả dụng.

Thứ tự chỉ được đảm bảo trong một subject/partition đã tài liệu nếu transport được chọn hỗ trợ nó. Consumer không được giả định thứ tự toàn cục.

## 9. Yêu cầu security và privacy

- Scoping tenant/organization có mặt trong mọi envelope áp dụng và được thực thi bởi producer/consumer.
- Authorization event là least privilege; worker chỉ nhận capability và trường cần thiết cho thao tác của họ.
- Secret material bị cấm trong payload, header được ghi làm metadata và log.
- Event dẫn xuất từ webhook chỉ được phát sau khi kiểm tra verification và replay, với kết quả verification được biểu diễn an toàn.
- Event kiểm toán và event nghiệp vụ là phân biệt khi retention/access yêu cầu khác nhau.
- Chính sách export/retention/deletion cho event là `OPEN`, nhưng phải tính đến dữ liệu cá nhân, nghĩa vụ provider và nhu cầu replay.

## 10. Quyết định đang mở và cổng chấp nhận

- `OPEN`: transport/broker, delivery guarantee và partition key.
- `OPEN`: triển khai schema registry/validation.
- `OPEN`: quyền sở hữu outbox và retry/dead-letter strategy của publisher.
- `OPEN`: chính sách retention, deletion và minimization dữ liệu cá nhân.
- `OPEN`: catalog event đầu tiên và danh sách consumer.
- `OPEN`: liệu webhook có được chuẩn hoá thành event đồng bộ hay qua một durable receipt worker.

Trước triển khai, mỗi event phải có schema được duyệt, chủ sở hữu producer/consumer, trigger/chuyển trạng thái, dedupe key, giả định thứ tự, quy tắc authorization, retry/dead-letter policy và ma trận contract test.