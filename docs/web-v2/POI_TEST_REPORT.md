# POI Test Report — `feat/web-poi-integration`

Ngày chạy: 21/11/2026, Windows 11, Node 24, Chromium Playwright. Nền: merge `origin/feat/poi-overture-web` `5afb307` vào `origin/develop` `62ea04c`.

## Kết quả cuối

| Kiểm tra | Lệnh | Kết quả | Loại |
|---|---|---|---|
| Typecheck | `tsc --noEmit` | PASS (0 lỗi) | Tĩnh |
| Lint | `eslint .` | PASS (0 lỗi) | Tĩnh |
| Build production | `vite build` | PASS | Build |
| Build preview | `vite build --mode preview` | PASS | Build |
| Unit/component | `vitest run` | 880/887 khi chạy song song; 7 lỗi là timeout do tải máy, chạy lại tuần tự 11 file liên quan 137/138 và file còn lại chạy riêng 6/6. Sau sửa cuối: 7 file Map/Dress/Places 111/111 | PASS với mocked API |
| E2E Preview fixture | `playwright test` | **251/251 PASS** | PASS với fixture |
| E2E Gateway HTTP-mock | `playwright test --config playwright.gateway.config.ts` | **208 PASS, 5 SKIP** | PASS với mocked API |
| E2E Leaflet (5 test) | cần build có `WOLFARI_LEAFLET_TEST=true` | NOT_RUN | — |
| Backend thật `feat/poi-overture` | — | NOT_RUN (chưa dựng môi trường backend POI sạch; DB dev cần reset migration POI) | — |

Không có kết quả nào ở trên là PASS với backend thật.

## Lỗi phát hiện sau merge và cách sửa

| # | Triệu chứng | Nguyên nhân | Sửa |
|---|---|---|---|
| 1 | Dress: "Chỉ xem" xuất hiện 2 lần (strict mode) | Chip toolbar của POI + badge trong aside của develop | Chip ở toolbar chỉ khi không có `dress_codes_write`; bỏ badge trùng trong aside, giữ nội dung/hành động của aside |
| 2 | SRS12: không có nút "Thêm địa điểm" | Bản giải Map bỏ `PreparationActions module="location"` tạo mới | Khôi phục cạnh `PreparationStatus` (journal phục hồi, giới hạn 50) |
| 3 | SRS12: không có "Xóa địa điểm" trên desktop | Sửa/Xóa chỉ nằm trong `PlaceDetail` (màn hẹp) | Thêm vào `selectedActions` của thẻ "Đang chọn …"; test chọn địa điểm trước khi xóa |
| 4 | `places-provider`: không có "Sắp xếp lịch trình" | Test POI viết cho Plan UI cũ (`onPlace`) | Viết lại bước gắn lịch theo planner của develop (mở pool, chọn ngày, kéo bàn phím) |
| 5 | Khung trang lệch giữa các route ở 1920px | Hai khung cùng tồn tại: declutter 1220px căn giữa (POI) và full-width (develop) | `--workspace-max-width: none` (đồng bộ với `TripWorkspace`); cập nhật `layout-consistency.spec.ts`; Overview, breadcrumb Fund/Price Watch theo develop (ghi chú trong test) |
| 6 | `gateway-plan-drop.test.tsx` lỗi type | Kiểm thử `onPlace` đã bỏ (giữ `onArrange` của develop) | Xóa test; `gateway-plan-panel.test.tsx` lấy bản develop |
| 7 | Finance `finance-operations` timeout 1 lần | Flake khi tải nặng | Chạy lại PASS, không sửa |

## Ghi nhận cho nhóm

- Khung declutter D1 (1220px) và các delta UDC của nhánh POI vẫn là đề xuất; nhánh này giữ khung develop.
- Backend blocker: không có.
