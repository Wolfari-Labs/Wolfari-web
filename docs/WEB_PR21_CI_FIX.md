# Web PR #21 — đồng bộ E2E với layout và overlay

Ngày03/11/2026. Phạm vi: sửa regression tests trong [Draft PR #21](https://github.com/Wolfari-Labs/Wolfari-web/pull/21). Không đổi application source, token/sidebar width, dependency, workflow, timeout hoặc retry. Kết quả dưới đây là fixture/HTTP mock, không là live Backend hoặc diễn tập Edge.

## Bằng chứng trước sửa

Source Web `79bd041c7ec01fd5f76b08cf64ea064320193bb8`, Backend `fc7bc3e9f2c826ebd3ad99e5ff0de5fc164799d7`.

| Run Linux | Built fixture | Các job khác |
|---|---|---|
| [Push41504076560](https://github.com/Wolfari-Labs/Wolfari-web/actions/runs/41504076560) | FAIL205/208: Drawer backdrop, nested confirmation Escape ở native200%, collapsed sidebar | Built Gateway HTTP mock PASS |
| [PR41504224195](https://github.com/Wolfari-Labs/Wolfari-web/actions/runs/41504224195) | FAIL207/208: collapsed hero left edge lệch148px | Checks PASS: unit586, dev fixture208, dev Gateway128; built Gateway128 PASS |

Push log: sidebar expected72, received220; Drawer vẫn visible sau raw mouse click; popup cha biến mất khi Escape từ alert. PR log cùng source: sidebar/hero measurements lệch148px, đúng chênh220−72. Không phải cả ba failure đều do sidebar.

Width theo `tokens.css` và `AppShell.module.css` vẫn là expanded220/collapsed72; không có transition width. Test cũ chỉ chờ accessible name rồi đọc nhiều bounding boxes một lần. Đây là khoảng trống đồng bộ giữa trạng thái semantic và geometry, không có bằng chứng yêu cầu đổi width chuẩn.

Drawer test cũ mở lại rồi gửi raw mouse click ngay, không đợi actionability. Nested alert autofocus xảy ra trước khi Radix cập nhật layer stack bằng effect; Escape handler gắn trên document. Vì vậy focus đơn lẻ chưa chứng minh layer mới đã sở hữu tương tác. Đây là chẩn đoán từ source và CI; chưa tái hiện được lỗi gốc trên Windows: sidebar10/10 và zoom10/10 PASS trước sửa. Không khẳng định đã loại bỏ mọi lỗi overlay runtime.

## Thay đổi

- Sidebar: thêm retrying CSS assertion đúng220/72 trước khi lấy các boxes; giữ mọi assertion width, edges và tỉ lệ cột.
- Drawer: sau reopen, kiểm focus rồi `click({ trial: true })` trên nút đóng để đợi actionability, sau đó mới click backdrop đúng tọa độ cũ. Trial không đóng Drawer; assertion vẫn kiểm một click ngoài đóng và trả focus.
- Nested alert: kiểm parent `pointer-events:none`, alert `auto`, rồi Escape; bổ sung kiểm alert đã đóng, giữ kiểm parent còn mở và focus trả đúng trigger.

Không sleep cố định, tăng timeout, bỏ assertion, skip hoặc bật retries. Không sửa hồ sơ checkpoint CP đã đóng.

## Kiểm chứng sau sửa

Windows Node24.19.0/pnpm10.34.5, Chromium headless, built fixture, một worker, retries0:

- Ba file `app-shell`, `trip-overview`, `foundations-zoom`: **48/48 PASS**, exit0 (`ci-sync-focused`).
- Ba case lỗi lặp10 lần/case: **30/30 PASS**, exit0; `ci-sync-repeat-results.json`, không có skipped/flaky.
- Full built fixture: **208/208 PASS**, exit0, 8,6 phút, không skipped/flaky (`ci-sync-full-fixture`).
- Lint/typecheck: **PASS**; scoped unit shared UI + shell: **18/18 PASS**, exit0.
- Format ban đầu phát hiện mixed line endings trong Trip overview. Sau full suite chuẩn hóa line endings; so sánh `git diff --no-index --ignore-space-at-eol` với file đã test exit0, không thay nội dung assertion. Scoped format kiểm lại **PASS**, exit0.
- CI Linux hậu push là gate riêng: xem [checks trên PR21](https://github.com/Wolfari-Labs/Wolfari-web/pull/21/checks) ở đúng HEAD hiện hành. Kết quả local trong báo cáo không thay CI.

Lệnh lặp (PowerShell, trực tiếp; không đi qua shell wrapper):

```powershell
node scripts/e2e-built.mjs fixture tests/e2e/trip-overview.spec.ts tests/e2e/app-shell.spec.ts tests/e2e/foundations-zoom.spec.ts --grep 'expanded and collapsed|drawer traps|CP03 native' --repeat-each=10 --workers=1 --trace=retain-on-failure
corepack pnpm test:e2e:built --workers=1 --trace=retain-on-failure
```

[Evidence tổng hợp](evidence/demo-readiness/web-ci-fix-20261103.json) lưu fix commit, hash ba test, command/exit/timestamps và thống kê report. Các commit tài liệu sau fix không đổi test/runtime. Raw logs/report trong `test-results/readiness/20261102/ci-*` (ignored); CI logs trong workspace `.readiness-replay/ci-<runId>/` (không commit). Lần gọi runner ban đầu `ci-overlay-baseline` exit255 vì regex chứa pipe bị Windows shell diễn giải, chưa chạy E2E; đã chuyển sang lệnh Node trực tiếp ở trên, không coi đó là failure sản phẩm.

## Bổ sung: backdrop ở Design System và Trip List

CI trên `30bea4a2c033fe08190446ad218f77b52aedd3d0` sau bản sửa đầu:

- [Push41508393423](https://github.com/Wolfari-Labs/Wolfari-web/actions/runs/41508393423): cả ba job PASS, built fixture208/208.
- [PR41508405323](https://github.com/Wolfari-Labs/Wolfari-web/actions/runs/41508405323): built fixture207/208 FAIL tại `design-system.spec.ts:125`; checks và built Gateway PASS. Ba case sửa trước không còn fail trong lượt này. Không coi push xanh là thay thế PR đang đỏ.

Failure mới vẫn là raw click ngay sau reopen, ở bài Design System chưa được sửa trong đợt đầu. Rà toàn bộ `page.mouse.click` trong fixture/Gateway tìm thấy ba call sites: AppShell đã có readiness check; Design System và Trip List còn thiếu. Bổ sung cùng điều kiện focus + `close.click({ trial: true })` cho cả hai, giữ một click tọa độ backdrop và các assertions đóng/return-focus. Trial không thực hiện click nút đóng. Không sửa Drawer runtime, timeout/retries hoặc thiết kế. Bản sửa đầu chưa bao phủ hết mẫu test này; không kết luận lỗi hạ tầng từ số lượng pass.

Baseline Windows Design System lặp10:10/10 PASS (`ci-backdrop-baseline`); lỗi gốc chỉ được quan sát trên CI Linux. Lượt đầu lặp ba bài backdrop20 lần/bài đạt59/60, FAIL riêng Trip List tại vị trí mở lần đầu: x=-300, expected0 (`trip-list.spec.ts:411`, trước bước backdrop). Trace xác nhận test đọc geometry lúc entry animation chưa xong; `toBeVisible()` không bảo đảm final position. Bổ sung polling đúng x=0 trước khi lấy box, giữ các assertions x/width cũ, không nới tolerance. Raw report/trace lần thất bại được giữ riêng.

Bản cuối: **60/60 PASS**, exit0, ba bài backdrop ×20 lần, một worker, retries0, không skipped/flaky (`ci-backdrop-repeat-final`,3 phút). Lint/typecheck/format cuối PASS, exit0. [Evidence bổ sung](evidence/demo-readiness/web-backdrop-followup-20261103.json) ghi đầy đủ baseline,59/60 FAIL và60/60 PASS. Không thay runtime/workflow; full suites hậu bổ sung cần lấy từ CI HEAD mới. Full208 local ở phần trước thuộc bản sửa đầu, không phải lượt mới sau bổ sung này.

## Gate còn lại sau bổ sung

Backend [PR17](https://github.com/Wolfari-Labs/Wolfari-backend/pull/17) đã có CI PASS nhưng chưa merge. Cả hai main vẫn là ancestor của readiness tại lúc kiểm tra. Web còn cần CI trên HEAD sửa, review hợp lệ và các gate live/manual đã ghi ở [readiness](demo-readiness-validation.md). Sửa CI fixture không biến trạng thái thành READY_TO_MERGE hoặc MAIN_VERIFIED.
