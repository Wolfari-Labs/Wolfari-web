# Giai đoạn 0 — Đo nền (19/11/2026, trước khi sửa mã nguồn)

Nhánh `feat/poi-overture-web`, Node 24.19.0, pnpm 10.34.5 (qua `corepack pnpm`; `pnpm` không có trên PATH của shell này).
Phạm vi thiết bị: chỉ web desktop (≥ 769px); ảnh 402×874 và 320×600 chỉ làm nền hồi quy pixel cho Giai đoạn C.

## 1. Nền lệnh tự kiểm

| Lệnh | Kết quả nền | Log |
| --- | --- | --- |
| `pnpm lint` | exit 0 | `baseline-logs/lint.txt` |
| `pnpm typecheck` | exit 0 | `baseline-logs/typecheck.txt` |
| `pnpm test` | **689/689 PASS, 58 file**, 123,5s | `baseline-logs/unit.txt` |
| build Preview/fixture (`VITE_DATA_MODE=fixture`, `--mode preview`) | exit 0 | `baseline-logs/build-fixture.txt` |
| build Gateway (`VITE_DATA_MODE=gateway`, production) | exit 0 | `baseline-logs/build-gateway.txt` |

Không có `BASELINE_FAIL` ở các lệnh trên. Suite Playwright đầy đủ (Preview fixture, Gateway HTTP-mock) được chạy ở bước xác minh cuối và so với nền đo lúc đó (xem README.md).

## 2. Thống kê tĩnh "trước" (`stats-before.json`)

- 521 khai báo `font-size` trong 48 file CSS; chỉ 17 dùng token; 52 giá trị cứng khác nhau (kể cả `clamp()`/`em`/`cqw`).
- 58 khai báo `font-size` < 12px (8:2, 9:4, 10:12, 10.5:2, 11:33, 11.2:1, 11.5:4); 154 khai báo 13px; 60 khai báo 12px.
- `border-radius`: 75 khai báo ngoài tập token {6, 7, 8, 10, 12, 16, 20, 24, 999} (không tính `0`, `%`, `inherit`); gồm 18px×17, 17px×11, 14px×15, 9px×4, 5px×7, 2px×6, 15px×4 …
- 35 `!important` (trong đó 2 cái ép `font-size` đúng như mục 7.1), 4 `font-weight: 800`, 2 `text-transform: uppercase`.

## 3. Đo bố cục thật (`layout-before.json`, script `measure-layout/`)

Đo trên bản Preview (fixture, `/trips/1111…`) và Gateway (HTTP-mock, đã đăng nhập), 1920×1080 / 1440×900 / 1366×768. Số liệu ở 1440×900 (hero: x, y, rộng, cao):

| Trang | Preview | Gateway | Mục 7.7 dự đoán | Khớp? |
| --- | --- | --- | --- | --- |
| Tổng quan | 238, **110**, 1180, **170**, bo 8 | giống Preview | y 34+76=110, cao 170 | Khớp |
| Lịch trình | 238, **116**, 1180, 150, bo 8 (`schedule`) | 238, 116, 1180, 150, bo 16 (`landscape`) | ~40 | Khớp (Gateway dùng `landscape`) |
| Bản đồ | 238, **110**, 1180, 150 | giống | 34 | Khớp |
| Đồ đạc | 238, **120**, 1180, 150 | giống | 44 | Khớp |
| Thành viên | 238, **120**, 1180, 150 | 238, **112,8**, 1180, 150 | 44 / ~36 | Khớp (36 → 36,8) |
| Quỹ | 238, **120**, 1180, 150 | **238, 204,06, 1184**, 150 | "không so sánh được" | **Mới:** hero nằm dưới liên kết + `h1` → y=204; rộng 1184 vì `padding` 18 đều |
| Giá vé | 238, **120**, 1180, 150 | **238, 94, 1184**, 150 | "không so sánh được" | **Mới:** hero nằm trên cùng (y=94), `h1` + nhãn HOA nằm dưới hero; rộng 1184 |
| Cài đặt | 238, **116**, 1180, 150 | giống | ~40 | Khớp |
| Bộ phối đồ | **không có hero** (`h1` "Đà Nẵng 3N2Đ ✎", gốc `x=238 w=1180`, không padding) | 238, 110, 1180, 150 | Preview `margin 15 0 0 18` | **Khác:** Preview Dress code không dùng `TripHero` |

