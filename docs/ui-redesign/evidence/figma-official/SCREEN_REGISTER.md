# Figma screen register — 167 frame cấp màn hình/tài liệu

Nguồn: https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace

Mọi dòng đã đọc cấu trúc bằng MCP. Cột ảnh chỉ đánh dấu các ảnh thực sự đã xem; không có ảnh không có nghĩa frame rỗng. Kích thước là canvas Figma, không phải responsive đã kiểm thử. Phân loại là đánh giá discovery, không phải quyết định xóa. Chi tiết layout, sections, chữ, font, instances và image hashes nằm trong `screens-*.json`; toàn bộ nested frames nằm trong `frames-*.json`. Các danh sách text/section trong screen JSON là mẫu có giới hạn, không phải dump nội dung đầy đủ.

## Wolfari · Desktop

| Node / frame | Canvas | Mapping / purpose | Phân loại | Ảnh |
|---|---|---|---|---|
| [3:28](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=3-28) 01 · Trang chủ — Guest | 1440×2144 | / | Cần cải tiến | Cấu trúc |
| [3:29](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=3-29) 02 · Chuyến đi của tôi | 1440×960 | /trips | Cần cải tiến | Cấu trúc |
| [3:30](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=3-30) 03 · Tạo chuyến đi | 1440×1123 | /trips/new | Cần cải tiến | Đã xem |
| [3:31](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=3-31) 04 · Tổng quan — mở | 1440×960 | /trips/:tripId | Cần cải tiến | Cấu trúc |
| [3:32](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=3-32) 05 · Tổng quan — thu gọn | 1440×960 | /trips/:tripId | Cần cải tiến | Cấu trúc |
| [3:33](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=3-33) Components & Decorations | 1440×2400 | Foundation / tài liệu | Tài nguyên / thử nghiệm; không là route | Cấu trúc |
| [20:236](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=20-236) 06 · Lịch trình | 1440×960 | /trips/:tripId/plan | Cần cải tiến | Cấu trúc |
| [20:386](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=20-386) 07 · Bản đồ & địa điểm | 1440×960 | /trips/:tripId/map | Cần cải tiến | Đã xem |
| [20:565](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=20-565) 08 · Dress code | 1440×960 | /trips/:tripId/dress-code | Cần cải tiến | Cấu trúc |
| [23:312](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=23-312) 09 · Packing list | 1440×960 | /trips/:tripId/packing | Cần cải tiến | Đã xem |
| [23:506](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=23-506) 10 · Quỹ nhóm | 1440×960 | /trips/:tripId/fund | Cần cải tiến | Cấu trúc |
| [23:657](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=23-657) 11 · Theo dõi giá vé | 1440×960 | /trips/:tripId/price-watch | Cần cải tiến | Cấu trúc |
| [25:360](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=25-360) 12 · Thành viên | 1440×960 | /trips/:tripId/members | Cần cải tiến | Cấu trúc |
| [25:518](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=25-518) 13 · Xuất & chia sẻ | 1440×960 | Figma-only: export/share | Chưa có route; backlog, không loại bỏ | Cấu trúc |
| [25:676](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=25-676) 14 · Cài đặt | 1440×960 | /trips/:tripId/settings | Cần cải tiến | Đã xem |
| [26:406](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=26-406) 15 · Overlay & Modal states | 1440×1660 | Shared overlays | Cần cải tiến | Đã xem |
| [224:1253](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=224-1253) 07.1 · Bản đồ & địa điểm — sau khi chọn | 1440×960 | /trips/:tripId/map | Cần cải tiến | Cấu trúc |
| [269:1234](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=269-1234) 14.1 · Cài đặt — Chỉnh sửa thông tin | 1440×960 | /trips/:tripId/settings | Cần cải tiến | Cấu trúc |
| [298:1642](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=298-1642) 01.1 · Trang chủ — Đã đăng nhập | 1440×800 | / | Cần cải tiến | Cấu trúc |
| [298:1893](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=298-1893) 16 · Đăng nhập | 1440×960 | /login | Cần cải tiến | Cấu trúc |
| [298:2007](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=298-2007) 17 · Đăng ký | 1440×960 | /register | Cần cải tiến | Cấu trúc |
| [299:1847](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=299-1847) 18 · Tài khoản & thông báo | 1440×960 | /profile | Cần cải tiến | Đã xem |
| [299:1926](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=299-1926) 19 · Trung tâm thông báo | 1440×960 | Shell notification Drawer | Cần cải tiến | Đã xem |
| [299:2010](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=299-2010) 20 · Phản hồi lời mời | 1440×960 | /invitations | Cần cải tiến | Đã xem |
| [299:2066](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=299-2066) 21 · Public Share — Chỉ xem | 1440×960 | Figma-only: public share | Chưa có route; backlog, không loại bỏ | Cấu trúc |
| [299:2133](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=299-2133) 21.1 · Public Share — Nhập mật khẩu | 1440×960 | Figma-only: public share | Chưa có route; backlog, không loại bỏ | Cấu trúc |
| [299:2173](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=299-2173) 21.2 · Public Share — Không khả dụng | 1440×960 | Figma-only: public share | Chưa có route; backlog, không loại bỏ | Cấu trúc |
| [299:2207](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=299-2207) 22 · Luồng hoạt động Web End-user | 3040×2100 | Flow documentation | Cần cải tiến | Cấu trúc |
| [439:2028](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=439-2028) 06.1 · Lịch trình — Chưa xếp lịch | 1440×960 | /trips/:tripId/plan | Cần cải tiến | Cấu trúc |
| [439:2497](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=439-2497) 06.2 · Lịch trình — Bản đồ ngày | 1440×960 | /trips/:tripId/plan | Cần cải tiến | Cấu trúc |
| [475:2294](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=475-2294) 12.1 · Thành viên — Lời mời | 1440×960 | /trips/:tripId/members | Cần cải tiến | Cấu trúc |
| [475:2530](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=475-2530) 12.2 · Thành viên — Quyền sửa Plan | 1440×960 | /trips/:tripId/members | Cần cải tiến | Cấu trúc |
| [475:2772](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=475-2772) 12.3 · Chuyển Owner — Xác nhận | 1440×960 | /trips/:tripId/members | Cần cải tiến | Cấu trúc |
| [475:2909](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=475-2909) 12.4 · Chuyển Owner — Finance CLOSING | 1440×960 | /trips/:tripId/members | Cần thiết kế lại theo contract | Cấu trúc |
| [475:3038](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=475-3038) 12.5 · Thành viên — Sau chuyển Owner | 1440×960 | /trips/:tripId/members | Cần cải tiến | Cấu trúc |
| [477:2692](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=477-2692) 10.1 · Quỹ nhóm — Quản lý Fund Holder | 1440×960 | /trips/:tripId/fund | Cần thiết kế lại theo contract | Cấu trúc |
| [477:2846](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=477-2846) 10.2 · Bàn giao Fund Holder — Chờ chấp nhận | 1440×960 | /trips/:tripId/fund | Cần thiết kế lại theo contract | Cấu trúc |
| [477:2990](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=477-2990) 10.3 · Bàn giao Fund Holder — Đối chiếu | 1440×960 | /trips/:tripId/fund | Cần thiết kế lại theo contract | Cấu trúc |
| [477:3153](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=477-3153) 10.4 · Bàn giao Fund Holder — Hoàn tất | 1440×960 | /trips/:tripId/fund | Cần thiết kế lại theo contract | Cấu trúc |
| [514:3121](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=514-3121) 08.1 · Dress code — Đã lưu | 1440×960 | /trips/:tripId/dress-code | Cần cải tiến | Cấu trúc |
| [514:3252](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=514-3252) 10.5 · Quỹ nhóm — Đã ghi khoản chi | 1440×960 | /trips/:tripId/fund | Cần thiết kế lại theo contract | Cấu trúc |
| [514:3370](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=514-3370) 12.6 · Thành viên — Đã gửi lời mời | 1440×960 | /trips/:tripId/members | Cần cải tiến | Cấu trúc |
| [514:3460](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=514-3460) 12.7 · Thành viên — Đã lưu quyền sửa Plan | 1440×960 | /trips/:tripId/members | Cần cải tiến | Cấu trúc |
| [514:3546](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=514-3546) 14.2 · Cài đặt — Không thể xóa Trip | 1440×960 | /trips/:tripId/settings | Cần cải tiến | Cấu trúc |
| [514:3660](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=514-3660) 18.1 · Tài khoản — Đã lưu | 1440×960 | /profile | Cần cải tiến | Cấu trúc |
| [514:3715](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=514-3715) 18.2 · Tài khoản — Đã xóa thiết bị | 1440×960 | /profile | Cần cải tiến | Cấu trúc |
| [514:3801](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=514-3801) 19.1 · Thông báo — Đã đọc | 1440×960 | Shell notification Drawer | Cần cải tiến | Cấu trúc |
| [517:3692](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=517-3692) 11.0 · Theo dõi giá vé — Tạo mới | 1440×960 | /trips/:tripId/price-watch | Cần cải tiến | Cấu trúc |
| [517:3849](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=517-3849) 11.1 · Theo dõi giá vé — Đã tạo | 1440×960 | /trips/:tripId/price-watch | Cần cải tiến | Cấu trúc |
| [517:4006](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=517-4006) 13.1 · Xuất & chia sẻ — Đang tạo file | 1440×960 | Figma-only: export/share | Chưa có route; backlog, không loại bỏ | Cấu trúc |
| [517:4146](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=517-4146) 13.2 · Xuất & chia sẻ — Link đã tạo | 1440×960 | Figma-only: export/share | Chưa có route; backlog, không loại bỏ | Cấu trúc |
| [517:4303](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=517-4303) 10.6 · Quỹ nhóm — Bắt đầu đóng Finance | 1440×960 | /trips/:tripId/fund | Cần thiết kế lại theo contract | Cấu trúc |
| [517:4446](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=517-4446) 10.7 · Quỹ nhóm — Finance CLOSING | 1440×960 | /trips/:tripId/fund | Cần thiết kế lại theo contract | Cấu trúc |
| [517:4599](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=517-4599) 10.8 · Quỹ nhóm — Finance CLOSED | 1440×960 | /trips/:tripId/fund | Cần thiết kế lại theo contract | Cấu trúc |
| [517:4741](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=517-4741) 14.3 · Cài đặt — Finance CLOSED | 1440×960 | /trips/:tripId/settings | Cần thiết kế lại theo contract | Cấu trúc |
| [517:4849](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=517-4849) 14.4 · Cài đặt — Trip đã lưu trữ | 1440×960 | /trips/:tripId/settings | Cần cải tiến | Cấu trúc |
| [517:4953](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=517-4953) 14.5 · Cài đặt — Xác nhận xóa Trip | 1440×960 | /trips/:tripId/settings | Cần cải tiến | Cấu trúc |
| [528:4683](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=528-4683) 10.9 · Quỹ nhóm — Đóng góp | 1440×960 | /trips/:tripId/fund | Cần cải tiến | Cấu trúc |
| [528:4874](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=528-4874) 10.10 · Quỹ nhóm — Hoàn tiền & điều chỉnh | 1440×960 | /trips/:tripId/fund | Cần thiết kế lại theo contract | Cấu trúc |
| [528:5059](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=528-5059) 10.11 · Quỹ nhóm — Lịch sử | 1440×960 | /trips/:tripId/fund | Cần cải tiến | Cấu trúc |
| [538:4973](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=538-4973) A00 · Admin — Đăng nhập | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [538:5007](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=538-5007) A01 · Admin — Tổng quan hệ thống | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Đã xem |
| [538:5098](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=538-5098) A02 · Admin — Người dùng & Trip | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [538:5195](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=538-5195) A03 · Admin — Provider & quota | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [538:5295](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=538-5295) A04 · Admin — Danh mục & mẫu | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [538:5391](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=538-5391) A05 · Admin — Job & log vận hành | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [538:5489](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=538-5489) A02.1 · Admin — Xác nhận khóa tài khoản | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [538:5597](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=538-5597) A02.2 · Admin — Tài khoản đã khóa | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [538:5696](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=538-5696) A06 · Luồng hoạt động Web Admin | 4640×1260 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [541:4994](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=541-4994) 10.9.1 · Quỹ nhóm — Đã tạo đợt đóng góp | 1440×960 | /trips/:tripId/fund | Cần cải tiến | Cấu trúc |
| [541:5205](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=541-5205) 10.10.1 · Quỹ nhóm — Đã lưu điều chỉnh | 1440×960 | /trips/:tripId/fund | Cần thiết kế lại theo contract | Cấu trúc |
| [541:5410](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=541-5410) 12.8 · Thành viên — Đã gửi lại lời mời | 1440×960 | /trips/:tripId/members | Cần cải tiến | Cấu trúc |
| [541:5488](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=541-5488) 12.9 · Thành viên — Đã thu hồi lời mời | 1440×960 | /trips/:tripId/members | Cần cải tiến | Cấu trúc |
| [541:5579](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=541-5579) 18.3 · Tài khoản — Đã đổi ảnh | 1440×960 | /profile | Cần cải tiến | Cấu trúc |
| [541:5636](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=541-5636) A04.1 · Admin — Thêm cấu hình | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [767:5377](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=767-5377) Alignment / Design contract | 4680×180 | Foundation / tài liệu | Tài nguyên / thử nghiệm; không là route | Cấu trúc |
| [768:5376](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=768-5376) 01 · Home Guest — Tham chiếu nguồn | 1440×2144 | / | Cần cải tiến | Đã xem |
| [768:5746](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=768-5746) 01.1 · Home User — Tham chiếu nguồn | 1440×800 | / | Cần cải tiến | Cấu trúc |
| [768:6118](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=768-6118) 16 · Login — Tham chiếu nguồn | 1440×960 | /login | Cần cải tiến | Cấu trúc |
| [768:6211](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=768-6211) 17 · Register — Tham chiếu nguồn | 1440×960 | /register | Cần cải tiến | Cấu trúc |
| [768:6309](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=768-6309) 02 · Trip List — Tham chiếu nguồn | 1440×960 | /trips | Cần cải tiến | Cấu trúc |
| [768:6807](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=768-6807) 04 · Trip Overview — Tham chiếu nguồn | 1440×960 | /trips/:tripId | Cần cải tiến | Cấu trúc |
| [768:7123](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=768-7123) 06 · Plan — Tham chiếu nguồn | 1440×960 | /trips/:tripId/plan | Cần cải tiến | Đã xem |
| [768:7492](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=768-7492) 12 · Members — Tham chiếu nguồn | 1440×960 | /trips/:tripId/members | Cần cải tiến | Đã xem |
| [768:7694](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=768-7694) 18 · Profile — Tham chiếu nguồn | 1440×960 | /profile | Cần cải tiến | Cấu trúc |
| [768:7778](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=768-7778) 10 · Quỹ nhóm — Đề xuất SRS | 1440×960 | /trips/:tripId/fund | Cần cải tiến | Đã xem |
| [768:7992](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=768-7992) 11 · Theo dõi giá vé — Đề xuất SRS | 1440×960 | /trips/:tripId/price-watch | Cần cải tiến | Đã xem |
| [768:8228](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=768-8228) 08 · Dress code — Đề xuất SRS | 1440×960 | /trips/:tripId/dress-code | Cần cải tiến | Đã xem |
| [777:6442](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=777-6442) Notes / Quỹ nhóm · điều chỉnh nghiệp vụ | 1440×300 | Foundation / tài liệu | Tài nguyên / thử nghiệm; không là route | Cấu trúc |
| [777:6445](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=777-6445) Notes / Theo dõi vé · điều chỉnh nghiệp vụ | 1440×300 | Foundation / tài liệu | Tài nguyên / thử nghiệm; không là route | Cấu trúc |
| [777:6448](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=777-6448) Notes / Dress code · điều chỉnh nghiệp vụ | 1440×300 | Foundation / tài liệu | Tài nguyên / thử nghiệm; không là route | Cấu trúc |
| [780:6444](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=780-6444) 01 · Home Guest — Web 402 | 402×4342 | / | Cần cải tiến | Cấu trúc |
| [781:6554](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=781-6554) 10 · Quỹ nhóm — Web 402 | 402×1900 | /trips/:tripId/fund | Cần cải tiến | Đã xem |
| [781:6626](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=781-6626) 11 · Theo dõi giá vé — Web 402 | 402×1946 | /trips/:tripId/price-watch | Cần cải tiến | Cấu trúc |
| [781:6748](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=781-6748) 08 · Dress code — Web 402 | 402×2050 | /trips/:tripId/dress-code | Cần cải tiến | Cấu trúc |
| [783:6655](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=783-6655) Web 402 · Menu drawer | 402×874 | Shell responsive Drawer | Tham khảo trực tiếp; cần focus/reflow states | Cấu trúc |
| [785:6670](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=785-6670) Notes / Responsive Web contract | 1480×340 | Foundation / tài liệu | Tài nguyên / thử nghiệm; không là route | Cấu trúc |

