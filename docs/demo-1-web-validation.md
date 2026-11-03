# Demo 1 Web — nghiệm thu tích hợp và giới hạn bàn giao

Cập nhật **29/10/2026, Asia/Saigon**. File này thay thế checkpoint WIP ngày 28/10. Không commit/push; thay đổi vẫn ở working tree của hai nhánh feature.

## 1. Kết luận

**Đã hoàn tất triển khai core và quỹ đóng góp thủ công TEST; luồng trình diễn chính đã PASS trên Backend thật ở cả Web dev và bundle build/preview.** Có thể chạy demo theo [hướng dẫn build/chạy](../HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md). Không còn blocker được quan sát trong kịch bản chính.

Kết luận này không có nghĩa mọi gate demo1 đã được chứng nhận vô điều kiện. **Native browser zoom 200% là NOT RUN** vì công cụ điều khiển không xác minh được URL cửa sổ. CSS document zoom 2× đã PASS nhưng không thay thế native zoom. Một số tổ hợp lỗi chỉ có unit/HTTP mock/service integration; launcher cài mới trên dataset cá nhân chưa chạy lại để tránh can thiệp dữ liệu. Xem §§5–8.

- Luồng chính: account/verify → Trip → EMAIL/LINK → quyền Editor → timeline cộng tác → Holder xác nhận đích nhận → report/reject/report/confirm → leave/remove → restart.
- Kết quả ở cả hai runtime: **500.000 VND, đúng 2 ledger IN, Fund OPEN**. Đây là dữ liệu TEST, không chuyển tiền thật và chưa quyết toán.
- Sáu P0 có bằng chứng sửa/kiểm theo phạm vi. Các P1 có thể còn giới hạn lớp kiểm được ghi rõ bên dưới; không dùng fixture thay Backend thật.
- 15 nhóm sau demo vẫn hoãn. Production HTTPS/domain, Mobile, provider thật và CI sau push: **NOT RUN**.

## 2. Snapshot và nguồn kiểm tra

| Repository | Branch | HEAD |
| --- | --- | --- |
| Web | `feat/demo-1-web` | `e2dae06bdef9747d874120bead2d61e44426a14f` |
| Backend | `feat/demo-1-backend` | `1154c740b6c04b455b551d70eeb0dec4e2da3388` |

Hai repo có thay đổi chưa commit; HEAD không đủ để nhận diện bản đã chạy. Run chấp nhận cuối: `20261028134422-6feca939`.

| Dấu vân tay | Giá trị trong run chấp nhận |
| --- | --- |
| Web full tree (đầu = cuối) | `564db753ad41c0fbfa5f9918eaf13274bd7052d975b596d8307ff4a61d5e8e73` |
| Web implementation | `4e3710669372e843d76a1a8b928cd916cd1c1ddfbfce17b78039c0395d13304e` |
| Backend full tree (đầu = cuối) | `57b280764ed951d324eb2d2531d68f973d684f993cf2f07780d723923ab930fa` |
| Backend implementation | `c00b55cc95a444f734087fce1d591be19e7912ce2dfa65949526b071d10d2121` |

Artifact cuối đã được đọc lại ngày 29/10; implementation hash của Web và Backend khớp đầu/cuối run. Tài liệu cập nhật sau run làm đổi full-tree Web nhưng không đổi implementation hash. Lấy snapshot mới bằng `node scripts/demo1-snapshot.mjs`. Harness từ chối PASS nếu implementation đổi giữa dev và preview.

Môi trường: Windows/PowerShell, Node 24.19.0, Corepack/pnpm 10.34.5, Chromium Playwright, Docker Desktop Linux engine. Hạ tầng thật dùng Compose project/ports/volumes riêng; service Node, gRPC, RabbitMQ, MinIO private và Mailpit. Không reset/reseed dataset cá nhân.

## 3. Kiểm thử theo lớp

### Web

