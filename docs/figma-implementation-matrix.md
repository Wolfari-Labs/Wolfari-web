# Wolfari Web — Figma Implementation Matrix

## Nguồn thiết kế

- File: [Wolfari · Travel Workspace](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace)
- Pages đã được ghi nhận: `Wolfari · Desktop`, `Wolfari · Mobile`, `Wolfari · Admin`.
- Figma là nguồn cho visual hierarchy, typography, spacing, component variants và prototype intent.
- Backend runtime là nguồn cho khả năng nghiệp vụ, permission, version, error và mutation behavior.

## Shared shell mapping

| Figma node/frame                          | Web mapping                                      | Responsive contract                                                                | Evidence                                            |
| ----------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| Desktop Header `135:483`                  | `AppShell` desktop header                        | 76px representative header                                                         | `AppShell.tsx`, `tokens.css`                        |
| Sidebar `135:484`                         | Expanded trip sidebar                            | 220px, page-level fixed                                                            | `AppShell.module.css`                               |
| Sidebar `135:1042`                        | Collapsed sidebar                                | 72px, icon-only                                                                    | `AppShell.module.css`                               |
| Mobile header `325:2266`                  | Mobile trip header: Web adaptation theo contract | hamburger left, logo center, avatar right; native back/title/More không dùng ở Web | `AppShell.tsx`                                      |
| Mobile home header `322:2268`             | Public/home mobile header                        | natural page flow                                                                  | `AppShell.tsx`                                      |
| Mobile drawer                             | Modal drawer + backdrop theo Web contract        | hidden/off-canvas, max 280px, 48px targets; focus/Escape/scroll                    | `shared/components/Drawer.tsx`, `Drawer.module.css` |
| Admin sidebar `197:1074` / nav `194:1084` | Admin shell `/admin`, mock-only                  | 248px desktop; Mobile drawer theo contract Web                                     | `AdminChrome.tsx`                                   |
| Admin topbar `194:1085`                   | Admin breadcrumb/account shell                   | 72px desktop; 54px shared Mobile adaptation                                        | `AdminChrome.tsx`                                   |

Native Mobile tab bar/section switcher không thuộc Mobile Web contract hiện tại. Desktop decor thu gọn/ẩn ở short laptop; nội dung main/nav không được cắt để né responsive. Admin prototype nav dẫn tới các frame `194:1094–1098`; Phase 1 chỉ đổi selection/placeholder trên `/admin`, không triển khai body hoặc API của các frame đó.

Acceptance evidence ngày 15/10/2026: `tests/e2e/app-shell.spec.ts` đạt 24 browser tests với Chromium có sẵn. Đã xem screenshot Desktop 1440×800, Mobile 402×874, Admin 1440×800 và Admin drawer 402×600; ảnh được sinh trong `test-results/` (ignored). Xem [báo cáo reconcile Phase 1](app-shell-reconcile-2026-10-15.md) cho mapping và giới hạn hiện tại.

## Frame-to-screen mapping rules

Mỗi frame mới phải thêm một dòng có đủ:

| Field                 | Bắt buộc                                               |
| --------------------- | ------------------------------------------------------ |
| Figma page/frame/node | Tên và node URL/ID                                     |
| Web route             | Route thật hoặc `not-yet-routed`                       |
| Actor                 | Guest/User/Member/Owner/Plan Editor/Admin              |
| Data mode             | fixture/gateway/unavailable                            |
| Domain owner          | Identity/Trip/Plan/Travel/Finance/etc.                 |
| Main query            | Repository method và view model                        |
| Commands              | Actions, permission, idempotency/version nếu có        |
| UI states             | Loading/success/empty/error/forbidden/conflict/pending |
| Scroll boundary       | Page/main/component/drawer                             |
| Acceptance evidence   | Test, screenshot hoặc browser check                    |

## Visual fidelity gates

