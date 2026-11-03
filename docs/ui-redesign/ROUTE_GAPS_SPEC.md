# CP-02 — Các route còn lại và state handoff

30/10/2026, W05-E. Đặc tả Web dựa trên inventory/current source; không implementation hoặc approve deltas. Dùng cùng [SOURCE_MAP](SOURCE_MAP.md), [ROUTE_MATRIX](ROUTE_MATRIX.md) và [contracts](INTEGRATION_CONTRACTS.md); không tạo roadmap mới. Các families chi tiết: [Home/Auth](HOME_AUTH_SPEC.md), [Plan](PLAN_SPEC.md), [Fund](FUND_SPEC.md), [Members](MEMBERS_SPEC.md).

## 1. Trip creation — representative journey J02

Source [3:30](evidence/figma-official/3-30.png) đã mở: public/account header, breadcrumb/back, heading/scenic art; basic form trái khoảng780px, destination map/suggestions phải khoảng436px ở1440; form dài với CTA cuối. Giữ hierarchy và illustrations. Source có destination/member count/style/template/budget/cover, nhưng [GatewayCreateTripPage](../../src/features/trips/create/GatewayCreateTripPage.tsx) chỉ tạo name/description/dates/timezone. `XRT01` là gap để review, không permission thêm API.

Proposed source-aligned composition: cột trái giữ title → name → date pair → timezone → description → status/helper → actions. Cột phải giữ vùng destination source nhưng label “Chưa hỗ trợ chọn điểm đến khi tạo chuyến đi”, không editable map/search hoặc danh sách gợi ý giả; budget note dẫn sang Fund sau tạo. Những unsupported controls không đưa vào submit. Đây là proposal cụ thể cần duyệt XRT01; không tự biến thành wizard hoặc âm thầm giấu toàn bộ cột phải.

| Field/action | Current semantics cần giữ |
|---|---|
| Name | Trim, required≤200. |
| Description | Form≤500; trim blank→omitted trong create, khác settings blank→null. |
| Ngày đi / ngày về | Calendar dates hợp lệ, end>=start; serialize start local00:00 và **ngày sau ngày về** local00:00 theo timezone. Không đổi end thành cùng ngày00:00. |
| Timezone | IANA validation bằng Intl; default Asia/Ho_Chi_Minh; không tự dùng browser timezone. |
| Request | POST `/api/v1/trips`; immutable CreateTripIntent/clientRequestId. Actor-scoped sessionStorage v3; no ownerless legacy draft import. |
| Pristine/dirty/invalid | Persistent labels; giữ draft, error hiện đầu form; focus error enhancement thuộc XRT01, không claim current form đã focus mọi invalid field. |
| Storage blocked/invalid | Memory-only draft cảnh báo; không send new create trước khi lưu intent an toàn; invalid recovery không clear để né guard. |
| Pending/unknown | Lock fields; duplicate guard; giữ exact request khi retry; link kiểm tra trips, không tự tạo bản sao. |
| Definitive validation/forbidden | Clear intent theo current result, giữ draft + message để sửa. |
| Authoritative created | CreateTripSuccess chỉ sau receipt; Mở chuyến đi dùng server tripId. Không local fake Trip. |

Source/create-success implementation hiện có custom role=dialog nhưng chưa có shared focus-trap integration trong component. `XRT02`: giữ success visual/mascot nhưng chuyển behavior sang shared accessible overlay ở CP05; review nhãn “Tiếp tục chỉnh sửa” vì current callback chỉ dismiss success, không mở settings. Proposal: nhãn “Đóng thông báo”, primary “Mở chuyến đi”; không đổi route tự động hoặc phát thêm POST.

CP05 disposition30/10/2026: XRT02 vẫn `DELTA_PENDING`; chưa thay success dialog hoặc copy theo proposal trên. W03 chỉ cải thiện validation/focus của các trường Gateway Create được hỗ trợ; [acceptance](CP05_ACCEPTANCE.md) ghi ranh giới thực tế.

