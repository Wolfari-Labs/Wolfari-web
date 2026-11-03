# CP11 — Đối chiếu20 nhận xét và22 routes

Ngày02/11/2026. Input: [báo cáo người dùng](../../DANH_GIA_CHI_TIET_GIAO_DIEN.md), giữ nguyên file. Đây là **đối chiếu code/contracts và test**, không phải visual audit hoàn tất. Direct browser capture bị chặn bởi browser host unavailable; ảnh kiểm thử tự động nếu có phải ghi fixture/HTTP-mock. Không suy tỷ lệ bỏ cuộc, phần trăm diện tích hay mức cải thiện từ nhận định trong báo cáo.

## 20 nhận xét — disposition và hướng xử lý

| # | Xác minh hiện tại / nguồn | Kết luận và hướng đi |
| --- | --- | --- |
|01 Password15–128 | `src/features/auth/model/auth-validation.ts:18`, Backend read-only `apps/identity-service/src/identity-crypto.ts:10` đều yêu cầu15–128 Unicode code points. | **CONTRACT_BOUNDARY**. Không hạ frontend xuống8 vì Backend sẽ từ chối. Không có đo lường chứng minh bỏ cuộc>50% hoặc tăng chuyển đổi gấp đôi. Thay policy cần workstream Backend/security riêng, ngoài CP11. |
|02 Drawer thiếu lối thoát | Trước D52 Drawer Trip có logo Home/Đóng nhưng thiếu link trực tiếp Trip list/Profile. | **APPROVED/IMPLEMENTED A03**. Hai link route thật được thêm vào Drawer, giữ close/focus behavior; full fixture208/208 PASS. Không thêm logout giả. |
|03 Chuyển Owner | `GatewayMembersPage.tsx:638` chỉ là heading + giải thích capability, không phải nút chuyển quyền; `MembersPage.tsx:353` có nút local Preview. | **MODE_MISMATCH**. Không có Gateway transfer API trong UI để “ẩn đi”. Preview đổi thành menu cần D17; không thêm nhắn tin/xem đóng góp/phân công giả theo đề xuất. |
|04 Settings khóa fields | Trước D52 `LockedField` tạo bốn input disabled cho dữ liệu không thuộc PATCH. | **APPROVED/IMPLEMENTED A04**. Read-only summary và một note; ba trường supported giữ logic draft/conflict/unknown, Settings unit16/16 + Gateway/fixture PASS. |
|05 Plan thêm địa điểm | `GatewayPlanPanel.tsx` chọn ID từ `plan.selectedLocations`, cho phép null; không có create-location writer. | **CONTRACT_BOUNDARY**. Inline provider/location creation là mở rộng khả năng, không phải sửa CSS. Giữ saved IDs/null; không giả persistence hay hủy draft để dẫn sang write chưa có. |
|06 Skip-link đè form | `AppShell.module.css:20–33` đã ẩn bằng translateY(-180%), chỉ hiện khi focus. Hai regression tests Web402/320 trong full built fixture208/208 PASS: offscreen idle, in-viewport khi focus, Enter→main, ẩn sau invalid submit focus name. | **NOT_REPRODUCED / AUTOMATED_VERIFIED**. Giữ khả năng skip; không xóa link hoặc áp sr-only. Không phải manual screen-reader audit hoặc full visual comparison. |
|07 Banner quá lớn | Header/TripHero bám source; số150+76 không tự chứng minh>55% viewport. DLT03 compact header vẫn pending. | **UNMEASURED / D17_REQUIRED**. Không áp50px sticky/collapse hoặc cam kết thu hồi85% diện tích. Cần đo vùng nội dung theo route/viewport và review source trước đổi density/motion. |
|08 Create panel tĩnh | `GatewayCreateTripPage.tsx:346` giải thích chưa chọn destination; hai cột được user duyệt XRT01/D29. Không phải provider map thật. | **APPROVED_ADAPTATION**. Giữ panel/capability trung thực; bỏ/thay cần sửa quyết định riêng, không tự thêm destination controls. |
|09 Timezone text | Gateway Create trước D52 bắt nhập IANA thô; serializer/date logic hiện có. | **APPROVED/IMPLEMENTED A05**. Select nhãn dễ hiểu, sáu presets/custom IANA; date/DST và retry intent được test, full Gateway PASS. |
|10 Fund column | `GatewayFundPage.tsx` context form theo state `form`, có đóng và focus-return; vị trí phải desktop/dưới main được D18/FND03 duyệt. | **APPROVED_LAYOUT / PROPOSAL_CONFLICT**. Không tự chuyển Drawer theo báo cáo. Khung context có thể còn khi không mở form; đây là placement đã duyệt, không chứng minh mọi lúc đang tạo đợt thu. FND pending/CP09 deferred giữ nguyên. |
|11 Plan split | CP06 day-map/pool and responsive composition được D33 duyệt; saved unassigned/activity semantics riêng. | **APPROVED_LAYOUT / VISUAL_NOT_RUN**. Hẹp/khó đọc cần current capture với nội dung dài. Không thay split thành Drawer hoặc tự thu banner; PLN06/DLT03 vẫn pending. |
|12 Dress imagery/palette | Gateway projection chỉ có scope/description từ Plan, read-only panel D36; Preview khác khả năng. | **CAPABILITY_BOUNDARY**. Không dựng màu từ mô tả, ảnh outfit giả hoặc upload chưa có writer. Tính năng dữ liệu mới ngoài scope; visual proposal cần D17. |
|13 Price giờ/nguồn | `RuntimePriceWatchPage.tsx` dùng presentation thời gian, ghi rõ timezone thiết bị; badge `MOCK_FLIGHT · Mô phỏng`. CP10 PWT01/D46 dùng observations thật theo API/mock. | **ALREADY_HANDLED / PRESERVE_TRUTH**. Không xóa nhãn mô phỏng; observed/fetched khác flight date. Kiểm tra bằng Price observations E2E, không gọi đây là giá thị trường/live provider. |
|14 Packing chỉ đọc | Gateway read projection được CP07-P01/D36 duyệt; local checkbox/write chỉ Preview. | **APPROVED_CAPABILITY_BOUNDARY**. Không biến fixture toggle thành server persistence; personal items/writer cần scope mới. |
|15 Mascot che Settings | `AppShell.module.css` đã ẩn decoration ở max-height950/min-width769; CP05 D29 sửa Settings visibility. Chín height tests520/600/900/950/951/960/985/986/990 PASS trong full built fixture208/208. | **ALREADY_ADDRESSED / AUTOMATED_VERIFIED**. Từ600px active Settings nằm trong nav không cần scrollTop;520px auto-reveal active item. Không đổi ngưỡng800 hoặc bỏ mascot toàn bộ. |
|16 Card contrast | Card/background/border là token nguồn; độ khác nhau của nền không đồng nghĩa text contrast fail. | **VISUAL_NOT_RUN / D17_REQUIRED**. Cần xác định border có phải indicator bắt buộc, đo từng state/text; không normalize palette/shadow từ mã màu báo cáo. DLT04/PLN06 còn pending. |
|17 Home phone artwork | `HomePage.tsx:195` copy nói rõ trình duyệt máy tính/điện thoại; artwork nguồn vẫn được giữ theo D17. | **COPY_HANDLED / ASSET_PROPOSAL**. Không quảng bá store/native capability mới. Đổi ảnh nguồn cần asset được duyệt, không tự redraw/hình AI. |
|18 Trip filters | `TripListPage` search/filter/sort trên dữ liệu đã tải; có trạng thái no-match/cursor. | **DESIGN_PROPOSAL**. Số trips/năm trong báo cáo chưa đo. Không bỏ filter hoặc biến loaded count thành total. Đổi hierarchy cần D17. |
|19 404 plain | `router.tsx` wildcard dùng shared `ContentState state="not-found" showHome`, giữ route focus/Home recovery. | **POLISH_PROPOSAL**. Thêm mascot/copy/asset mới cần D17; không coi thiếu illustration là lỗi chặn route. `/not-found` là wildcard input, không thêm route thứ23. |
|20 Native select | `shared/components/Select.tsx` bọc native select bằng Field, error/hint associations, CSS và chevron; không phải control không style. | **PARTLY_INCORRECT / PRESERVE_A11Y**. OS popup native khác giữa browser là dự kiến; custom listbox cần thiết kế/keyboard QA riêng. Không thay tất cả select chỉ vì ảnh chụp. |