- Asset dùng local, không để URL Figma trong production.
- Typography, token, spacing, radius, shadow và icon mapping truy được về Figma node.
- Desktop representative viewport: 1440×800 cho shell; không dùng page-level scroll ở trip workspace.
- Short laptop: compact spacing trước khi cho page overflow.
- Mobile: không cắt nội dung bằng `overflow: hidden`; public/auth dùng natural document flow.
- Mobile trip: drawer ẩn/hiện; header không chứa page title; title nằm trong content.
- Keyboard: skip link, focus-visible, Escape/backdrop close drawer khi flow yêu cầu.
- Visual match không được đánh đổi bằng việc bỏ loading, empty, error hoặc permission state.

## Backend readiness labels

| Label               | Cách dùng                                                                          |
| ------------------- | ---------------------------------------------------------------------------------- |
| `mock-only`         | Figma/fixture để duyệt visual; không có runtime contract                           |
| `partial-runtime`   | Có một phần endpoint/projection nhưng còn gap                                      |
| `runtime-candidate` | Có route/handler cần verify trước khi bật                                          |
| `runtime-ready`     | Route, handler, schema, permission, error, version/idempotency và test đã xác nhận |

Không dùng label `runtime-ready` chỉ vì Figma đã có frame hoặc OpenAPI đã có schema.

## Whole-file frame / variant / action mapping

[Full map](figma-screen-map-2026-10-15.md) nối toàn bộ 150 cấp-page source frame/board/set → route/host → actor → domain → fixture → state profile → scroll. [Snapshot](figma-inventory-2026-10-15.json): 17 sets/81 variants, 2.149 prototype entries, 110 unwired patterns, nested modal/target ownership/action readiness. [Runtime matrix](runtime-evidence-2026-10-15.md) là gate trước feature code.

Metadata không node chỉ liệt kê Desktop trong response hiện tại; Plugin API discovery và per-page reads xác nhận Desktop 0:1, Mobile 310:2025 và Admin 194:1073. Không suy ra page mất từ metadata chưa hydrate.

Admin Desktop 538:4973–541:5636 và Admin page 194:1093–216:1472 có section/flow khác; giữ cả hai, chưa canonical feature/navigation/child routes. Shell hiện có giữ source mapping cũ, không sửa UI/Figma trong task inventory.

Mobile native Tab bar/Trip section switcher/Apple samples/device chrome được kiểm kê nhưng không chuyển thành Web shell. Web giữ drawer/header/title theo contract; không tablet source riêng, breakpoint/tablet acceptance là adaptation.

Saved/created/completed và OVERLAY/NAVIGATE/CONDITIONAL không API evidence. Missing route/handler/schema/permission/version/idempotency → mock-only hoặc unknown; runtime-ready cần runtime/integration proof.

## Phase 2 — Shared UI foundation

Component-level mapping, không dựng lại toàn bộ showcase canvas hoặc feature screen. Chi tiết token, asset, Web adaptation và kiểm tra ở [bàn giao Phase 2](design-system-phase2.md).

| Figma source                                                                 | Shared implementation                           | Variant / adaptation                                                                                                |
| ---------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Desktop board `3:33`; Button `11:9`, `11:14`                                 | `Button`, tokens                                | Desktop gradient/outline, 44px, radius 18px; icon local 18px                                                        |
| Mobile Button `320:2144` / `320:2138–2143`                                   | `Button` responsive                             | 52px pill, teal/secondary, pressed/disabled; loading/hover/focus là Web state extension                             |
| Input Search `11:23`; login field `298:1983`; Mobile Field `320:2154`        | `Input`, internal `Field`                       | Native label/input; icon swappable, hint/error/aria-invalid; Desktop 44px/Mobile 52px                               |
| Sort dropdown `65:622`                                                       | `Select`                                        | Native select và local 16px chevron; source 40px nâng 44px theo touch contract; Mobile 52px/control radius          |
| Login note `298:2004`, profile note `299:1888`; status tones `403:3369`      | `Alert`                                         | Reusable wrapping notice; tones từ palette source, full notice/error semantics là Web adaptation, không clone badge |
| Shared state contract, chưa có dedicated source loading/empty/error variants | `ContentState`, `Skeleton`                      | Dùng Button/Skeleton; lỗi thiếu details vẫn là error; không tự báo mutation success                                 |
| Trip sidebar `135:484`/`135:1042`; Admin nav `194:1084`                      | `NavigationButton`, existing shell compositions | Desktop targets ≥44px cả short laptop; Drawer targets 48px; giữ selection/permission/route                          |
| Desktop/Mobile shells `135:483`, `325:2266`; Web drawer contract             | `Drawer`, asset map/local fonts                 | Drawer chuyển từ feature sang shared, giữ modal/focus/Escape/backdrop/scroll; không native tab/Glass chrome         |

