# Gateway Plan drag-and-drop — 06/11/2026

## Phạm vi được người dùng yêu cầu

“Sửa hoàn chỉnh cho chế độ kết nối với BE luôn, đừng sửa BE.” Đây là yêu cầu riêng sau CP11,
thay thế giới hạn Preview-only của kế hoạch DnD trước đó. Không mở lại checkpoint, không duyệt
các design delta khác, không sửa Backend/Figma/dependency/public API hoặc dữ liệu demo cá nhân.

Nguyên nhân báo lỗi trước sửa: Gateway `onDay` mở editor khi hoạt động có `startsAt`; nút
“Thêm hoạt động” mở form tạo thủ công. Các thay đổi Preview không chạy trong demo Gateway.

## Cách triển khai

- “Thêm hoạt động” mở giỏ “Đã chọn · Chưa xếp lịch”; form chỉ mở qua menu chỉnh sửa hoặc
  “Tùy chọn lịch trình → Tạo hoạt động thủ công”. Kéo-thả không mở form/xác nhận.
- Trong ngày: item được thả và suffix giữ ngày, xóa giờ; prefix giữ nguyên giờ. Đưa về giỏ:
  chỉ item kéo bị xóa ngày/giờ. No-op/hủy/thả ngoài vùng không gửi lệnh.
- Địa điểm chưa có activity được POST một lần; dùng ID receipt để reorder đầy đủ IDs.
  Địa điểm đã liên kết với một activity (kể cả trong giỏ) không xuất hiện thành bản sao.
- Gateway sử dụng command owner hiện tại, PATCH/POST/PUT tuần tự, expected version từ receipt
  và UUID idempotency riêng cho từng bước. Không có endpoint/transaction giả cho toàn bộ drag.
- Một drag có thể lưu một phần nếu bước sau thất bại. UI báo rõ, dừng lệnh tiếp theo, tải snapshot
  thật và khóa ghi cho tới đối chiếu. Kết quả chưa xác định giữ nguyên intent trong sessionStorage;
  chỉ replay đúng payload/keys ban đầu, không tự rebase theo version mới.
- Preview vẫn là nháp localStorage; không biến `PlanDraftMove` thành payload Backend.
- Giữ riêng editor date/time, permission/archive, conflict, session/CSRF và các validation hiện có.
- Escape, đổi sang readonly và unmount giải phóng listener cảm ứng; không để thao tác đã hủy
  chặn các tương tác tiếp theo. Chuột, bàn phím và cảm ứng dùng cùng quy tắc lưu Gateway.
- Chạm ngón thứ hai hủy drag, không ghi dữ liệu; kiểm tra touch/pointer ID ngăn sự kiện kết thúc
  cũ hoặc của ngón khác làm thả nhầm. Giữ bridge pointerup/touchend của Chromium, không lưu trùng.

## Đối chiếu thiết kế

Nguồn: Figma `hdy2sOZk6rfjKXKDJ9HW9y`, normal `20:236`, pool `439:2028`, map `439:2497`.
Đã lấy và xem lại screenshot pool bằng Figma MCP (read-only). Dùng banner landscape chung
theo kế hoạch đã duyệt; không chép tên/ảnh/địa chỉ/presence minh họa vào dữ liệu Gateway.

| Thành phần             | Cách áp dụng                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Timeline + giỏ desktop | Mặc định 680:488, gap 12px; cùng vị trí panel phải với bản đồ, không ba cột; giữ resize đã lưu |
| Thao tác card          | Tay nắm kéo, menu chỉnh sửa; chỉ báo chèn trước/sau/cuối                                       |
| Giỏ                    | Tên panel, tìm kiếm, số lượng, hướng dẫn và item thật                                          |
| Web hẹp                | Drawer tổ chức chứa cả timeline và giỏ để không kéo vào nền đang inert                         |
| Dữ liệu thiếu          | Không tạo ảnh, thời gian di chuyển hay người online giả                                        |

## Kết quả xác minh mới

Chỉ điền PASS sau khi lệnh kết thúc. Không dùng kết quả lịch sử CP11/Preview để nghiệm thu thay đổi này.

