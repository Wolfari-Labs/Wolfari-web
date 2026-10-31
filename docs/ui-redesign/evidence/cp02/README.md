# CP-02 — Visual selection evidence

Ngày30/10/2026. **SUPERSEDED_FOR_DIRECTION** sau user correction: trang Lịch trình đã được thiết kế trong Figma. Ba ảnh dưới chỉ giữ lịch sử, không còn yêu cầu lựa chọn. [Live source review](figma-plan-review-2026-10-30/README.md) xác nhận nguồn Web hiện có. CP02 nay COMPLETE theo D20, visual QA miễn theo D19; xem [nghiệm thu](../../CP02_ACCEPTANCE.md). Bảng review dưới là nhận xét lịch sử của exploration không được chọn.

| Thứ tự hiển thị | Artifact / tên direction | Review bằng mắt, giới hạn phải xử lý sau lựa chọn |
|---|---|---|
| 1 | [Nhật ký gọn](visual-01-journal.png) | Brand/sidebar/timeline gần reference, đọc được bốn hoạt động. **Chưa đạt compact-header intent**: generator giữ scenic banner lớn, thêm duplicate add affordance. Không dùng kích thước banner này làm spec cho short viewport. |
| 2 | [Tập trung theo ngày](visual-02-day-focus.png) | Day rail và unassigned rail phân biệt rõ, không banner. Title/date bị lặp ở rail và main; bốn cột làm timeline hẹp, cần bỏ context trùng và chốt collapse priority trước narrow composition. |
| 3 | [Không gian ngang](visual-03-horizontal.png) | Không sidebar, route nav ngang và grouped rows rộng; overflow chứa các route còn lại cần spec keyboard/menu. Khoảng trống trên timeline vẫn cao, phải compact ở viewport520px; chưa phải nghiệm thu first-row target. |

Tất cả: PNG **1487×1058 thực tế**, prompt yêu cầu1440×1024; không resize để giả đúng viewport. Dữ liệu/người dùng/địa điểm trong ảnh chỉ minh hoạ. Có thể có sai khác chữ, font, icon, spacing/token values do generation; source assets/tokens mới là authority khi đặc tả. Không copy pixel-generated logo/icon thành production asset.

## Provenance

- Built-in ImageGen, không CLI/API fallback. [Exact prompts](prompts.md) giữ shared block + từng direction.
- Input1: [official Web Plan](../figma-official/768-7123.png), input2: [current HTTP-mock Plan](../baseline/plan-1366x520.png), input3: [official Home brand](../figma-official/768-5376.png). Cả ba đã mở xem và truyền local image paths vào mỗi call.
- Nguồn Figma chính thức: https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace. Không truy vấn lại toàn file, không write canvas.
- Originals giữ nguyên trong generated_images session `01a18857-0ea5-7083-b3a7-faf451aa71a7`: image1 `exec-3f4dc485-3e87-4d3c-b084-455891bb2c65.png`; image2 `exec-57945ba4-8d30-4df0-b06c-8336a599a226.png`; image3 `exec-99bb08c1-a7bd-4a00-81f4-9e7f357ca9c8.png`. Copies trong thư mục này là durable project artifacts.
- Mỗi ảnh chỉ thể hiện populated desktop Plan. Responsive, hover/focus, editor, error/permission, asynchronous behavior, contrast, keyboard, performance và live Backend **NOT_RUN**; không chứng minh bằng ảnh tĩnh.

## Stop / next action

Không hỏi chọn1/2/3, không tạo revised AI target. Source mapping/spec đã bàn giao và CP02 đã đóng với ngoại lệ; các ảnh này không trở thành target sau D20. Không cho phép app source/Backend/dependencies/Figma writes hoặc CP03.