Breakpoint 768/360/1100px và height 950px là Web responsive policy có sẵn, không gọi là Figma-exported variable. `design-system.html` là sandbox development/explicit fixture preview, không route sản phẩm và không nằm trong production build.

## Phase 3 — Trip List

Scope được người dùng chốt ngày 15/10/2026; [Trip List contract](screen-contracts.md#contract-trip-list). Đây là mapping của implementation fixture đang được hoàn thiện, không phải kết luận visual/test đã đạt hoặc API runtime đã chạy.

| Figma node / frame                                 | Route / actor / domain / data                  | Visual / interaction mapping                                                                                                                                                                  |
| -------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop `3:29`                                     | `/trips` / Authenticated User / Trip / fixture | Node canonical của danh sách; metadata hiện ghi `02 · Chuyến đi của tôi`, task gọi `03`. Hero + toolbar/status filters + sáu-card catalog; Desktop 1440px ba cột/gutter 64px                  |
| Mobile `317:2029` (`M05 · Chuyến đi của tôi`)      | Cùng `/trips`, actor và repository             | Giữ hero đầu/compact các item còn lại, sáu canonical Desktop trips dùng chung. Ảnh Mobile riêng khi có `cover.mobileSrc`, còn lại fallback Desktop cover; không tự thay fixture theo viewport |
| Header `135:483`                                   | Shared `AppShell` / cùng fixture session       | Header Desktop 76px cố định, main cuộn; Mobile logo giữa/hamburger trái/avatar phải, title trong content                                                                                      |
| Trip sidebar `135:1357`                            | Reference của trip workspace                   | Chỉ tham khảo shared navigation/Drawer; list Desktop không có trip sidebar. Không mở thêm route hoặc feature của sidebar                                                                      |
| Search / dropdown source, status filters trên list | Local controls, không HTTP                     | Name search, sort “Mặc định”/start date tăng/giảm; all/ONGOING/UPCOMING/COMPLETED/ARCHIVED. Role/time/advanced controls và writes chưa chốt behavior được disabled                            |
| Local assets / typography                          | Shared asset map và fonts                      | Dùng local Figma SVG/PNG, Be Vietnam Pro và Kalam theo source; không runtime Figma asset URL hoặc secret                                                                                      |

### Responsive / scroll adaptation đã chốt

| Viewport                            | Layout / boundary / accessible controls                                                                                                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop 1440×800                    | Header 76px cố định; main cuộn trong viewport; ba cột/gutter 64px; không trip sidebar hoặc page scroll                                                                                                                             |
| Short laptop 1366×520               | Hero compact 138px/gutter 32px; main vẫn cuộn truy cập đủ toolbar và cards, không overflow clip để che content                                                                                                                     |
| Tablet 820px                        | Grid hai cột, giữ controls và main boundary; tablet là Web adaptation, không khẳng định Figma có source tablet riêng                                                                                                               |
| Mobile ≤768px, representative 402px | Natural document scroll; title trong content; first hero card/compact rest; drawer trái, logo giữa, avatar phải; không native bottom tab                                                                                           |
| Mobile filters                      | Năm status choices trong row cuộn ngang, targets ≥44px. Đây là Web adaptation của M05 ba pill source để all/archived vẫn truy cập được. Search/sort trong disclosure “Tìm kiếm và sắp xếp”; state và dataset giữ nguyên khi resize |

`TripRepository.listTrips` trả `TripListViewModel` có current membership/permissions và ba revisions. Chỉ readable items được hiển thị; open link tới `/trips/:tripId` vẫn là Overview placeholder đã có. Sáu canonical fixtures giữ lifecycle explicit theo mốc `2026-09-23`; default `all`/catalog order, date comparator dùng start instant với stable ID fallback, không “nearest” theo đồng hồ máy. Cover/member count/mobile cover là nullable presentation targets, không DTO fields đã được Gateway cung cấp.

Runtime static audit: GET list `runtime-candidate`, Figma enrichment `partial-runtime`; không Backend call hoặc readiness promotion. Server chưa có search/custom sort/enrichment; default server list loại archived khác `all` fixture. Create/edit/archive/delete disabled, không mutation success, write pending/unknown/idempotency không áp dụng. Gateway adapter cùng interface nhưng trả unavailable trong Phase 3.

Acceptance ngày 15/10/2026: lint/typecheck/test/build/build:preview đạt; **95 unit/component/proxy tests và 47 Chromium E2E tests đạt**. Đã xem screenshot Desktop/Mobile/short laptop và kiểm tra geometry cả sáu viewport bằng browser. Artifacts ignored: `test-results/trip-list-Trip-List-layout-*/trip-list.png`.

E2E chạy serial trên fixture preview với external server và Playwright CLI `test --workers=1` (exit 0). Managed dev-server teardown trong sandbox Windows bị treo sau assertions nên dùng preview server do runner sở hữu và đóng trong finally; giữ nguyên toàn bộ assertions. Production bundle không chứa catalog/UUID/error marker fixture; production browser `/trips` unavailable, không fixture controls/items/API request. Skip link được sửa từ 42px lên 44px; route aliases `/trips/`/`/TRIPS` giữ guard/layout; accessible status name bao gồm label Mobile.

### Phase 3 Auth fixture / Home / Self profile

[Figma → route → actor/component, domain và runtime gaps](auth-fixture-phase3.md). Home `3:28`/`298:1642`/M01/M04, Auth `298:1893`/`298:2007`/M02/M03, Self `299:1847`/M22/M32. Web shared header và document scroll thay native bars/tabs; không thêm route. HomeRepository public story projection mock-only; Self/session read runtime-candidate, Gateway unavailable.

Auth fixture acceptance 15/10/2026: lint/typecheck/test/build/build:preview pass; 115 unit/component/proxy tests và 57 Chromium E2E pass (serial external preview runner, exit 0). Đã review screenshot desktop, short laptop và Mobile. Production marker scan không có fixture records/IDs; build có warning chunk >500kB, cần tách route khi mở rộng flow. Backend HEAD d8c02cb sạch, chỉ đọc.

### Trip Overview fixture

`3:31`/`3:32` → Desktop expanded/collapsed; `317:2032` → Mobile Web adaptation của cùng `/trips/:tripId`, Member/Owner. [Component/domain/scroll/runtime mapping](trip-overview-phase3.md). Trip List canonical dates/name giữ nguyên; cover theo Overview frame, unsupported dashboard numbers thay unavailable. Tablet là Web adaptation, không tuyên bố có Figma tablet frame. Router lazy-load feature bodies và shell loading boundary.

Overview acceptance 15/10/2026: lint/typecheck/test/build/build:preview pass, **124 unit/component/proxy và 65 Chromium E2E tests pass**. Full regression sau route splitting dùng hai browser workers, exit 0; route/body readiness assertions giữ nguyên scroll/asset checks. Đã review Desktop/Mobile screenshots; production lazy chunks hết warning >500kB và fixture marker scan pass.