## Wolfari · Mobile

| Node / frame | Canvas | Mapping / purpose | Phân loại | Ảnh |
|---|---|---|---|---|
| [317:2025](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2025) M01 · Khám phá — Guest | 402×874 | / | Cần cải tiến cho Web | Cấu trúc |
| [317:2026](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2026) M02 · Đăng nhập | 402×874 | /login | Cần cải tiến cho Web | Cấu trúc |
| [317:2027](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2027) M03 · Đăng ký | 402×874 | /register | Cần cải tiến cho Web | Cấu trúc |
| [317:2028](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2028) M04 · Khám phá — Thành viên | 402×874 | / | Cần cải tiến cho Web | Cấu trúc |
| [317:2029](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2029) M05 · Chuyến đi của tôi | 402×874 | /trips | Cần cải tiến cho Web | Cấu trúc |
| [317:2030](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2030) M06 · Tạo chuyến đi — Thông tin | 402×874 | /trips/new | Cần cải tiến cho Web | Cấu trúc |
| [317:2031](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2031) M07 · Tạo chuyến đi — Cá nhân hóa | 402×874 | /trips/new | Cần cải tiến cho Web | Cấu trúc |
| [317:2032](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2032) M08 · Tổng quan chuyến đi | 402×874 | /trips/:tripId | Cần cải tiến cho Web | Cấu trúc |
| [317:2033](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2033) M09 · Lịch trình | 402×874 | /trips/:tripId/plan | Cần cải tiến cho Web | Đã xem |
| [317:2034](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2034) M10 · Bản đồ & địa điểm | 402×874 | /trips/:tripId/map | Cần cải tiến cho Web | Cấu trúc |
| [317:2035](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2035) M11 · Chi tiết địa điểm | 402×874 | /trips/:tripId/map (detail) | Cần cải tiến cho Web | Cấu trúc |
| [317:2036](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2036) M12 · Dress code | 402×874 | /trips/:tripId/dress-code | Cần cải tiến cho Web | Cấu trúc |
| [317:2037](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2037) M13 · Hành lý | 402×874 | /trips/:tripId/packing | Cần cải tiến cho Web | Cấu trúc |
| [317:2038](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2038) M14 · Quỹ nhóm | 402×874 | /trips/:tripId/fund | Cần cải tiến cho Web | Cấu trúc |
| [317:2039](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2039) M15 · Ghi nhận khoản chi | 402×874 | /trips/:tripId/fund (backlog) | Cần cải tiến cho Web | Cấu trúc |
| [317:2040](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2040) M16 · Thành viên | 402×874 | /trips/:tripId/members | Cần cải tiến cho Web | Cấu trúc |
| [317:2041](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2041) M17 · Mời thành viên | 402×874 | /trips/:tripId/members (invite) | Cần cải tiến cho Web | Cấu trúc |
| [317:2042](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2042) M18 · Theo dõi giá vé | 402×874 | /trips/:tripId/price-watch | Cần cải tiến cho Web | Cấu trúc |
| [317:2043](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2043) M19 · Xuất & chia sẻ | 402×874 | Figma-only: export/share | Chưa có route; backlog, không loại bỏ | Cấu trúc |
| [317:2044](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2044) M20 · Cài đặt chuyến đi | 402×874 | /trips/:tripId/settings | Cần cải tiến cho Web | Cấu trúc |
| [317:2045](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2045) M21 · Chỉnh sửa chuyến đi | 402×874 | /trips/:tripId/settings | Cần cải tiến cho Web | Cấu trúc |
| [317:2046](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2046) M22 · Tài khoản & thông báo | 402×874 | /profile | Cần cải tiến cho Web | Cấu trúc |
| [317:2047](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2047) M23 · Trung tâm thông báo | 402×874 | Shell notification Drawer | Cần cải tiến cho Web | Cấu trúc |
| [317:2048](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2048) M24 · Phản hồi lời mời | 402×874 | /invitations | Cần cải tiến cho Web | Cấu trúc |
| [317:2049](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2049) M25 · Chia sẻ công khai | 402×874 | Figma-only: public share | Chưa có route; backlog, không loại bỏ | Cấu trúc |
| [317:2050](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2050) M26 · Nhập mật khẩu chia sẻ | 402×874 | Figma-only: public share | Chưa có route; backlog, không loại bỏ | Cấu trúc |
| [317:2051](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2051) M27 · Liên kết không khả dụng | 402×874 | Figma-only: public share | Chưa có route; backlog, không loại bỏ | Cấu trúc |
| [328:3072](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=328-3072) Scrollable viewport | 402×754 | Foundation / tài liệu | Tài nguyên / thử nghiệm; không là route | Cấu trúc |
| [317:2052](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2052) M28 · Tiện ích chuyến đi | 402×874 | Shell tools/navigation | Cần cải tiến cho Web | Cấu trúc |
| [317:2053](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2053) M29 · Thêm hoạt động | 402×874 | /trips/:tripId/plan (add) | Cần cải tiến cho Web | Cấu trúc |
| [317:2054](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2054) M30 · Thêm vật dụng | 402×874 | /trips/:tripId/packing (preview) | Cần cải tiến cho Web | Cấu trúc |
| [317:2055](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=317-2055) Mobile · Components | 2840×5567 | Foundation / tài liệu | Tài nguyên / thử nghiệm; không là route | Cấu trúc |
| [329:3244](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=329-3244) Mobile · Design index | 2840×121 | Foundation / tài liệu | Tài nguyên / thử nghiệm; không là route | Cấu trúc |
| [405:3506](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=405-3506) M31 · Thao tác nhanh — Bottom sheet | 402×874 | Shell quick actions | Cần cải tiến cho Web | Cấu trúc |
| [405:3634](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=405-3634) Mobile · Modern component showcase | 1080×1369 | Foundation / tài liệu | Tài nguyên / thử nghiệm; không là route | Cấu trúc |
| [424:4048](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=424-4048) M32 · Chỉnh sửa hồ sơ | 402×874 | /profile | Cần cải tiến cho Web | Cấu trúc |
| [449:4053](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=449-4053) Mobile · Prototype controls | 750×360 | Foundation / tài liệu | Tài nguyên / thử nghiệm; không là route | Cấu trúc |
| [450:4374](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4374) P01 · Chuyến đi đã sẵn sàng | 402×874 | /trips/new | State tham khảo; chưa đủ lỗi/pending | Cấu trúc |
| [450:4392](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4392) P02 · Đã lưu hoạt động | 402×874 | /trips/:tripId/plan | State tham khảo; chưa đủ lỗi/pending | Cấu trúc |
| [450:4410](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4410) P03 · Đã lưu vật dụng | 402×874 | /trips/:tripId/packing (preview) | State tham khảo; chưa đủ lỗi/pending | Cấu trúc |
| [450:4428](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4428) P04 · Đã lưu khoản chi | 402×874 | /trips/:tripId/fund (backlog) | State tham khảo; chưa đủ lỗi/pending | Cấu trúc |
| [450:4446](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4446) P05 · Lời mời đã sẵn sàng | 402×874 | /trips/:tripId/members | State tham khảo; chưa đủ lỗi/pending | Cấu trúc |
| [450:4464](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4464) P06 · Đã lưu hồ sơ | 402×874 | /profile | State tham khảo; chưa đủ lỗi/pending | Cấu trúc |
| [450:4482](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4482) P07 · Đã lưu cài đặt | 402×874 | /trips/:tripId/settings | State tham khảo; chưa đủ lỗi/pending | Cấu trúc |
| [450:4500](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4500) P08 · Đã lưu chuyến đi | 402×874 | /trips/:tripId/settings | State tham khảo; chưa đủ lỗi/pending | Cấu trúc |
| [450:4518](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4518) P09 · Đã lưu ngưỡng giá | 402×874 | /trips/:tripId/price-watch | State tham khảo; chưa đủ lỗi/pending | Cấu trúc |
| [450:4533](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4533) P10 · Xuất lịch trình PDF | 402×874 | Figma-only: export | Chưa có route; backlog, không loại bỏ | Cấu trúc |
| [450:4551](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4551) P11 · Liên kết chia sẻ | 402×874 | Figma-only: share | Chưa có route; backlog, không loại bỏ | Cấu trúc |
| [450:4569](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4569) P12 · Đăng xuất khỏi Wolfari? | 402×874 | Shell logout | State tham khảo; chưa đủ lỗi/pending | Cấu trúc |
| [450:4588](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4588) P13 · Lưu trữ chuyến đi? | 402×874 | /trips/:tripId/settings (backlog) | State tham khảo; chưa đủ lỗi/pending | Cấu trúc |
| [450:4607](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=450-4607) P14 · Thiết bị đang đăng nhập | 402×874 | /profile (sessions ≠ push devices) | State tham khảo; chưa đủ lỗi/pending | Cấu trúc |
| [461:5096](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=461-5096) Mobile · Travel journal components | 1174×1897 | Foundation / tài liệu | Tài nguyên / thử nghiệm; không là route | Cấu trúc |
| [588:8020](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=588-8020) M33 · Chi tiết hoạt động — Bottom sheet | 402×874 | /trips/:tripId/plan (detail) | Cần cải tiến cho Web | Cấu trúc |
| [612:8805](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=612-8805) P15 · Hành lý sẵn sàng | 402×874 | /trips/:tripId/packing (preview) | State tham khảo; chưa đủ lỗi/pending | Cấu trúc |

