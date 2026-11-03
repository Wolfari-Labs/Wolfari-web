# Frontend inventory

CP02/D17: observations/code inventory CP01 giữ nguyên; recommendation RESTYLE compact/normalize là đề xuất lịch sử, không approval khác visual source. Theo SOURCE_MAP và DESIGN_DELTAS hiện hành; không khảo sát lại Backend hoặc rewrite components đã có.

Snapshot: branch `draft/demo-ui-ux`, HEAD `dc99219241c4cf36d0952115fc93f646d4fc1581`; worktree ban đầu clean. CP-01 chỉ thêm tài liệu/evidence. Không xóa kết quả khảo sát trước khi sửa nguồn Figma.

## Stack đã xác minh

Node24.19.0 / pnpm10.34.5; React19, TypeScript5.9, Vite8, React Router7, TanStack Query5. CSS Modules + `src/shared/styles/tokens.css`, Be Vietnam Pro/Patrick Hand self-host. Radix UI1.8, motion14.7, dnd-kit0.5, resizable-panels4, lucide-react. Vitest/Testing Library, Playwright và axe đã có; không cần thêm thư viện ở discovery.

## Architecture và functional boundary

- `src/main.tsx`: dependency injection cho repositories/session/command coordinator. DEV/preview mặc định fixture; production mặc định Gateway. Không xem localhost dev tự động là runtime thật.
- `src/app`: lazy route components + Suspense, App layouts/guards, Providers/query/session, safe return-to. 22 routes ở [ROUTE_MATRIX](ROUTE_MATRIX.md).
- `src/features`: auth/home/trips/plan/map/dress-code/packing/members/fund/price-watch/notifications/shell; page orchestration và domain models/hooks/components.
- `src/infrastructure`: typed Gateway repositories/decoders, fixture repositories, HTTP client, session coordination, command recovery. Đây là boundaries phải giữ khi restyle.
- `src/shared`: UI primitives/composites, styles/tokens/breakpoints, assets, utilities. Assets thật có sẵn tại `shared/assets/figma`, mapping tại `asset-map.ts` và `scene-assets.ts`; không mặc định cần ImageGen.
- Runtime Trip create/update/list/detail; auth/profile/avatar/password/session; Plan timeline+mutations; Members/invitation/policy; TEST manual Fund; Notifications và Price Watch đã wired. Map/Dress chỉ projection trong Gateway, Packing Gateway chỉ đọc; preview có editor phong phú hơn. Admin chỉ placeholder. Chi tiết endpoint ở [INTEGRATION_CONTRACTS](INTEGRATION_CONTRACTS.md).

## Components: preserve / restyle / refactor

| Nhóm | Current source / khả năng | Khuyến nghị |
|---|---|---|
| Button/ButtonLink/NavigationButton | Shared variants/sizes/loading; giữ nội dung khi busy | RESTYLE + CONSOLIDATE usage; preserve semantics, focus và dimensions. Không thay button bằng div. |
| Drawer | Radix, focus return, body-scroll lock | PRESERVE interaction core; restyle sizes/motion. Không rewrite lock theo animation completion. |
| Ui.tsx | Card, Badge, Tip, ActionMenu, ConfirmDialog, Switch, SegmentedTabs, Disclosure | Tách module khi có lợi cho imports/tests; một source mỗi pattern, không tạo generic abstraction toàn năng. |
| ContentState/OperationStatus | loading/error/placeholder/not-found và command lifecycle | PRESERVE semantics; cải tiến message/hierarchy/action recovery; không collapse UNKNOWN thành FAILED/SUCCESS. |
| Form controls | Các form auth/create/profile/Finance/Price có labels/validation riêng | CONSOLIDATE Field/helper/error/layout trước, validators và serializers giữ domain. |
| Page headers/banner/cards | Trip banner, metric cards, workspace descriptions | RESTYLE compact density; shared contextual header để giảm chiếm chiều cao. |
| Timeline/reorder | GatewayPlanPanel, RuntimeTimeline, dnd-kit, resizable panel | PRESERVE ID/order/keyboard semantics; refactor view và orchestration tăng dần. |
| Map/Dress/Packing preview | Local draft/editor vs runtime read-only | PRESERVE mode boundary; không hợp nhất repository theo giao diện giống nhau. |
| Asset/icons | Figma SVG/PNG + Lucide + scenic components | CONSOLIDATE semantic mapping; loại bỏ chỉ khi kiểm tra imports/runtime chứng minh unused. |

## Hotspots có bằng chứng source

Approximate line counts ở snapshot (độ dài không tự nó chứng minh bug): PlanPage1158, GatewayFundPage913, MembersPage899, ProfilePage606, CreateTripPage576, TripMapPage564, PriceWatchPage552, GatewayPlanPanel534, GatewayMembersPage520, TripSettingsPage489, RuntimePriceWatchPage475, AppShell451.

Các boundary đề xuất: page orchestration → domain panels/hooks → reusable UI, không rewrite cả feature. `GatewayOverview` import `formatVnd`/`QueryError` từ `GatewayFundPage` tạo coupling xuyên feature: chuyển utility/presentation dùng chung sau characterization tests; không move cùng lúc command semantics. Finance hiện gom nhiều workflow trong page nên cần tách theo setup/destination/contribution/ledger, không theo vài CSS blocks.

Không có bằng chứng benchmark để khẳng định rendering chậm. Duplicate styles/magic values cần kiểm tra theo component work unit; chưa có tree-shaking/dead-code proof để remove. Reduced motion đã có global CSS và MotionConfig, không ghi “chưa hỗ trợ”.

## Baseline và môi trường

Scripts và kết quả thật tại [CP-01](checkpoints/CP-01.md). Variables được nhận diện theo tên, không xuất giá trị: `VITE_DATA_MODE`, `VITE_GATEWAY_PROXY_TARGET`, `VITE_GOOGLE_MAPS_BROWSER_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`. Không sửa secrets, deployment hoặc Backend.

Browser host unavailable; Computer Use từ chối điều khiển vì không xác định Chrome URL. Dừng input và không bypass. Ảnh baseline được test hiện hữu tạo ở lượt CP-01, không lấy ảnh audit cũ làm evidence mới.
