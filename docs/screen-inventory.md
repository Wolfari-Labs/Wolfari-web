# Wolfari Web — Screen Inventory

> Tài liệu này là danh mục màn hình và phạm vi triển khai của Web. Figma mô tả hình ảnh và ý định UX; route/code hiện tại và Backend runtime quyết định trạng thái triển khai thực tế.

## Quy ước trạng thái

| Nhãn                      | Ý nghĩa                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `shell-ready`             | Route và app shell đã có; nội dung feature còn placeholder.                                        |
| `fixture-only`            | Có thể dựng độc lập bằng fixture nhưng chưa được gọi Backend thật.                                 |
| `runtime-ready-candidate` | Backend có dấu hiệu route/handler runtime; vẫn phải xác minh request/response/quyền trước khi nối. |
| `partial-runtime`         | Chỉ một phần capability có runtime hoặc projection đủ dùng.                                        |
| `target-only`             | Có trong Figma/domain target nhưng chưa có bằng chứng runtime đủ để tích hợp.                      |
| `blocked`                 | Không được giả lập thành công trong production path vì thiếu contract, quyền hoặc dữ liệu.         |

## Route hiện có trong Web

| Route                    | Màn hình             | Actor chính         | Code hiện tại                         | Trạng thái                                                       |
| ------------------------ | -------------------- | ------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| `/`                      | Trang chủ / landing  | Guest, User         | `src/app/router.tsx`, `AppShell`      | `shell-ready`, placeholder                                       |
| `/login`                 | Đăng nhập            | Guest               | `src/app/router.tsx`                  | `shell-ready`, placeholder                                       |
| `/register`              | Đăng ký              | Guest               | `src/app/router.tsx`                  | `shell-ready`, placeholder                                       |
| `/trips`                 | Danh sách chuyến đi  | Authenticated User  | `TripRepository.listTrips`, Trip List | Phase 3 `fixture-only`; contract bên dưới, chưa tích hợp Gateway |
| `/trips/:tripId`         | Tổng quan chuyến đi  | Member              | `src/app/router.tsx`                  | `shell-ready`, placeholder                                       |
| `/trips/:tripId/plan`    | Lịch trình           | Member, Plan Editor | `src/app/router.tsx`                  | `shell-ready`, placeholder                                       |
| `/trips/:tripId/members` | Thành viên           | Member, Owner       | `src/app/router.tsx`                  | `shell-ready`, placeholder                                       |
| `/profile`               | Hồ sơ cá nhân        | Authenticated user  | `src/app/router.tsx`                  | `shell-ready`, placeholder                                       |
| `/admin`                 | Admin shell          | System Admin        | `AppShell`, `AdminChrome`, router     | `shell-ready`, fixture placeholder; API/features `target-only`   |
| `*`                      | Không tìm thấy trang | Any                 | `src/app/router.tsx`                  | Đã có fallback                                                   |

Các màn hình dưới đây xuất hiện trong Figma hoặc domain architecture nhưng chưa có route Web tương ứng: verify email, password reset, invitations, trip settings, locations/map, dress code, packing list, finance, price watch, export/share, travel intelligence, recommendations và các màn hình nghiệp vụ Admin. `/admin` chỉ là shell được chốt ngày 15/10/2026; route con Admin chưa mở.

## Màn hình theo domain

### Identity và public

| Màn hình       | Cần có                                           | Dữ liệu/contract                  | Ràng buộc                                                  |
| -------------- | ------------------------------------------------ | --------------------------------- | ---------------------------------------------------------- |
| Home           | CTA đăng nhập/đăng ký hoặc workspace gần đây     | Chưa cần dữ liệu riêng ở fixture  | Không hiển thị dữ liệu private cho guest                   |
| Login          | Email, password, pending/error/success           | Identity Gateway                  | Refresh token qua HttpOnly cookie; access token chỉ memory |
| Register       | Email, password, display name, validation        | Identity Gateway                  | Không báo thành công trước khi server xác nhận             |
| Verify email   | Nhập/tiếp nhận one-time link, expired/used/error | Identity Gateway                  | Token đọc một lần trong memory, xóa khỏi URL               |
| Password reset | Request/reset/expired/success                    | Identity Gateway                  | Không tiết lộ email có tồn tại hay không                   |
| Profile        | Profile, avatar, password, sessions              | `GET/PATCH /me`, avatar, sessions | Avatar/profile version và lỗi upload phải hiển thị rõ      |

