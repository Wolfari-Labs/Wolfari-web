# Phase 1 · App Shell reconcile · 15/10/2026

Hoàn thiện shell trong `Wolfari-web` theo screen contract mới, data mode fixture. Đây là báo cáo bàn giao Phase 1 hiện tại, đã gộp hướng dẫn bootstrap và reconcile để tránh tài liệu trùng hoặc kết quả kiểm tra cũ. Không triển khai feature body hoặc tích hợp Backend.

## Reconcile trước khi sửa

| Hạng mục                                                     | Trạng thái ban đầu                | Patch/kết quả                                                                                                            |
| ------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| React/TypeScript strict/Vite, providers, repository boundary | Đúng                              | Giữ bootstrap, QueryClient, memory-only token store và HTTP client chưa kết nối                                          |
| Route inventory và fallback                                  | Đúng một phần                     | Giữ 8 route placeholder; fallback 404 độc lập trạng thái đọc shell; bổ sung `/admin` theo quyết định người dùng          |
| Visual Desktop/Mobile                                        | Đúng một phần                     | Giữ logo/icon/token từ Figma; bổ sung Admin chrome; Mobile theo Web contract                                             |
| Responsive/scroll                                            | Thiếu kiểm tra boundary           | Desktop main/nav cuộn riêng, document cố định; Mobile/public natural flow; short laptop compact decor                    |
| Keyboard/drawer                                              | Thiếu                             | Native dialog + Tab/Shift+Tab trap, Escape/backdrop/close, trả focus trigger; chọn destination focus main                |
| Permission                                                   | Thiếu guard ready snapshot        | `canRead=false` không render Trip outlet; Guest không render `/trips`/`/profile`; ADMIN khai báo rõ, không suy ra từ URL |
| Admin route                                                  | Chưa xác định                     | Người dùng chốt `/admin` ngày 15/10/2026, fixture-only; không tạo route con/API                                          |
| States/repository                                            | Đúng boundary, thiếu coverage mới | Cùng interface/model; thêm explicit Admin và denied snapshot; fixture không tạo Trip từ ID tùy ý                         |
| Browser tests                                                | Lệch với drawer contract mới      | Reconcile assertions, giữ kiểm tra thật bằng Chromium; 24 tests đạt                                                      |

## Route / screen / flow

Các route shell placeholder: `/`, `/login`, `/register`, `/trips`, `/trips/:tripId`, `/trips/:tripId/plan`, `/trips/:tripId/members`, `/profile`, `/admin`. Wildcard trả not-found, không redirect im lặng. Đây là placeholder theo inventory, không chứng minh feature screen đã hoàn thành.

Logo về Home; account về Profile, Guest về Login. Plan/Members chuyển theo route có sẵn. Các section Trip target còn lại và 6 section Admin chỉ đổi lựa chọn/title/breadcrumb local, không tạo feature route hoặc gọi command. Chuyển destination đóng drawer, focus main và reset scroll, kể cả chọn lại destination hiện tại. Browser Back từ Plan/Members về base Trip hiển thị Tổng quan. Link hồ sơ giữ accessible name khi phần tên được thu gọn trên tablet.

Desktop Trip: header 76px, sidebar 220px/72px, page cố định theo viewport, main và nav cuộn riêng. Admin: sidebar 248px, topbar 72px, main/nav cuộn riêng. Mobile ≤768px: header 54px, hamburger trái, logo giữa, avatar phải, title trong content; drawer trái tối đa 280px, target 48px, menu đóng không truy cập được bằng keyboard. Mobile/public/auth cuộn theo document. Body scroll lock chỉ áp dụng trong lúc drawer modal mở.

## Figma mapping

File [Wolfari · Travel Workspace](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace), pages Desktop `0:1`, Mobile `310:2025`, Admin `194:1073` đã đọc. Không sửa Figma trong lượt reconcile.

| Node                            | Mapping                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `135:483`                       | Desktop header/variants                                                                                 |
| `135:484`, `135:1042`           | Expanded/collapsed Trip sidebar                                                                         |
| `325:2266`, `322:2268`          | Mobile source header; Web adaptation theo screen contract, không dùng native bottom tab/back-title-More |
| `197:1074`, `194:1084`          | Admin sidebar/nav                                                                                       |
| `194:1085`                      | Admin breadcrumb/account topbar, local bell asset `06423.svg`                                           |
| Admin prototype `194:1094–1098` | Chỉ dùng selection/placeholder và intent reset scroll; chưa dựng feature body                           |

