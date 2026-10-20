# Wolfari Web — Flow Map

## Nguyên tắc flow

```text
Figma frame
  → route web
  → actor / permission
  → query hoặc command
  → repository interface
  → fixture hoặc Gateway adapter
  → UI states
  → acceptance test
```

Component chỉ nhận view model và event callback. Component không gọi `fetch`, không ghép URL và không đọc raw HTTP envelope. Quy tắc này được thực thi qua ranh giới `ShellRepository` hiện tại và sẽ mở rộng cho từng feature.

## Flow triển khai 18/10/2026

```text
Trip List → /trips/new
  → validate + session draft
  → temporal write gate chưa chốt
  → unavailable, không POST, không fake success

Workspace route → Trip + Plan shared snapshot
  → permission/membership/revision guard
  ├─ Dress Code: group saved projection
  ├─ Packing List: category/progress saved projection
  └─ Trip Map: list/filter/detail → provider-unavailable viewport
```

Back/forward/refresh/deep-link dùng route thật cho Map, Dress Code và Packing. Chuyển filter Map xóa selection nếu địa điểm không còn trong tập hiển thị. Phase provider/Gateway activation vẫn bị gate.

## Flow tổng thể

```text
Guest
 ├─ Home
 │   ├─ Login → authenticated workspace
 │   └─ Register → verify email → login
 ├─ Invitation link → preview → login/register nếu cần → accept/decline
 └─ Password reset request → one-time link → reset password

Authenticated user
 ├─ Home → Trip list
 │            ├─ Create trip → Trip overview
 │            └─ Select trip → Workspace
 ├─ Profile → profile/avatar/password/sessions
 └─ Workspace
     ├─ Overview
     ├─ Plan → Activity detail/create/edit/reorder/complete
     ├─ Members → invite/preview/revoke/resend/leave/remove
     ├─ Locations / Dress / Packing
     ├─ Finance / Price watch
     ├─ Export / Share
     └─ Settings
```

## Flow A — App shell

| Bước | Điều kiện                     | Kết quả                                                                                                                                                  |
| ---- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | App khởi động                 | Chọn fixture ở dev/preview hoặc Gateway ở production                                                                                                     |
| 2    | Repository đọc shell snapshot | `loading`, `ready`, `empty` hoặc domain error                                                                                                            |
| 3    | Có `tripId`                   | Hiển thị desktop sidebar hoặc mobile drawer                                                                                                              |
| 4    | Mobile                        | Header gồm hamburger trái, logo giữa, avatar phải; title nằm trong content                                                                               |
| 5    | Chọn section                  | Cập nhật route được hỗ trợ; không tạo mutation                                                                                                           |
| 6    | Không có quyền                | Disable action và hiển thị permission state                                                                                                              |
| 7    | Drawer mở                     | Focus modal; Escape/backdrop/close trả focus trigger; chọn section đóng drawer và focus main                                                             |
| 8    | `/admin`                      | Role ADMIN có khai báo từ snapshot mới được render placeholder; USER/Guest forbidden. Scenario `admin` là lựa chọn fixture rõ ràng, không suy ra từ URL. |
| 9    | Unknown URL                   | Fallback not-found ưu tiên cả khi shell read unavailable; không redirect im lặng                                                                         |

Admin navigation ở Phase 1 đổi section/breadcrumb local trên `/admin`; không tạo route con hoặc command API. Các hành động nghiệp vụ Admin vẫn `mock-only`/unavailable.

Evidence: `src/main.tsx`, `src/app/App.tsx`, `src/app/router.tsx`, `src/features/shell/hooks/use-shell.ts`, `src/features/shell/repositories/shell.repository.ts`.

Phase 2 dùng `shared/components/Drawer` và `NavigationButton` trong shell hiện có; điều hướng/guard/section selection không đổi. Sandbox `/design-system.html` đi trực tiếp từ development/preview → native input/select/local demo error/loading/drawer → `/`; không qua session/repository hoặc tạo server mutation. Field error giữ input; close drawer trả focus trigger. Không thêm product route trong router.

## Flow B — Authentication

