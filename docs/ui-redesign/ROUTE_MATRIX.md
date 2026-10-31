# Route matrix — toàn bộ Frontend hiện tại

Policy update CP02/D17: cột Redesign kế thừa đề xuất discovery CP01, **không phải approval đổi visual**. Source selection theo SOURCE_MAP; “rút gọn”, “progressive”, “compact”, “workflow-first” chỉ xét qua DESIGN_DELTAS/DLT03/07, không ghi đè Figma. Hành vi/contracts hiện có vẫn phải bảo toàn.

Source: `src/app/router.tsx`, `src/main.tsx`, feature modules và repository adapters tại commit CP-01. Figma chính thức: https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace

22 route entries kể cả wildcard. `T = /trips/:tripId` trong bảng. CP03/04 đã APPROVED/DONE; CP05 bốn route Trips đã hoàn tất W01–W13 và **READY_FOR_REVIEW**, còn CP06+ PLANNED. Xem [contracts](INTEGRATION_CONTRACTS.md) để biết invariants; IDs không có page prefix mặc định thuộc Desktop. Mxx thuộc Mobile page, không dùng native chrome cho Web.

CP04 cập nhật30/10/2026: `/`, `/login`, `/register`, `/forgot-password`, `/verify-email`, `/reset-password`, `/profile`, `*` và Shell/navigation đã hoàn thành work unit trong scope CP04, status **READY_FOR_REVIEW**, chờ approval. Home giữ năm section nguồn và guest/user CTA; Auth/Profile giữ contract/session/token/version và bổ sung field semantics/truthful states; 404 giữ focus/Home recovery; Web402 header/drawer theo HMA04/D18. [Acceptance](CP04_ACCEPTANCE.md) ghi đầy đủ test modes/limits. Các row “Redesign” bên dưới vẫn là proposal lịch sử CP01 nếu khác source; chỉ register [DESIGN_DELTAS](DESIGN_DELTAS.md) có quyền xác nhận delta đã duyệt. CP05+ không được triển khai ở lượt này.

D25 cập nhật30/10/2026: CP04 đã APPROVED/DONE với verification limits giữ nguyên; CP05 mở cho đúng bốn route `/trips`, `/trips/new`, `T`, `T/settings`. Các row CP06+ vẫn PLANNED. Những ghi chú CP04 “chờ approval” ở đoạn trên là trạng thái lịch sử lúc kết thúc CP04, không phải trạng thái hiện tại.

D28 snapshot30/10/2026: CP05 W01–W07 đã hoàn tất đúng scope D25; [acceptance](CP05_ACCEPTANCE.md) giữ fixture/Gateway failure history, focused corrections và NOT_RUN. Ở thời điểm đó D26/D27 chỉ duyệt hai màu chữ, XRT01/02/03 còn pending. D29/D30 bên dưới cập nhật trạng thái hiện tại; **STOP trước CP06**, chờ user approval CP05.

D29/D30 remediation31/10/2026: XRT01/02 và CP04-R01/R02 được duyệt riêng, CP05-A03 đổi hai chữ dialog; XRT03 vẫn pending. W08–W13 hoàn tất, [verification](CP05_VERIFICATION.md) ghi full built fixture205/205 và Gateway HTTP-mock57/57 PASS, giữ nguyên failure history W07. CP05 **READY_FOR_REVIEW**, chưa APPROVED; STOP trước CP06.