Original assets và fonts được bundle local: Be Vietnam Pro/Caveat từ Fontsource; SF Pro dùng system fallback, không phân phối font Apple. Breakpoint 768px, compact decor cho laptop thấp và Mobile Web drawer là adaptation theo contract; native Glass/device chrome không được tái hiện như giao diện app, không khẳng định pixel-identical native rendering.

## Domain / repository / API evidence

`ShellRepository.read({ tripId, scenario, signal })` trả `ReadResult<ShellSnapshot>`. Fixture và Gateway cùng interface. Model giữ viewer `fullName/version/systemRole`, Trip `planVersion/membershipRevision/exportRevision` và `permissions.canRead/canUpdate`. `MutationIntent` giữ idempotency/expected revisions cho contract tương lai; shell hiện tại không có mutation.

Scenario `admin` là lựa chọn preview tường minh, không phải đăng nhập và không cấp quyền Trip. USER mặc định mở `/admin` nhận forbidden. Trip fixture duy nhất là `11111111-1111-4111-8111-111111111111`; ID khác trả RESOURCE_NOT_FOUND. `forbidden-snapshot` kiểm tra ready snapshot nhưng `canRead=false`. Không có fixture success thay cho server write.

| Action/read                                          | Readiness trong Phase 1 | Evidence / giới hạn                                                                                                                                                          |
| ---------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đọc shell fixture, drawer/collapse/section selection | `mock-only`             | Local repository/UI, không gửi HTTP                                                                                                                                          |
| Viewer Self cho adapter sau                          | `runtime-candidate`     | Backend `apps/api-gateway/src/identity-proxy.ts` có GET `/api/v1/me`; Identity projection giữ `system_role`, `version`, `full_name`. Chưa chạy integration/session trong Web |
| Trip permission/revision cho adapter sau             | `runtime-candidate`     | Backend `apps/api-gateway/src/trip-proxy.ts` có Trip route/projection, permission và revision; chưa nối adapter Web                                                          |
| Plan/Members navigation                              | `mock-only`             | Chỉ route placeholder. `plan-proxy.ts`/`membership-proxy.ts` là runtime source để đối chiếu cho flow sau; shell không đọc feature data                                       |
| Admin sections/notification                          | `mock-only`             | Selection local; notification disabled; chưa khai báo hoặc gọi API Admin                                                                                                     |
| Shell production Gateway                             | `mock-only`             | Composition boundary nhận verified reader; hiện chưa có reader, trả unavailable, không tạo `/shell` API                                                                      |

Các label trên không chứng minh runtime-ready. Backend runtime chỉ được đọc đối chiếu, không sửa. Component dùng view model/repository, không fetch, không ghép transport URL/envelope, không persistent token storage. Production build loại module fixture và các giá trị nhận dạng fixture; explicit preview build có fixture chunk.

HTTP foundation trong `infrastructure/http` chưa kết nối shell: chỉ có GET read, envelope/error/correlation mapping, abort/timeout, cookie read tường minh và memory-only access-token store. Không có feature endpoint, refresh/retry tự động hoặc mutation method. `tests/proxy.test.ts` kiểm tra Vite proxy giữ nguyên `/api/v1` với ephemeral test upstream; không cần Backend runtime. Auth/CSRF/session lifecycle thuộc Phase 4.

## State coverage

9 placeholder routes được kiểm tra success/loading/empty/error/forbidden/not-found/conflict/unavailable. Conflict chỉ reload read; không ghi đè revision. Guest/USER/ADMIN và ready snapshot denied được kiểm tra riêng. Unknown route vẫn 404 khi Gateway shell unavailable. Validation/pending/unknown mutation không áp dụng vì không có command; trạng thái write của feature flow vẫn là yêu cầu tương lai trong state matrix.

## Commands / results

Môi trường: Node 24, Corepack + pnpm 10.34.5. Chromium có sẵn được dùng qua executable override; không bỏ assertion vì default Playwright binary khác revision.

| Command                                            | Result                                     |
| -------------------------------------------------- | ------------------------------------------ |
| `corepack pnpm lint`                               | PASS                                       |
| `corepack pnpm typecheck`                          | PASS                                       |
| `corepack pnpm test`                               | PASS: 40 tests, 4 files                    |
| `corepack pnpm test:e2e`                           | PASS: 24 browser tests                     |
| `corepack pnpm build:preview`                      | PASS, fixture preview chunk                |
| `corepack pnpm build`                              | PASS, production fixture exclusion checked |
| Git status/graph/diff/whitespace và transport scan | Đã kiểm tra; không stage/commit/push       |

