# Hợp đồng API Integration BOS

> **Trạng thái:** `PROPOSED` — hợp đồng API provider-neutral cho triển khai tương lai. Path và schema hiện không có trong application hiện tại.

## 1. Nguyên tắc hợp đồng

- API là ranh giới tích hợp hướng sản phẩm; product code không gọi SDK của provider.
- Biểu diễn API dùng identifier BOS và trạng thái canonical, không phải hình thức response của provider.
- Mỗi request theo phạm vi organization được authorize đối với organization, Connection và capability.
- Remote work chậm, có thể retry, bị rate-limit hoặc có side-effect là bất đồng bộ.
- `202 Accepted` nghĩa là work đã được ghi, không phải thao tác provider đã thành công.
- Mutating request có thể được retry yêu cầu một `Idempotency-Key`; key nằm trong phạm vi organization, operation và principal đã xác thực.
- Response bao gồm một `correlationId`; resource bất đồng bộ cũng phơi ra `syncId` hoặc destination-delivery ID.
- Error ổn định, machine-readable và an toàn để phơi ra. Secret, token, raw payload của provider và internal stack trace không bao giờ xuất hiện trong response API.
- Phân trang dùng cursor opaque. Cursor của provider không được phơi ra làm hợp đồng sản phẩm.

## 2. Header chung và envelope

### Header request

| Header | Yêu cầu |
|---|---|
| `Authorization` | Cơ chế xác thực BOS hiện có; chính sách token/cookie chính xác vẫn do Identity sở hữu. |
| `Idempotency-Key` | Bắt buộc cho command bất đồng bộ và thao tác side-effecting có thể retry; bị từ chối nếu thiếu hoặc bị tái sử dụng với một request body khác. |
| `X-Correlation-Id` | Tuỳ chọn client-cung-cấp trace ID tuỳ thuộc validation; BOS tạo một ID khi thiếu và trả về nó. |
| `Content-Type` | `application/json` cho hợp đồng JSON. Ingress webhook dùng content type provider-specific và xử lý raw-body có giới hạn. |

### Envelope resource

```json
{
  "data": {},
  "correlationId": "corr_01..."
}
```

### Envelope error

```json
{
  "error": {
    "code": "INTEGRATION_CONNECTION_REAUTH_REQUIRED",
    "message": "The connection requires reauthorization.",
    "details": {},
    "retryable": false,
    "correlationId": "corr_01..."
  }
}
```

`message` an toàn cho client nhưng không phải raw error text của provider. `details` là một object allow-listed, có schema-version; nó không được chứa credential, signed request body hay dữ liệu provider nhạy cảm.

## 3. Hình dạng resource

### Provider summary

```json
{
  "key": "provider-key",
  "displayName": "Provider display name",
  "contractVersion": "1",
  "capabilities": ["RESOURCE_READ", "WEBHOOK_RECEIVE"],
  "status": "ENABLED"
}
```

Dữ liệu catalog provider là read-only với user organization thường. Việc chọn provider không phải credential.

### Connection

```json
{
  "id": "conn_01...",
  "organizationId": "org_01...",
  "providerKey": "provider-key",
  "status": "ACTIVE",
  "capabilities": ["RESOURCE_READ"],
  "externalAccountId": "acct_01...",
  "credentialStatus": "VALID",
  "lastHealthCheckAt": "2026-08-15T00:00:00.000Z",
  "createdAt": "2026-08-15T00:00:00.000Z",
  "updatedAt": "2026-08-15T00:00:00.000Z"
}
```

Không bao giờ trả về access/refresh token, client secret, private key hay giá trị credential. `organizationId` có thể được bỏ qua hoặc redact trong một route hướng người dùng nếu route đã theo phạm vi organization; hợp đồng authorization phải định nghĩa điều này một cách nhất quán.

### ExternalAccount và ExternalResource

```json
{
  "id": "extacct_01...",
  "connectionId": "conn_01...",
  "providerKey": "provider-key",
  "providerAccountType": "channel",
  "providerExternalId": "opaque-provider-id",
  "displayName": "Safe display name",
  "status": "ACTIVE",
  "lastSyncedAt": "2026-08-15T00:00:00.000Z"
}
```

```json
{
  "id": "extres_01...",
  "connectionId": "conn_01...",
  "externalAccountId": "extacct_01...",
  "providerKey": "provider-key",
  "resourceType": "track",
  "providerExternalId": "opaque-resource-id",
  "status": "LINKED",
  "mappingVersion": "1",
  "lastSyncedAt": "2026-08-15T00:00:00.000Z"
}
```

