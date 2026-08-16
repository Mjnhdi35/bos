# Kiến trúc Connector BOS

> **Trạng thái:** `PROPOSED` — ranh giới mục tiêu cho tích hợp provider. Tài liệu này không triển khai connector hay provider nào.

## 1. Mục đích và ranh giới

Connector là ranh giới hẹp giữa logic integration của BOS và transport provider bên ngoài. Nó cô lập protocol, transport xác thực, rate limit, timeout, phân trang, đăng ký webhook và hình thức error đặc thù provider. Nó không phải framework plugin generic và không được chứa quy tắc nghiệp vụ sản phẩm.

```text
Product module
  -> Integration use case / canonical contract
  -> Provider capability port
  -> Provider Adapter
  -> Connector interface
  -> Provider API / webhook endpoint
```

SDK của provider, nếu được chọn sau, chỉ có thể được dùng bên trong package Adapter/Connector tương ứng. Module sản phẩm, tiện ích chia sẻ và miền không liên quan không được import những SDK hay kiểu response của provider đó.

## 2. Thành phần

### Provider registry

Registry phân giải một provider key ổn định và phiên bản hợp đồng/capability thành một factory Adapter đã được duyệt. Nó là cấu hình và đăng ký code, không phải trạng thái tenant. Nó phải từ chối tường minh các provider không xác định hoặc bị vô hiệu hoá.

### Adapter

Adapter dịch command/query canonical của BOS thành thao tác provider và chuẩn hoá response provider thành kết quả provider-neutral. Nó sở hữu:

- ánh xạ trường và validation đặc thù provider;
- đàm phán capability/version của provider;
- phân loại error provider;
- quy ước remote idempotency/header;
- lệnh gọi SDK provider, nếu có.

Nó không được sở hữu quyết định authorization của organization, bất biến sản phẩm, hay lưu trữ secret.

### Connector

Connector sở hữu cơ chế transport:

- xây dựng request từ credential/session ngắn hạn do credential boundary cung cấp;
- chính sách HTTPS/TLS và timeout request;
- parse response an toàn và giới hạn kích thước;
- cơ chế phân trang/cursor khi provider-neutral;
- trích xuất tín hiệu rate-limit;
- retry có giới hạn chỉ khi operation policy cho phép;
- telemetry với redaction;
- transport đăng ký/ingress giao hàng webhook.

Connector trả về kết quả transport đã chuẩn hoá; nó không quyết định một release sản phẩm có hợp lệ không hay một customer có thể thực hiện thao tác hay không.

### Credential boundary

Một Connector nhận credential handle giới hạn capability hoặc một accessor token đã được authorize, không bao giờ nhận giá trị credential trong một request hoặc event sản phẩm. Refresh, rotation, revocation token và lưu trữ secret là trách nhiệm của security/integration. Hệ thống lưu trữ secret chính xác là `OPEN`.

## 3. Hợp đồng connector canonical

Sau đây là hợp đồng khái niệm dạng TypeScript, không phải code triển khai:

```ts
interface ProviderAdapter {
  providerKey: string;
  contractVersion: string;
  capabilities(): ReadonlySet<Capability>;
  execute<TRequest, TResult>(
    operation: CanonicalOperation<TRequest>,
    context: ConnectorContext,
  ): Promise<ProviderResult<TResult>>;
}

interface ConnectorContext {
  organizationId: string;
  connectionId: string;
  correlationId: string;
  idempotencyKey?: string;
  deadline: string;
  credentialHandle: string;
}
```

Triển khai thực phải áp strict type và tránh làm rò rỉ object generic đặc thù provider vào module sản phẩm. `ProviderResult` phải phân biệt success, retryable failure, terminal failure, authorization failure và rate-limit outcome. Nó chỉ mang metadata request/reference của provider khi an toàn để giữ.

Context thao tác tối thiểu:

- `organizationId` và `connectionId` cho cô lập/kiểm toán;
- `correlationId` cho truy vết request-to-sync-to-event;
- `idempotencyKey` theo thao tác cho write;
- deadline/timeout budget tuyệt đối;
- capability và phiên bản hợp đồng;
- credential handle, không bao giờ là secret material thô;
- actor/service identity cho authorization và kiểm toán.

## 4. Mô hình capability

Capability là tường minh, có version và nằm trong allow-list, ví dụ:

- `ACCOUNT_READ`
- `RESOURCE_READ`
- `RESOURCE_WRITE`
- `PUBLISH`
- `DISTRIBUTE`
- `WEBHOOK_RECEIVE`
- `WEBHOOK_MANAGE`
- `SYNC_PULL`
- `SYNC_PUSH`

Danh sách này là minh hoạ; yêu cầu sản phẩm đầu tiên phải định nghĩa từ vựng được chấp nhận. Một Adapter phải chỉ quảng bá các capability mà nó triển khai và được phép gọi. Một Connection có thể enable một tập con. Kiểm tra capability xảy ra trước khi gọi remote và lặp lại ở đánh giá scope credential/token khi áp dụng.

## 5. Dữ liệu provider-neutral so với provider-specific