```text
Login form
  → client validation
  → Gateway Identity login
  → access token memory + refresh cookie
  → load /me
  → redirect về intended route hoặc home
```

Các nhánh bắt buộc: validation failure, invalid credentials, unverified email, rate limit, service unavailable, refresh failure và logout. Không lưu access token vào localStorage/sessionStorage. One-time verification/reset token không được đưa vào query cache, log hoặc persistent storage.

## Flow C — Trip list và trip creation

```text
Trip list loading
 ├─ success → list items
 ├─ empty → empty CTA
 ├─ error → retryable error
 └─ select trip → /trips/:tripId

Create trip
 ├─ invalid form → field errors
 ├─ submit pending → disable duplicate submit
 ├─ success → navigate to created trip
 ├─ conflict/permission → preserve form + explain failure
 └─ timeout/unknown → do not claim saved
```

Nếu backend chưa có create runtime, chỉ dựng fixture form trong preview và gắn nhãn `fixture-only`; production route phải hiển thị unavailable hoặc không expose action.

## Flow D — Trip workspace và plan

```text
GET trip/plan
  → snapshot {activities, projections, permissions, plan_version}
  → render timeline

Activity write
  → validate input
  → send Idempotency-Key + expected_plan_version
  → pending
  ├─ success → invalidate/refetch snapshot
  ├─ 403 → permission state
  ├─ 409 → conflict state → refetch before retry
  ├─ 4xx validation → field/form error
  └─ timeout/503 → unknown state; retry same intent only if contract allows
```

Member có thể completion Activity theo contract; Owner/Plan Editor mới được CRUD/reorder. Client không tự tăng `plan_version` hoặc `export_revision`.

## Flow E — Invitations và members

```text
Owner → create invitation
  ├─ EMAIL: cần email verified / matching rule
  └─ LINK: hiển thị one-time link một lần

Invitee → preview
  ├─ valid → accept/decline
  ├─ expired/revoked/used → unavailable
  └─ unauthenticated → login/register rồi quay lại intent
```

List members chỉ được hiển thị fields có trong projection. Không ghép profile người khác bằng cách gọi `/me` hoặc suy luận từ database.

## Flow F — Các flow target cần giữ nhưng chưa mở runtime

Travel/DSS, Finance, Export/Share, Price Watch và Admin phải dùng cùng flow shape:

```text
screen entry
  → capability check
  → query/preview
  → explicit pending state
  → server-confirmed success hoặc unavailable/error
```

Không có `success` giả cho các mutation chưa có Gateway handler. Với job/export/payment/provider timeout, UI phải phân biệt `pending`, `failed` và `unknown`.

## Route transition rules

| Từ        | Hành động         | Đến                      | Điều kiện                                  |
| --------- | ----------------- | ------------------------ | ------------------------------------------ |
| Home      | Login             | `/login`                 | Guest                                      |
| Login     | Success           | intended route hoặc `/`  | Session hợp lệ                             |
| Home      | Chuyến đi của tôi | `/trips`                 | Authenticated                              |
| Trip list | Chọn trip         | `/trips/:tripId`         | Trip accessible                            |
| Workspace | Lịch trình        | `/trips/:tripId/plan`    | Có quyền đọc trip                          |
| Workspace | Thành viên        | `/trips/:tripId/members` | Có quyền đọc membership                    |
| Any       | Unknown URL       | `*`                      | Hiển thị not-found, không redirect im lặng |

## Inventory toàn bộ · entry/exit và prototype gaps

[Full map](figma-screen-map-2026-10-15.md) có 150 cấp-page frame/board; [snapshot](figma-inventory-2026-10-15.json) ghi 2.149 action entries với trigger/destination/reset-scroll/capability. Internal layout frame kế thừa screen, không tạo route; variables/checkbox/confetti là local presentation.