Trường provider-specific không được thêm vào hình dạng chia sẻ nếu không có hợp đồng capability có version. Metadata provider nhạy cảm được bỏ qua hoặc chỉ phơi ra qua một projection allow-listed, được authorize hẹp.

### Sync

```json
{
  "id": "sync_01...",
  "connectionId": "conn_01...",
  "direction": "PUSH",
  "scope": "release",
  "status": "RUNNING",
  "attempt": 1,
  "correlationId": "corr_01...",
  "idempotencyKey": "idem_01...",
  "startedAt": "2026-08-15T00:00:00.000Z",
  "finishedAt": null,
  "error": null
}
```

`error` là một error chuẩn hoá allow-listed với category/code và message an toàn. Nó không bao gồm raw header hay secret provider.

### Mapping

```json
{
  "id": "map_01...",
  "organizationId": "org_01...",
  "productType": "release",
  "productId": "release_01...",
  "externalResourceId": "extres_01...",
  "mappingVersion": "1",
  "status": "ACTIVE",
  "lastAppliedAt": "2026-08-15T00:00:00.000Z"
}
```

Một Mapping là tường minh và theo phạm vi organization. Khớp display-name không bao giờ đủ để tạo hoặc thay đổi một Mapping.

## 4. Endpoint resource đề xuất

Route prefix và hình dạng URL organization chính xác là `OPEN`; sau đây là đề xuất provider-neutral.

### Catalog provider

- `GET /integration/providers`
  - Liệt kê các provider summary được enable và capability khả dụng cho caller/organization.
  - Không phơi ra client credential hay chẩn đoán adapter nội bộ.

### Connections

- `GET /integration/connections`
  - Liệt kê connection mà principal organization đã xác thực có thể thấy.
  - Hỗ trợ phân trang cursor opaque và filter theo provider/status.
- `POST /integration/connections`
  - Tạo một Connection `PENDING_AUTH` và trả về metadata khởi tạo authorization của provider, hoặc một URL authorization có giới hạn nếu thiết kế OAuth duyệt response đó.
  - Không chấp nhận giá trị token provider tuỳ ý.
- `GET /integration/connections/{connectionId}`
  - Trả về trạng thái Connection an toàn, capability và metadata health.
- `POST /integration/connections/{connectionId}/authorize/complete`
  - Hoàn tất một trao đổi authorization đã được duyệt dùng hợp đồng state/code một lần; flow OAuth chính xác là `OPEN`.
- `POST /integration/connections/{connectionId}/health-check`
  - Đồng bộ chỉ khi bounded và read-only; nếu không trả về một resource Sync.
- `POST /integration/connections/{connectionId}/disable`
  - Dừng work mới và làm cho việc dùng credential fail closed; không phá hủy record kiểm toán/tính di động theo mặc định.
- `POST /integration/connections/{connectionId}/disconnect`
  - Thu hồi/xoá authorization provider khi được hỗ trợ và chuyển trạng thái Connection; hành vi xoá bên ngoài phải được chính sách sản phẩm chọn tường minh.

### External accounts/resources

- `GET /integration/connections/{connectionId}/external-accounts`
- `POST /integration/connections/{connectionId}/external-accounts/sync`
- `GET /integration/external-resources`
- `GET /integration/external-resources/{externalResourceId}`
- `POST /integration/external-resources/sync`

Route list/read trả về projection canonical và trạng thái an toàn. Filter provider và provider-native ID không được bypass authorization organization/Connection.

### Mappings và Sync

- `GET /integration/mappings`
- `POST /integration/mappings`
- `DELETE /integration/mappings/{mappingId}`
- `GET /integration/syncs/{syncId}`
- `POST /integration/syncs/{syncId}/cancel`

`POST /integration/mappings` xác thực quyền sở hữu của product object và ExternalResource, mapping version và capability trước khi persist. Cancel là best-effort: side effect remote đã hoàn tất vẫn hiển thị và được đối chiếu.

## 5. Hợp đồng command bất đồng bộ

Một endpoint command bắt đầu work trả về:

```http
HTTP/1.1 202 Accepted
Location: /integration/syncs/sync_01...
```

```json
{
  "data": {
    "syncId": "sync_01...",
    "status": "REQUESTED",
    "correlationId": "corr_01..."
  },
  "correlationId": "corr_01..."
}
```