| Gate                                                                          | Trạng thái                                                                                                     |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Lint / typecheck                                                              | PASS, exit 0 sau sửa cuối                                                                                      |
| Unit/component                                                                | PASS 706/706, 53 files, exit 0; rerun source không đổi lúc 13:11 sau khi build/live kết thúc, 107.54s          |
| Gateway HTTP-mock DnD/regression/responsive                                   | PASS 27/27, workers=1, exit 0 sau sửa cuối; 1440×960, 1366×520, 820×900, 402×874, 320×600, native Chrome 200%  |
| Gateway HTTP-mock toàn bộ                                                     | PASS 147/147, exit 0 trong đợt này nhưng **trước** cleanup/multitouch cuối; không ghi thành full post-fix PASS |
| Preview fixture regression                                                    | PASS 23/23 trong đợt này; trước sửa cleanup Gateway-only, controller Preview không đổi sau lượt đó             |
| Production / Preview / demo builds                                            | PASS `build`, `build:preview`, và bundle Gateway `dist-demo1` của harness, exit 0                              |
| Isolated live Backend DnD                                                     | PASS dev 1/1 + bản build 1/1, không retry/flaky, run `20261106060802-01d9b4e9` sau sửa cuối                    |
| Physical touch device / manual screen reader / tải đồng thời nhiều người / CI | NOT_RUN                                                                                                        |

Live test riêng dùng `corepack pnpm test:e2e:demo1 '--grep=Gateway DnD live'` với Compose
project/ports/accounts/trip tạm do harness sở hữu. Không chạy legacy live suite trên personal demo.
HTTP-mock, touch giả lập và live receipt replay là những loại bằng chứng khác nhau.
Runtime `preview` trong harness là **bundle Gateway kết nối BE thật**, không phải fixture Preview.

Live đã xác minh receipt thật, giữ giờ prefix/xóa giờ item + suffix, chuyển từ/về giỏ, reload,
và cố ý làm mất phản hồi **sau khi server commit** rồi replay đúng payload/idempotency key:
không tạo activity trùng, không tăng version lần nữa. Luồng tạo activity từ địa điểm đã chọn
được kiểm tra bằng HTTP-mock; live test tạo activity thủ công để không phụ thuộc provider bản đồ.

Artifacts gốc: `test-results/demo1/20261106060802-01d9b4e9/` (`dev/results.json`,
`preview/results.json`, `snapshot.json`, `final-source.json`). Kiểm tra hash đầu/cuối:
implementation frontend không đổi trong run, toàn bộ tree Backend không đổi, Backend git status rỗng.
Implementation SHA-256 frontend của run: `820ed25cb5bb291b36ab288c040fa2bdc5868d27f27dd28c6d4409ca390aa73e`.
Harness đã dọn containers/volumes/network test; không tác động stack/dữ liệu demo cá nhân.
Report unit cuối: `test-results/gateway-plan-final-unit.json`; Gateway scoped:
`test-results/gateway/results.json` (27 expected, 0 unexpected/flaky/skipped).

