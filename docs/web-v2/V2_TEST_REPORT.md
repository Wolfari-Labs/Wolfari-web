# Web V2 Test Report — `feat/web-v2-figma-redesign`

Ngày chạy: 22/11/2026, Windows 11, Node 24, Chromium Playwright. Nền: `feat/web-poi-integration` `50f6a74`.

## Kết quả cuối

| Kiểm tra | Lệnh | Kết quả | Loại |
|---|---|---|---|
| Typecheck | `tsc --noEmit` | PASS | Tĩnh |
| Lint | `eslint .` | PASS | Tĩnh |
| Unit/component | `vitest run` | **887/887 PASS** | Mocked API |
| E2E Preview fixture | `node scripts/e2e-built.mjs fixture` | **251 PASS** (sau tinh chỉnh V2-D15/D16, kiểm tra gradient đã bật lại) | Fixture |
| E2E Gateway HTTP-mock | `node scripts/e2e-built.mjs gateway` | **208 PASS, 5 SKIP** (Leaflet, cần `WOLFARI_LEAFLET_TEST=true`) | Mocked API |
| Axe WCAG 2.1 AA (tất cả rule) | quét 16 route ở 1440 và 402px | 0 vi phạm | Fixture |
| Backend thật | — | NOT_RUN | — |

Không có kết quả nào ở trên là PASS với backend thật.

## Đối soát Figma

- Chụp màn hình 1440×960 và so với `get_screenshot` của node Figma, mỗi nhóm màn ít nhất 2 vòng: W02, W04/W05, W06/W06.1, W07/W07.1, W08, W09, W10 (fixture), W11/W11.0, W12/W12.1, W14/W14.1, W03, W01 (guest/đã đăng nhập), W16/W17, W18, A01.
- Khung chung đo bằng script: top nav (24,20,1392×76), sidebar (24,112,264), nội dung x=312 y=112 rộng 1104, W/Trip header cao 84, hero W04 232, ô thống kê 138, hàng dưới 410 — khớp Figma.
- Gateway HTTP-mock đã chụp và đối soát 22/11: Quỹ nhóm OPEN/CLOSING/CLOSED + hộp thoại cài đặt (W10/W10.1), Lịch trình + bản đồ ngày (W06.2); sửa breadcrumb Quỹ nhóm Gateway nằm trong W/Trip header.
- Chỉ kiểm tra bằng CSS/test, chưa xem trực quan: các bước con W10.2–W10.11 trong hộp thoại, Gateway members/create; overlay W15.
- Không phải pixel parity tuyệt đối: font render, ảnh dữ liệu thật và các sai lệch có chủ đích trong [V2_DESIGN_DELTAS.md](V2_DESIGN_DELTAS.md).

## Test đã cập nhật theo V2

Các test khóa hình học/màu của thiết kế cũ (sidebar 220/72px, hero 150px tại x=238, màu `#006b92`, nhãn menu cũ, rail timeline, lưới thẻ cũ) được đổi sang số đo Figma V2. Không bỏ kiểm tra nghiệp vụ. Kiểm tra tương phản gradient chính tách thành `test.fixme` (V2-D09) chờ quyết định thiết kế.

## Việc còn mở

- Ảnh chuẩn Linux Home đã cập nhật ngày 22/11 và xác minh trong CI `45014561827` tại commit `8e219d1` (cả 3 job PASS). Giữ ảnh Web V2 này khi giải quyết conflict với nhánh POI. Xem [PR31_CI_REPAIR.md](PR31_CI_REPAIR.md) để phân biệt lỗi cũ và bằng chứng mới.
- Màn chưa có route/tính năng: W13, W21, A00, A02.1, A04.1 (V2-D13).

## Tinh chỉnh 22/11/2026

Theo yêu cầu "bớt bo tròn, đỡ AI, cuốn hút hơn" và "cân nhắc nội dung hiển thị": V2-D15 (hình khối, màu, font) và V2-D16 ([CONTENT_RULES.md](CONTENT_RULES.md)). Kiểm tra lại sau tinh chỉnh: tsc/eslint PASS, unit 887/887, fixture 251/251, Gateway 208 PASS + 5 skip Leaflet, axe 0 vi phạm.
