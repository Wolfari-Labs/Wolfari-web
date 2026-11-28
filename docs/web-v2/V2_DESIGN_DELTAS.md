# Web V2 — Sai lệch có chủ đích so với Figma

Figma: `hdy2sOZk6rfjKXKDJ9HW9y`, trang `930:6658`. Mỗi mục là một chỗ code cố ý khác Figma, kèm lý do. Các mục này cần nhóm thiết kế xác nhận; không coi là đã duyệt.

| ID | Figma | Code | Lý do |
|---|---|---|---|
| V2-D01 | Màu chữ phụ `#6a7891`, mờ `#8a97b0`, link `#3c7be8`, chip cảnh báo `#9a6a12`, chip tím `#6b4ee6` | `#5f6d86`, `#5d6a83`, `#2e6ad4`, `#8c600f`, `#6346de` (cùng tông, đậm hơn tối thiểu) | Giá trị Figma dưới WCAG AA 4.5:1 ở chữ 12–15px trên nền V2 (axe `color-contrast` của bộ E2E). Màu nền, gradient, pastel giữ nguyên Figma. |
| V2-D02 | Tab/chip/nút nav 34–40px, nút thu gọn sidebar không có trên bản mở rộng | Vùng bấm tối thiểu 44px; nút thu gọn 44px ở góc phải dòng "CHUYẾN ĐI" | Quy tắc target 44px của dự án (test a11y). Nút thu gọn giữ chức năng hiện có. |
| V2-D03 | W/Trip header có avatar stack, "3 đang online" | Không hiển thị | Trip detail chỉ có số thành viên, không có danh sách/presence; không tạo dữ liệu giả. |
| V2-D04 | Breadcrumb "Chuyến đi của tôi › Tên chuyến › Trang" | Giữ nhãn hiện có của từng trang ("Tổng quan chuyến đi › Trang") | Breadcrumb là `h1` và đường dẫn đã được test; đổi nhãn cần thống nhất toàn bộ trang. |
| V2-D05 | Ô tìm kiếm W02 "Tìm chuyến đi, điểm đến…" + nút lọc tròn | "Tìm theo tên chuyến đi", không có nút lọc | Tìm kiếm chỉ lọc theo tên; nút lọc không có chức năng tương ứng. |
| V2-D06 | Thẻ chuyến đi không có menu "…" | Giữ ActionMenu "Thao tác …" ở góc ảnh | Giữ thao tác "Cài đặt chuyến đi" hiện có. |
| V2-D07 | Nav guest: Trang chủ / Chuyến đi của tôi / Lên lịch | Như Figma; "Lên lịch" là nút disabled khi chưa chọn chuyến | Thay cho liên kết "Tính năng"/"Về Wolfari" cũ (đã cập nhật test). |
| V2-D08 | Top nav 769–1100px (Figma chỉ có khung 1440) | Ẩn nhãn nav (giữ icon + tên truy cập), wordmark 80% | Tránh tràn ngang ở 820–1100px. |
| V2-D09 | Chữ trắng trên gradient `#5b8cff → #3cc9b0` (nút chính, tab/chip/nav đang chọn) | Giữ nguyên Figma | Chỉ đạt ~2,1:1 ở đầu xanh ngọc, dưới AA. Không thể đạt AA mà giữ được gradient. **Đã giải quyết bởi V2-D15** (nút chính dùng màu xanh đặc `#1f5fd1`, chữ trắng 5,8:1); kiểm tra tương phản đã bật lại. |
| V2-D10 | Figma chỉ có khung 1440×960 | Tổng quan vừa đúng một màn hình khi viewport ≥1101×900; thấp/hẹp hơn thì vùng `main` cuộn bên trong, mobile cuộn tự nhiên | Bố cục V2 cố định chiều cao hero 232, ô 138, hàng dưới 410 như Figma. |
| V2-D11 | Sidebar 264px | 769–1100px dùng dạng thu gọn 84px (Figma `937:7692`) | Giữ chiều rộng nội dung đủ dùng ở màn laptop hẹp/tablet ngang. |
| V2-D12 | Các phần tử cần dữ liệu không có trong app | Không dựng | Thời tiết, avatar/online, hóa đơn, "Thêm khoản chi", radio bàn giao theo thành viên, khoảng 7/30/90 ngày, toast W07.1/W08.1/W12.6–12.9/W18.1/W19.1, hộp thoại chuyển Owner (W12.3–12.5), các trạng thái lưu trữ/xóa Trip (W14.2–14.5), số liệu quảng bá ở Trang chủ, Google sign-in, "Ghi nhớ đăng nhập", tìm kiếm/đăng xuất Admin. Chi tiết theo màn hình trong báo cáo kiểm thử. |
| V2-D13 | Màn W13 Xuất & chia sẻ, W21 Public Share, A00/A02.1/A04.1 | Không có | Web chưa có route tương ứng; không tự tạo route/tính năng mới. |
| V2-D14 | Một số nhãn Figma ("Quyền sửa Plan", "Owner/Member", tiêu đề itinerary) | Giữ nhãn hiện có | Nhãn đang là tên truy cập/heading được test và nghiệp vụ dùng. |
| V2-D15 | "Pastel mềm 3D": bo 28–34px, nút viên thuốc, gradient `#5b8cff → #3cc9b0`, bóng mờ rộng + viền sáng inset, font Nunito | Bo 10px (nút/ô nhập/chip), 16px (thẻ), 20px (khung lớn), tròn giữ cho avatar; màu xanh đặc `#1f5fd1` cho nút chính/mục đang chọn; viền mảnh 1px + bóng ngắn; icon tile màu đặc; nền `#f4f6fa`; font Be Vietnam Pro | Yêu cầu của người dùng 22/11/2026: giao diện "đỡ AI hơn, cuốn hút hơn", bớt bo tròn. Đổi qua token `--v2-*` nên có thể chỉnh lại nhanh. |
| V2-D16 | Nội dung theo Figma (nút Chia sẻ, ô thời tiết, ghi chú bản xem trước trên từng thẻ…) | Áp dụng [CONTENT_RULES.md](CONTENT_RULES.md): ẩn tính năng chưa có, bỏ từ kỹ thuật, gom ghi chú xem trước, đặt thao tác cạnh đối tượng | Yêu cầu của người dùng 22/11/2026: cân nhắc kỹ nội dung hiển thị và vị trí. |
