# Phase 2 — Design system và shared UI foundation

Ngày 15/10/2026. Scope: foundation theo Figma, fixture presentation; không dựng feature business, không tích hợp Backend. Phần đúng của Phase 1 được giữ và migrate incremental.

## Summary / Git dependency

Phase 1 `ff88629` đã fast-forward local vào `develop`; `ui/design-system` tạo từ `develop` tại commit này. `main` giữ `0e41b09`, không push, Issue hoặc PR. Ba prompt người dùng đang chỉnh được xác nhận, tạm stash đúng ba đường dẫn khi chuyển branch, apply và so diff khớp bản gốc rồi bỏ stash tạm. Không đưa các prompt vào thay đổi implementation.

Sandbox: `corepack pnpm dev`, mở `http://127.0.0.1:5173/design-system.html`, hoặc link Shared UI foundation trong App Shell preview panel. `corepack pnpm build:preview` xuất sandbox và fixture shell; `corepack pnpm build` chỉ xuất entry production `index.html`, Gateway boundary hiện vẫn unavailable. Sandbox không phải React Router/product route.

## Figma / visual mapping

Đọc bằng Figma MCP + skill `figma-design-to-code`; dùng design context, variable definitions và screenshot, không sửa Figma. Mapping component-level, không clone toàn bộ canvas showcase hoặc render feature screen.

| Source node                                              | Mapping / bằng chứng dùng chung                                                                                                                |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop Components & Decorations `3:33`                  | Palette, typography, radius, soft shadow; primitives lặp trong Home/Trip/Auth/Profile                                                          |
| Button Primary `11:9`, Outline `11:14`                   | Desktop 44px, radius 18px, Be Vietnam Pro 15/22 medium, blue→teal gradient/outline; local send icon 18px                                       |
| Mobile Button `320:2144`                                 | Primary/Secondary, Default/Pressed/Disabled; 52px pill, teal `#317c89`, pressed `#245f6a`, line disabled                                       |
| Search Input `11:23`, login field `298:1983`             | Native input foundation với label/leading icon, Desktop 44px; không render login/search business                                               |
| Mobile Field `320:2154`                                  | 52px/control radius 16, default/focus/error, editable value/swappable leading icon                                                             |
| Sort dropdown `65:622`                                   | Native Select, local chevron; source 40px nâng ≥44px theo touch requirement, Mobile 52px                                                       |
| Login note `298:2004`, Self note `299:1888`              | Alert info sử dụng wrapping layout thay absolute text height; palette/border/radius source                                                     |
| Mobile status tones `403:3369`, showcase `405:3634`      | Mint/amber/neutral palette và shadow; full Alert tones là Web adaptation, không clone source badge. Success tone không xác nhận dữ liệu đã lưu |
| Trip Sidebar `135:484`, `135:1042`; Admin Nav `194:1084` | Shared NavigationButton, owning shell giữ label/icon/selection/permission; giữ Admin marker/badge layout                                       |
| Desktop/Mobile shells `135:483`, `325:2266`              | Shared drawer theo Web contract. Giữ hamburger trái/logo giữa/avatar phải/title trong content; không native tab/Glass/back-title-more chrome   |

## Token / asset mapping

`src/shared/styles/tokens.css` giữ palette Desktop và Mobile riêng: ink `#06458b`, blue `#0089c7`, line `#cdebf7`, pale `#f3fbff`, selected `#e8f7fa`; Mobile ink/muted/teal/pressed/line/mint/amber/coral. Spacing 4/8/12/16/24/32 từ component variables; 14/20/28/48 từ component/layout context. Radius 7/8/10/12/16/18/20/24/pill và soft/mobile/selection/header/drawer shadows có source hoặc Web shell policy đã ghi.

Typography: body 16/24, label 15/22, small 13/20, card title 20/28, title 24/32, heading 32/40. Local `fonts.css` dùng Be Vietnam Pro 400/500/600/700 Latin + Vietnamese và Caveat 700 Latin/Latin-ext từ package đã cài, không đổi dependencies/lockfile. Mobile dùng system SF Pro stack; Windows/Linux fallback sans-serif, không tự tải font Apple. Mobile input dùng 16px để tránh automatic form zoom trên iOS, khác source label 15px; state font/field vẫn theo Web contract.