402/320 proposal: heading/art reflow → form một cột (dates stacked nếu không đủ width) → destination capability panel → footer actions. Short1366×520/600: scroll đến form CTA; không fixed form height/floating footer che error. 768/820 width quyết định stacking sau visual comparison, không preset breakpoint mới. Success overlay giới hạn viewport, focus primary, Escape/return focus safe, không phụ thuộc animation. Đây là Web extension XRT01/02 chưa có frame source riêng.

## 2. Trips list, overview, settings

| Route/source | Composition và runtime mapping | States/adaptation/gate |
|---|---|---|
| `/trips`,3:29/768:6309 | TripListHero → search/status/sort → TripCard grid → load more. Name search, status ALL/UPCOMING/ONGOING/COMPLETED/ARCHIVED, sort listed/start asc/desc từ loaded items. | Initial loading/error/unavailable, truly empty vs filter-no-match, loaded count, next-page error retains rows. No full-server search claim; preserve opaque cursor. Narrow controls disclosure keyboard+clear label, cards một cột khi thiếu width. Source listed in inventory, chưa mới chụp live full list. |
| `T`,3:31/32/768:6807 | TripHero/description và summary panels theo source map, không đổi priority mặc định. GatewayOverview reads Trip first then Plan/Fund/Members. Packing count từ Plan. | Per-panel error/retry; Fund null≠503; member page count ghi “đã tải” nếu còn cursor; Plan error không giả0. Weather/share chưa wired. `XRT03` review source regions thiếu data, không bỏ toàn panel hoặc fake realtime/weather. |
| `T/settings`,[25:676](evidence/figma-official/25-676.png) | Banner → information trái / members-reminders-management phải. Current view/edit name/description/publicDescription; source reminder/archive/Owner-transfer/delete không là quyền triển khai. | Read/edit/pending/dirty/invalid/conflict/unknown; current dates/destination/budget/cover locked. `XRT03`: keep capability reasons, explicit name/public description fields và button routing tới Members; no reminder API invented. |

Settings fields: name trimmed1–200; description/publicDescription whitespace-only→null, unchanged fields omitted. PATCH `/api/v1/trips/{id}` giữ expectedPlanVersion/expectedExportRevision + same fingerprint/key khi retry; conflict refetch giữ draft, không stamp unrelated projection revision. Upload cover/date editing/archive/delete/transfer không tự active. Reset/cancel focus cần test; không thêm save-on-blur. Owners/canUpdate/nonarchived guard giữ.

Source visual review bổ sung bắt buộc CP05: list/overview exact frame và populated/empty/partial states cùng viewport; các facts chưa ảnh mới chỉ là structure/current-code mapping, không full visual fidelity claim.

## 3. Map/Dress/Packing — preserve read vs preview

| Route/source | Source composition | Current data/fields/actions và gap |
|---|---|---|
| `T/map`,[20:386](evidence/figma-official/20-386.png) | Banner, search/list trái và map/details phải; status chips/legend. | Gateway DeferredReadPage: selectedLocations id/name/address/lat/lng read-only, no interactive map provider. `XRT04`: source-shaped list/empty/provider-unavailable surface with explanation; không map image làm bản đồ hoạt động, không pins/search/save giả. Interactive map mới cần scope approval riêng. |
| `T/dress-code`,[768:8228](evidence/figma-official/768-8228.png) | Banner → scope choices → source illustrated cards và form phải; Web402 companion theo notes. | Gateway dressCodes label/description/publicDescription/scopeType TRIP/DAY/ACTIVITY, planDate/activity title. `XRT04`: source card style với actual data, labels “chỉ xem”; không upload palette, apply AI suggestions hoặc member assignment mới. Source outfit art là illustration, không ảnh của item server trừ provenance rõ. |
| `T/packing`,[23:312](evidence/figma-official/23-312.png) | Banner → summary/progress/add → filter/category → grouped rows với quantity/person/due/action. | Current PackingPage filters/groups/progress, Gateway read-only; preview canWrite=previewEnabled&&canEdit&&canComplete. Giữ identity membership IDs, no server saved claim từ local toggle. `XRT04`: read-only row completion representation + capability note, giữ preview editor riêng. |

