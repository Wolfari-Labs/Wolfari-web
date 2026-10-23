# Wolfari Web — UI State Matrix

## State vocabulary

### Projection screens triển khai 18/10/2026

| Screen       | Loading/empty/error                                       | Conflict/permission                                | Write state                                                                            |
| ------------ | --------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Create Trip  | Draft restore và validation summary                       | Session guard ở shell                              | Valid draft hiện unavailable vì temporal contract chưa chốt; không pending/success giả |
| Dress Code   | Shared Plan boundary; empty copy riêng                    | Snapshot mismatch hoặc row mismatch chặn toàn body | Read-only cho mọi role, kể cả `canEdit=true`                                           |
| Packing List | Shared Plan boundary; empty/filter-empty                  | Như Dress Code                                     | Không checkbox/add/edit/delete/reassign/complete                                       |
| Trip Map     | Shared Plan boundary; list còn dùng được khi provider lỗi | Như Dress Code                                     | Không search/save/remove/route; zero external tile request                             |

Fixture Plan có dữ liệu deterministic cho null/valid coordinates, ba Dress scope và Packing category/status/decimal/assignee. Fixture/Gateway Create đều trả `unavailable`; runtime UI không tạo success giả.

| State              | Ý nghĩa                                | UI bắt buộc                                      |
| ------------------ | -------------------------------------- | ------------------------------------------------ |
| `loading`          | Chưa có dữ liệu dùng được              | Skeleton hoặc progress; không render dữ liệu giả |
| `success`          | Dữ liệu hợp lệ đã đọc được             | Nội dung chính và actions được phép              |
| `empty`            | Request thành công nhưng không có item | Empty explanation và CTA nếu capability cho phép |
| `validation-error` | Input không đạt schema                 | Field/form error; giữ input hợp lệ               |
| `forbidden`        | Server không cho đọc/thao tác          | Thông báo quyền; ẩn/disable action phù hợp       |
| `not-found`        | Resource/route không tồn tại           | Not-found state, không redirect im lặng          |
| `conflict`         | Revision/version đã cũ                 | Refetch/reload; không ghi đè version cũ          |
| `pending`          | Mutation/job đang xử lý                | Disable duplicate action; hiển thị tiến trình    |
| `unknown`          | Timeout/503 khiến kết quả chưa biết    | Không báo success; hướng dẫn retry/status check  |
| `unavailable`      | Capability chưa có runtime             | Giải thích giới hạn, không gọi API giả           |

## Screen matrix

Shell/route placeholder Phase 1 (bao gồm `/admin`): success = placeholder, cùng coverage loading/empty/error/forbidden/not-found/conflict/unavailable. Không có command, nên validation/pending/unknown write không áp dụng. Fixture scenario `admin` giữ cùng shape với `success`, khai báo `systemRole=ADMIN` và không cấp quyền Trip; `forbidden-snapshot` trả snapshot có `canRead=false` để kiểm tra không render outlet private.

`admin` không cấp quyền Trip; `/admin` mặc định với USER vẫn forbidden. Fixture chỉ có một Trip preview đã khai báo; Trip ID khác trả not-found, không tạo projection/quyền từ URL. Unknown route hiển thị 404 ngay cả khi Gateway shell chưa khả dụng.

Evidence Phase 1 ngày 15/10/2026: 40 unit/component/proxy tests và 24 browser tests đạt. Browser state contract được kiểm tra trên 9 route placeholder trong `tests/e2e/app-shell.spec.ts`; permission từ ready snapshot được kiểm tra thêm trong `tests/shell-navigation.test.tsx` và `tests/shell-repository.test.ts`. Matrix feature bên dưới là yêu cầu cho flow sau, không khẳng định các mutation đã được triển khai.