Browser run dùng server Vite riêng với `PLAYWRIGHT_EXTERNAL_SERVER=1` và `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Users/NGUYEN THI TRANG/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe` để tránh Windows managed-server teardown. Server được dừng sau QA.

Viewport coverage: 1440×800, 1440×960, 1366×600, 1366×520, 1024×600, 820×600, 768×1024, 402×874, 320×480; Admin thêm 1024×520 và 402×600. Assertions bao gồm geometry, nội dung cuối main/nav, không document scroll ở Desktop workspace, natural Mobile scroll, focus trap/return/skip link, Escape/backdrop, route/Back/reset scroll, quyền, state, SVG dimensions, zero API requests và zero persistent browser storage. Screenshots Desktop/Mobile/Admin đã xem trong ignored `test-results/` và có thể tái tạo bằng browser test.

## Files changed trong lượt reconcile

- `src/app/App.tsx`, `router.tsx`, `route-paths.ts`: guard, title, navigation/focus/scroll/fallback, Admin placeholder.
- `src/features/shell/components/AppShell.tsx`, `AppShell.module.css`: responsive shell/boundaries; thêm `MobileDrawer.tsx`/`.module.css`, `AdminChrome.tsx`/`.module.css`.
- `src/features/shell/model/shell.ts`, `src/infrastructure/fixtures/shell.fixture-repository.ts`: system role/scenarios và fixture resource scope.
- `src/shared/components/ContentState.tsx`/`.module.css`, `src/shared/styles/global.css`: unavailable state, semantic headings/title.
- `src/shared/assets/figma/06423.svg`: local Admin bell từ Figma.
- `tests/setup.ts`, `shell-navigation.test.tsx`, `shell-repository.test.ts`, `e2e/app-shell.spec.ts`: reconcile contract assertions; HTTP/proxy tests giữ nguyên.
- `docs/screen-contracts.md`, `screen-inventory.md`, `flow-map.md`, `state-matrix.md`, `figma-implementation-matrix.md` và báo cáo này: cập nhật Admin/shell behavior/evidence.

Bootstrap/config/README và các tài liệu có sẵn trong working tree được giữ lại. Không xóa hoặc reset implementation cũ.

## Git / remaining gaps

Branch `ui/app-shell`; `main`, `develop` và UI branch cùng base `0e41b0983b4ce2362b2e4b29128ae55fbd69cdd5`, đúng recovery workflow. Không tạo lại branch, Issue, PR hoặc commit. Working tree vẫn có README modified và bootstrap/docs/source/test/config untracked từ trước; chưa được người dùng yêu cầu commit. Git safe.directory dùng riêng từng command để đọc repo trong sandbox, không sửa global config.

Không có blocker cho phạm vi fixture App Shell. Feature bodies, auth/session, verified Gateway adapters và Admin APIs thuộc flow sau. CI chưa chạy trên GitHub vì chưa push; các command local đều đạt. Backend/Mobile working tree không thay đổi.

Chạy local từ `Wolfari-web`: `corepack pnpm dev`, mở `http://127.0.0.1:5173`; preview panel chọn Trip hoặc Admin và scenario tương ứng. Để xem Admin allowed, chọn scenario `admin`; mở URL `/admin` đơn thuần không cấp quyền. Production `build` hiện hiển thị unavailable boundary đến khi adapter được triển khai.

## Reconcile sau inventory toàn bộ · 15/10/2026

Đã đối chiếu lại code thực tế với [full inventory](figma-screen-map-2026-10-15.md), screen/flow/state contracts và runtime matrix mới. Các profile feature draft/blocked không mở rộng Phase 1 shell hoặc cho phép thêm route/API. Giữ implementation đã đúng từ lượt trước; không scaffold/reset lại.

