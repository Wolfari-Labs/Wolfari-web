# CP-07 — verification Map / Dress / Packing Web

Ngày 01/11/2026. Branch `draft/demo-ui-ux`, HEAD `4a4ff2687aac675c6614d92025534bf11afac3e0`; worktree chứa thay đổi CP06/CP07 chưa commit. W05 kiểm tra trên mã hiện tại, không thay Backend, dependencies, package/lock hay Figma chính thức.

## Kết quả chạy

| Gate | Lệnh / mode | Kết quả |
|---|---|---|
| Lint | `npm run lint` | PASS toàn repo sau sửa cuối |
| TypeScript | `npm run typecheck` | PASS sau sửa cuối |
| Unit/component | `npm test` | PASS 47 files / 571 tests sau sửa cuối |
| Build | `npm run build` và `npm run build:preview -- --outDir .local/cp07-build-preview` | PASS cả production và Preview sau sửa cuối |
| Gateway projection | `node node_modules/@playwright/test/cli.js test --config playwright.gateway.config.ts --output .local/cp07-projections-run tests/e2e-gateway/cp07-projections.spec.ts` | PASS 11/11; Gateway HTTP-mock trên Vite dev, không phải live Backend |
| Gateway composition | `node node_modules/@playwright/test/cli.js test --config playwright.gateway.config.ts tests/e2e-gateway/cp07-composition.spec.ts` | PASS 15/15; ba route × 1440×960, 820×900, 402×874, 320×600, 1366×520 |
| Native Chrome zoom | `node node_modules/@playwright/test/cli.js test --config playwright.gateway.config.ts --output .local/cp07-native-zoom-run tests/e2e-gateway/cp07-native-zoom.spec.ts` | PASS 1/1 cho ba route; `chrome.tabs.setZoom(2)`, width 1418→709, DPR 1→2, CSS zoom = 1 |
| Preview regressions | `node node_modules/@playwright/test/cli.js test --config playwright.config.ts tests/e2e/trip-map.spec.ts tests/e2e/packing-list.spec.ts tests/e2e/trip-workspace-projections.spec.ts tests/e2e/web-fix-regressions.spec.ts` | PASS 28/28 trước sửa permission Preview; Map dùng Places provider mock |
| Preview Packing sau sửa permission | `node node_modules/@playwright/test/cli.js test --config playwright.config.ts tests/e2e/packing-list.spec.ts` | PASS 4/4, gồm ca mới Preview read-only |
| Gateway trước CP07 để đối chiếu ảnh | Isolated `.local/cp07-before-app` trên port5175, chỉ bốn file Map/Dress/Packing lấy từ `HEAD`; cùng populated Trip+Plan HTTP mock | PASS 1/1, ba ảnh 1440×960 và zero Trip writes; 448 source files byte-checked, 444 file khác giữ nguyên workspace hiện tại |

`pnpm` không có trên PATH trong môi trường này; các lệnh Playwright dùng CLI đã cài trong `node_modules`, còn lint/typecheck/unit/build dùng npm scripts của repo. Không cài hay thay dependency.

## Contract và trạng thái

- Gateway Map chỉ hiển thị `selectedLocations` thật; search/filter tại danh sách đã tải, schedule từ activity tham chiếu, chi tiết dạng chữ khi map provider không khả dụng. Không có Map write controls hoặc Trip write request trong các ca Gateway.
- Gateway Dress đọc `dressCodes` theo TRIP/DAY/ACTIVITY, description/publicDescription và scope thực; panel phải nói rõ chỉ xem. Không gắn ảnh/outfit mẫu hoặc bật upload/apply/save.
- Gateway Packing đọc trực tiếp `packingItems` từ Plan; count/progress/category/quantity/assignee/due/null lấy từ projection. Ở 402/320, quantity/assignee/due còn thấy với nhãn. Preview có add/edit/toggle cục bộ; ca thiếu permission giữ checkbox và menu vô hiệu hóa như trước CP07.
- Gateway projection suite kiểm tra empty, Plan 503 + retry, Trip read denial, held Plan GET loading + recovery trên cả ba route. Các ca xác nhận không có Trip write request. Route guards, actor/session, `useTripPlanSnapshot` và repository contracts không bị thay.
- Composition suite kiểm tra thứ tự list/card trước panel phụ, document không tràn ngang, nội dung cuối cuộn tới được, keyboard/focus/filter, reduced motion và no-preference. Ở 1440/402, sáu quét axe toàn trang và sáu quét riêng route theo WCAG 2 A/AA/2.1 AA đều **0 violation**. Ảnh, JSON, SHA-256 ở [evidence CP07](evidence/cp07/README.md).

## Lịch sử lỗi và giới hạn

- W04 Gateway projection test ban đầu **7/8**: Packing còn disabled write controls. Sau W04 và W05 sửa, focused rerun **8/8**, rồi thêm loading cases thành **11/11**.
- W05 narrow Packing composition ban đầu dùng matcher `Tôi`/date exact, trong khi UI có nhãn `Người chuẩn bị: Tôi` và `Hạn chuẩn bị: 01/11/2026`; đây là lỗi assertion. Sửa matcher theo nhãn và chạy lại composition **15/15**. Audit cùng lúc phát hiện bản trước đó ẩn assignee/due ở ≤768px; đã sửa Gateway-only trước lần PASS cuối.
- Gateway Google Maps khi có browser key/provider thật, live Backend, manual screen reader, thiết bị vật lý, production Web Vitals và CI: **NOT_RUN**. Preview Places mock không xác minh provider thật; HTTP-mock không xác minh live Trip/Plan. Ảnh Figma canonical là source; ảnh runtime trước/sau dùng HTTP-mock và chỉ đối chiếu 1440×960 của ba route. Bản trước được dựng cô lập từ bốn file pre-CP07 tại HEAD với 444 source file còn lại khớp worktree CP06/CP07; [method và hashes](evidence/cp07/README.md).
- Desktop Dress full-page PNG chỉ chụp vùng hiện tại của `main` có scroll riêng; bài composition kiểm tra panel cuối cuộn tới được, còn ảnh 402px ghi đầy đủ nội dung dọc. Native zoom PNG là ảnh bề mặt viewport, không phải ảnh toàn trang.

## Final docs/Git audit

- `node docs/ui-redesign/evidence/verify-inventory.mjs`: **PASS**, 56 Markdown files/547 local links/22 routes; Figma inventory7.239 frames/175 components/17 sets/257 variables và sáu baseline image hashes giữ nguyên.
- CP07 evidence README SHA-256: **31/31 PASS**. Strict UTF-8, replacement character, trailing-whitespace và conflict-marker scan: **57/57 Markdown files** gồm AGENTS, **PASS**. `git diff --check` PASS; Git chỉ cảnh báo LF→CRLF tại các file tracked hiện có.
- Branch vẫn `draft/demo-ui-ux`, HEAD `4a4ff2687aac675c6614d92025534bf11afac3e0`; `src/infrastructure`, package/lock diff rỗng; Backend worktree sạch. `DANH_GIA_CHI_TIET_GIAO_DIEN.md` ngoài scope và CP06 worktree giữ nguyên. Không commit/push hoặc Figma writes.