Ở 1920×1080 (chiều rộng vùng nội dung): Tổng quan/Bản đồ/Đồ đạc/Cài đặt = 1700 (hero rộng 1660, x=238); Lịch trình/Thành viên/Quỹ/Giá vé (Preview) = 1220 căn giữa (hero x=478, rộng 1180) → xác nhận hiện tượng nội dung "nhảy" trái–phải. Ở Gateway, Quỹ và Giá vé là 1220 căn giữa (hero x≈478, rộng 1184).

`h1`: mọi trang đúng 1 `h1`; Bộ phối đồ Gateway và Thành viên Gateway có `h1` bị ẩn (`visibleH1Count = 0`); Quỹ Gateway và Giá vé Gateway không có breadcrumb.

Trang Tổng quan (1440×900, lề trái–phải tính theo tọa độ trang), khớp hoàn toàn mục 7.7.5:

| | Cột 1 | Cột 2 | Cột 3 | Cột 4 |
| --- | --- | --- | --- | --- |
| Hàng KPI | 238–522,5 | 536,5–821 | 835–1119,5 | 1133,5–1418 |
| Hàng dưới | 238–816 | 830–1144 | 1158–1418 | — |

Cả hai hàng cùng `gap` 14px; hàng dưới cao 408px; hero cao 170px.

Điều chỉnh Giai đoạn C so với kế hoạch (số đo khác mục 7.7): (a) Quỹ/Giá vé Gateway có thể so sánh được và hero đang lệch rất lớn (y=204 / y=94); (b) bộ phối đồ Preview không có hero nên bộ test bố cục dùng khung nội dung chung chứ không có hộp hero; còn lại các bước C0–C7 giữ như kế hoạch.

## 4. Assertion hình học sẽ bị Giai đoạn C ảnh hưởng

Đọc `trip-overview`, `fund-preview`, `members-preview`, `plan-preview`, `trip-map`, `app-shell` và `tests/e2e-gateway/cp0*-composition`:

| Spec | Assertion hiện tại | Ảnh hưởng của Giai đoạn C |
| --- | --- | --- |
| `trip-overview.spec.ts` `assertDesktopContentEdges` | cạnh trái = `220+18`, cạnh phải = `width − 22` cho hero/summary/workspace ở mọi viewport (kể cả 1920, 2560) | **Đổi** (D1): cạnh phải theo khung 1220 căn giữa khi `width − 220 > 1220` |
| `trip-overview.spec.ts` (test sidebar mở/thu gọn) `expectedRight = 1440 − 22` | thu gọn sidebar còn 72px thì vùng nội dung rộng 1368 > 1220 | **Đổi** (D1): cạnh phải tính theo khung tối đa |
| `trip-overview.spec.ts` `heroBox.height 170` | hero Tổng quan cao 170 | **Đổi** (D3): 150 |
| `trip-overview.spec.ts` `usableWidth = workspaceBox.width − 28`, tỉ lệ `[578,314,260]/1152`, `columns.toHaveLength(3)` | lưới 3 cột | **Đổi** (D5, D7): `[2c+g, c, c]`, `c = (usable − 3g)/4`, `g=16`; giữ `toHaveLength(3)` |
| `fund-preview.spec.ts` | hero 238/120/1180/150 (±4) ở 1440 | Giữ nguyên số; sau C hero đúng y=120 |
| `members-preview.spec.ts` | hero 238/120/1180/150 (±4) | Giữ nguyên |
| `plan-preview.spec.ts` | hero 238/**116**/1180/150 (±4) | **Đổi** (D2): y = 120 (không nới sai số) |
| `app-shell.spec.ts` | header 76, sidebar 220/72, mascot 166; không đụng vùng trang | Không đổi (shell nằm ngoài C) |
| `trip-map.spec.ts` / `cp07-composition` / `cp08-composition` | quan hệ tương đối panel/map/search, kích thước mục tiêu ≥ 44 | Không dùng tọa độ tuyệt đối; kiểm tra lại sau C5 |
| Test dùng tên nhãn (D9): `app-shell.spec.ts:9`, `packing-list.spec.ts:26`, `shell-navigation.test.tsx:99`, `cp07-composition.spec.ts:237,293`, `cp07-native-zoom.spec.ts:207` | "Packing list", "Khả năng Dress code" | **Đổi** ở C6 |

Sai số hiện tại của các spec Figma là ±4px (đã có sẵn). Không nới thêm; spec mới `layout-consistency.spec.ts` dùng ≤ 1px.

## 5. Ảnh nền

`before/` chứa ảnh Preview + Gateway cho 9 route workspace ở 1920×1080, 1440×900, 1366×768 (viewport) và 402×874, 320×600 (toàn trang, chỉ để hồi quy pixel), cùng Trang chủ/Danh sách chuyến đi/Tạo chuyến/Hồ sơ.