Trường hợp đồng provider-neutral nên bao gồm BOS ID ổn định, provider key, external ID, trạng thái canonical, timestamp, danh mục error chuẩn hoá, tham chiếu correlation/idempotency và metadata an toàn.

Trường provider-specific bị giới hạn ở ranh giới Adapter/Connector. Nếu cần persistence cho đối chiếu, lưu một snapshot provider có version và được redact trong trạng thái do Integration sở hữu với chính sách retention tường minh. Không phơi ra JSON provider tuỳ ý làm hợp đồng API sản phẩm theo mặc định.

Provider-native ID là chuỗi opaque. Không parse chúng, không derive authorization từ chúng, và không dùng chúng làm BOS ID. Loại account/resource provider và phiên bản hợp đồng phải được lưu cùng chúng.

## 6. Quy tắc thực thi request

1. Xác thực organization, trạng thái Connection, capability và authorization trước khi tạo work.
2. Tạo correlation ID và idempotency key theo thao tác trước lần thử remote đầu tiên.
3. Áp deadline tuyệt đối và giới hạn kích thước response.
4. Dùng retry policy derive từ ngữ nghĩa thao tác, không phải một retry interceptor chung.
5. Chỉ retry các transient failure đã được phân loại và chỉ khi tác dụng phụ trùng lặp được ngăn chặn hoặc được hợp đồng chấp nhận.
6. Tôn trọng hướng dẫn reset rate-limit của provider với cận trên.
7. Không bao giờ log authorization header, cookie, secret của raw payload, refresh token, access token hoặc body webhook đã ký.
8. Persist kết quả Sync/attempt trước khi phát event hoàn tất/thất bại ở nơi trạng thái bền vững được yêu cầu.
9. Coi success của provider là fact bên ngoài; thay đổi trạng thái sản phẩm vẫn đi qua hợp đồng API/domain sản phẩm.
10. Khi adapter/connector thất bại, giữ một error code chuẩn hoá ổn định và tham chiếu chẩn đoán an toàn.

## 7. Ranh giới connector webhook

Webhook inbound theo đường này:

```text
Provider callback
  -> ingress route
  -> raw-body capture (bounded)
  -> signature/timestamp verification
  -> provider adapter normalization
  -> dedupe by provider delivery ID + Connection
  -> durable webhook receipt state
  -> async processing/event
```

Ingress route phải trả về acknowledgement mà provider yêu cầu chỉ sau các kiểm tra tính xác thực và hình dạng cơ bản phù hợp với provider. Xử lý nghiệp vụ không nên phụ thuộc vào việc giữ kết nối provider mở. Chữ ký không hợp lệ, timestamp cũ, Connection không xác định và delivery ID bị replay bị từ chối hoặc bỏ qua theo hợp đồng provider và được kiểm toán mà không phơi raw secret.

Chi tiết verification là provider-specific và thuộc Adapter/Connector. Security model định nghĩa bất biến; không thuật toán, nhà cung cấp hay key store nào được chọn ở đây.

## 8. Hợp đồng test Adapter

Mỗi Adapter nên có:

- contract test chống lại một Connector giả bao gồm quảng bá capability, chuẩn hoá, idempotency và phân loại error;
- fixture test cho success của provider, response lỗi hình dạng, rate limit, authorization failure, timeout và callback trùng;
- isolation test chứng minh context organization/Connection không thể vượt ranh giới;
- test chữ ký và replay webhook khi áp dụng;
- test tính di động cho export/disconnect khi không có provider khả dụng;
- integration test provider chỉ khi một sandbox thật và credential được duyệt.

Không production code nào bị yêu cầu khởi tạo SDK của provider chỉ để test hành vi product-domain.

## 9. Tư thế triển khai và phụ thuộc

Giả định hiện tại là ranh giới modular-monolith trong process. Một quyết định sau có thể chuyển một connector rủi ro cao hoặc lưu lượng cao ra sau ranh giới service, nhưng điều đó không bắt buộc bởi hợp đồng này. Không thêm queue, event broker, SDK, thư viện circuit-breaker hay secret manager cho tới khi một yêu cầu cụ thể và quyết định vận hành biện minh cho điều đó.

Quyết định `OPEN`:

- provider và tập capability đầu tiên;
- SDK so với triển khai HTTP trực tiếp;
- ngưỡng cô lập process connector;
- durable job/outbox và transport event;
- ngân sách rate-limit theo provider;
- hỗ trợ remote idempotency và chiến lược fallback;
- lưu trữ secret và cơ chế xoay vòng khoá;
- scheme xác thực webhook được hỗ trợ.

## 10. Cổng review

Một Connector/Adapter chỉ sẵn sàng triển khai khi task của nó bao gồm:

- phiên bản capability và hợp đồng API/event;
- quyền sở hữu và import phụ thuộc được phép;
- ma trận organization/authz và provider-scope;
- chính sách timeout/retry/idempotency/rate-limit;
- vòng đời credential và quy tắc redaction;
- chính sách verification/replay webhook;
- hành vi cô lập thất bại, bao gồm đích độc lập;
- contract test fake-adapter và yêu cầu quan sát vận hành;
- hành vi disconnect/export và migration provider.