Read states cho cả3: TripPlanBoundary loading/error/denied/revision mismatch → authoritative coherent plan; empty items riêng; missing address/coordinate/activity không fabricate; stale refresh không trộn revision. Preview add/edit/delete/suggestions giữ nhãn local; no widening Gateway adapter. Packing editor source26:406-E fields name/quantity/category/assignee/due/reminder; current form model/serializer là authority, không reminders server từ source.

Narrow proposal: list trước details/map fallback; source card image aspect-ratio và auto-height text; form (preview only) dưới main/Drawer theo existing pattern tới khi XRT04 duyệt. Group headings/disclosures dùng buttons/summary keyboard; progress có count text, không color-only. Default no motion effect khi chỉ đọc/checkbox disabled. CP07 kiểm tra fixture+Gateway riêng.

## 4. Price Watch — fields, source và lifecycle

Source [768:7992](evidence/figma-official/768-7992.png), notes777:6445: left watch list / middle chart+explanation / right form; Web402781:6626 form dưới. Runtime [PriceWatchForm](../../src/features/price-watch/PriceWatchForm.tsx) trong Drawer khác source (`XRT05`). D18 đã duyệt placement: contextual form phải desktop, dưới nội dung ở Web hẹp. Chart/table/copy còn là proposal chưa áp dụng; source chart không là chứng cứ có full30-day observations. CP02 đóng theo D20, visual QA miễn theo D19.

Fields bắt buộc giữ: MOCK_FLIGHT/VND, origin/destination IATA3 uppercase khác nhau; ONE_WAY/ROUND_TRIP; departure_date và departure_at theo **UTC**, giờ mặc định09:00 UTC, future datetime; ROUND_TRIP return>=departure, one-way return=null; adults1–9, children/infants0–9, infants<=adults, total<=9; cabin null/ECONOMY/PREMIUM_ECONOMY/BUSINESS/FIRST; threshold positive int64 string. Không tự đổi sang giờ sân bay hoặc Trip timezone dù prop timezone tồn tại.

POST create giữ idempotency/journal; PATCH edit expected_version; POST pause/resume/stop, không DELETE. Owner watch sửa/pause/resume own; Trip owner stop other theo current guard; stop terminal có confirm, history giữ. No booking/payment/provider mới. Create recovery journal và lifecycle/edit unknown policies giữ đúng RuntimePriceWatchPage, không gom Finance coordinator.

States: list loading/empty/error/cursor; ACTIVE/PAUSED/EXPIRED/STOPPED; own/other/archived read-only; validation first-focus/pending; version conflict giữ review barrier; unknown no alternate submit; restored journal invalid blocks; observations loading/none/error/stale with provider/observedAt/fetchedAt. Chart proposal chỉ actual points, table fallback; no interpolation giả, no price0 khi provider lỗi. `XRT05` ghi UTC field/narrow layout/chart-with-real-data và source-specific action label “Dừng” thay “Xóa”.

## 5. Profile/security và notifications

Source [299:1847](evidence/figma-official/299-1847.png) hai card personal/travel settings; current profile cùng family, có password/session fields bổ sung. [299:1926](evidence/figma-official/299-1926.png) là full-page inbox nhưng current route không có Notifications page: giữ cross-route Drawer, không thêm route (`XRT06`).