| Actor / flow                      | Entry → steps → exit                                                                                     | Runtime gate                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Guest → Identity                  | Home/protected intent → Login → verified session → allowed route; Register → accepted/verification/login | Candidate; không prototype auto-session; recovery design/route thiếu                           |
| User → Self                       | Account → read/profile versioned save; avatar upload → attach; session revoke/logout                     | Candidate cho Self; push-device/preferences mock-only, không map push-delete sang /me/sessions |
| User → Trip                       | /trips/Home → create target → server-created Owner/Trip → workspace; cancel về /trips                    | Basic candidate, personalization partial; create route chưa chốt                               |
| Member/Owner → Workspace          | List/invite accept → Overview → Plan/Members; target sections local preview                              | Active membership/canRead; Finance summaries không thuộc Trip DTO                              |
| Owner/editor/Member → Activity    | Plan read → form/order/completion → pending → server result → refetch; close không mutate                | Candidate; completion/reopen policy riêng; HTTP OpenAPI gap                                    |
| Owner → Collaboration             | Members → invitations create/revoke/resend, policy save, transfer confirmation/blocked                   | Invitation/policy candidates; initial editor read/member profile gap; transfer mock-only       |
| User invitee → Response           | Deep link → login intended return → non-consuming preview → accept/decline server result                 | ACTIVE; EMAIL verified/matching; token memory-only; route chưa chốt                            |
| Member/editor → Map/Dress/Packing | Workspace/tools → read projection → provider/CRUD/assignment/completion gated                            | Projection partial; writes/Travel/DSS mock-only; saved/count prototype không persist           |
| Member/Owner/Holder → Finance     | Fund tabs → contribution/expense/refund/history → handover/reconcile → closure                           | No Web REST; Holder không Owner; không fake ledger/payment success                             |
| User/Member → Automation          | Bell/Profile/tools → inbox/preference/reminder/watch → reauthorized source destination                   | Worker/email khác inbox/push/preferences/watch API                                             |
| Owner/Member → Export             | Share/tools → job → private authorized download                                                          | Mock-only; Mobile P10 → public M25 semantic mismatch                                           |
| Owner/Guest → Share               | Owner create/revoke target → public password/expiry/revoke → server whitelist → Home/Login/Register      | Mock-only; không private DTO client filter hoặc membership giả                                 |
| Admin → Operations                | /admin shell → verified ADMIN → account/provider/job/support/config; reason/audit                        | Mock-only; 2 source sets, chưa canonical/routes con; không Trip/Holder bypass                  |

Desktop flow diagrams 299:2207 và 538:5696 là documentation, không product routes. Admin page có 8 action overlays 216:1337–1472, đều mock-only. Detached Mobile 328:3072 chưa rõ owner, giữ unknown.

Prototype Register đi logged-in trái 202/no-session. Những màn “Đã hoàn tất” của share/export/Finance/transfer/archive/delete/packing không được đi thẳng bằng mock mutation. Xem runtime evidence trước mở flow.

## Phase 3 — Trip List · read-only fixture