### Trip workspace

| Màn hình      | Cần có                                       | Dữ liệu/contract                  | Ràng buộc                                                    |
| ------------- | -------------------------------------------- | --------------------------------- | ------------------------------------------------------------ |
| Trip list     | Danh sách, empty, create, loading/error      | Trip list runtime cần xác minh    | Không tạo trip giả thành công                                |
| Trip overview | Metadata, permission, revision, summary      | Trip projection                   | Quyền hiển thị action lấy từ server projection               |
| Plan          | Activity timeline, completion, reorder, CRUD | Plan snapshot + Activity contract | Dùng `plan_version`, idempotency và conflict recovery        |
| Members       | Member projection, invitation actions        | Members/invitations runtime       | Không tự bịa display name/avatar nếu projection thiếu        |
| Trip settings | Metadata/policy                              | Trip update/policy runtime        | Owner/Plan Editor khác nhau; UI không thay thế backend guard |

### Các domain phụ thuộc backend chưa sẵn sàng đầy đủ

| Domain        | Figma intent                          | Web độc lập                            | Khi nào được tích hợp                                           |
| ------------- | ------------------------------------- | -------------------------------------- | --------------------------------------------------------------- |
| Locations/map | Tìm địa điểm, bản đồ, snapshot        | Fixture với unavailable/provider error | Có Gateway route, source/time/stale contract                    |
| Dress/Packing | Checklist, assignee, completion       | Fixture/read-only state                | Có Plan projection/CRUD runtime                                 |
| Travel/DSS    | Route, weather, recommendation, Apply | Preview rõ là fixture                  | Có proposal version, source, apply idempotency                  |
| Finance       | Quỹ, receipt, settlement              | Không giả lập payment success          | Có Finance runtime, duplicate/callback/retry contract           |
| Export/share  | Tạo file, link, trạng thái job        | Hiển thị unavailable/fixture preview   | Có job status, captured version, permission và private download |
| Price watch   | Theo dõi giá, pause/resume            | Target-only                            | Có provider/source/time/cooldown contract                       |
| Admin         | Support, audit, feature flag, retry   | Target-only                            | Có admin role, reason, audit và route riêng                     |

## Quy tắc đọc danh mục

1. Không coi một frame Figma là bằng chứng route hoặc API đã tồn tại.
2. Mỗi màn hình phải có screen contract trước khi chuyển từ `fixture-only` sang runtime.
3. Một màn hình chỉ được đánh `runtime-ready-candidate` sau khi đối chiếu Gateway route, handler, OpenAPI, permission và error mapping.
4. Nếu thiếu dữ liệu, UI phải có empty/unavailable state; không dùng dữ liệu giả trông như dữ liệu server.

## Whole-project inventory · 15/10/2026

Scope người dùng chốt “toàn bộ”. [Full screen map](figma-screen-map-2026-10-15.md): 3 pages, 150 cấp-page frame/board/set, 17 sets/81 variants, 2.149 prototype entries, 110 unwired patterns (136 occurrences). [Snapshot JSON](figma-inventory-2026-10-15.json) giữ node/action/ownership/overflow/capability; [runtime matrix](runtime-evidence-2026-10-15.md) giữ Gateway/handler/schema/permission/error/version/idempotency.

