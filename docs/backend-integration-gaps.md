# Các thiếu hụt backend ảnh hưởng tích hợp Web

Ngày rà soát: 12/11/2026. Phạm vi: code backend local và Web Finance SRS v1.2; chưa chạy kiểm chứng live. Báo cáo không phải thay đổi hợp đồng API đã được phê duyệt. Không sửa backend trong nhánh Web này.

## BE-01 — Không truy xuất chứng từ từ khoản chi sau tải lại

**Đã xác nhận, chặn chức năng chứng từ hoàn chỉnh.** `apps/api-gateway/src/expense-http.ts` chỉ trả `receipt_available`; test `expense-http.test.ts` chủ động kiểm tra không lộ `receipt_object_key`. Download tại `finance-receipt-http.ts` lại yêu cầu `GET /api/v1/funds/{fundId}/receipts/download?object_key=...`. Không có API tra chứng từ bằng expense ID.

Upload trả key nhưng không giải quyết việc người khác hoặc phiên trình duyệt mới đọc chứng từ đã gắn. Web không được đoán key hay lưu file riêng để giả lập backend.

**Đề xuất:** bổ sung endpoint tải chứng từ theo ID khoản chi (ví dụ `GET /api/v1/expenses/{expenseId}/receipt`); server tự tìm file và kiểm tra session, membership, Trip/Fund scope, quyền đọc, trạng thái attachment. Trả 404 khi không có, không lộ key nội bộ; giữ MIME, Content-Disposition, no-store, giới hạn file hiện có. Kiểm thử sau reload, thành viên khác đủ quyền, outsider/cross-Trip, file thiếu và link cũ. URL trên là đề xuất, Web chưa gọi.

**Xử lý Web đã được user đồng ý:** hoãn chứng từ; không đánh dấu hoàn thành; tiếp tục ghi chú, đảo đóng góp, hoàn tiền, đóng quỹ và lịch sử.

## BE-02 — Kiểm chứng độc lập khoản hoàn cho chính Holder

**Đã xác nhận lệch SRS FR-FIN-05/02.** `apps/finance-service/src/domain/refund-management.ts` cho người nhận xác nhận khi HOLDER_REPORTED, không có nhánh chỉ định người kiểm chứng độc lập nếu người nhận là Holder. SRS yêu cầu độc lập khi có người khác có thể kiểm chứng.

**Đề xuất:** thiết kế verifier/permissions và trạng thái xác nhận độc lập ở backend, bao gồm trường hợp Owner=Holder và Trip một người; chống xác nhận trùng, stale version, thay đổi membership. Không chỉ chặn bằng UI.

**Xử lý Web:** user chọn hành vi API hiện tại; không tuyên bố đạt kiểm chứng độc lập. Không gửi tiền thật.

## BE-03 — Bàn giao Fund Holder

Chưa có route bàn giao trong Finance gateway hiện tại; UI handover chưa tích hợp. FR-FIN-06 cần quy trình tiếp nhận, snapshot, xác nhận hai bên, vô hiệu xác nhận khi số liệu thay đổi, hủy và xử lý tiền đến đích cũ. Không thể thay thế bằng sửa `holder_user_id` trực tiếp. Ngoài phạm vi nhánh này.

## Các phụ thuộc ngoài Finance cần đợt rà soát riêng

- Map/Dress/Packing writes, Travel/DSS: `docs/web-preparation-srs12.md` ghi consumer Web/capability gating chưa chứng minh backend đã hỗ trợ. Cần inventory runtime trước khi bật capability.
- Export/Public Share: chưa thấy trong gateway router hiện tại; không tạo UI giả tải/chia sẻ.
- README backend ghi provider giá thật, push/FCM, Reminder API132, export và Finance notification delivery còn giới hạn. Không suy ra email/push đã được gửi từ việc API tiếp nhận yêu cầu.
- Đóng thiếu/thừa, giao dịch đến muộn và các quy tắc sản phẩm rộng hơn: cần đối chiếu từng contract với SRS, không coi sự tồn tại của endpoint là nghiệm thu toàn bộ yêu cầu.

## BE-04 — Lý do yêu cầu đảo hoàn tiền không có trong API đọc

**Đã xác nhận.** `refund-http.ts/projectRefund` trả thời điểm yêu cầu/đồng ý đảo, nhưng không trả `reversal_reason`. Trong `domain/refund-management.ts`, `REVERSE_REFUND` bắt buộc lý do trùng chính xác với yêu cầu đảo. `reason` trong projection là lý do hoàn tiền ban đầu, không phải lý do đảo.

**Đề xuất:** trả lý do yêu cầu đảo cho thành viên có quyền đọc hoặc cho lệnh đảo tham chiếu yêu cầu đã đồng ý. Cần kiểm thử reload/đổi thiết bị và toàn vẹn consent/version.

**Web:** yêu cầu nhập lại đúng lý do; không dùng lý do gốc hoặc lưu riêng để giả lập API. Việc xem lại lý do trước khi đồng ý/đảo còn phụ thuộc backend.

## Quy tắc bàn giao

Backend bổ sung contract và tests trên nhánh riêng; Web chỉ nối sau khi thống nhất response/permissions/error/idempotency. HTTP-mock không chứng minh database transaction hoặc provider delivery. Ghi rõ IMPLEMENTED, DEFERRED, DEVIATION và NOT_RUN trong kết quả.