| Lệnh | Kết quả |
| --- | --- |
| `corepack pnpm lint` | PASS (28/10, lượt cuối) |
| `corepack pnpm typecheck` | PASS (28/10, lượt cuối) |
| `corepack pnpm test --maxWorkers=2` | **535/535 PASS, 42 files**, 56,18 giây |
| `corepack pnpm test:e2e:gateway` | **35/35 PASS**, browser + HTTP mock |
| `corepack pnpm test:e2e` | **164/164 PASS**, browser fixture |
| `corepack pnpm build` | PASS, Gateway bundle |
| `corepack pnpm build:preview` | PASS, fixture preview |
| `corepack pnpm demo:build` | PASS; `dist-demo` không chứa marker fixture/credentials/catalog/designSystem (0 matches) |
| `corepack pnpm test:e2e:demo1` | Dev **1/1 PASS**, preview **1/1 PASS**; mỗi test 14 bước, không skipped/flaky/error |
| `corepack pnpm test:e2e:live` | **NOT RUN** trên dataset cá nhân; suite legacy không thay gate demo1 |

### Backend và contract

| Lệnh | Kết quả |
| --- | --- |
| `corepack pnpm lint` | PASS |
| `corepack pnpm test --maxWorkers=2` | **1596/1596 PASS, 113 files** |
| `corepack pnpm contracts:rest` | PASS: 109 method/path entries, 6 test OpenAPI |
| `corepack pnpm contracts:check` | PASS: generated/catalog/inventory tái lập |
| `corepack pnpm contracts:breaking --against 1154c740b6c04b455b551d70eeb0dec4e2da3388` | PASS |
| `corepack pnpm build` | PASS, 11 subprojects |
| `node scripts/trip-integration.mjs --demo1` | **9 nhóm PASS** |
| `node scripts/identity-integration.mjs` | **19 nhóm PASS** |
| `node scripts/database-integration.mjs` | **30 nhóm PASS** |
| `node scripts/trip-integration.mjs --finance` | **122 nhóm PASS**; Finance/SQL thật, external payment/provider là fixture |
| `node scripts/trip-integration.mjs --invitations` | **19 nhóm PASS**, 29/10 01:03–01:06, exit 0 |
| `node scripts/trip-integration.mjs` | **39 nhóm PASS**, 29/10 bắt đầu 01:13:33, exit 0; test project đã cleanup |

Các kết quả service trên có output terminal, không tạo artifact độc lập. Không dựng timestamp chi tiết hoặc coi chúng là số bước Web.

## 4. Browser thật và bằng chứng

Nguồn: [demo1.spec.mjs](../tests/e2e-demo1/demo1.spec.mjs), [launcher](../scripts/demo1-e2e.mjs), [Playwright config](../playwright.demo1.config.ts).

Artifact local của run `20261028134422-6feca939`:

- [snapshot đầu](../test-results/demo1/20261028134422-6feca939/snapshot.json), [final-source](../test-results/demo1/20261028134422-6feca939/final-source.json);
- [dev results](../test-results/demo1/20261028134422-6feca939/dev/results.json): expected 1, unexpected/skipped/flaky 0, errors rỗng;
- [preview results](../test-results/demo1/20261028134422-6feca939/preview/results.json): expected 1, unexpected/skipped/flaky 0, errors rỗng;
- [business proof dev](../test-results/demo1/20261028134422-6feca939/dev-business-proof.json), [preview](../test-results/demo1/20261028134422-6feca939/preview-business-proof.json).

Artifact nằm ở thư mục ignored và không đi theo clone mới. `business-proof` chỉ được đọc cùng `results.json`, không phải bằng chứng độc lập.