## Wolfari · Admin

| Node / frame | Canvas | Mapping / purpose | Phân loại | Ảnh |
|---|---|---|---|---|
| [194:1093](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=194-1093) A01 · Admin — Tổng quan | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Đã xem |
| [194:1094](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=194-1094) A02 · Admin — Tài khoản | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [194:1095](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=194-1095) A03 · Admin — Tích hợp & Provider | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [194:1096](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=194-1096) A04 · Admin — Giám sát hệ thống | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [194:1097](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=194-1097) A05 · Admin — Audit & Hỗ trợ | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [194:1098](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=194-1098) A06 · Admin — Cấu hình hệ thống | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [215:1271](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=215-1271) A02.1 · Admin — Tài khoản · Đã khóa | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [215:1497](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=215-1497) A02.2 · Admin — Tài khoản · Quản trị viên | 1440×960 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [216:1337](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=216-1337) Admin Action · Khóa tài khoản | 520×316 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [216:1354](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=216-1354) Admin Action · Mở khóa tài khoản | 520×308 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [216:1371](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=216-1371) Admin Action · Cấu hình Provider | 520×366 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [216:1392](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=216-1392) Admin Action · Trạng thái Provider | 520×298 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [216:1409](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=216-1409) Admin Action · Retry Job | 520×366 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [216:1430](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=216-1430) Admin Action · Chi tiết hỗ trợ | 520×366 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [216:1451](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=216-1451) Admin Action · Lý do truy cập hỗ trợ | 520×384 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |
| [216:1472](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace?node-id=216-1472) Admin Action · Feature Flag | 520×298 | /admin (placeholder; flow Figma-only) | Chưa triển khai; canonical chưa chốt | Cấu trúc |