| Route | Existing component / entry | Figma frame(s) | Actual integration & quyền | Redesign / states & gate | CP |
|---|---|---|---|---|---|
| `/` | HomeRoute → HomePage | 3:28,298:1642;768:5376/5746;M01/M04 | Guest/auth context; preview home repository; Gateway dùng editorialLanding, session | Rút gọn storytelling, CTA đúng mode; session loading/error; không fake recommendation | 04 |
| `/trips` | TripListPage | 3:29;768:6309;M05 | Viewer; Trip GET cursor | W02 COMPLETE: loaded-only search/filter/count/sort; cursor empty/no-match và stale refetch rõ; opaque cursor giữ nguyên | 05 |
| `/trips/new` | CreateTripPage → GatewayCreateTripPage | 3:30;M06/M07/P01 | Viewer; POST trips; validated dates/timezone/idempotency | W03/W09/W12 COMPLETE: supported-field validation/focus/draft, immutable intent; D29 source two-column Gateway form/capability panel, shared success dialog/reset; Figma-only destination/style/budget/cover controls không active | 05 |
| `T` | TripOverviewPage → GatewayOverview | 3:31/32;768:6807;M08 | Viewer + Trip access; Trip/Plan/Fund/Members aggregate | W04 COMPLETE: source hero/four summaries/three workspace panels, independent partial states; Fund chưa bật ≠ lỗi, Map/Price Watch route thật; XRT03 pending | 05 |
| `T/plan` | PlanPage → GatewayPlanPanel / RuntimeTimeline | 20:236;439:2028/2497;768:7123;M09/M29/M33 | Plan read + activity create/edit/delete/complete/reorder; PlanEditPolicy | Timeline/card, unassigned, Drawer, keyboard/touch reorder; dirty/pending/conflict/day-only/overnight/full-order | 06 |
| `T/map` | TripMapPage → DeferredReadPage trong Gateway | 20:386;224:1253;M10/M11 | Read projection từ Plan; preview editor riêng | Map/list liên kết, provider unavailable và read-only; không giả pin persistence | 07 |
| `T/dress-code` | DressCodePage → DeferredReadPage trong Gateway | 20:565;768:8228;781:6748;M12 | Read projection; Gateway mutation chưa wired | Scope/context và disclosure khả năng; preview-only suggestions; không tự bật apply/upload | 07 |
| `T/packing` | PackingPage | 23:312;256:1996;M13/M30/P15 | Gateway read-only; write chỉ preview + permission | Grouped rows/progress/filter; read-only/empty/error; không báo server saved từ local toggle | 07 |
| `T/members` | MembersPage → GatewayMembersPage | 25:360;475:*;768:7492;M16/M17 | Members cursor; invitation commands; policy; remove/leave via coordinator | Tabs, roles, current/left members, invite preview, pending/unknown/review; Owner ≠ Holder | 08 |
| `T/fund` | FundPage → GatewayFundPage | 23:506;768:7778;781:6554;M14 | TEST VND manual Fund core, commands/ledger/destination consent | Workflow-first panels; not-enabled/loading/error/permission; report ≠ confirm; no handover/advanced finance expansion | 09 |
| `T/price-watch` | PriceWatchPage → RuntimePriceWatchPage | 23:657;768:7992;781:6626;M18 | MOCK_FLIGHT watch lifecycle + observations; own watch vs Trip owner permissions | Editable fields, pause/resume/stop confirmation, stale/error/no observations, source/time; no booking | 10 |
| `T/settings` | TripSettingsPage | 25:676;269:1234;M20/M21 | Trip detail/PATCH with version; preview lifecycle differs | W05/W11 COMPLETE: draft after retryable conflict refetch, ambiguous PATCH journal locks new intent until exact retry/authoritative read, definitive403/404; unsupported reminder/lifecycle actions explained, XRT03 pending | 05 |
| `/profile` | ProfilePage + NotificationPreferences | 299:1847;768:7694;M22/M32/P14 | GET/PATCH me, password/avatar/sessions, notification preferences | Group account/security/preferences; per-section save/errors, version, session revocation; push device ≠ session | 04,10 |
| `/invitations` | InvitationPage | 299:2010;M24 | Token preview/accept/decline; recipient/session checks | Invalid/expired/revoked/wrong account/pending; safe login return; scrub token | 08 |
| `/invitations/local` | InvitationPage | cùng invitation family, không có dedicated frame | Local/preview entry; không giả production token | Giữ URL và mode boundary, hồi phục/back/error | 08 |
| `/login` | AuthPage mode=login | 298:1893;768:6118;M02 | auth login, refresh/CSRF/session bootstrap | Pending/field/server error, safe returnTo, keyboard/autofill | 04 |
| `/register` | AuthPage mode=register | 298:2007;768:6211;M03 | auth register accepted202; verification flow | Accepted ≠ authenticated; neutral errors, validation/pending | 04 |
| `/forgot-password` | IdentityActionPage action=forgot | Không có dedicated screen đã xác định | password-reset-requests | Neutral accepted, validation/rate limit/unavailable; cần thiết kế bổ sung | 04 |
| `/verify-email` | IdentityActionPage action=verify | Không có dedicated screen đã xác định | email verification confirm/resend | Token invalid/expired/success/pending; không lộ token, không auto-login | 04 |
| `/reset-password` | IdentityActionPage action=reset | Không có dedicated screen đã xác định | password-resets | Form validation/token error/pending/success; keyboard, sanitized route state | 04 |
| `/admin` | ContentState placeholder + AdminChrome / guard | Admin page194:1073 + Desktop538:* | Viewer/guard; **không có Admin business workflow** | Polish truthful placeholder/denied; chọn canonical IA chỉ là proposal; không thêm Admin API | 10 |
| `*` | ContentState not-found | Không có dedicated404 đã xác định | Không cần business API | Recovery link, navigation context, keyboard/focus | 04 |

## Cross-route surfaces

| Surface | Current source | Figma reference | Integration / preservation |
|---|---|---|---|
| Header/sidebar/mobile drawer/account menu | AppShell, App, shell repository |135:483/135:1357;783:6655|Session/Trip guard; preserve return focus, locks, back/forward and route titles.|
| Notifications Drawer/badge | NotificationInbox, Notifications |299:1926;M23|Runtime paginated inbox, individual read; no standalone route required. CP10.|
| Dialog/confirm/toast/content states | Drawer, Ui.tsx, ContentState, OperationStatus |26:406;Mobile P*|Focus restore/escape/scroll lock; asynchronous command state remains visible. CP03.|
| Design system preview | design-system.html |Component boards|Dev artifact outside router; not a production route. CP03/final gate.|

## Figma-only backlog — giữ trong inventory, không ngầm triển khai

Export/share/public share/password link; Owner transfer; FundHolder handover (mâu thuẫn notes mới); expenses/refunds/closure/ledger reversal beyond current UI; native mobile quick actions/tab bar; Admin operational workflows; recommendation/DSS and external-provider discovery; push device registration. Chức năng Backend có contract không có nghĩa đã wired Frontend. Mọi expansion cần scope riêng, contracts và approval trước implementation.

## State/test matrix áp dụng cho mỗi feature

- Read: loading → populated/empty; partial error;401/403/not-found;503/unavailable; pagination exhaustion; stale/cancelled request; actor/Trip change.
- Form: pristine/dirty/invalid/valid/submitting/server-error/conflict/success; field error liên kết bằng accessible description; không mất draft khi response lỗi.
- Command: pending/processing/recovery/unknown/review/success/failed; giữ intent và idempotency key khi retry; không báo hoàn tất theo animation.
- UI: Web responsive ở width320/402/768/820/1366/1440, viewport thấp520/600, 200% native zoom, long text, keyboard, focus, reduced motion. Không app mobile/native. Các gates này là kế hoạch, không phải kết quả đã chạy toàn bộ.
- Evidence hiện có: [baseline](checkpoints/CP-01.md), [UX screenshots](UX_AUDIT.md). Live Backend của CP-01 NOT_RUN.