| Hạng mục                    | Kết luận trước patch                  | Xử lý / bằng chứng mới                                                                                                                                          |
| --------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route                       | Đúng                                  | Giữ 9 placeholder và wildcard 404; target routes chưa chốt vẫn không được tạo                                                                                   |
| Visual                      | Đúng trong shell mapping              | Đọc lại Header 135:483, sidebar 135:484, Mobile 325:2266/322:2268; xem ảnh browser mới Desktop/Mobile. Giữ assets/tokens/layout                                 |
| Responsive                  | Đúng                                  | Fixed Desktop Trip, main/nav boundaries, compact short laptop; Mobile hamburger/logo/avatar, title content, drawer/backdrop, natural page flow và no bottom tab |
| States                      | Đúng                                  | Loading/success placeholder/empty/error/forbidden/not-found/conflict/unavailable; no mutations, pending/unknown write N/A                                       |
| Permission                  | Đúng code, thiếu browser permutation  | Bổ sung Guest assertion trên Trip/Plan/Members/Admin; private outlet không render, restore đúng scenario để tiếp tục state checks                               |
| Repository boundary         | Đúng                                  | Cùng ShellRepository/ReadResult/ShellSnapshot; version/revision/permission giữ nguyên, no mutation, Gateway unavailable, fixture không vào production bundle    |
| Test                        | Thiếu Guest permutation, còn lại đúng | Giữ assertions cũ, mở rộng shared-state browser test; 40 unit/component/proxy và 24 browser tests PASS                                                          |
| Bàn giao                    | Lệch README pointer                   | README dẫn tới báo cáo reconcile hiện tại, giữ link báo cáo cũ cho lịch sử                                                                                      |
| Admin feature source / APIs | Chưa xác định ngoài scope             | Hai bộ Figma/Admin target contracts vẫn gated theo inventory; không đổi shell, route con hoặc Backend                                                           |

Production code giữ nguyên: AppShell, MobileDrawer, AdminChrome, router/providers/error boundary, styles, domain model và cả hai repository. Patch chỉ gồm `tests/e2e/app-shell.spec.ts`, link README và phần báo cáo này; không có behavior mới cần đổi screen/flow/state contracts.

### Kiểm tra chạy lại

- `corepack pnpm lint`: PASS.
- `corepack pnpm typecheck`: PASS, chạy lại sau patch test.
- `corepack pnpm test`: PASS, 40 tests/4 files.
- `corepack pnpm test:e2e`: PASS, 24 tests, Chromium executable override và external Vite server; Guest private routes được kiểm tra thêm trong các test hiện có.
- `corepack pnpm build:preview`, `corepack pnpm build`: PASS; build production cuối cùng, scan không có fixture module/identity values.
- Scan UI transport/storage: không fetch, HTTP path/envelope hoặc persistent token storage trong app/features/shared.
- Desktop 1440×800/960, short laptop 1366×600/520, tablet 1024/820/768 và Mobile 402/320: browser assertions đạt; route/Back/focus trap/return/skip link/scroll đều giữ nguyên. Figma Mobile source native header được thích nghi theo Web contract, không khẳng định pixel-identical native chrome.
- Git diff/status/graph/whitespace kiểm tra lại; Vite server do lượt này khởi chạy được dừng sau QA. Giữ nhánh `ui/app-shell`, không stage/commit/Issue/PR/push, Backend/Mobile không đổi.

Không có blocker cho fixture App Shell. Các gap API/feature/recovery/tablet source/Admin canonical trong inventory là gate cho flow tiếp theo, không phải bằng chứng Phase 1 thiếu feature body.

## Dọn source và tổ chức commit · 15/10/2026

Theo yêu cầu người dùng, loại 6 SVG không còn consumer sau Web drawer migration (`131b4`, `542c8`, `584ff`, `635fe`, `8366a`, `bbf29`); giữ 24 asset shell đang dùng. Bỏ CSS drawer/backdrop/native glass header cũ và shadow token không được tham chiếu. Drawer modal hiện tại giữ nguyên behavior và CSS riêng.

Gộp hướng dẫn hữu ích của báo cáo bootstrap cũ vào tài liệu này, cập nhật README/screen contract và bỏ báo cáo trùng trước commit đầu tiên. Các tài liệu kiến trúc, prompt templates, full Figma map/snapshot và runtime evidence được giữ làm nguồn/decision record. Generated `node_modules`, `dist`, coverage, Playwright report và test-results nằm trong gitignore, không đưa vào commit.

Commit được tổ chức theo dependency: baseline kiến trúc/quy trình → app shell/toolchain/tests → inventory/contracts/bàn giao. Các dòng “chưa commit” phía trên ghi trạng thái tại mốc kiểm tra tương ứng trước khi người dùng yêu cầu commit; trạng thái hiện tại xem `git log` và `git status`. Không push hoặc mở Issue/PR trong lượt này.

Kiểm tra lại sau khi dọn: frozen-lockfile install, lint, typecheck, 40 unit/component tests, 24 browser tests, fixture preview build và production build đều PASS. Production bundle không có fixture; UI transport/storage scan, local Markdown file links và snapshot Figma references/counts/readiness đều PASS. Hai action chỉnh sửa Trip giữ nhãn `partial-runtime` vì form chứa field ngoài phạm vi route update, dù capability update cơ bản là `runtime-candidate`. Dev server do lượt này khởi chạy đã được dừng sau browser QA.