Scope `/trips` theo [screen contract](screen-contracts.md#contract-trip-list), được chốt ngày 15/10/2026. Flow C phía trên mô tả cả target creation; work unit này chỉ triển khai read-only list, không mở create flow hoặc gọi Backend.

```text
Authenticated User → /trips
  → TripRepository.listTrips (session-scoped, AbortSignal)
  → loading/read pending
  ├─ ready → sáu canonical Desktop fixtures dùng chung Desktop/Mobile
  │   ├─ canRead=false / không có active viewer membership → không render item
  │   ├─ status / name search / date sort → local presentation, không HTTP
  │   ├─ không còn kết quả phù hợp → empty giữ controls để sửa filter
  │   └─ open readable trip → /trips/:tripId (Overview placeholder hiện có)
  ├─ empty → empty explanation; create chưa mở
  ├─ error → retry read, giữ filter/search/sort
  ├─ forbidden → permission state, không private list payload
  ├─ conflict → reload/refetch read, không ghi đè revisions
  └─ unavailable → capability explanation, không gọi API giả
```

| Interaction                | Behavior đã chốt                                                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default / filter           | `all` và thứ tự catalog Figma trên mọi viewport. Năm status choices all/ONGOING/UPCOMING/COMPLETED/ARCHIVED dùng chung local state; resize không tự đổi selection hoặc dataset                                                              |
| Name / sort                | Search chỉ theo tên trong fixture đã được phép đọc. Sort “Mặc định” giữ catalog; ngày bắt đầu tăng/giảm dùng `Date.parse(startAt)` và stable ID fallback, không dùng đồng hồ máy hoặc thuật toán “gần nhất” chưa chốt                       |
| Desktop / tablet           | Header 76px cố định, main là scroll boundary. 1440px ba cột/gutter 64px; short 1366×520 compact hero 138px/gutter 32px; tablet 820px hai cột; list Desktop không có trip sidebar                                                            |
| Mobile ≤768px              | Drawer trái/header logo giữa/avatar phải; title trong content; natural document scroll; hero đầu/compact phần còn lại. Status row cuộn ngang với targets ≥44px; search/sort trong disclosure “Tìm kiếm và sắp xếp”; không native bottom tab |
| Drawer / keyboard          | Dùng shared modal Drawer; trigger/Escape/backdrop/close và focus-return theo shell contract. Open trip dùng semantic link; status button có selected state; controls có label và focus-visible                                              |
| Create/edit/archive/delete | Disabled, không navigation hoặc mutation success. Bộ lọc vai trò/thời gian/nâng cao chưa có behavior được kiểm chứng cũng disabled                                                                                                          |
| Gateway path               | Cùng `TripRepository`/view model; adapter chưa nối và trả unavailable. Không gửi HTTP, không tạo idempotency key hoặc tăng revision cho local presentation                                                                                  |

Sáu fixture giữ lifecycle explicit với mốc `2026-09-23`, không `Date.now()`. Cover/member count/ảnh Mobile là nullable presentation enrichment; không suy ra từ Trip DTO hoặc số lượng `currentMembership`.

GET list runtime hiện chỉ nhận `limit`/`cursor`/`lifecycle`, scope active membership, default loại archived và sort fixed `created_at DESC,id DESC` (`runtime-candidate`). Local name/date sort và `all` fixture không trở thành server query hoặc kết luận toàn bộ collection Gateway đã được tải. Destination vẫn là shell placeholder: Phase 3 này không thêm Overview business, write pending/unknown hoặc server persistence.

Acceptance 15/10/2026: 95 unit/component/proxy và 47 browser tests đạt; alias `/trips/`/`/TRIPS` không bỏ qua authenticated guard hoặc thay layout. Xem [visual/test evidence](figma-implementation-matrix.md).

### Auth fixture / Home / Self profile

Header/drawer/logo → `/`; Guest CTA → `/login` ↔ `/register`; User → `/trips` hoặc `/profile`. Theo yêu cầu demo: fixture `/login` nhận tài khoản sample đúng → shell User preview → `/` với banner phiên demo; sai → error giữ input/route và không private read. Thoát demo → Guest Home; reload Home cũng về Guest. Không server session/token/storage/API; production không inject demo capability. Register và Login không có capability vẫn unavailable. Mobile profile summary mở editor inline; draft giữ qua read error/retry. Guest không gọi Self/Trip queries, kể cả Home retry. Xem [contract và evidence](auth-fixture-phase3.md).

### Trip Overview fixture

Readable Trip List card → Overview metadata → existing Plan/Members route; Back trả về list, focus main/reset scroll theo shell. Edit/Share và aggregate actions unavailable. Không deep link mới, không server writes. [Contract/evidence](trip-overview-phase3.md).

### Plan preview

Overview/sidebar → Plan → chọn ngày/activity disclosure/unscheduled panel → Overview hoặc Members bằng existing navigation. Day selection và expansion local, giữ qua read error/recovery; không route cho map/activity hoặc drag/drop mutation. Overview đọc cùng first-day Plan projection. [Contract/evidence](plan-preview-phase3.md).

### Members / Invitation preview

Overview/Plan/sidebar → Members active rows → Owner-only local invitation preview → Members, không URL mới. Member không đọc invitation projection. Email validation giữ draft/focus rồi unavailable, không sent/saved/token/link; terminal statuses là seeded reads. Target-only sidebar giữ selection/URL và unavailable, chọn Overview phục hồi body và focus main. [Contract/evidence](members-preview-phase3.md).
