# Draft PR — Web Demo 1 readiness

Title: `Demo 1 readiness: guard Finance refresh, verify integration and document localhost demo`

Base: `main`. Compare: `feat/demo-1-readiness-web`. **Draft** vì live post-fix và manual gates chưa hoàn tất. Người dùng đã yêu cầu chuyển giai đoạn D; đây là nội dung để tạo PR, chưa phải bằng chứng PR đã tồn tại.

## Vấn đề và kết quả

Sau command quỹ thành công, người dùng có thể mở form mới trước khi authoritative projections tải xong và nhận phiên bản cũ. Candidate chặn mở intent mới trong lúc các queries đang fetching; giữ nguyên snapshot của form đang mở, quyền, versions và idempotency. Regression giữ chậm GET tái hiện lỗi trước sửa, rồi kiểm chờ refresh và bảo toàn draft khi409.

Live harness cập nhật selector UI, cleanup ownership khi volume chưa tồn tại, healthcheck sau restart, Finance inbox và MOCK_FLIGHT observation. Thêm built fixture/Gateway suites với output riêng và CI jobs. Bài Map provider-error dùng đồng hồ debounce kiểm soát; không tăng timeout hoặc đổi Map runtime. Mở rộng live Settings/delete/expiry/money safety, nhưng phần mở rộng chưa full PASS.

Runbook, kịch bản Edge, hướng dẫn PR/merge và báo cáo evidence phân biệt fixture/HTTP mock/live/manual. Không sửa hồ sơ CP đã đóng hoặc DOCX chính thức.

## Cặp kiểm chứng

- Web source commit `20063c08999caaf129c16195260566088fbfb52f`; implementation hash candidate cuối `c0563a73f5906acda31424f6c5d8dc8ca34facc9cdeb6dea9d6142643b221fc3`; các commit sau chỉ docs/evidence.
- Backend candidate `bec284f6b14e6451fd2e988acde8ae831c307f8a`; implementation hash `3298ef26df465d4d1437c97bcabbf491000a316b86b945aed59ebfdf7b41ee9f`.
- Web main đã tích hợp `e2dae06bdef9747d874120bead2d61e44426a14f`.
- Sau Backend merge phải ghi Backend main SHA thực tế và chạy lại cross-repo gate; các kết quả hiện tại không chứng minh Backend main sau merge.

## Kiểm chứng local và giới hạn

- Current lint/typecheck/demo build: PASS. Unit49 files/586 PASS; sau đó chỉ sửa thứ tự chờ trong live test và docs. Focused Finance HTTP mock3/3 PASS.
- **Trước runtime fix RD-09:** full fixture208/208 và Gateway127/127 đạt cả dev/built; không skipped/flaky. Suite Gateway hiện có128 bài, full post-fix NOT_RERUN.
- **Trước runtime fix RD-09:** dev `20261102172120-6606e567`, preview `20261102172641-398317aa`, preview `20261102173053-fb54789f`: mỗi lượt1 scenario/15 steps, exit0, retries0. Web hash khi đó `3926bfa939c8f18c0b29dc78b4a9dbec9f2e6d77c273c41bfa01d6c74bde5152`.
- Personal localhost launcher và read-after-restart smoke: PASS, balance 500000 / hai ledger / Plan còn nguyên.
- Frozen install/build trên local clone + source overlay mới: PASS. Đây không phải máy sạch hoàn toàn hoặc clean committed candidate checkout.

Live mở rộng cuối `20261102183225-1fcdc2b4` **FAIL** tại Delete/reload Plan: activity đã mất trên API nhưng form thao tác mới bị khóa sau reload sớm. Test đã thêm chờ DELETE200/row biến mất/nút enabled; **NOT_RERUN** theo quyết định chốt chuyển D. Settings conflict đã đi qua trong run thất bại; Finance đồng thời và expired invite chưa chạy tới. Chuỗi dev1+preview2 trên implementation cuối chưa có. Reload workaround RD-09 đã bỏ khỏi test nhưng chưa có live post-fix hoàn chỉnh.

Giữ nguyên mọi failure history. Stop Price Watch retry chỉ sau409 và reload/reconfirm; không runner retry. Edge2 lượt/30 phút/native zoom chưa có kết quả. Không tuyên bố READY_FOR_LOCAL_DEMO hoặc READY_TO_MERGE.

## Gate trước merge

- Review các known issues và coverage gaps trong `docs/demo-readiness-validation.md`.
- Người dùng hoàn thành Edge hai lượt + 30 phút/native zoom theo `docs/HUONG_DAN_DEMO_TRUC_TIEP.md`.
- Backend PR đã merge; chạy live dev + hai preview với đúng Backend main SHA.
- CI trên HEAD PR hiện hành PASS, reviewer khác tác giả approve, resolve tất cả threads.
- Merge commit; không force-push/bypass. Sau cả hai merge chạy main install/build/live/smoke và chỉ ghi MAIN_VERIFIED khi đạt.

## Rollback

Giữ cặp đã kiểm chứng trong checkout riêng để chuẩn bị demo; sửa/revert code qua PR nếu cần. Không reset DB, xóa volumes hoặc dùng fixture thay lỗi Backend. Phạm vi chỉ Web + Backend localhost, Finance TEST, provider MOCK_FLIGHT; không production/Mobile.

Evidence: [readiness](../demo-readiness-validation.md), [bàn giao D](../PHASE_D_HANDOFF.md), [run summary](../evidence/demo-readiness/run-summary-20261103.json). Khi dán vào GitHub, thay các link tương đối bằng URL của file trên nhánh đã push và gắn Backend PR URL. Raw artifacts/credentials không đính kèm.