Asset map chuyển từ feature sang `src/shared/assets/asset-map.ts`; giữ 24 asset Phase 1 và thêm đúng 4 SVG Figma đang dùng:

| Local asset | Source / callsite                                  | Root geometry |
| ----------- | -------------------------------------------------- | ------------- |
| `54f7f.svg` | Mobile Field default/error; sandbox editable input | 16.5×16.5     |
| `c8442.svg` | Mobile Field focus; sandbox input focus            | 16.5×16.5     |
| `6fbf6.svg` | Desktop `11:23` Search; sandbox search input       | 20×20         |
| `9c529.svg` | Dropdown `65:622`; native Select CSS background    | 16×16         |

Tải đúng URL Figma context bằng curl, không redraw/path extraction hoặc runtime Figma URL. SVG root geometry giữ nguyên; Chromium làm tròn natural dimensions 16.5 thành 17, browser assertion so rounded rendered dimensions. Logo/mascot/decor geometry Phase 1 giữ nguyên. Download cần sandbox network escalation, đã được automatic approval cho phép; không dùng secret.

## Shared components / architecture

- `Button`: native button/type=button mặc định, primary/outline/plain, icon, hover/pressed/focus, disabled/loading, responsive; loading giữ label và chặn duplicate callback.
- `Input`, `Select`, internal `Field`: native semantics, unique IDs, label/hint/error liên kết, error live message, forward native props/ref; Select không fake listbox. Native input thật đạt 44px/52px, border vẽ inset để không mất vùng bấm.
- `Alert`: wrapping presentation notice, info/success/warning/error, dynamic status/alert; static showcase không live.
- `Skeleton`, `ContentState`: decorative skeleton, aria-busy, empty/error/unavailable/placeholder và domain error mapping cũ; Button dùng cho read retry. Error thiếu details giờ vẫn hiển thị service error.
- `Drawer`: migrate từ MobileDrawer feature sang shared; native dialog/modal, Tab/Shift+Tab trap, Escape/backdrop/close, focus return, scroll lock và internal scroll. App shell vẫn xử lý destination focus/reset.
- `NavigationButton`: shared selected/disabled/native semantics, Trip/Admin giữ styles riêng; không nhận repository hoặc cấp quyền.

Shared chỉ nhận props/callback và generic domain error type, không import feature/fixture/Gateway, không fetch, URL HTTP/envelope hoặc persistent token storage. `ShellRepository`, fixture/Gateway interface, version/revision/permission và error shapes giữ nguyên; không thêm query/mutation/idempotency contract. Fixture sandbox chỉ local form/selection/loading demo, không “đã lưu” từ timer/request giả.

## Responsive / reconcile

| Hạng mục Phase 1                  | Trạng thái / xử lý Phase 2                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Routes, guards, model/repository  | Đúng, giữ nguyên 9 placeholders + wildcard, explicit Admin role và Trip permissions                                                     |
| Desktop fixed/main/nav boundaries | Đúng, giữ; sidebar targets nâng từ 42px/short 38px lên ≥44px, cho nav cuộn đúng boundary                                                |
| Mobile shell/drawer               | Đúng, chuyển drawer sang shared; giữ left drawer/backdrop/title/main/focus/scroll, không bottom tab                                     |
| Header/compact profile/collapse   | Nâng vùng bấm nhỏ lên ≥44px; ảnh/logo/icon giữ geometry, Drawer targets 48px                                                            |
| States / accessibility            | Giữ shell states; thêm native field associations, loading duplicate guard, Web hover/focus/reduced-motion; error thiếu details được sửa |
| Shared tokens/assets/components   | Thiếu trước Phase 2, bổ sung theo source mapping; không dựng UI kit ngoài scope                                                         |
| Tests                             | Giữ test Phase 1, thêm 8 unit/component và 9 browser cases; thêm header/sidebar target assertions                                       |