| Screen         | Loading                            | Empty                                   | Error                    | Forbidden                               | Conflict                             | Pending/unknown                   |
| -------------- | ---------------------------------- | --------------------------------------- | ------------------------ | --------------------------------------- | ------------------------------------ | --------------------------------- |
| Home           | Có nếu bootstrap data              | Chưa có trip                            | Retry                    | Không áp dụng private data              | Không                                | Không                             |
| Login/Register | Submit pending                     | Không                                   | Credentials/rate/service | Không                                   | Không                                | Không báo thành công sớm          |
| Trip list      | Skeleton/read đang chờ             | Empty/no match; create disabled Phase 3 | Retry giữ local controls | Session guard + readable membership     | Read resilience/refetch Phase 3      | Write không áp dụng Phase 3       |
| Trip overview  | Skeleton                           | Projection thiếu                        | Retry                    | Có                                      | Có nếu update                        | Update pending/unknown            |
| Plan           | Timeline skeleton                  | Empty timeline + add nếu được phép      | Retry                    | Read/write tách biệt                    | Bắt buộc                             | Activity mutation                 |
| Members        | List skeleton                      | Chưa có member ngoài current            | Retry                    | Membership forbidden                    | Membership revision                  | Invitation pending                |
| Invitations    | Preview skeleton                   | Không áp dụng                           | Expired/revoked/used     | Login/permission                        | Membership revision                  | Accept/decline pending            |
| Finance        | Chờ runtime                        | Không giả lập                           | Provider/service         | Role-based                              | Finance version                      | Payment/callback unknown          |
| Export/share   | Job skeleton                       | Chưa có export                          | Failed/expired           | Download forbidden                      | Captured version                     | Queued/processing                 |
| Admin          | Shell loading; dashboard tương lai | Empty shell                             | Retry read               | ADMIN từ snapshot, USER/Guest forbidden | Shell conflict; job/config tương lai | Không ở Phase 1; action tương lai |

## Permission display rules

1. `canRead=false`: không render dữ liệu private; hiển thị forbidden.
2. `canUpdate=false`: có thể render read-only nếu `canRead=true`, nhưng không render write actions.
3. Client chỉ dùng permission để điều hướng/hiển thị; Backend luôn kiểm tra lại.
4. Không suy ra role từ tên người dùng hoặc URL.
5. Khi permission thay đổi sau khi load, map 403 về forbidden và invalidate query liên quan.

## Mutation state rules

```text
idle → validating → pending → success → refetch
                         ├→ validation-error
                         ├→ forbidden
                         ├→ conflict → refetch → user decision
                         └→ unknown → retry/status read với cùng intent nếu contract cho phép
```

Không được chuyển trực tiếp `pending → success` bằng fixture trong production path. Fixture chỉ được tạo response deterministic cho preview và test.

### Invitation runtime state (feat/7)

| Flow                | Pending                                            | Conflict / permission                                                              | Unknown / terminal                                                                                          |
| ------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Owner create        | Khóa form và mọi command khác; giữ draft           | Revision conflict refetch projection, yêu cầu submit mới; 403/404 khóa theo server | 503/network giữ nguyên intent + key để explicit retry; LINK receipt thiếu secret không được tạo lại tự động |
| Owner resend/revoke | Một command tại một thời điểm; revoke cần xác nhận | Version conflict refetch list; chỉ EMAIL/PENDING resend, PENDING revoke            | Retry cùng invitation/version/key; success cập nhật list, delivery không được gọi là delivered              |
| Token preview       | Chỉ sau authenticated bootstrap                    | 401 về auth; 403/404/409 copy trung tính, không suy đoán nguyên nhân               | Fragment đã scrub; reload/token mất yêu cầu mở lại link gốc                                                 |
| Accept/decline      | Khóa cả hai action                                 | Wrong account/email chưa xác minh/terminal token dùng copy trung tính              | Retry cùng token/key; receipt success là terminal, không preview lại token đã consume                       |

## Inventory state profiles

Profiles nối [full frame map](figma-screen-map-2026-10-15.md) với contract tương lai, là required coverage, **không phải feature test result hoặc Figma variants đã có**. Shell Phase 1 giữ coverage phía trên.