Caller quan sát trạng thái cuối qua `GET /integration/syncs/{syncId}` hoặc hợp đồng event đã tài liệu. Một response `202` không bao giờ được mô tả là success của provider.

Quy tắc idempotency:

- cùng organization + principal + operation + key + request tương đương trả về result/resource gốc;
- cùng key với một request body khác trả về `409 INTEGRATION_IDEMPOTENCY_CONFLICT`;
- cửa sổ giữ key là `OPEN` nhưng phải bao phủ cửa sổ retry/replay tối đa;
- trạng thái idempotency đủ bền vững để sống sót qua restart process;
- idempotency của provider remote và idempotency của BOS là kiểm soát riêng biệt và cả hai đều được tài liệu theo Adapter.

## 6. Hình dạng API phân phối Music

Một miền sản phẩm có thể yêu cầu phân phối qua một command hướng sản phẩm hoặc hợp đồng command Integration. API phải xác định đích một cách tường minh:

```json
{
  "productType": "release",
  "productId": "release_01...",
  "destinations": [
    { "connectionId": "conn_a", "externalAccountId": "acct_a" },
    { "connectionId": "conn_b", "externalAccountId": "acct_b" }
  ],
  "mappingVersion": "1"
}
```

Response trả về một thao tác tổng hợp cộng destination delivery ID/trạng thái. Mỗi destination chuyển trạng thái độc lập. Một error của một destination không phải thất bại transaction cho các destination khác, và endpoint retry/cancel nhắm tới một Sync hoặc delivery cụ thể khi có thể.

## 7. Ma trận authorization (đề xuất)

| Thao tác | Organization member | Integration admin/owner | Service worker |
|---|---:|---:|---:|
| Liệt kê catalog provider | đọc | đọc | đọc |
| Liệt kê/đọc Connection của organization mình | đọc | đọc | đọc có phạm vi |
| Tạo/authorize/disable/disconnect Connection | không theo mặc định | có | chỉ qua command đã duyệt |
| Đọc ExternalAccount/Resource/Mapping | đọc có phạm vi | đọc có phạm vi | đọc/ghi có phạm vi |
| Tạo/xoá Mapping | tuỳ chính sách | có | thực thi có phạm vi |
| Bắt đầu/cancel Sync | tuỳ chính sách | có | thực thi nội bộ |
| Đọc credential material thô | không bao giờ | không bao giờ | không bao giờ; chỉ token accessor |
| Đọc body webhook/raw signature | không bao giờ theo mặc định | không; chỉ scope security/audit | chỉ xử lý đã redact |

Ma trận này là đề xuất đang chờ hợp đồng Identity/Organization. Deny theo mặc định khi actor, organization hay quyền sở hữu resource mơ hồ.

## 8. Version hợp đồng và tương thích

- Mỗi hợp đồng API có một major version và schema identifier.
- Trường additive là tuỳ chọn cho tới khi client migration hoàn tất; xoá/đổi tên trường là thay đổi phá vỡ version.
- Giá trị enum canonical là append-only khi có thể; giá trị không xác định phải fail an toàn hoặc map sang `UNKNOWN` mà không khẳng định success.
- Phiên bản hợp đồng provider tách biệt khỏi phiên bản API công khai.
- Phiên bản payload event tách biệt khỏi phiên bản resource API.
- Một Connection ghi lại phiên bản hợp đồng provider/adapter đã dùng cho thao tác thành công gần nhất khi cần cho replay/đối chiếu.

## 9. Quyết định đang mở và cổng triển khai

- `OPEN`: route prefix và chiến lược URL organization.
- `OPEN`: mô hình organization/role/quyền; kho mã hiện tại có authz một phần và chưa có chính sách authz integration đã được chứng minh.
- `OPEN`: biến thể OAuth grant, yêu cầu redirect/state/PKCE và quyền sở hữu callback.
- `OPEN`: capability đầu tiên và canonical product payload.
- `OPEN`: transport event, outbox và worker runtime.
- `OPEN`: retention idempotency và lưu trữ phân trang/checkpoint sync.
- `OPEN`: chính sách remote deletion/disconnect provider-native.

Trước khi thêm một endpoint, task sở hữu phải cung cấp JSON Schema request/response hoặc hợp đồng strict type tương đương, ma trận authz/tenant, hành vi idempotency, bảng error, liên kết event, yêu cầu kiểm toán và contract test.