| Bước | Nội dung | Kết quả |
| --- | --- | --- |
| 1–2 | Năm account A/B/C/D/X tạo và verify qua Mailpit; profile/avatar; MinIO mất/phục hồi; revoke session; đổi/reset password | PASS |
| 3 | Create Trip mất response sau commit → reload/replay cùng intent; EMAIL/LINK; outsider bị chặn | PASS |
| 4–5 | SELECTED_MEMBERS; day-only/timed/overnight; reorder/complete/reopen; revoke Editor; hai actor 409 giữ draft và reconcile trong drawer | PASS |
| 6–7 | Owner≠Holder setup/consent; C=200000, D=300000; reject có lý do → reload → report lại → confirm; mất response confirm replay một lần | PASS; **500000, 2 IN** |
| 8–10 | Hai tab chung cookie/logout; Holder leave bị chặn; Member leave; Editor remove/rejoin; restart giữ dữ liệu; Finance/DB/Rabbit outage và recovery | PASS |
| 11 | Viewport 320/402/768/1366/1440; deferred module; CSS document zoom 2× drawer/focus | PASS; native zoom NOT RUN |
| 12 | Owner=Holder, ngày cuối năm America/New_York, max-int64 budget, destination version, retry cùng intent, metadata/waive/cancel không ledger | PASS |
| 13–14 | EMAIL recipient mới đăng ký/verify/reopen/accept; wrong/revoked link; đổi actor cùng SPA không lộ draft | PASS |

Trip ID dev `0a379bd1-6482-4df0-83f7-339a8c8a742e`, preview `4c2db03f-7bc6-4a5f-adb6-69034b9595bc`; dữ liệu test đã cleanup. Outage chỉ tác động tài nguyên manifest test; Finance read sau reconnect dùng retry có giới hạn, mutation không tự retry.

## 5. Gate 34 tác vụ bắt buộc

Chi tiết implementation, nguồn contract, tiêu chí và đủ sáu nhóm ảnh hưởng tài liệu của toàn bộ 49 ID nằm trong [phụ lục v1.0](demo-1-web-addendum-v1.0.md). Bảng này phân biệt bằng chứng browser thật với lớp unit/mock/service.

| Nhóm ID | Trạng thái nghiệm thu |
| --- | --- |
| INF-01–04 | PASS cho harness dev/preview, restart, recovery và journal; cold-start `demo:*` trên dataset cá nhân chưa chạy lại |
| AUTH-01–03 | PASS browser account/profile/revoke/shared-cookie/same-SPA + Identity 19 nhóm; không bao quát mọi crash tab |
| HOME-01, TRIP-01–05 | PASS navigation, fields lưu thật, replay, timezone/end-exclusive, overview/decoder; mọi tổ hợp DST chưa có browser riêng |
| PLAN-01–05 | PASS server timeline, day-only/timed/overnight, reorder, completion, conflict/revocation/reload; một số state operation dùng unit/mock/service |
| MEM-01–04 | PASS names/policy/EMAIL-LINK/leave-remove/rejoin; expiry/race/outbox có Backend 19 nhóm |
| FIN-01–06 | PASS adapter thật, authorization/outage, setup/consent, reject reason, exact money/ledger, replay; 202/NEEDS_REVIEW/journal corruption chủ yếu unit/mock |
| SAFE-01–02 | PASS read-only Packing và deferred Map/Dress, bundle không fixture |
| UX-01 | PASS viewport/keyboard/focus/drawer/CSS zoom; **PARTIAL: native browser zoom 200% NOT RUN**, chưa phải accessibility audit đầy đủ |
| QA-01 | PASS harness dev/preview, ownership, source guard, fault/restart; **PARTIAL** theo giới hạn trên |
| DOC-01–02 | PASS tài liệu/traceability và canonical Backend contract; không tạo OpenAPI cạnh tranh |

BR-01 đã đóng bằng ngoại lệ Backend được duyệt: `ContributionView.rejected_reason` protobuf optional field 15 và REST nullable; cột DB đã tồn tại từ V001, không migration mới. Nguồn: [rejection feedback](../../Wolfari-backend/docs/architecture/demo-1-rejection-feedback.md) và [Finance OpenAPI](../../Wolfari-backend/docs/api/finance-contributions.openapi.json). UI đọc được lý do gần nhất sau reload, không suy status từ field, receipt cũ thiếu field → null; Mobile decoder chưa nghiệm thu.

## 6. Lỗi lịch sử và sửa

