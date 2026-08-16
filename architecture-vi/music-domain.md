# BOS Music Domain

> **Trạng thái:** `PROPOSED` — domain contract. Chưa có Music module nào được hiện thực hôm nay.

## Từ vựng

- **FACT** — đã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — đã chấp nhận.
- **PROPOSED** — quy tắc thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- Kho mã không chứa mã Music.
- Không có catalog, release, track, distribution-request hay thực thể liên quan royalty nào tồn tại.

## 2. Purpose

Một music product xử lý catalog của các recording, release, track, distribution request và fact liên quan royalty. Distribution destination và provider integration thuộc sở hữu của Integration context; Music sở hữu release state phía product. Music độc lập với CMS, Ecommerce, Studio, Production-TVC và Entertainment.

## 3. Owned data (proposed)

- Recording/catalog item.
- Release và metadata của release.
- Track và quan hệ của chúng với release.
- Distribution request (ý định phân phối phía sản phẩm).
- Fact liên quan royalty (nơi Music sở hữu chúng).

Music không sở hữu: provider connection state, sync state, external-account metadata, mapping execution state (những cái này thuộc Integration), editorial content (CMS), commerce order (Ecommerce), creative asset (Studio), TVC deliverable (Production-TVC), event rights (Entertainment).

## 4. Boundaries

- Music không bao giờ đọc hay ghi bảng của sản phẩm khác.
- Music yêu cầu distribution thông qua Integration context; per-destination delivery state thuộc sở hữu của Integration (xem `architecture/integration-model.md` §6).
- Provider SDK bị giới hạn trong Integration adapter; Music là provider-neutral.

## 5. API và event (proposed)

- API: catalog CRUD, release CRUD, track CRUD, distribution-request lifecycle, royalty-relevant read.
- Event: release created, release updated, distribution requested, distribution completed (per destination), distribution failed (per destination), rights changed.
- Webhook: inbound provider callback đến qua Integration, không trực tiếp vào Music.

Một destination thất bại không ngụ ý release thất bại; aggregate release status được derive từ destination state.

## 6. Standalone / degraded operation

- Music phải hoạt động khi CMS, Ecommerce, Studio, Production-TVC hay Entertainment chưa cài.
- Nếu Integration context không khả dụng, Music ghi distribution request ở local và retry khi Integration tới được; release giữ state hiện tại.
- Nếu một provider destination cụ thể không khả dụng, chỉ destination đó suy giảm; destination khác và chính release không bị ảnh hưởng.
- Nếu nguồn dữ liệu liên quan royalty không khả dụng, Music tiếp tục ghi catalog/release state; tính toán royalty bị trì hoãn.

## 7. Open decisions

- `OPEN`: distribution destinations (chưa chọn provider).
- `OPEN`: rights model và territories.
- `OPEN`: royalty computation strategy.
- `OPEN`: ingest pipeline cho catalog data.
- `OPEN`: quan hệ với Production-TVC deliverable và Entertainment event.