Capability labels chuẩn: `runtime-ready`, `runtime-candidate`, `partial-runtime`, `mock-only`, `unknown`. `runtime-ready-candidate` ở baseline là alias của `runtime-candidate`, không runtime-ready. `shell-ready` là route/layout Web; `target-only` là product scope, không API readiness.

| Scope                                          | Existing route / host                          | Actor                             | Data mode / readiness                                              |
| ---------------------------------------------- | ---------------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Home/auth/Self                                 | /, /login, /register, /profile placeholder     | Guest/User                        | Fixture shell; Identity candidates, prefs/push blocked             |
| Trip list/overview                             | /trips, /trips/:tripId placeholder             | User/Member/Owner                 | Fixture shell; basic Trip candidate, Figma extras partial          |
| Activity                                       | /trips/:tripId/plan placeholder                | Member/Owner/Plan Editor          | Fixture shell; Plan candidate, HTTP OpenAPI gap                    |
| Members                                        | /trips/:tripId/members placeholder             | Member/Owner                      | Read partial; invitation/policy candidate; profile/editor read gap |
| Create/recovery/invitation detail/settings     | not-yet-routed                                 | Guest/User/Owner/invitee          | Draft, không tự sinh URL                                           |
| Location/Dress/Packing/Travel/DSS/tools        | not-yet-routed                                 | Member/Owner/Plan Editor          | Projection partial; target writes/provider mock-only               |
| Finance/Holder/closure                         | not-yet-routed                                 | Member/Owner/Holder               | Web mock-only; internal foundation không REST proof                |
| Notifications/preferences/push/reminders/watch | not-yet-routed                                 | User/Member/Owner theo capability | Web mock-only; delivery workers không API UI                       |
| Export/share/public/history                    | not-yet-routed                                 | Owner/Member/Guest theo scope     | Mock-only; private download/public whitelist gates                 |
| Admin                                          | /admin shell only; child routes not-yet-routed | Explicit Admin                    | Mock-only; giữ cả 2 source sets chờ canonical decision             |
| Components/diagrams                            | no product route                               | Inherit feature                   | Presentation/documentation, không permission                       |
| Detached 328:3072                              | unknown/not-yet-routed                         | unknown                           | unknown owner/flow                                                 |

41 capability groups: 18 runtime-candidate, 4 partial-runtime, 18 mock-only, 1 unknown; **không runtime-ready xác nhận trong inventory này**. Tại thời điểm kiểm kê Phase 0, feature bodies/production adapters chưa triển khai; phạm vi Trip List Phase 3 được bổ sung bên dưới. Các counts không phải số API; mapping không tự cấp phép thêm route/field/permission/behavior.

## Shared UI sandbox · Phase 2