| Lỗi đã tái hiện | Sửa đã xác nhận |
| --- | --- |
| Unit day-only/profile theo semantics cũ | Sửa assertion/mock theo contract, không xóa test; cuối 535 PASS |
| `20261028124933-6c4d7332`: label password không exact | Selector exact |
| `20261028125331-0d2bd209`: reconcile bị modal che | Đưa control vào drawer; bước conflict cuối PASS |
| `20261028130053-f4eca87f`: assertion phủ định quá sớm làm navigation rơi login | Chờ business-ready, SPA navigation và action timeout hữu hạn |
| `20261028131634-077eb2d6`: chạy đồng thời làm host thiếu RAM, exit 134 | Chạy tuần tự, unit `--maxWorkers=2`; không quy mọi crash lịch sử cùng nguyên nhân |
| `20261028132311-64cf041e`: document zoom 2× che footer | Drawer fixed insets/height auto; CSS zoom cuối PASS |
| `20261028132759-ffc673a0`: Finance reconnect chưa sẵn sàng | Xác nhận 503 thật rồi bounded retry **read**, không retry mutation |
| Fixture launcher sai host | Chạy lại đúng launcher; 164 PASS |

Các fix khác: fail-closed journal/sessionStorage, policy intent qua reload, UUID/scope receipt, pagination retry, revoke đúng session. Những trường hợp chỉ có unit/mock không được gọi là browser integration.

## 7. Runbook và giới hạn kiểm chứng

Runbook duy nhất: [HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md](../HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md). Đã kiểm bằng build, harness Compose cô lập, Web dev/preview, Mailpit, account mới, restart và recovery. **Không chạy lại** `demo:init`, `demo:start`, `demo:check`, `demo:accounts`, `demo:stop` trên dataset cá nhân; cũng chưa chạy `install --frozen-lockfile` trên máy sạch. Không được gộp hai mục này vào PASS harness.

### NOT RUN / hoãn

- Native browser zoom 200%: công cụ UI dừng vì không xác minh URL. Ca tiếp theo cần mở Plan/drawer và Fund/Members ở zoom menu 200%, kiểm Save/scroll/focus/keyboard rồi trả 100%.
- Firefox/Safari, thiết bị thật, screen reader và accessibility audit đầy đủ; native zoom là gate riêng.
- Một số 202/NEEDS_REVIEW/journal corruption/pagination/money boundary chỉ có unit/mock/service; không phải mỗi state đều được gây qua UI outage thật.
- Mobile, production TLS/domain/reverse proxy, app containers, external mail/payment/travel providers và CI sau push: NOT RUN.
- 15 nhóm LATER trong phụ lục không triển khai.

### Riêng tư, cleanup và baseline

Không ghi password/token/cookie/link nhạy cảm vào báo cáo. `.local/demo1/<runId>/` ignored; trace/HAR/video/DOM failure snapshot cho bài có credential bị tắt. `demo1-redact-artifacts.mjs` chỉ redaction có giới hạn trong artifact đúng run ID, không đọc/xóa secret `.local`. Container/volume của run cuối và các suite Trip bổ sung đã cleanup theo label; không prune Docker, không stop Docker toàn cục, không reset dataset người dùng.

Audit gốc SHA256: `EE32682378591959D9D723F7874D367FB06478A2DADA4B80B0D9BC3F1478A36F`. DOCX chính thức khớp HEAD: SRS `beae6799e2a0c36ba7c8f25f9d5ceb5b3ae99284`, ERD `44e3f987e878f83d6410a70c9f47a164d15d2f69`, DDL/API `a42b80efb5a73a56760936c8bfecfccff48df3f9`. Không sửa Mobile, audit gốc hoặc ba DOCX; dùng phụ lục versioned và canonical OpenAPI Backend.

**Bàn giao:** dùng luồng demo core + quỹ TEST ở §4 theo runbook; giới thiệu đúng là demo local đã nghiệm thu luồng chính, không cam kết toàn MVP hoặc production-ready. Không commit/push tự động.