Breakpoint 768/360/1100px, workspace height 950px là Web policy có sẵn, không Figma-exported breakpoint. `breakpoints.ts` dùng cho matchMedia và tokens ghi cùng policy; CSS queries dùng literal vì custom properties không dùng được trong query. Tablet là Web adaptation, không source tablet riêng. Sandbox có document scroll/wrapping grid; short laptop/mobile vẫn tới footer. Body overflow lock chỉ khi modal mở; không ẩn content để né responsive.

## Files changed

- `src/shared/styles/`: tokens, fonts, breakpoints, global styles.
- `src/shared/components/`: Button/Input/Select/Field/Alert/Skeleton/Drawer/NavigationButton và CSS Modules; ContentState tái sử dụng primitives.
- `src/shared/assets/asset-map.ts`, 4 SVG; map/Drawer chuyển từ feature, không giữ duplicate files cũ.
- `src/features/shell/components/AppShell*`, `AdminChrome*`: shared imports, tokens và 44px targets.
- `src/app/App.tsx`, `src/main.tsx`: dùng shared Select trong preview, sandbox link, centralized fonts.
- `design-system.html`, `src/preview/design-system*`, `vite.config.ts`: standalone sandbox, preview-only build entry.
- `tests/shared-ui.test.tsx`, `tests/e2e/design-system.spec.ts`, shell E2E và proxy test config invocation.
- README, screen inventory/contracts, flow/state/Figma implementation matrix và report này.

## Commands / results

| Command / check                              | Result                                                   |
| -------------------------------------------- | -------------------------------------------------------- |
| `corepack pnpm lint`                         | PASS                                                     |
| `corepack pnpm typecheck`                    | PASS, strict                                             |
| `corepack pnpm test`                         | PASS — 48 tests / 5 files                                |
| `corepack pnpm test:e2e --workers=1`         | PASS — 33 browser tests                                  |
| `corepack pnpm build:preview`                | PASS — app + foundation sandbox + isolated fixture       |
| `corepack pnpm build`                        | PASS — production only, chạy sau preview                 |
| Shared dependency/transport/storage scan     | PASS                                                     |
| Production fixture/sandbox entry/module scan | PASS                                                     |
| Assets                                       | 28 non-empty local files; 4 new root geometries verified |

Chromium có sẵn dùng `PLAYWRIGHT_CHROMIUM_EXECUTABLE`; external Vite server dùng `PLAYWRIGHT_EXTERNAL_SERVER=1`. Một lần chạy 2 workers bị đóng Chromium lúc chụp screenshot Desktop sau assertions; chạy lại toàn bộ 1 worker đạt 33/33, không bỏ assertion hoặc bật retry che failure. Dev server do lượt này khởi chạy được dừng sau QA.

Browser: foundation ở 1440×800, 1366×520, 820×600, 768×1024, 402×874, 320×480; shell regression thêm 1440×960, 1366×600, 1024×600 và Admin 1024×520/402×600. Đã xem screenshot foundation Desktop/Mobile và shell; screenshots tái tạo dưới ignored `test-results/`, không commit generated reports. Native keyboard, field focus/error preservation, hover/pressed, disabled/loading, reduced motion, target geometry, local assets, main/nav/drawer scrolling và zero API/storage đều được kiểm tra.

## Remaining gaps / Git status

Không blocker cho foundation scope này. Feature forms/pages, auth/session và verified Gateway adapters vẫn thuộc phase sau; source Figma thiếu một số Web states và tablet frame được xử lý như adaptation đã ghi, không gọi pixel-identical native UI. Không tạo thêm Switch/Chip/Finance/Travel/Admin business abstractions trong Phase 2.

Tại mốc bàn giao implementation, Phase 2 chưa commit trên `ui/design-system`. Sau yêu cầu commit của người dùng, thay đổi được chia thành hai commit: cập nhật quy trình trong ba prompt (giữ nguyên nội dung người dùng), rồi foundation Phase 2 cùng tests/tài liệu. `develop` đã có Phase 1, `main` không đổi; không merge Phase 2 hoặc push trong lượt commit này. Backend/Mobile không sửa. Trạng thái và commit hiện tại xem `git status` / `git log`.
