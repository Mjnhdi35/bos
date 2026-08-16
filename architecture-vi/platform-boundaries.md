# Ranh giới Platform BOS

> **Trạng thái:** `PROPOSED` — hợp đồng ranh giới cho tầng BOS Platform. Triển khai hiện tại là một phần: metadata Platform, materialize schema và generic CRUD đã có; Organization, Workspace, context Deployment và context Product thì chưa.

## Từ vựng

- **FACT** — được kho mã xác minh.
- **REQUIREMENT** — bất biến.
- **DECISION** — lựa chọn đã được chấp nhận.
- **PROPOSED** — hợp đồng thiết kế.
- **OPEN** — chưa chọn.

## 1. FACT

- `src/platform/**` cung cấp định nghĩa entity, lưu trữ metadata, materialize schema, CRUD entity generic, phân trang, hỗ trợ trường enum/array.
- Migration `platform_entities` tồn tại với unique `(name, version)` và index name.
- Materialize chưa là transactional.
- Route Platform hiện thiếu hợp đồng authz.

## 2. REQUIREMENT

- Platform không được nhúng bất kỳ ngữ nghĩa business-domain cụ thể nào. Hệ sinh thái mục tiêu chưa chọn miền nghiệp vụ nào; Platform giữ trung lập với miền bất kể miền ứng viên nào được kích hoạt trước.
- Platform không được phụ thuộc vào một module sản phẩm cụ thể.
- Dịch vụ Platform chỉ được truy cập qua API/hợp đồng có tài liệu.

## 3. Trách nhiệm theo tầng

| Tầng | Sở hữu | Không được sở hữu |
|---|---|---|
| **Product** (module miền được thêm khi một sản phẩm được kích hoạt) | Thực thể sản phẩm, bất biến sản phẩm, API và event sản phẩm | Internal của Platform; internal của sản phẩm khác |
| **Platform** | Metadata entity, scaffolding CRUD generic, context nhận biết identity, context organization/workspace/deployment, hợp đồng integration, bề mặt tích hợp provider-neutral | Quy tắc nghiệp vụ, schema sản phẩm, lệnh gọi SDK của provider |
| **PaaS** | Substrate container/orchestration, mạng, nguyên thuỷ storage, nguyên thuỷ queue/cache, build/release | Ngữ nghĩa nghiệp vụ |
| **BaaS** | Managed object storage, mail, scheduled job, nguyên thuỷ quan sát, managed database | Ngữ nghĩa nghiệp vụ |

PaaS và BaaS là tên hoán đổi cho substrate generic bên dưới BOS. Không tầng nào được phép mã hoá khái niệm sản phẩm.

## 4. Hướng phụ thuộc

```text
Product
  -> Platform application contract
  -> Integration contract (provider-neutral)
  -> PaaS/BaaS capability
```

Import ngược bị cấm. Một capability PaaS/BaaS không bao giờ import module sản phẩm hoặc platform.

## 5. Danh mục dịch vụ Platform (hiện tại và đề xuất)

- **FACT:** đăng ký entity metadata, materialize schema, CRUD record generic, phân trang.
- **PROPOSED:** provider context organization/workspace/deployment, context identity, hook authorization theo capability, hook audit, ranh giới integration, ranh giới phát hành event.
- **OPEN:** transport event, substrate queue/cache, backend quan sát, secret store.

## 6. Lộ trình có điều kiện

Capability Platform chỉ được triển khai khi yêu cầu sản phẩm hoặc vận hành viện dẫn tới nó. Không thêm capability suy đoán.

## 7. Quyết định đang mở

- `OPEN`: hình dạng context identity cho product tiêu thụ.
- `OPEN`: từ vựng capability/role.
- `OPEN`: hình dạng và retention của audit log.
- `OPEN`: dịch vụ PaaS/BaaS nào trở thành first-class so với bên ngoài.