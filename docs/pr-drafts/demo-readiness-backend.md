# Draft PR — Backend Demo 1 readiness

Title: `Demo 1 readiness: integrate main and verify local Web compatibility`

Base: `main`. Compare: `feat/demo-1-readiness-backend`. Trạng thái dự kiến: **Draft** cho đến khi các gate còn thiếu được xử lý. File này là bản soạn local, chưa phải PR đã tạo.

## Vấn đề và kết quả

Nhánh Demo 1 cần dùng cùng Finance outbox/inbox mới trên main. Merge local giữ day-only, rejection feedback, acceptance tooling và các job Finance notifications; thống nhất cổng Automation của integration harness. Catalog hợp nhất có 113 RPC, sửa count gate và tái sinh contracts từ source đã hợp nhất. Không mở thêm API hoặc schema nghiệp vụ, không sửa migration đã áp dụng.

## Cặp phiên bản kiểm chứng

- Backend merge local: `bec284f6b14e6451fd2e988acde8ae831c307f8a`; main đã tích hợp: `37a4b5786f913f2ce2705204d013076cbcf1bd3a`.
- Backend implementation SHA-256: `3298ef26df465d4d1437c97bcabbf491000a316b86b945aed59ebfdf7b41ee9f`.
- Web hash của chuỗi live PASS: `3926bfa939c8f18c0b29dc78b4a9dbec9f2e6d77c273c41bfa01d6c74bde5152`. Sau đó Web sửa Finance refresh và live test, candidate hash `c0563a73f5906acda31424f6c5d8dc8ca34facc9cdeb6dea9d6142643b221fc3`; chưa có full live PASS với hash mới. Backend implementation giữ nguyên.
- Sau commit candidate, điền SHA thực tế và xác nhận docs-only diff hoặc chạy lại gate bị ảnh hưởng. Không dùng riêng Web HEAD trên để tái hiện candidate.

## Kiểm chứng local

Node 24.19.0, pnpm 10.34.5, Windows + Docker Linux; suites tuần tự, unit tối đa hai worker.

- Build/lint/frozen install; unit 126 files / 1896 tests: PASS.
- Contracts generation/check/lint/REST/breaking: PASS, 113 RPC; contracts tests 15 files / 78 tests.
- DB 30, Identity 27, Trip 39, Invitations 19, Members 19, Finance 122, Notification 7, Price Watch 12, Demo acceptance 9 groups: PASS.
- Finance outbox 10 groups, Finance notifications 61 groups: PASS.
- Fresh source replay install/build và `dev:test`: PASS, bảy liveness endpoints, graceful shutdown Windows.
- Cross-repo live dev + hai preview liên tiếp: PASS; balance 500000, hai ledger IN, Fund OPEN; real broker/Mailpit/Finance, không business SQL seed.
- Personal launcher start/check/stop/restart và browser smoke: PASS, giữ dữ liệu.

Members integration có Finance protocol fixture; outbox dùng capture queue; notification integration có controlled fault/concurrency fixtures. Đây không phải production hoặc ngân hàng thật. Personal Finance delivery vẫn mặc định tắt.

## Gate còn thiếu

Đọc báo cáo `Wolfari-web/docs/demo-readiness-validation.md` và evidence summary trước đổi PR thành Ready. Full dev fixture208/Gateway127 đã recovery trên fresh replay trước Web runtime fix. Finance refresh fix đạt focused3/3; Web full unit586 đạt. Live Web mở rộng cuối FAIL tại Delete/reload Plan, test chờ kết quả đã chỉnh nhưng NOT_RERUN theo yêu cầu chuyển D; full post-fix dev1/preview2 và Edge2 lượt/30 phút còn thiếu. CI trên HEAD PR, approval khác tác giả và resolve threads vẫn bắt buộc. Không lấy local PASS thay CI/review.

Không đưa Backend PR #14–16 vào phạm vi. Không Mobile, production, provider giá thật, push/email Finance hoặc redesign mới. Ba DOCX chính thức giữ nguyên checksum.

## Review và rollback

Review protobuf/generated/catalog, migration compatibility, config và Finance recipient/deduplication. Merge Backend trước bằng merge commit; sau merge kiểm chứng Web với đúng Backend main SHA mới. Nếu có lỗi, fix/revert qua PR; giữ database/volumes, không suy code rollback cho phép downgrade schema.

Trước đăng PR: thay liên kết bằng URL của readiness/evidence đã push, gắn PR Web liên quan và cập nhật trạng thái CI thực tế. Không đính kèm raw logs, `.local`, mật khẩu hoặc token.