`/design-system.html` là entry kiểm tra component trong development/explicit preview build, không React Router/product route và không thêm actor/permission hoặc API capability. Production build loại entry này. Mapping component Desktop/Mobile/showcase nằm trong [implementation matrix](figma-implementation-matrix.md#phase-2--shared-ui-foundation); Trip List có scope fixture riêng ở Phase 3 bên dưới, các feature body khác vẫn placeholder/blocked.

## Phase 3 — Trip List · phạm vi fixture đã chốt

Ngày 15/10/2026, người dùng chốt dùng sáu trip Desktop làm catalog canonical cho cả Desktop và Mobile; cho phép lọc trạng thái, tìm tên và sắp xếp ngày ở local. Đây là phạm vi của work unit `/trips`, không mở các feature Trip khác. Acceptance Phase 3 đã xác minh: lint/typecheck/test/build/build:preview, 95 unit/component/proxy và 47 browser tests đạt; xem [evidence](figma-implementation-matrix.md).

| Mục                    | Mapping / giới hạn                                                                                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Figma                  | Desktop `3:29` (metadata hiện ghi `02 · Chuyến đi của tôi`, task gọi `03`; node ID là nguồn canonical); Mobile `317:2029` (`M05 · Chuyến đi của tôi`); header `135:483`; sidebar `135:1357` chỉ tham khảo, không xuất hiện ở list Desktop                                         |
| Route / actor / owner  | `/trips`; Authenticated User; Trip domain; entry từ header/drawer hoặc URL trực tiếp                                                                                                                                                                                              |
| Model / repository     | `TripListViewModel` / `TripRepository.listTrips`; adapter session-scoped; chỉ trả item mà viewer được đọc, không chọn viewer khác qua URL                                                                                                                                         |
| Data mode              | Deterministic fixture; sáu item canonical dùng chung ở mọi viewport, lifecycle explicit theo mốc cố định `2026-09-23`, không đổi theo đồng hồ máy                                                                                                                                 |
| Permission / revisions | Giữ current membership, `canRead`/`canUpdate`, `planVersion`/`membershipRevision`/`exportRevision`; `canRead=false` không render nội dung trip; không suy `canCreate` từ authentication hoặc `canUpdate`                                                                          |
| Local presentation     | Mặc định giữ thứ tự catalog Figma, filter `all` trên cả Desktop/Mobile; năm lựa chọn all/ONGOING/UPCOMING/COMPLETED/ARCHIVED. Tìm theo tên; sort start date tăng/giảm qua `Date.parse(startAt)` với ID fallback ổn định; không server search/sort                                 |
| Exit                   | Open trip được phép → route `/trips/:tripId` đã có; destination vẫn Overview placeholder, không triển khai Overview business                                                                                                                                                      |
| Action chưa mở         | Create/edit/archive/delete và bộ lọc vai trò/thời gian/nâng cao disabled; không mở form/route mới và không thông báo đã lưu                                                                                                                                                       |
| States                 | Loading/read đang chờ, success, empty/no matching items, error/retry, forbidden, conflict/refetch, unavailable; không có mutation nên write pending/unknown/idempotency không áp dụng                                                                                             |
| Desktop / tablet       | Header 76px giữ cố định; main cuộn đúng boundary, không page scroll. 1440px: grid ba cột/gutter 64px; short 1366×520: hero 138px/gutter 32px; tablet 820px: hai cột                                                                                                               |
| Mobile ≤768px          | Natural document scroll; drawer trái, logo giữa, avatar phải, title trong content; item đầu dạng hero, phần còn lại compact. Không native bottom tab; năm status filter cuộn ngang trong row, targets ≥44px; tìm/sort trong disclosure “Tìm kiếm và sắp xếp”; resize giữ lựa chọn |
| Assets                 | Local Figma assets/fonts, gồm Kalam. Cover/member count là presentation nullable, không field API Trip; `cover.mobileSrc` nullable để chọn ảnh Mobile khi có, còn lại dùng Desktop cover                                                                                          |
| Runtime gate           | GET `/api/v1/trips` có static route/handler/OpenAPI evidence, giữ `runtime-candidate`; Figma enrichment `partial-runtime`. Gateway adapter Phase 3 trả unavailable, không gọi Backend; không có bằng chứng runtime-ready mới                                                      |

**Gap trước Gateway:** runtime chỉ hỗ trợ `limit`/opaque `cursor`/`lifecycle`, sort cố định theo created time; không có server search/custom sort/cover/member-count projection. Fixture `all` bao gồm catalog được duyệt, trong khi default GET runtime loại archived; không đồng nhất hai semantics hoặc bịa query mới. Xem [Contract: Trip List](screen-contracts.md#contract-trip-list), [flow](flow-map.md#phase-3--trip-list--read-only-fixture) và [state coverage](state-matrix.md#phase-3--trip-list--fixture-state-contract).

### Phase 3 Auth fixture implementation

Home, Login, Register v? Self profile ?? c? fixture bodies tr?n c?c route inventory hi?n c?. Mobile edit profile inline, kh?ng th?m route; c?c frame native notification/verification/reset v?n target-only. Xem [mapping v? gaps](auth-fixture-phase3.md).