Các hàng D17_REQUIRED/PROPOSAL còn lại không phải yêu cầu user phải chọn ngay tất cả. CP11-A01 theo D50 và CP11-A02–A05 theo D52 đã được triển khai trong phạm vi riêng. Nhận xét về VietQR ở phần roadmap của input cũng không tự mở scope: GatewayFund hiện có instruction/VietQR reader; cần đúng contribution quyền/hành vi, không suy payment confirmation từ QR.

## 22 routes và kiểm tra liên quan

`T = /trips/:tripId`. Đây là mapping **test coverage hiện có**, không tuyên bố mọi state đều đã PASS. Kết quả actual suites ở [verification](CP11_VERIFICATION.md). Tất cả Gateway tests dùng HTTP mocks, fixture tests không chứng minh Backend.

| Route | Test files tiêu biểu (dưới tests/) | States/boundaries được bảo vệ |
| --- | --- | --- |
| `/` | `e2e/auth-fixture`, `e2e/app-shell`, `auth-fixture.test.tsx` | Guest/auth, public navigation, source assets, responsive. |
| `/trips` | `e2e-gateway/trips`, `e2e/trip-list`, `trip-list.test.tsx` | Loaded filters/sort, cursor retry, role/empty/stale. |
| `/trips/new` | `e2e-gateway/trips`, `cp05-create-modal`, `cp05-create-axe`, `gateway-create-trip.test.tsx` | IANA/date validation, immutable intent, unknown/retry, success dialog focus. |
| `T` | `e2e-gateway/trip-overview`, `e2e/trip-overview` | Independent partial projections, route links, no fabricated zero totals. |
| `T/plan` | `e2e-gateway/plan`, `timeline-interaction`, `cp06-composition`, `cp06-editor`, `cp06-readonly` | Day/ALL/POOL, null/overnight, full reorder IDs, permission/conflict/unknown, editor focus. |
| `T/map` | `e2e-gateway/cp07-projections`, `cp07-composition`, `trip-map-nearby.test.tsx` | Saved list, provider unavailable/error, no fabricated data, read-only Gateway. |
| `T/dress-code` | `e2e-gateway/cp07-projections`, `cp07-composition`, `e2e/trip-workspace-projections` | Scope/empty/loading/denial and read-only Gateway. |
| `T/packing` | `e2e-gateway/cp07-projections`, `cp07-composition`, `e2e/packing-list` | Real progress/filter/status, Gateway no mutation, Preview local. |
| `T/members` | `e2e-gateway/members-policy`, `cp08-composition`, `cp08-lifecycle` | Cursor, Owner≠Holder, invite/policy/remove/leave, processing/recovery. |
| `T/fund` | `e2e-gateway/finance-operations`, `e2e/fund-preview`, Finance unit | int64, idempotency/actor, budget/destination/contribution/ledger, form focus. CP09 deferred work not silently completed. |
| `T/price-watch` | `e2e-gateway/ui-upgrade`, `price-observations-cp10`, `e2e/price-watch-preview` | MOCK_FLIGHT/lifecycle/version/cursor, history retry/source/times, no booking. |
| `T/settings` | `e2e-gateway/trips`, `trip-settings.test.tsx`, `e2e/trip-settings` | Supported fields, unknown intent journal, conflict refresh, draft/focus. |
| `/profile` | `e2e-gateway/identity`, `ui-upgrade`, `identity-session-boundary.test.tsx` | Versions/avatar/sessions/password/preferences, CSRF and session clear. |
| `/invitations` | `e2e-gateway/invitations`, `cp08-composition` | Scrub token, safe return, recipient/status/expiry, accept/decline. |
| `/invitations/local` | `e2e/members-preview`, invitation unit | Local Preview boundary, not a production-token journey. |
| `/login` | `e2e-gateway/identity`, `e2e/auth-fixture` | Credentials/CSRF, safe return, pending/error, keyboard. |
| `/register` | `e2e-gateway/identity`, `e2e/auth-fixture` |15–128 contract, accepted202≠authenticated, field errors. |
| `/forgot-password` | `e2e-gateway/identity`, `e2e/cp04-review` | Neutral response, validation, no account disclosure. |
| `/verify-email` | `e2e-gateway/identity`, identity unit | Token scrub/invalid/expired, no auto-login. |
| `/reset-password` | `e2e-gateway/identity`, identity unit | Missing token blocks locally, reset session clear, no secret in URL. |
| `/admin` | `e2e-gateway/admin-placeholder`, shell unit | Explicit role guard, truthful unavailable, no CRUD/API. |
| `*` | `e2e/cp04-review`, `e2e/app-shell` | Not-found recovery, main focus, responsive. |

Cross-route: `foundations-cp03`, `foundations-zoom`, `cp04/05-review`, `cp04/05-zoom`, `cp07/08-native-zoom`, `cp11-plan-native-zoom`, `ui-acceptance`, `app-shell`, `web-fix-regressions`: focus traps/return, scroll locks, reflow, reduced motion, sampled axe/native zoom. Post-D50 native Gateway Plan200% PASS (HTTP mocks), not a retroactive CP06 result. Post-D52 default CP06 axe5/5 zero after shell label repair; historical findings remain archived. This is not exhaustive screen-reader/manual accessibility or live Backend coverage.
