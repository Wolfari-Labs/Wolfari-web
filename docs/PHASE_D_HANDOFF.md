# Bàn giao giai đoạn D — 03/11/2026

**PHASE_D_DRAFT / NOT_READY_TO_MERGE.** Người dùng yêu cầu chốt kiểm thử hiện tại, dọn dẹp, cập nhật docs và chuyển D. Chưa có quyền bỏ reviewer, bypass protection hoặc đổi các gate chưa chạy thành PASS.

## Candidate và bằng chứng

- Backend: `feat/demo-1-readiness-backend`, candidate docs commit `fc7bc3e9f2c826ebd3ad99e5ff0de5fc164799d7`, merge source `bec284f6b14e6451fd2e988acde8ae831c307f8a`. Main đã fetch `37a4b5786f913f2ce2705204d013076cbcf1bd3a`.
- Web: `feat/demo-1-readiness-web`, source readiness commit `20063c08999caaf129c16195260566088fbfb52f`; docs commit tách riêng sau đó. Main đã fetch `e2dae06bdef9747d874120bead2d61e44426a14f`. Implementation SHA-256 trước sửa fixture E2E RD-13 là `c0563a73f5906acda31424f6c5d8dc8ca34facc9cdeb6dea9d6142643b221fc3`; application runtime không đổi trong RD-13.
- [Readiness đầy đủ](demo-readiness-validation.md) và [evidence JSON](evidence/demo-readiness/run-summary-20261103.json) ghi từng command/exit/hash. Dùng `git log -3 --oneline` và `git rev-parse HEAD` để xác nhận commit bàn giao; không coi SHA nguồn là toàn bộ candidate.
- Current source đã đạt lint/typecheck/demo build, unit586/586, Finance HTTP-mock3/3. Bộ full fixture208/Gateway127 và dev1+preview2 PASS thuộc bản trước sửa Finance refresh.
- Live cuối `20261102183225-1fcdc2b4` FAIL tại Delete/reload Plan. Đã chỉnh test chờ DELETE200 và UI hết pending trước reload; chưa chạy lại theo yêu cầu chốt. Dev1+preview2 live trên bản cuối, Edge2 lượt/30 phút vẫn là gate còn thiếu. Gateway HTTP mock128 đã PASS cả dev và built trên CI tại `79bd041`; không thay gate live.

## Dọn dẹp đã thực hiện

- Launcher demo đã dừng; không còn listener Wolfari tại5273/13000/18025/5173/5174 lúc kiểm kê.
- Không còn container/volume mang project test `wolfari-web-demo1-*`. Giữ nguyên `wolfari-demo_postgres_data`, `wolfari-demo_rabbitmq_data`, `wolfari-demo_minio_data`.
- Xóa hai thư mục `node_modules` trong `.readiness-replay/20261103/Wolfari-web` và `Wolfari-backend`; đây là dependencies sinh lại được bằng frozen install. Giữ source overlay, Git và raw evidence để truy xuất kết quả.
- Giữ node_modules và bundle demo của checkout chính, file backup29/29, journal credentials ignored, hai Trip TEST và ba DOCX gốc. Không thao tác Supabase/OSRM hoặc ứng dụng khác.

## Thứ tự Git và PR

1. Review/stage danh sách file rõ ràng, secret/checksum/link/diff check; commit Web source/test/workflow tách docs. Backend commit docs trên merge đã kiểm chứng.
2. Push hai nhánh readiness, giữ nguyên nhánh nguồn và main.
3. Tạo **Draft PR Backend** từ `feat/demo-1-readiness-backend` vào `main` với [nội dung đã soạn](pr-drafts/demo-readiness-backend.md).
4. Web có thể chuẩn bị Draft PR phụ thuộc Backend bằng [nội dung Web](pr-drafts/demo-readiness-web.md), nhưng không merge trước Backend.
5. Hoàn thành gate còn thiếu; CI trên HEAD hiện hành, reviewer khác tác giả approve, resolve threads. Merge commit Backend trước. Sau đó kiểm live lại Web với đúng Backend main SHA, rồi mới review/merge Web.
6. Kiểm main CI/install/build/live preview/smoke trên đúng hai SHA đã merge. Chỉ lúc đó ghi `MAIN_VERIFIED`.

GitHub main của cả hai repo có protection và cho phép merge commit. Không dùng quyền admin để bypass. PR Backend14/15 còn mở không thuộc candidate; PR16 cũng không được bổ sung vào phạm vi.

## Trạng thái công cụ và thao tác remote

GitHub web chưa điều khiển được (`The browser access host is unavailable`). Người dùng đã chấp thuận dùng GitHub API, không cài GitHub CLI. Hai nhánh đã push và hai Draft PR đã tạo:

- [Backend PR #17](https://github.com/Wolfari-Labs/Wolfari-backend/pull/17), HEAD `fc7bc3e`: [CI PR PASS](https://github.com/Wolfari-Labs/Wolfari-backend/actions/runs/41504212006).
- [Web PR #21](https://github.com/Wolfari-Labs/Wolfari-web/pull/21), phụ thuộc Backend. CI tại `79bd041` FAIL built fixture; checks (unit586, dev fixture208, dev HTTP mock128) và built HTTP mock128 PASS. [Chẩn đoán và kiểm chứng bản sửa](WEB_PR21_CI_FIX.md).

Tại `30bea4a`, CI push đã PASS cả ba job, nhưng CI PR vẫn FAIL207/208 ở backdrop Design System. Đã bổ sung readiness ở Design System/Trip List và chờ entry geometry Trip List; ba backdrop cases lặp20 lần/case đạt60/60 local, lint/typecheck/format PASS. Không gọi PR xanh từ kết quả push hoặc local; theo dõi CI HEAD hiện hành và [báo cáo nối tiếp](WEB_PR21_CI_FIX.md).

Cả hai **chưa merge**. Fetch và GitHub API ngày03/11 xác nhận main vẫn là hai SHA ở trên; `git rev-list --left-right --count origin/main...HEAD` có phía trái bằng0 ở cả hai repo. Backend đã hợp nhất main bằng merge `bec284f`; Web main đã là ancestor, không cần merge rỗng. Không còn commit main chưa tích hợp tại mốc kiểm tra này. Phải kiểm lại nếu main tiến thêm trong lúc review.

Không tạo PR trùng, không dùng nút Merge khi còn gate hoặc approval thiếu. Các bước Git ở trên là quy trình; trạng thái thực tế lấy từ hai PR và CI trên HEAD hiện hành.

## Chạy bản demo để người dùng diễn tập

Backend: `corepack pnpm demo:start`; terminal khác: `corepack pnpm demo:check`. Web: `corepack pnpm demo:preview`, mở `http://localhost:5273`. Bundle `dist-demo` đã build lại sau bản sửa cuối; nếu đổi source phải `demo:build` lại. Chi tiết cài/nâng bản/account recovery: [runbook](../HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md).

Người dùng đã nhận [checklist Edge](HUONG_DAN_DEMO_TRUC_TIEP.md). Credentials chỉ mở riêng tư từ journal cục bộ, không dán vào PR. Bộ presentation Trip vẫn chờ report200000/300000; bộ smoke đã có500000/hai ledger. Không dùng smoke để confirm thêm cùng khoản.