| Profile    | Required states                                                                                                                                                                 | Giới hạn                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| READ       | loading, success, empty, error, forbidden, not-found, unavailable                                                                                                               | Conflict chỉ ở related versioned use-case; không read mutation        |
| AUTH       | loading, success: accepted/session-confirmed only, validation-error, error, forbidden, pending, unknown, unavailable                                                            | Register accepted, login verified session; không invented version/key |
| FORM       | loading, success, empty, validation-error, error, forbidden, conflict, pending, unknown, not-found, unavailable                                                                 | Pending/unknown chỉ actual command/job; không fixture server success  |
| PLAN       | loading, success, empty, validation-error, error, forbidden, conflict, pending, unknown, not-found, unavailable                                                                 | Pending/unknown chỉ actual command/job; không fixture server success  |
| PROVIDER   | loading, success, empty, error, forbidden, conflict: write only, pending: write only, unknown: write/provider result, unavailable, stale/provider-error                         | Pending/unknown chỉ actual command/job; không fixture server success  |
| FINANCE    | loading, success: server-confirmed only, empty, validation-error, error, forbidden, conflict, pending, unknown, not-found, unavailable, OPEN/CLOSING/CLOSED: target source only | Pending/unknown chỉ actual command/job; không fixture server success  |
| INVITATION | loading, success, empty: management only, validation-error, error, forbidden, conflict, pending: writes, unknown: writes, not-found, unavailable, expired/revoked/used          | Pending/unknown chỉ actual command/job; không fixture server success  |
| LIFECYCLE  | loading, success: server-confirmed only, empty, validation-error, error, forbidden, conflict, pending, unknown, not-found, unavailable, blocked/recovery                        | Pending/unknown chỉ actual command/job; không fixture server success  |
| JOB        | loading, success: server-confirmed only, empty, error, forbidden, conflict, pending: queued/processing, unknown, not-found, unavailable, failed/expired/revoked                 | Pending/unknown chỉ actual command/job; không fixture server success  |
| PUBLIC     | loading, success: server whitelist only, empty, validation-error: password, error, forbidden, not-found, unavailable, expired/revoked/password-required                         | Pending/unknown chỉ actual command/job; không fixture server success  |
| ADMIN      | loading, success: server-confirmed only, empty, validation-error, error, forbidden, conflict, pending, unknown, not-found, unavailable                                          | Pending/unknown chỉ actual command/job; không fixture server success  |
| COMPONENT  | default/selected/focus/pressed/disabled/error where source variant exists; no business state                                                                                    | Presentation-only, no server success                                  |

### Source state / required state

- Saved/completed/create, Finance OPEN/CLOSING/CLOSED, Owner transfer blocked, export đang tạo, packing Checked/count/confetti đều là prototype source, không persisted state.
- Observed component variants: Button Default/Pressed/Disabled, Field Default/Focus/Error, Chip Selected, Switch On/Off, Checklist Checked, Progress In progress/Complete, Status Info/Success/Warning. Không có dedicated loading/empty/forbidden/conflict/pending/unknown variants cho mọi feature; bổ sung theo contract.
- Permission/state theo actor hiện hành; public whitelist không chứa private forbidden payload. Provider/payment/job bất định không biến thành price/balance 0 hoặc saved.
- Lifecycle default flag false → unavailable; accepted receipt recovery PROCESSING/PENDING_RECOVERY/NEEDS_REVIEW không SUCCEEDED. Packing Self completion/reassignment cần command riêng, không Activity completion.
- Unwired/generic controls và detached frame có unknown capability phải disabled/unavailable đến khi có quyết định/evidence.

## Phase 2 — Presentation state coverage

- Button: default, hover ở pointer hỗ trợ, focus-visible, pressed, disabled, loading; loading giữ accessible label và chặn callback, không tự chuyển sang saved.
- Input/Select: native default/focus/disabled/error, unique label, hint/error qua `aria-describedby`, `aria-invalid`; lỗi demo giữ input. Select native có keyboard behavior, không fake listbox.
- Alert: static demo không live; dynamic error `alert`, info/success/warning `status`. Tone success chỉ là presentation prop, không bằng chứng mutation thành công.
- ContentState: loading/placeholder/empty/error/forbidden/not-found/conflict/unavailable giữ nguyên; skeleton decorative, busy state semantic; retry dùng callback đúng read policy. Error không có details vẫn hiển thị lỗi service, không rơi vào placeholder.
- Drawer/nav: closed không tab-order; modal focus trap, Escape/backdrop/close focus return, internal scroll/body lock; selected/disabled không cấp permission.
- Component pending/loading không có server operation; unknown/conflict/forbidden của feature vẫn thuộc owning model/repository. Không tạo shared business state machine.

