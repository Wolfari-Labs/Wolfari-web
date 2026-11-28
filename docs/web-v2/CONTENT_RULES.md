# Web V2 — Quy tắc nội dung (hiển thị gì, ở đâu)

Ngày 22/11/2026, theo yêu cầu "cân nhắc kỹ nội dung nào nên hiển thị và hiển thị ở đâu". Áp dụng cho mọi màn V2.

## 1. Chỉ hiện thứ người dùng dùng được hoặc cần biết ngay
- Không hiện nút/khối cho tính năng **chưa tồn tại** (ví dụ "Chia sẻ", thời tiết). Ẩn hẳn, không để disabled vĩnh viễn.
- Nút disabled chỉ dùng khi tính năng có thật nhưng người dùng chưa đủ quyền/trạng thái; lý do đặt trong `title`/chú thích ngắn ngay cạnh nút.
- Trường/ô không có dữ liệu: ẩn nếu là thông tin phụ; nếu là chỉ số chính thì thay bằng lời mời hành động có thật (ví dụ "Tạo theo dõi giá").

## 2. Không lộ từ ngữ kỹ thuật
- Không hiện giá trị enum/mã nội bộ (`PENDING_CONFIRMATIONS`, `OPEN`, `MEMBER`, `MOCK_FLIGHT`), từ "projection", "Gateway command", "request", ngày ISO (`2026-09-22`).
- Dịch sang tiếng Việt tự nhiên: "Đang chờ xác nhận", "Đang mở", "Thành viên", ngày `dd/MM/yyyy`.
- Giữ nguyên ý nghĩa nghiệp vụ; chỉ đổi cách diễn đạt.

## 3. Ghi chú "bản xem trước" gom về một chỗ
- Chế độ fixture đã có một chỉ báo chung ("UI preview · Dữ liệu minh họa"). Bỏ các nhãn "TEST", "Minh họa", "Bản xem trước…", "Bản nháp chỉ kiểm tra…" lặp lại trên từng thẻ.
- Ngoại lệ: hình **trông như dữ liệu thật nhưng không phải** (bản đồ minh họa) vẫn giữ nhãn "Minh họa".

## 4. Đặt nội dung đúng chỗ
- Thao tác thuộc về đối tượng nào thì nằm trên đối tượng đó (hàng, thẻ, menu "…").
- Giải thích/hướng dẫn tĩnh không chiếm cả cột: thu vào khối "Hướng dẫn" có thể mở (`details`) hoặc chú thích ngắn cạnh control liên quan.
- Thông báo pháp lý/tiền bạc quan trọng ("Wolfari không giữ hoặc chuyển tiền") giữ lại **một lần** mỗi trang, dạng chú thích gần số liệu tiền.
- Không lặp cùng một thông tin hai lần trên một màn.

## 5. Vừa khung
- Không cắt chữ/số quan trọng ở 1440 và 1100px; nhãn ngắn ("Ngày 2", số tiền) không xuống dòng.
