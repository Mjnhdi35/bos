# Tổng quan hệ sinh thái BOS

> **Trạng thái:** `PROPOSED` — chỉ là tài liệu. Tài liệu này không triển khai capability hệ sinh thái nào.

## Từ vựng dùng trong bộ artifact này

- **FACT** — được xác minh bởi kho mã hiện tại (source, test, migration, CI, runtime).
- **REQUIREMENT** — bất biến nghiệp vụ được phát biểu từ bên ngoài hoặc suy ra, phải giữ.
- **DECISION** — lựa chọn tường minh đã được chấp nhận trong control plane.
- **PROPOSED** — hợp đồng thiết kế chưa có triển khai hỗ trợ.
- **OPEN** — hướng, nhà cung cấp, công nghệ hoặc chính sách chưa được chọn.

## 1. BOS là gì

BOS là platform Business Operating System cho Smoothie Studio. Nó host các sản phẩm nghiệp vụ độc lập (CMS, Ecommerce, Studio, Production-TVC, Entertainment, Music) trên một nền tảng chung nhưng generic.

BOS không phải là:

- một sản phẩm đơn lẻ;
- SaaS chỉ-tenant;
- sự thay thế cho storage miền sản phẩm.

## 2. Góc nhìn theo tầng

```text
Smoothie Studio business products
  CMS | Ecommerce | Studio | Production-TVC | Entertainment | Music
     |
     | product-to-product contracts (API, events, webhooks)
     |
BOS Platform
  identity, organization, workspace, deployment context,
  generic platform services (entities, metadata, integrations)
     |
BOS PaaS / BaaS capabilities
  generic, business-semantics-free infrastructure:
  object storage, queue, cache, mail, scheduled jobs, observability
     |
Deployment substrate
  standalone instance OR independent cloud/self-hosted instances
```

Tầng PaaS/BaaS không được mã hoá ngữ nghĩa nghiệp vụ. Sản phẩm sở hữu dữ liệu và hợp đồng của mình.

## 3. FACT — trạng thái đã xác minh hiện tại

- Node.js 24, TypeScript strict, CommonJS, ES2023.
- Express 5 làm HTTP framework.
- PostgreSQL qua Knex; Vitest + Supertest; Docker Compose cho dev local.
- CI bao gồm typecheck, test, coverage, quét secret, build Docker, kiểm tra non-root, Trivy.
- Triển khai hiện có: Platform (một phần), Identity/Auth (một phần), Users (một phần).
- Sản phẩm nghiệp vụ (CMS, Ecommerce, Studio, Production-TVC, Entertainment, Music) chưa được triển khai.

## 4. REQUIREMENT — bất biến

- CMS, Ecommerce, Studio, Production-TVC, Entertainment và Music là các sản phẩm độc lập.
- Một deployment có thể là standalone hoặc một trong nhiều deployment độc lập.
- Cả cloud và self-hosting đều là tuỳ chọn được hỗ trợ.
- Sản phẩm tích hợp qua API tường minh, event, webhook và hợp đồng.
- Không có global business database chia sẻ theo mặc định.
- Provider adapter có thể thay thế.
- Tầng PaaS/BaaS không mang ngữ nghĩa nghiệp vụ.
- Mỗi bounded context sở hữu dữ liệu của mình.
- Frontend không phải source of truth.
- Không có cột `tenant_id` bắt buộc xuyên suốt các sản phẩm.

## 5. DECISION

- BOS hôm nay là một modular monolith. Microservices không được chọn.
- Hợp đồng integration/security trong `architecture/integration-model.md`, `connector-architecture.md`, `api-contracts.md`, `event-contracts.md` và `security-model.md` là authoritative.

## 6. PROPOSED — hệ sinh thái nên trông như thế nào

- Sản phẩm phơi ra API và event canonical cho các sản phẩm khác.
- Một sản phẩm có thể chạy khi chưa cài sản phẩm khác.
- Tính nhất quán chéo sản phẩm đạt được qua hợp đồng, không qua schema chia sẻ.
- Platform chỉ cung cấp dịch vụ generic; ngữ nghĩa sản phẩm nằm trong module sản phẩm.

## 7. OPEN

- Sản phẩm nghiệp vụ đầu tiên sẽ onboard (không chọn ở đây).
- Bất kỳ cloud, event bus, queue, cache hay nhà cung cấp storage cụ thể nào.
- Kubernetes hoặc substrate orchestration khác.
- Bất kỳ triển khai security cụ thể nào, secret store hay OAuth provider.

## 8. Artifact đi kèm

- `architecture/architecture-principles.md` — giá trị và bất thương lượng.
- `architecture/platform-boundaries.md`, `architecture/product-boundaries.md`.
- `architecture/domain-map.md`, `architecture/bounded-contexts.md`.
- `architecture/deployment-model.md`, `architecture/standalone-model.md`, `architecture/cloud-model.md`, `architecture/multi-instance-model.md`.
- `architecture/identity-model.md`, `architecture/organization-model.md`, `architecture/data-ownership.md`.
- Theo miền: `cms-domain.md`, `ecommerce-domain.md`, `studio-domain.md`, `production-domain.md`, `entertainment-domain.md`, `music-domain.md`.
- `architecture/dependency-map.md`, `architecture/architecture-decisions.md`, `architecture/implementation-roadmap.md`.