Sandbox và acceptance theo [shared UI contract](screen-contracts.md#contract-shared-ui-foundation) / [Phase 2 handoff](design-system-phase2.md).

## Phase 3 — Trip List · fixture state contract

Chỉ áp dụng read-only `/trips`; [Contract: Trip List](screen-contracts.md#contract-trip-list) là nguồn acceptance. Coverage sau được xác minh bởi các kiểm tra Phase 3 ngày 15/10/2026; giữ kết quả Phase 1/2 bên trên là lịch sử.

| State / điều kiện                                        | UI và invariant                                                                                                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading / read pending                                   | List skeleton/progress có busy semantics; không render data success trong lúc chưa có snapshot. “Pending” ở đây là read đang chờ, không mutation/job state                                                    |
| Success                                                  | Sáu fixture canonical Desktop dùng cả Desktop/Mobile, lifecycle explicit theo mốc `2026-09-23`; chỉ readable active membership được render. Giữ revisions/permissions; không tính lifecycle bằng `Date.now()` |
| Empty từ repository                                      | Explanation; không báo lỗi/mất quyền; create disabled do không có write flow được bật                                                                                                                         |
| Empty do local filters/search                            | Giữ status/search/sort và controls để người dùng thay điều kiện; không tự reset về `all` hoặc xóa search                                                                                                      |
| Error                                                    | Error state với read retry phù hợp; không mất filter/search/sort; không rơi xuống placeholder success                                                                                                         |
| Forbidden / Guest                                        | Không private item/title/cover/member count; không cấp quyền từ route, username hoặc `canUpdate`                                                                                                              |
| Conflict                                                 | Explicit version/conflict explanation và refetch read; giữ query local, không tự tăng revision hoặc replay command                                                                                            |
| Unavailable                                              | Gateway adapter chưa nối hoặc read capability unavailable: explanation, không fake endpoint/fixture production response                                                                                       |
| Nullable enrichment                                      | `presentation.memberCount`/cover (gồm `mobileSrc`) thiếu thì dùng unavailable/fallback presentation hợp lý, không bịa số người hoặc API field                                                                 |
| Local responsive state                                   | Cùng default `all`, catalog order và filter/search/sort state ở mọi viewport; resize không đổi dataset hoặc selection. Năm status choices luôn truy cập được qua row scroll Mobile                            |
| Disabled actions                                         | Create/edit/archive/delete, role/time/advanced filters không có callback tạo thành công hoặc route/command chưa chốt                                                                                          |
| Validation / write pending / write unknown / idempotency | Không áp dụng: flow không có form write hoặc mutation. Search/sort/filter là local presentation; không tạo operation ID hoặc mutation receipt                                                                 |

Forbidden/conflict là fixture resilience cases. GET-list OpenAPI hiện chỉ mô tả HTTP 200/400/401/503; không khẳng định các state fixture là response runtime list đã được kiểm thử. GET list giữ nhãn `runtime-candidate`, enrichment `partial-runtime`; không có Backend call trong Phase 3. Actor/member guard phải được kiểm tra cả khi repository trả ready snapshot có item không đọc được.

Browser acceptance đã bao phủ desktop 1440×800, short laptop 1366×520, tablet 820px và Mobile 768/402/320px: đúng scroll boundary, controls ≥44px, disclosure Mobile, drawer/focus/Escape, keyboard open trip, resize giữ filter và route tới Overview placeholder. Lint/typecheck/test/build/build:preview đạt; 95 unit/component/proxy và 47 Chromium E2E tests đạt. Alias route và label-in-name Mobile có regression; xem [visual/test evidence](figma-implementation-matrix.md).

### Phase 3 Auth/Home/Self coverage

Home/Self/session reads: loading/ready/empty/error/forbidden/not-found/conflict/unavailable qua common repository result. Auth: validation giữ input/focus; pending/unknown/error/unavailable là presentation, không mutation receipt. Self save chỉ validate/unavailable, version không đổi; profile draft giữ qua error/recovery. Notification/push/avatar/logout/revoke disabled. [Evidence](auth-fixture-phase3.md).

Demo login được người dùng yêu cầu: public sample credentials chỉ trong fixture bootstrap; invalid credentials → form alert/focus, Guest và route giữ nguyên; đúng → User Home + banner demo, không server success. Thoát demo hoặc reload Home → Guest; không token/storage/HTTP hoặc thay revisions. Nút thoát demo chỉ đổi preview, khác logout Backend vẫn disabled. Register/Gateway không có demo login. Pending/unknown selector vẫn là presentation và không activate demo khi pending.

### Trip Overview fixture

Metadata read: loading/ready/empty/error/forbidden/not-found/conflict/unavailable; unknown/denied opaque IDs → not-found. Snapshot canRead/active membership guard và Guest/Admin shell guard chặn private reads. Aggregate cards unavailable; writes disabled, pending/unknown không áp dụng cho read-only metadata. [Evidence](trip-overview-phase3.md).

### Plan preview

Plan read loading/ready/empty/error/forbidden/not-found/conflict/unavailable; null startsAt không bị gán ngày, nullable end/location rõ ràng; unknown trip → not-found. Cross-projection revision mismatch → conflict; read permissions trước summary/timeline. Pending/unknown presentation không đổi snapshot, write controls disabled. Day selection/expansion giữ qua read recovery; Guest không gọi Plan. [Evidence](plan-preview-phase3.md).

### Members / Invitation preview

Member/invitation reads: loading/ready/empty/error/forbidden/not-found/conflict/unavailable; Invitation EXPIRED/REVOKED/ACCEPTED “đã dùng” là read scenarios/version2. Owner-only invitation query; Guest và denied metadata không đọc members/invitations; foreign-trip rows không hiển thị. Nullable name/avatar → neutral ID fallback, không role/Holder inference. Draft email giữ qua read recovery; pending/unknown không tăng revision hoặc báo sent/saved. Target-only selection unavailable thay vì sai body. [Evidence](members-preview-phase3.md).

### Feature 6 — Gateway Members / Plan policy

| State / intent             | UI and invariant                                                                                                                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Members first page         | Requests use `limit=100`, `include_left=false` by default and preserve an opaque `next_cursor`; rows are scoped to the requested Trip and deduplicated by membership ID.                                                    |
| Next page / retry          | Explicit load-more uses the returned cursor. A failed later page keeps prior rows and retry uses that same cursor; changing Trip or departed filter starts at page one.                                                     |
| Departed filter            | `include_left` is sent with the selected filter; off by default. Departed rows show `leftAt` and are excluded from active-membership actions/policy selection.                                                              |
| Identity projection        | Stable User ID and Membership ID are shown, with complete IDs in disclosure and `Bạn` keyed by current membership ID. Missing name/avatar/email and responsibility assignments remain unknown.                              |
| Malformed Members response | Missing/invalid `items`, ID, Trip scope, role, timestamp, `left_at` or cursor becomes a read error carrying correlation ID; it never renders as an empty success or `undefined`.                                            |
| Policy availability        | Only active Owner + `canUpdate` + unarchived Trip can open the writer. Fixture, Member, departed viewer and archived Trip do not issue policy writes.                                                                       |
| Basic policy write         | `OWNER_ONLY`/`ALL_MEMBERS` always send `editor_member_ids: []`, expected `membership_revision` and one stable idempotency key per intent. Unchanged policy sends no request; duplicate submit is locked.                    |
| Selected policy            | Existing `SELECTED_MEMBERS` is shown as read-only; no editor list is invented because the Trip GET projection omits it. Switching to either basic policy remains available to an eligible Owner.                            |
| Confirmed write            | PUT is not the final authority. Reset Plan cache and refetch Trip detail, Members, shell and Trip list; show saved only when the fresh Trip projection reflects the intended policy/revision.                               |
| Conflict                   | Keep the draft, refetch projections and require an explicit resubmit using the fresh membership revision and a new idempotency key. Never replay automatically.                                                             |
| Unknown write              | Timeout/network/5xx/malformed 2xx after sending remains unknown, even if a later read appears to match. Do not claim success or retry automatically; explicit retry reuses identical payload, revision and idempotency key. |
| Deferred capabilities      | Leave/remove/transfer and invitation writes remain disabled until their owning Backend lifecycle gates are enabled; no `feat/7`, `feat/8` or editor-ID read API is introduced.                                              |

Gateway browser tests use Playwright HTTP interception and the real Web adapters; they are mocked contract coverage, not live Backend E2E. See [Members Phase 3 / Feature 6 status](members-preview-phase3.md#feature-6-gateway-status--22102026) and [Gateway Integration Matrix](gateway-integration-matrix.md).

### Fund preview

Fund `/trips/:tripId/fund` dùng `FundRepository.getFund` với fixture projection và Gateway `SERVICE_UNAVAILABLE`. Fixture kiểm tra `OPEN`, `CLOSING`, `CLOSED`, loading, empty, error, forbidden, not-found, conflict và unavailable; mọi số tiền là chuỗi số nguyên VND. Form chỉ kiểm tra bản nháp và luôn giữ thông báo “Chưa gửi, chưa trừ số dư”. `currentBalance`, `reservedRefund` và `availableBalance` hiển thị tách biệt; ngoài quỹ không làm thay đổi ledger. Browser contract chạy ở 1440, 1366, 1024, 820, 768, 402 và 320px, không overflow ngang và không gọi `/api/`.

### Price Watch preview

Price Watch `/trips/:tripId/price-watch` dùng `PriceWatchRepository.getPriceWatch` với fixture `TEST` và Gateway `SERVICE_UNAVAILABLE`. Fixture có watch của bản thân/người khác, `ACTIVE`, `PAUSED`, `STALE`, provider lỗi, loading, empty, error, forbidden, not-found, conflict và unavailable. Giá/ngưỡng là chuỗi VND; provider lỗi giữ giá quan sát gần nhất và không render `0`. Form chỉ kiểm tra bản xem trước; edit/pause/resume/delete không báo đã lưu. Browser contract giữ ba vùng Desktop và một cột Mobile ở 1440, 1366, 1024, 820, 768, 402, 320px, không overflow ngang và không gọi `/api/`.