| Surface | Fields/actions cần giữ | State/review treatment |
|---|---|---|
| Profile | fullName Unicode1–150 →PATCH me expected_version; email read-only; email verify/resend accepted. | Per-section pending/error/version conflict/draft preserved; not Trip role edit. |
| Avatar | PNG/JPEG nonempty≤10MiB; multipart upload→object_key→PATCH attach expected_version; bytes read/object URL revoke. | Upload success≠attach success; show partial failure; no dataURL in business payload, no source mascot replacing user avatar. |
| Password | current required; new15–128 Unicode + confirmation; POST password-change | Confirmed clear secret, login notice then session/query cleanup; ambiguous result no automatic repeat. |
| Sessions | GET me/sessions opaque cursor; DELETE session/id | Separate loading/empty/error/paging/revoke feedback; no delete-push-device label. Source device panel isn't current session management. |
| Notification preferences | email_enabled/push_enabled, group overrides INVITATION/PLAN/PACKING/CONTRIBUTION/CLOSURE/PRICE, inherit/true/false; PUT expected_version | Busy; conflict/unknown keeps draft and blocks save until explicit load-current. Registered devices only; Web push enrollment not wired. No session revoke substitution for device deletion. |
| Inbox Drawer | Tất cả/Chưa đọc, createdAt/title/body/read marker, per-item PATCH read, load more, safe domain destination, profile#notifications | Loading/empty/error/next-page retains items; marking pending/error; explicit read receipt only. Current foreground interval30s; not push-delivery proof. Source bulk-read/type filters unavailable (`XRT06`). |

402 proposal: personal then notifications/preferences then security/sessions in current logical order, forms one column, row metadata wrap, same Drawer focus/scroll behavior. Source wide device/manage actions must not imply capability. Long email visible/wrappable; reduced motion status does not hide error. CP04/10 own implementation; per-section save boundaries retained.

## 6. Admin, 404 và shared recovery

`/admin`: two source families remain unresolved for business screens, but current guarded placeholder is explicit scope. `XRT07` proposal uses current AdminChrome + ContentState: loading guard → denied safe home/trips exit OR “Không gian quản trị — các chức năng nghiệp vụ chưa khả dụng”. Không fake KPI/table/API, không chọn canonical operational design hoặc bypass permission. Responsive menu follows shared Web Drawer; dark/native mock not imported.

`*`: missing dedicated source. `XRT07` proposal shared public shell, centered content section, h1 “Không tìm thấy trang”, short explanation, “Về trang chủ” link; authenticated viewer optional existing trips link after actual session resolution. No auto history.back as sole recovery, no new business API. Focus main via router, long invalid URL never rendered as HTML. 320 width padding16, intrinsic height, short viewport scroll; no full-screen art replacing actions. This is explicit gap spec, not Figma original.

Shared session bootstrap/route lazy loading/error: maintain suspense/loading distinction; unknown session is neither logged in nor guest proof; no private data flash. Navigation focus/scroll lock cleanup independent animation. Surface errors keep readable correlation details under disclosure, no raw token/password. Current guards/routes unchanged.

## 7. 22-route coverage closure (spec ownership, không product PASS)

| Routes | Detailed spec | Owner checkpoint |
|---|---|---|
| `/`, `/login`, `/register`, `/forgot-password`, `/verify-email`, `/reset-password` (6) |HOME_AUTH_SPEC |CP04 |
| `/trips`, `/trips/new`, `T`, `T/settings` (4) |mục1–2 trên |CP05 |
| `T/plan` (1) |PLAN_SPEC |CP06 |
| `T/map`, `T/dress-code`, `T/packing` (3) |mục3 trên |CP07 |
| `T/members`, `/invitations`, `/invitations/local` (3) |MEMBERS_SPEC |CP08 |
| `T/fund` (1) |FUND_SPEC |CP09 |
| `T/price-watch`, `/profile`, `/admin`, `*` (4) |mục4–6 trên |CP04/10 |

Total22; Notifications/overlays/shell cross-route, không route thứ23. Mọi state family đều có loading/empty/error/permission/recovery hoặc explicit N/A: pure404 no mutation; Admin no CRUD; read-only Gateway Map/Dress/Packing no write pending/success. Không gán Finance UNKNOWN cho mọi form. CP02 chỉ design/spec, app tests/browser/live **NOT_RUN**. Các mẫu nguồn còn chưa visually verified toàn state là gate CP tương ứng, không che dưới chữ COMPLETE.
