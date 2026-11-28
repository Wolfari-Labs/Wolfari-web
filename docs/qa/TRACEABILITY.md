# Ma trận truy vết SRS v1.2

Sinh từ SRS thật; mã gốc, đoạn nguồn và toàn bộ tiêu chí nằm trong requirements.json. Đây là coverage thiết kế, không phải kết quả chạy. Ca cấp yêu cầu: requirement-cases.json; kịch bản chi tiết: scenarios.json. Script viết mới: automated-cases.json. Không coi một assertion là toàn bộ yêu cầu.

| SRS | Chức năng | Yêu cầu | Phạm vi | Trạng thái ban đầu | Script hiện có |
|---|---|---|---|---|---|
| IR-UI-01 | ChatLuongWeb | Nguyên tắc giao diện chung | WEB_DIRECT_OR_INDIRECT | NOT RUN | AUTH-004, UX-KEYBOARD, UX-login, UX-register, UX-forgot-password |
| IR-UI-02 | ChatLuongWeb | Web End-user | WEB_DIRECT_OR_INDIRECT | NOT RUN | DASH-001 |
| IR-UI-03 | ChatLuongWeb | Mobile | OUT_OF_SCOPE_NATIVE | NOT RUN | Chưa có trong suite mới |
| IR-UI-04 | QuanTriWeb | Web Admin | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| IR-UI-05 | ChiaSeCongKhai | Giao diện Public Share | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| IR-HW-01 | ChatLuongWeb | Thiết bị Web | WEB_DIRECT_OR_INDIRECT | NOT RUN | UX-login, UX-register, UX-forgot-password |
| IR-HW-02 | ChatLuongWeb | Thiết bị Mobile | OUT_OF_SCOPE_NATIVE | NOT RUN | Chưa có trong suite mới |
| IR-API-01 | ChatLuongWeb | Giao diện giữa các sản phẩm và backend | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| IR-INT-01 | ChatLuongWeb | Giao diện với các dịch vụ bên ngoài  | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| IR-INT-02 | ChatLuongWeb | Xử lý dữ liệu từ dịch vụ bên ngoài | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| IR-INT-03 | ChatLuongWeb | Giao diện hỗ trợ xác minh giao dịch | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| IR-INT-04 | ChatLuongWeb | Quan hệ với dịch vụ đặt vé và thanh toán bên ngoài | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| IR-COMM-01 | ChatLuongWeb | Giao tiếp giữa client và backend | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| IR-COMM-02 | ChatLuongWeb | Giao tiếp với dịch vụ bên ngoài | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| IR-COMM-03 | ChatLuongWeb | Callback và webhook | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| IR-COMM-04 | ChatLuongWeb | Email và Push Notification | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-ID-01 | DangNhap | Đăng ký tài khoản | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-ID-02 | DangNhap | Đăng nhập | WEB_DIRECT_OR_INDIRECT | NOT RUN | AUTH-001, AUTH-004 |
| FR-ID-03 | DangNhap | Đăng xuất | WEB_DIRECT_OR_INDIRECT | NOT RUN | AUTH-003 |
| FR-ID-04 | HoSo | Quản lý thông tin cá nhân | WEB_DIRECT_OR_INDIRECT | NOT RUN | AUTH-001, PROFILE-001 |
| FR-ID-05 | DangNhap | Kiểm tra trạng thái truy cập | WEB_DIRECT_OR_INDIRECT | NOT RUN | AUTH-002 |
| FR-TR-01 | QuanLyChuyenDi | Tạo và cập nhật Trip | WEB_DIRECT_OR_INDIRECT | NOT RUN | TRIP-001, DASH-001, TRIP-002 |
| FR-TR-02 | ThanhVienLoiMoi | Quản lý lời mời và membership | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-TR-03 | ThanhVienLoiMoi | Chuyển Owner | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-TR-04 | ThanhVienLoiMoi | Rời Trip và xóa Member | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-TR-05 | QuanLyChuyenDi | Archive và mở lại Trip | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-TR-06 | QuanLyChuyenDi | Nhân bản Trip | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-TR-07 | QuanLyChuyenDi | Xóa Trip | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PL-01 | QuyenSuaKeHoach | Thiết lập chính sách chỉnh sửa kế hoạch | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PL-02 | QuyenSuaKeHoach | Quản lý Member được chọn | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PL-03 | QuyenSuaKeHoach | Kiểm tra quyền khi chỉnh sửa Plan | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PL-04 | QuyenSuaKeHoach | Quyền của Member không có quyền chỉnh sửa Plan | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PL-05 | LichTrinh | Tạo, sửa và xóa Activity | WEB_DIRECT_OR_INDIRECT | NOT RUN | PLAN-001 |
| FR-PL-06 | LichTrinh | Kiểm tra thời gian Activity | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PL-07 | LichTrinh | Sắp xếp Timeline | WEB_DIRECT_OR_INDIRECT | NOT RUN | PLAN-002 |
| FR-PL-08 | LichTrinh | Cập nhật trạng thái hoàn thành Activity | WEB_DIRECT_OR_INDIRECT | NOT RUN | PLAN-001 |
| FR-LOC-01 | BanDoDiaDiem | Tìm kiếm và xem địa điểm | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-LOC-02 | BanDoDiaDiem | Quản lý địa điểm trong Plan | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-LOC-03 | BanDoDiaDiem | Quản lý liên kết giữa địa điểm và Activity | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-LOC-04 | BanDoDiaDiem | Xem bản đồ và tuyến đường | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-LOC-05 | BanDoDiaDiem | Xử lý khi không có dữ liệu tuyến đường | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-LOC-06 | BanDoDiaDiem | Yêu cầu và áp dụng gợi ý thứ tự ghé thăm | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PK-01 | TrangPhuc | Quản lý Dress Code | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PK-02 | HanhLy | Quản lý Packing Item | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PK-03 | HanhLy | Phân công Packing Item | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PK-04 | HanhLy | Cập nhật trạng thái Packing Item | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PK-05 | HanhLy | Đồng bộ trạng thái khi thay đổi Packing Item | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PK-06 | HanhLy | Áp dụng gợi ý Packing | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-DSS-01 | GoiYThongMinh | Tạo và hiển thị gợi ý | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-DSS-02 | GoiYThongMinh | Áp dụng gợi ý vào Plan | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-DSS-03 | GoiYThongMinh | Gợi ý Dress Code và Packing List | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-DSS-04 | GoiYThongMinh | Gợi ý tuyến đường và thứ tự ghé thăm | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-DSS-05 | GoiYThongMinh | Cảnh báo xung đột lịch trình | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-DSS-06 | GoiYThongMinh | Xử lý dữ liệu thiếu hoặc thay đổi | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-FIN-01 | QuyNhom | Cấu hình quỹ và Fund Holder | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-FIN-02 | QuyNhom | Quản lý đóng góp | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-FIN-03 | QuyNhom | Quản lý chi quỹ và chi ngoài quỹ | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-FIN-04 | QuyNhom | Số dư, số tiền có thể sử dụng, thiếu tiền và điều chỉnh | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-FIN-05 | QuyNhom | Hoàn tiền | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-FIN-06 | QuyNhom | Bàn giao Fund Holder | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-FIN-07 | QuyNhom | Đóng Finance | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-FIN-08 | QuyNhom | Giao dịch đến muộn | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-FIN-09 | QuyNhom | Đọc thông tin VietQR trên Android | OUT_OF_SCOPE_NATIVE | NOT RUN | Chưa có trong suite mới |
| FR-PW-01 | TheoDoiGiaVe | Quản lý yêu cầu theo dõi giá | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PW-02 | TheoDoiGiaVe | Đánh giá giá và cảnh báo | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PW-03 | TheoDoiGiaVe | Đặt vé chung | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PW-04 | TheoDoiGiaVe | Thay đổi và kết thúc theo dõi | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PW-05 | TheoDoiGiaVe | Chống ghi trùng | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PW-06 | TheoDoiGiaVe | Gom truy vấn và sử dụng chung kết quả giá | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PW-07 | TheoDoiGiaVe | Kiểm soát cập nhật yêu cầu theo dõi | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-NT-01 | ThongBao | Quản lý thông báo | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-NT-02 | ThongBao | Cập nhật reminder | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-NT-03 | ThongBao | Quyền và lỗi gửi | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-EX-01 | XuatDuLieu | Nội dung và định dạng export | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-EX-02 | XuatDuLieu | Snapshot dữ liệu | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-EX-03 | XuatDuLieu | Điều kiện tải | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-TR-08 | ChiaSeCongKhai | Quản lý Public Share | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-TR-09 | ChiaSeCongKhai | Phạm vi dữ liệu công khai | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-TR-10 | ChiaSeCongKhai | Truy cập và vòng đời liên kết | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-AD-01 | QuanTriWeb | Phạm vi Admin | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-PL-10 | LichTrinh | Kiểm soát cập nhật đồng thời | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-TR-11 | QuanLyChuyenDi | Xử lý yêu cầu lặp và tác vụ nền | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| FR-TR-12 | QuanLyChuyenDi | Lịch sử thay đổi | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-PER-01 | ChatLuongWeb | Thời gian phản hồi API | WEB_DIRECT_OR_INDIRECT | SPEC_BLOCKED | Chưa có trong suite mới |
| NFR-PER-02 | ChatLuongWeb | Hiệu năng trong giới hạn MVP | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-PER-03 | ChatLuongWeb | Tác vụ xử lý dài | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-PER-04 | ChatLuongWeb | Dịch vụ bên ngoài | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-SAF-01 | ChatLuongWeb | Không tạo dữ liệu giả | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-SAF-02 | ChatLuongWeb | Gợi ý không tự thay đổi dữ liệu | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-SAF-03 | ChatLuongWeb | Bảo toàn dữ liệu quan trọng | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-SEC-01 | ChatLuongWeb | Xác thực và phân quyền | WEB_DIRECT_OR_INDIRECT | NOT RUN | AUTH-002 |
| NFR-SEC-02 | ChatLuongWeb | Cách ly dữ liệu giữa các Trip | WEB_DIRECT_OR_INDIRECT | NOT RUN | SEC-001 |
| NFR-SEC-03 | ChatLuongWeb | Bảo vệ thông tin xác thực | WEB_DIRECT_OR_INDIRECT | NOT RUN | SEC-STORAGE |
| NFR-SEC-04 | ChatLuongWeb | Bảo vệ dữ liệu Public Share và Export | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-SEC-05 | ChatLuongWeb | Callback, webhook và chống xử lý lặp | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-REL-01 | ChatLuongWeb | Khả năng chịu lỗi bên ngoài | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-REL-02 | ChatLuongWeb | Tính nhất quán | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-REL-03 | ChatLuongWeb | Xử lý lại an toàn | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-REL-04 | ChatLuongWeb | Sao lưu và phục hồi | WEB_DIRECT_OR_INDIRECT | SPEC_BLOCKED | Chưa có trong suite mới |
| NFR-USA-01 | ChatLuongWeb | Trình bày giao diện | WEB_DIRECT_OR_INDIRECT | NOT RUN | UX-KEYBOARD, UX-login, UX-register, UX-forgot-password |
| NFR-USA-02 | ChatLuongWeb | Khả năng hoàn thành tác vụ | WEB_DIRECT_OR_INDIRECT | SPEC_BLOCKED | Chưa có trong suite mới |
| NFR-COMP-01 | ChatLuongWeb | Tương thích client | WEB_PART_ONLY | NOT RUN | Chưa có trong suite mới |
| NFR-MNT-01 | ChatLuongWeb | Tách biệt nghiệp vụ và tích hợp | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-MNT-02 | ChatLuongWeb | Kiểm thử các quy tắc quan trọng | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-01 | ChatLuongWeb | Mỗi Trip có đúng một Owner; những người tham gia còn lại là Member. | WEB_DIRECT_OR_INDIRECT | NOT RUN | TRIP-001 |
| BR-02 | ChatLuongWeb | Owner và Member là vai trò theo từng Trip. Admin không mặc nhiên có quyền Owner trong các Trip. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-03 | ChatLuongWeb | Fund Holder là trách nhiệm tài chính, không phải vai trò thay thế Owner hoặc Member. Mỗi Finance đang hoạt động có đúng một Fund Holder. Khi Fund Holder là bên có lợi ích trực tiếp trong giao dịch cần xác nhận, hệ thống phải áp dụng cơ chế kiểm chứng độc lập theo yêu cầu Finance tương ứng; người kiểm chứng chỉ được cấp quyền xác nhận giao dịch được chỉ định và không trở thành một vai trò độc lập trong Trip. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-04 | ChatLuongWeb | Người xem Public Share chỉ có quyền đọc theo liên kết, không trở thành Member và không có vai trò Viewer. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-05 | ChatLuongWeb | Mọi quyền phải được kiểm tra lại tại backend theo trạng thái hiện tại; quyền rộng hơn không được suy ra thành một quyền riêng chưa được cấp. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-06 | ChatLuongWeb | Một Trip MVP có 1–6 thành viên đang tham gia, kéo dài 1–4 ngày liên tiếp, tối đa 50 Activity và 50 địa điểm. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-07 | ChatLuongWeb | Ngày kết thúc không được trước ngày bắt đầu; Trip một ngày được phép. Activity phải nằm trong khoảng thời gian của Trip. | WEB_DIRECT_OR_INDIRECT | NOT RUN | TRIP-001 |
| BR-08 | ChatLuongWeb | Trip chỉ được Archive khi Finance chưa bật hoặc đã CLOSED. Archive khác với xóa Trip. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-09 | ChatLuongWeb | Owner muốn rời Trip phải chuyển quyền Owner trước. Nếu đồng thời là Fund Holder của Finance đang hoạt động, Owner phải hoàn tất bàn giao Fund Holder; nếu Finance đã CLOSED và trách nhiệm giữ tiền đã được giải quyết thì không yêu cầu chỉ định Fund Holder mới. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-10 | ChatLuongWeb | Membership chỉ được chấm dứt sau khi các nghĩa vụ và trách nhiệm chưa hoàn tất của người đó được xử lý. Giao dịch, vé hoặc dữ liệu lịch sử đã hoàn tất không tự động chặn việc rời. Việc rời hoặc xóa Member không tự miễn nghĩa vụ, không tự tạo khoản hoàn và không làm mất dữ liệu lịch sử liên quan. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-11 | ChatLuongWeb | PlanEditPolicy có ba chế độ: OWNER_ONLY, ALL_MEMBERS, SELECTED_MEMBERS. Trip mới mặc định OWNER_ONLY. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-12 | ChatLuongWeb | Quyền sửa Plan không tự cấp quyền Finance, membership, Public Share hoặc thiết lập cá nhân. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-13 | ChatLuongWeb | DSS chỉ đưa ra gợi ý/cảnh báo. Chỉ người có quyền sửa Plan được áp dụng thay đổi. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-14 | ChatLuongWeb | Cảnh báo trùng lịch hoặc thiếu thời gian di chuyển không tự sửa Activity. Nếu thiếu Route, hệ thống phải thông báo chưa thể đánh giá. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-15 | ChatLuongWeb | Finance là sổ theo dõi quỹ của Trip; Wolfari không trực tiếp giữ hoặc chuyển tiền thật. Báo đã chuyển tiền hoặc đọc VietQR không chứng minh Fund Holder đã nhận tiền và không tự làm thay đổi số dư. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-16 | ChatLuongWeb | Sổ quỹ sử dụng VND. Chỉ giao dịch được ghi nhận hợp lệ mới ảnh hưởng số dư. Một khoản đóng góp chỉ được ghi thu một lần, kể cả khi yêu cầu gửi lặp hoặc xử lý đồng thời. Số tiền có thể sử dụng bằng số dư trừ khoản đang dành cho thanh toán hoặc hoàn tiền chưa kết thúc; việc dành tiền, ghi sổ và giải phóng phải nhất quán. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-17 | ChatLuongWeb | Chỉ Fund Holder được thực hiện và ghi nhận chi từ quỹ hoặc đặt vé chung bằng quỹ. Owner không có quyền này nếu không đồng thời là Fund Holder. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-18 | ChatLuongWeb | Khoản chi ngoài quỹ không làm thay đổi số dư, không tự tạo công nợ và không tự tạo hoàn ứng. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-19 | ChatLuongWeb | MVP không triển khai chia nợ kiểu Splitwise, tự động ứng hộ, tự động hoàn ứng hoặc tự tạo khoản vay khi quỹ thiếu. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-20 | ChatLuongWeb | Giao dịch đã ghi sổ không được xóa trực tiếp; sửa sai phải được ghi bằng điều chỉnh có lịch sử. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-21 | ChatLuongWeb | Finance CLOSED là trạng thái cuối trong MVP và không được mở lại. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-22 | ChatLuongWeb | Yêu cầu theo dõi giá gắn với Trip và người tạo, có ngưỡng và trạng thái riêng. Các yêu cầu có thể dùng chung truy vấn nhưng không hợp nhất quyền hoặc điều kiện cảnh báo. Ngưỡng cá nhân không phải ngân sách mua chung. Theo dõi giá không tự đặt hoặc thanh toán vé. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-23 | ChatLuongWeb | Giá được đánh giá theo nguồn, thời điểm và điều kiện tương đương. Cảnh báo được xác định riêng theo FR-PW-02. Nguồn mô phỏng phải được phân biệt với nguồn thực tế. Hệ thống không được khẳng định giá rẻ nhất hoặc chắc chắn sẽ giảm. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-24 | ChatLuongWeb | Export sử dụng snapshot tại thời điểm yêu cầu được chấp nhận; quyền phải được kiểm tra lại khi tải. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-25 | ChatLuongWeb | Public Share hiển thị dữ liệu hiện tại thuộc allowlist, chỉ đọc và không được công khai Finance hoặc dữ liệu cá nhân hạn chế. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-26 | ChatLuongWeb | Plan sử dụng version để phát hiện cập nhật từ dữ liệu cũ; request dùng version cũ không được ghi đè dữ liệu mới. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-27 | ChatLuongWeb | Một request, webhook hoặc tác vụ được gửi lại không được tạo Trip, membership, giao dịch, Expense hoặc notification nghiệp vụ trùng. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-28 | ChatLuongWeb | Các thay đổi quan trọng về membership, Owner, Plan, DSS, Finance, Fund Holder, Finance Closure và Public Share phải được ghi lịch sử. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| BR-29 | ChatLuongWeb | Người dùng không được sửa trực tiếp lịch sử để thay đổi người thực hiện hoặc che nội dung đã phát sinh. | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| DR-01 | ChatLuongWeb | Kiểu dữ liệu và kiểm tra dữ liệu | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| DR-02 | ChatLuongWeb | Tính nhất quán dữ liệu | WEB_DIRECT_OR_INDIRECT | NOT RUN | TRIP-001 |
| DR-03 | ChatLuongWeb | Phiên bản và chống mất cập nhật | WEB_DIRECT_OR_INDIRECT | NOT RUN | PLAN-002, TRIP-002 |
| DR-04 | ChatLuongWeb | Snapshot dữ liệu | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| DR-05 | ChatLuongWeb | Dữ liệu ngoài và tệp | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| DR-06 | ChatLuongWeb | Lưu giữ dữ liệu | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-L10N-01 | ChatLuongWeb | Ngôn ngữ | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-L10N-02 | ChatLuongWeb | Ngày, giờ và tiền tệ | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| NFR-L10N-03 | ChatLuongWeb | Unicode và tài liệu xuất | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-01 | ChatLuongWeb | Đăng ký, đăng nhập, đăng xuất và truy cập chức năng được bảo vệ | WEB_DIRECT_OR_INDIRECT | NOT RUN | AUTH-001, AUTH-002, AUTH-003 |
| AT-02 | ChatLuongWeb | Tạo Trip ở biên giới hạn MVP | WEB_DIRECT_OR_INDIRECT | NOT RUN | TRIP-001 |
| AT-03 | ChatLuongWeb | Mời, chấp nhận, từ chối, thu hồi và mời lại thành viên | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-04 | ChatLuongWeb | Chuyển Owner, Member rời hoặc bị xóa | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-05 | ChatLuongWeb | Hai người đồng thời sửa Plan | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-06 | ChatLuongWeb | Activity trùng giờ, ngoài Trip và thiếu dữ liệu Route | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-07 | ChatLuongWeb | Dress Code, Packing và quyền Member không có Plan edit | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-08 | ChatLuongWeb | DSS với dữ liệu đầy đủ và dữ liệu thiếu | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-09 | ChatLuongWeb | Đóng góp Finance: đóng thiếu, đóng thừa, sai thông tin đối chiếu, giao dịch lặp và Fund Holder tự đóng góp | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-10 | ChatLuongWeb | Chi quỹ, số tiền có thể sử dụng, thiếu tiền, điều chỉnh và hoàn tiền | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-11 | ChatLuongWeb | Bàn giao Fund Holder | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-12 | ChatLuongWeb | Finance Closure | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-13 | ChatLuongWeb | Price Watch, provider lỗi và đặt vé bằng quỹ | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-14 | ChatLuongWeb | Notification/reminder thay đổi theo Activity/Packing/Archive | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-15 | ChatLuongWeb | Export khi dữ liệu thay đổi | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-16 | ChatLuongWeb | Public Share: password, expiry, revoke và allowlist | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-17 | ChatLuongWeb | Truy cập chéo Trip bằng ID/API | WEB_DIRECT_OR_INDIRECT | NOT RUN | SEC-001 |
| AT-18 | ChatLuongWeb | Retry request, webhook hoặc job | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-19 | ChatLuongWeb | Tiếng Việt, PDF/Excel/infographic | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-20 | ChatLuongWeb | Kiểm thử hiệu năng theo ngưỡng đã chốt | WEB_DIRECT_OR_INDIRECT | SPEC_BLOCKED | Chưa có trong suite mới |
| AT-21 | ChatLuongWeb | Đọc VietQR bằng phương thức nhập hoặc dán, từ chối quyền camera và kiểm tra CRC | OUT_OF_SCOPE_NATIVE | NOT RUN | Chưa có trong suite mới |
| AT-22 | ChatLuongWeb | Gom truy vấn và dùng chung kết quả giá | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-23 | ChatLuongWeb | Cảnh báo theo ngưỡng, mức giảm và thời gian của từng theo dõi | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-24 | ChatLuongWeb | Dữ liệu đầu vào, trạng thái, quyền và phiên bản theo dõi | WEB_DIRECT_OR_INDIRECT | NOT RUN | Chưa có trong suite mới |
| AT-25 | ChatLuongWeb | Lời mời và cộng tác Web–Android | WEB_PART_ONLY | NOT RUN | Chưa có trong suite mới |