Các lệnh hồi quy trọng tâm:

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm vitest run --reporter=dot --reporter=json --outputFile=test-results/gateway-plan-final-unit.json
corepack pnpm build
corepack pnpm build:preview
corepack pnpm exec playwright test --config playwright.gateway.config.ts tests/e2e-gateway/gateway-plan-dnd.spec.ts tests/e2e-gateway/timeline-interaction.spec.ts tests/e2e-gateway/cp06-composition.spec.ts tests/e2e-gateway/cp06-editor.spec.ts tests/e2e-gateway/cp06-readonly.spec.ts tests/e2e-gateway/cp11-plan-native-zoom.spec.ts tests/e2e-gateway/plan.spec.ts --workers=1
corepack pnpm exec playwright test tests/e2e/plan-preview-dnd.spec.ts tests/e2e/plan-draft-time.spec.ts tests/e2e/plan-preview.spec.ts tests/e2e/plan-redesign.spec.ts --workers=1
corepack pnpm test:e2e:demo1 '--grep=Gateway DnD live'
```

## Các lượt lỗi đã được giữ lại trong báo cáo

- Full Gateway 147/147 chạy thực tế với **2 workers**: `-- --workers=1` qua pnpm không áp dụng
  như dự định. Lượt scoped cuối dùng trực tiếp `pnpm exec playwright ... --workers=1`.
- Touch E2E ban đầu đo tọa độ tay nắm trước khi cuộn đích, làm tọa độ bắt đầu cũ; đã sửa
  thứ tự cuộn/đo trong test, không ghi lỗi đó thành lỗi Backend.
- Live thử nghiệm trước đó có lỗi helper: request ngoài browser không mang token bộ nhớ,
  reload trước receipt PUT làm hủy lệnh, kiểm tra focus/panel sau reload, reload lặp làm mất body.
  Đã sửa helper để chờ receipt và kiểm tra focus/panel trước reload; không nới assertion dữ liệu.
- Các run dev `20261106054620-63b30802` và `20261106060203-856156b7` PASS trước sửa multitouch;
  run dev + build cuối ở trên mới là bằng chứng live cho source cuối. Ảnh normal của một run
  cũ chụp khi còn loading; test cuối chờ handle render trước khi chụp.
- Lượt full unit lúc 13:07 ngày 06/11: 702/706, 4 lỗi trong `trip-map`, `trip-new-features`,
  `trip-overview` khi chờ UI render, trong lúc build/live/E2E chạy song song. Không sửa các module
  đó, không tăng timeout để che lỗi; chạy lại nguyên suite sau khi build/live kết thúc đạt
  **706/706**. Các assertion `findBy*` dùng timeout mặc định 1 giây; phù hợp với lỗi chờ render,
  nhưng chưa chứng minh tài nguyên máy là nguyên nhân. Không ghi lượt thất bại thành PASS.
- Warning PostCSS thiếu `from` và warning React Router `flushSync` vẫn xuất hiện; không phải
  bằng chứng lỗi chức năng DnD và không được đổi thành “không có warning”.

## Ảnh đối chiếu

- [Figma pool 439:2028](figma-pool.png): nguồn tham chiếu, đọc bằng Figma MCP, không sửa Figma.
- HTTP-mock 1440×960: [timeline](gateway-http-mock-normal-1440.png),
  [giỏ](gateway-http-mock-pool-1440.png), [bản đồ](gateway-http-mock-map-1440.png).
- HTTP-mock responsive: [giỏ trong planner 320px](gateway-http-mock-pool-320.png).
- Live bản build, run cuối: [trước kéo](live-built-normal-before-drag.png),
  [sau chuyển về giỏ](live-built-pool-after-drag.png), đã mở và xem trực tiếp cả hai ảnh.
  “Before/after” của các ảnh live là trước/sau thao tác kéo trên bản mới, không phải ảnh UI
  phiên bản cũ. Không có ảnh chụp mới của UI cũ để tuyên bố so sánh pixel trước/sau sửa.

Không coi việc xem ảnh, build thành công hoặc axe tự động là nghiệm thu pixel-perfect,
screen reader thủ công, thiết bị cảm ứng thật, tải nhiều người hoặc phê duyệt production/SLA.

## Chạy đúng bản kết nối Backend

Thực hiện trong `D:\Study\HK7\pbl6\Wolfari-web`, không phải worktree cũ
`Wolfari-web-plan-activity-dnd`. Dừng terminal frontend cũ trước vì script dùng `--strictPort`.

```powershell
corepack pnpm demo:dev
```

Nếu đang dùng bundle đã build:

```powershell
corepack pnpm demo:build
corepack pnpm demo:preview
```

Các script demo dùng Gateway, frontend `http://localhost:5273`, Backend `http://127.0.0.1:13000`
và manifest demo hiện có. Backend cần đang chạy. Không cần `demo:init`, reset dữ liệu hay sửa
`.env`. `build:preview` tạo bản fixture trong `dist`, không cập nhật Gateway `dist-demo`.
Đợt kiểm thử này không build lại `dist-demo`, không restart server hoặc sửa dữ liệu demo cá nhân.
