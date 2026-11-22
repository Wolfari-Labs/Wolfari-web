# UI declutter & typography — bằng chứng (19/11/2026)

Kế hoạch: [`docs/agents/UI_DECLUTTER_AND_TYPOGRAPHY_PLAN.md`](../../../agents/UI_DECLUTTER_AND_TYPOGRAPHY_PLAN.md). Việc bảo trì theo yêu cầu trực tiếp, chỉ web desktop (≥ 769px), không commit. Delta ghi tại `DESIGN_DELTAS.md` mục UI-DECLUTTER.

## Thư mục
- `PHASE0.md` — nền lệnh, số đo bố cục thật, danh sách assertion hình học bị ảnh hưởng.
- `before/`, `after/` — ảnh Preview (`preview-*`) và Gateway HTTP-mock (`gateway-*`) ở 1920×1080, 1440×900, 1366×768 (viewport) và 402×874, 320×600 (toàn trang, chỉ hồi quy).
- `after-AB-mobile-reference/` — ảnh mobile sau Giai đoạn A+B, mốc so điểm ảnh cho Giai đoạn C.
- `layout-before.json`, `layout-after.json` — hộp hero, breadcrumb, `h1`, cột Tổng quan (script ở `measure-layout/*.txt`, đổi đuôi `.txt` để chạy lại).
- `pixdiff-*.json` — so điểm ảnh mobile. `stats-before.json`, `stats-after.json` — thống kê cỡ chữ/bo góc. `phaseB-plan.txt` — danh sách thay đổi Giai đoạn B. `baseline-logs/` — log từng lệnh.

## Kết quả lệnh
| Lệnh | Nền (HEAD, nguyên bản) | Cuối |
| --- | --- | --- |
| lint / typecheck | exit 0 / exit 0 | exit 0 / exit 0 |
| `pnpm test` | 689/689 (58 file) | **694/694** (59 file, thêm `page-breadcrumb.test.tsx`) |
| `pnpm build` / `build:preview` | exit 0 | exit 0 / exit 0 |
| Preview fixture built (`test:e2e:built`) | 208/208 | **214/214** (+6 `layout-consistency`) |
| Gateway HTTP-mock built (`test:e2e:gateway:built`) | 143 pass, 5 skip | **143 pass, 5 skip** |

Không có `BASELINE_FAIL`. Ghi chú: nền e2e chạy trên bản sao `git archive HEAD` (chưa sửa), không phải working tree.

## Số liệu trước/sau (`stats-*.json`)
| | Trước | Sau |
| --- | --- | --- |
| Giá trị `font-size` khác nhau (desktop) | 45 | 24 = 8 bậc thang + 16 ngoại lệ (Home/Auth/hero display ≥ 29px, 4 glyph 22px, `1.07em`, `2.46cqw`, 4 `clamp()` đã đưa biên vào token) |
| Khai báo dùng token chữ | 16 | 351 |
| Khai báo chữ < 12px (desktop) | 47 | **0** (còn 56 trong khối mobile: 11 gốc + khối `mobile freeze`) |
| Bo góc ngoài token (desktop) | 69 | **0** (72 giá trị cũ giữ trong khối `mobile freeze`) |
| `!important` | 35 | 32 (hai chỗ ép cỡ chữ ở 7.1 đã bỏ) |
| Hero (x, y, rộng, cao) @1440 | 7 hộp khác nhau, y 94–204, cao 150/170 | **1 hộp: 238, 120, 1180, 150** trên cả 9 route, Preview và Gateway |
| Hero @1920 | 9 hộp | 1 hộp: 478, 120, 1180, 150 |
| Hero @1366 | 7 hộp | 1 hộp: 238, 120, 1106, 150 |
| `y` breadcrumb | 84–94 / không có | 84 ở mọi route; đúng một `h1` thấy được |
| Cột Tổng quan @1440 | KPI 238/536,5/835/1133,5; hàng dưới 238/830/1158 (lệch 5 và 24px) | KPI 238/537/836/1135; hàng dưới 238(→820)/836/1135 — trùng cạnh |

## Hồi quy mobile (402×874, 320×600)
Giai đoạn B không làm đổi mobile: mọi route không đụng Giai đoạn A còn giống hệt nền (so điểm ảnh) nhờ khối `mobile freeze`. Giai đoạn C so với mốc A+B: 32/44 ảnh giống hệt; 12 ảnh khác chỉ do nhãn C6 (Đồ đạc, Trang phục, Tiến độ đồ đạc). So với nền Giai đoạn 0, ảnh khác nhau chỉ ở các route có thay đổi văn bản Giai đoạn A (Bản đồ, Lịch trình Gateway, Giá vé Gateway, Cài đặt, Hồ sơ, Bộ phối đồ, Quỹ Gateway) hoặc nhãn C6.

## NOT_RUN / giới hạn
- Backend thật, nhà cung cấp thật, đọc màn hình thủ công, thiết bị thật, CI, cổng a11y đầy đủ (axe chạy trong các spec hiện có: Gateway 143, fixture 214 pass).
- Ảnh chụp chuẩn `linux/…/home-guest-1440.png` chưa chụp lại (máy Windows); bản `win32` đã chụp lại vì Giai đoạn B đổi cỡ chữ Trang chủ.
- Không chạy `layout-consistency` cho Gateway (chỉ Preview, theo kế hoạch); Gateway được đo trong `layout-after.json`.
- Không đánh giá thẩm mỹ mobile; bố cục mobile hoãn.
- Mục A-phụ của kế hoạch (Packing "Chỉ xem" lặp từng dòng, Plan Preview, Thành viên Preview, `AppShell`, `GatewayOverview`) chưa làm: chạm CSS mobile hoặc bị test khóa; ghi ở UDC-D6.
- A27: `RefundPanel.tsx`/`FinanceHistoryPanel.tsx` không tồn tại ở commit này; "Chi tiết hỗ trợ · Finance version" ở Quỹ Gateway nằm trong `details` đóng nên giữ nguyên.
