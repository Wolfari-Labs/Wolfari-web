# Nghiệm thu Demo 1 — Web + Backend

Ngày mở: **02/11/2026, Asia/Saigon**; chốt chuyển giai đoạn **03/11/2026**. Trạng thái: **PHASE_D_DRAFT / NOT_READY_TO_MERGE**. Người dùng yêu cầu dừng mở rộng kiểm thử, dọn dẹp/cập nhật docs và chuyển D. Đây là quyền chuẩn bị commit/push/Draft PR, không biến gate FAIL/NOT_RUN thành PASS hoặc miễn reviewer/CI.

**Bản cuối chưa đạt lại chuỗi live đầy đủ sau sửa Finance.** Lint/typecheck/build demo và unit586 đạt; regression Finance3/3 đạt. Live mở rộng cuối FAIL tại xóa/reload Plan, đã chỉnh test chờ kết quả nhưng chưa chạy lại. Chi tiết và bước Git: [bàn giao giai đoạn D](PHASE_D_HANDOFF.md).

Đây là workstream riêng được người dùng phê duyệt sau CP11. Không mở lại checkpoint, không phê duyệt thêm design delta. Chỉ Web và Backend, localhost Windows, Finance TEST và `MOCK_FLIGHT`; không Mobile/production. Ba DOCX chính thức giữ nguyên.

## Phiên bản và quyền thực hiện

| Mốc | Web | Backend |
|---|---|---|
| Baseline | `draft/demo-ui-ux` / `6a6a7d1b4daa2a9aed892c0418a1461b466627eb` | `feat/demo-1-backend` / `ebd3550d2cc3d5dc96ae25a0b0dbaba10a326be4` |
| Remote main đã fetch | `e2dae06bdef9747d874120bead2d61e44426a14f` | `37a4b5786f913f2ce2705204d013076cbcf1bd3a` |
| Nhánh nghiệm thu | `feat/demo-1-readiness-web` | `feat/demo-1-readiness-backend` |
| Merge local | `main` đã là ancestor; không tạo merge rỗng | `bec284f` hợp nhất cả hai parents |

Trong giai đoạn A–C chưa push/tạo PR/merge remote. Ngày03/11 người dùng yêu cầu chuyển D; trạng thái Git mới ở hồ sơ bàn giao D. Backend PR #14–16 không được đưa vào. Fetch mới nhất giữ nguyên hai main trên; API read-only thấy Backend #14/#15 còn mở, Web chưa có PR. SHA và tree/implementation hash của từng live run nằm trong snapshot riêng; không coi working tree chưa commit là bản commit gốc.

## Nơi lưu bằng chứng

- Gate runner/log/JSON: `test-results/readiness/20261102/`; mỗi command có exit code và source trước/sau trong `summary.json`.
- Live: `test-results/demo1/<runId>/snapshot.json`, `final-source.json`, `<runtime>/results.json`, business proof và diagnostics.
- Raw artifacts và cấu hình bí mật đều ignored. Không chia sẻ `.local`, seed journal hoặc raw log chưa lọc.
- [Tổng hợp máy đọc được](evidence/demo-readiness/run-summary-20261103.json) chỉ chứa trường đã chọn, command/exit/hash và đường dẫn evidence; không chứa credentials/token/raw response.
- Unit/fixture, browser HTTP mock, live Backend và diễn tập Edge được ghi riêng. File business proof không thay exit code/toàn bộ báo cáo scenario.

## Baseline đã chạy

| Gate | Kết quả |
|---|---|
| Backend install/build/lint | PASS |
| Backend unit | PASS **113 files / 1596 tests** |
| Web install/lint/typecheck/build | PASS |
| Web unit | PASS **48 files / 578 tests** |
| Live baseline preview | FAIL trước browser: DNS CDN khi build base image MinIO; cleanup báo volume chưa tồn tại |

Không có thay đổi source trong baseline. Frozen install dùng đúng lockfile; bộ `node_modules` cũ không được xem là nguồn phiên bản authoritative.

## Tiến độ trên candidate

| Gate | Kết quả tại lần cập nhật này |
|---|---|
| Backend merged build/lint/unit | PASS **126 files / 1896 tests** |
| Generated contracts/check/lint/REST/breaking | PASS; catalog **113 RPC**, additive với `origin/main` |
| Cleanup ownership regression | PASS **8 tests** sau sửa import test; initial test-authoring failure được giữ |
| Backend integrations | PASS DB30, Identity27, Trip39, invitations19, Members19, Finance122, Notification7, PriceWatch12, demo acceptance9, outbox10, Finance notifications61 groups |
| Backend contracts:test | PASS15 files /78 tests |
| Web lint/typecheck/unit/builds | PASS49 files /586 unit tests; cả hai builds PASS |
| Web fixture dev | Fresh source replay **PASS208/208**, exit0, một worker (`fresh-fixture-dev`, 10,5 phút). Giữ hai lần FAIL207/208 trước đó ở checkout chính; focused PASS không được dùng thay full |
| Web Gateway HTTP mock dev | Fresh source replay **PASS127/127**, exit0, một worker (`fresh-gateway-dev`, 10,2 phút). Giữ lần FAIL126/127 trước đó và trace focused; không kết luận nguyên nhân chậm tải đã được loại bỏ |
| Web built fixture/Gateway HTTP mock | PASS **208/208 fixture**, **127/127 HTTP mock**, exit0, một worker, không skipped/flaky; outputs tách riêng |
| Live preview trung gian | PASS1 scenario /15 business steps, run `20261102154252-327c96ba`; không thay final dev1 + preview2 |
| Dev + hai preview trước sửa RD-09 | PASS **1 scenario /15 steps mỗi lượt**, cùng implementation hash; xem bảng runs bên dưới. Sau sửa runtime RD-09 phải chạy chuỗi mới |
| Runbook launcher/personal demo | PASS init/start/check/build/preview/stop/restart và Chromium smoke sau restart; journal cũ MISSING được giữ nguyên; 5 TEST accounts mới |
| Edge manual, hai diễn tập, soak 30 phút | NOT_RUN / chờ người dùng; user đã nhận tự diễn tập theo checklist khi bản chạy sẵn sàng |
| Fresh source replay trước RD-09 | Hai clone cục bộ + overlay đúng hash candidate; không copy config, journal, node_modules. Backend install/build/dev:test PASS; Web install/build và full dev fixture208/Gateway127 PASS; isolated preview `20261102181858-e7d23909` PASS15 steps, 179,7 giây, exit0. Chưa là clean committed checkout hoặc máy sạch; chưa đại diện source sau sửa RD-09 |
| RD-09 focused regression | Baseline FAIL khi nút mới vẫn bật trong lúc GET quỹ bị giữ chậm. Sau sửa, ba bài Finance HTTP-mock built PASS (`rd09-fix-focused-2`), gồm draft/version conflict. Một lần authoring fixture thiếu error-envelope fields được giữ riêng, không là lỗi runtime |
| Candidate CI/PR/reviewer/main verification | NOT_RUN; chưa push |

## Issue register

| ID | Loại / mức | Finding và disposition |
|---|---|---|
| RD-01 | Environment / blocker | Docker CDN DNS khiến build MinIO thất bại; tải trực tiếp đúng pinned Golang/Alpine rồi build nguyên Dockerfile thành công. Không đổi image version/proxy/security. |
| RD-02 | Test infrastructure / P2 | Cleanup inspect volume chưa được tạo sau build failure; sửa để list volumes thành công rồi chỉ inspect exact names hiện có. Ownership mismatch/daemon failure vẫn fail closed; thêm 8 regression tests. |
| RD-03 | Integration / P1 | Hai nhánh thêm RPC riêng; auto-merge để count112 trong khi catalog113. Sửa count gate và expectation, giữ đủ methods; regeneration/reproducibility/breaking PASS. |
| RD-04 | Test drift / P2 | Live selectors còn dialog/select cũ sau CP06/08/09/10. Cập nhật theo radio policy, Plan dialog, Fund named form và Price Watch context panel; không thay behavior hoặc bỏ assertions nghiệp vụ. |
| RD-05 | Test sequencing | Worker Price Watch có thể đổi version cả sau reload. Hai failure409 được giữ; test reload và xác nhận lại Stop tối đa3 lần khi nhận409, cuối cùng phải200 và trạng tháiSTOPPED sau reload. Đây là retry nghiệp vụ có kiểm soát, không Playwright retry hoặc bỏ version guard. |
| RD-06 | Tool / blocker | Native Computer Use pipe và browser access host unavailable. Không thể công nhận Edge/manual rehearsal; Playwright không thay chứng cứ này. |
| RD-07 | Dev environment / P2, có full recovery | Full fixture và HTTP-mock dev từng timeout chuyển route. Trace ghi module Settings chưa hoàn tất; ảnh/font có request3,2–6,7s; RAM trống1,37GiB. Fresh replay một worker đạt208/208 và127/127 với assertions giữ nguyên. Không tăng timeout/skip và không khẳng định nguyên nhân đã bị loại bỏ; dùng bundle preview cho buổi trình bày. Các full failures được giữ lịch sử. |
| RD-08 | Test infrastructure / đã sửa | MinIO `start` chỉ chờ process, chưa ready; Dev `20261102165422-0f242470` nhận503 khi đọc avatar sau restart. Harness nay dùng Compose `start --wait` với healthcheck hiện hữu; ba final runs kiểm lại outage/recovery đạt. Không tăng assertion timeout hoặc sửa Avatar runtime. |
| RD-09 | Finance UI / P2, sửa và đang full regression | Preview `20261102171259-0bf80315` không đóng form tạo đợt thu thứ hai; thiếu HTTP response nên chưa gắn chắc nguyên nhân lần đó. Regression có giữ chậm GET chứng minh nút mở thao tác mới vẫn bật trước authoritative refresh (`rd09-reproduction`, FAIL đúng assertion). Sửa chặn mở intent mới khi fund/destination/request/contribution/member queries còn fetching. Không đổi version/idempotency hoặc cập nhật ngầm draft đang mở. Focused built3/3 PASS; bỏ workaround reload giữa waive/cancel và bổ sung diagnostics status/error/version, đang kiểm live lại. |
| RD-10 | Personal smoke sequencing / đã xử lý | Sau accept invitation ở actor khác, Owner còn membership revision cũ; UI trả conflict và giữ draft. Helper đọc lại roster trước chọn Editor. Tiếp tục đúng5 accounts/Trip đã tạo, không đăng ký trùng hoặc ghi đè journal. |
| RD-11 | Unit test timing / đã sửa | `final-rd09-unit` FAIL585/586: callback debounce300ms của Map chưa được gọi trong cửa sổ waitFor. Test nay kích hoạt lại cùng truy vấn rỗng bằng fake timer, vẫn kiểm provider error/saved data; không tăng timeout hoặc sửa Map runtime. Focused4/4 và full586/586 PASS. |
| RD-12 | Live test sequencing / chưa kiểm lại | `expanded-live-dev` / `20261102183225-1fcdc2b4` FAIL: sau Delete lập tức reload, activity đã mất trên API nhưng nút Sửa còn disabled. Test được bổ sung chờ DELETE200, item biến mất và nút Sửa enabled trước reload. **NOT_RERUN** theo yêu cầu chuyển D; chưa kết luận mọi nguyên nhân đã khắc phục. |

## Trạng thái cuối trước commit/push giai đoạn D

Implementation hash cuối: Web `c0563a73f5906acda31424f6c5d8dc8ca34facc9cdeb6dea9d6142643b221fc3`, Backend `3298ef26df465d4d1437c97bcabbf491000a316b86b945aed59ebfdf7b41ee9f`. Expanded live FAIL dùng Web hash `b3a5dfbdd97620d1bda502c789de2a5b3fb39560dee86e608eca9417dbc57600`; khác biệt sau đó là chờ kết quả Delete trong test. Docs-only commits không thay implementation hash.

| Gate sau sửa RD-09 | Kết quả |
|---|---|
| Lint / typecheck / demo:build | PASS, labels `d-handoff-lint`, `d-handoff-typecheck`, `d-handoff-demo-build` |
| Unit | PASS49 files /586 tests, `final-rd09-unit-2`; sau đó chỉ sửa thứ tự chờ trong live test và docs |
| Finance built HTTP mock | PASS3/3, `rd09-fix-focused-2`; nút chờ authoritative reads, expected versions3→4; draft cũ giữ version5 khi server6 và nhận409 |
| Full fixture/Gateway sau RD-09 | NOT_RERUN; PASS208/127 trước sửa runtime được giữ lịch sử, suite mới có128 bài Gateway |
| Live dev mở rộng | FAIL1 scenario, 116,1 giây, không retry; Settings conflict đã đi qua, lỗi tại Delete/reload; các bước sau chưa chạy |
| Dev1 + preview2 trên implementation cuối | NOT_RUN; không dùng chuỗi trước RD-09 thay thế |
| Personal smoke sau runtime fix | NOT_RERUN; bundle `dist-demo` đã build lại, dữ liệu/volumes được giữ |
| Edge2 lượt /30 phút/native zoom | NOT_RUN, người dùng đã nhận checklist; chưa có báo cáo kết quả |
| CI/reviewer/merge/main verification | Gate giai đoạn D, xem hồ sơ bàn giao; chưa đủ điều kiện merge |

Không mở thêm test dài sau quyết định chuyển D. Bản sửa RD-09 có bằng chứng focused; bản sửa sequencing RD-12 cần live verification trước đổi Draft thành Ready. Một run FAIL có các bước đầu PASS không được ghi full PASS.

## Chuỗi live đã đạt trước sửa RD-09 — 03/11/2026 giờ Việt Nam

| Label / run ID | Runtime | Kết quả browser | Runner |
|---|---|---|---|
| `final-live-dev-4` / `20261102172120-6606e567` | dev | 1 PASS, 15 steps; 244,5 giây | exit0, retries0 |
| `final-live-preview-3` / `20261102172641-398317aa` | preview | 1 PASS, 15 steps; 182,5 giây | exit0, retries0 |
| `final-live-preview-4` / `20261102173053-fb54789f` | preview | 1 PASS, 15 steps; 179,6 giây | exit0, retries0 |

Không skipped/flaky ở ba reports. Run ID theo UTC nên vẫn bắt đầu bằng20261102; thời gian địa phương đã là03/11. Cả ba source snapshots có cùng:

- Web implementation SHA-256: `3926bfa939c8f18c0b29dc78b4a9dbec9f2e6d77c273c41bfa01d6c74bde5152`.
- Backend implementation SHA-256: `3298ef26df465d4d1437c97bcabbf491000a316b86b945aed59ebfdf7b41ee9f`.
- HEAD Web `6a6a7d1b4daa2a9aed892c0418a1461b466627eb` + test/config/workflow changes chưa commit; Backend `bec284f6b14e6451fd2e988acde8ae831c307f8a` + docs-only changes.

Các thất bại trung gian và Preview PASS trước final edit vẫn ở thư mục evidence; không ghép chúng thành chuỗi cuối. Các retry lost-response/409 là nội dung nghiệp vụ được kiểm thử, không retry toàn scenario. **Sau chuỗi này đã sửa Web `GatewayFundPage.tsx` và mở rộng test**, nên các hash trên chỉ mô tả bản trước RD-09; phải ghi chuỗi post-fix riêng.

## Launcher và dữ liệu diễn tập

Đã chạy `demo:start`, `demo:check`, `demo:accounts`, `demo:build`, `demo:preview`, `demo:stop`, `demo:init` giữ config, restart/check và smoke read sau restart. `demo:check/accounts` trước startup đã báoECONNREFUSED đúng trạng thái dịch vụ chưa chạy; không dùng lần này để đánh giá code fail. `demo:accounts` sau start báo4 tài khoản journal cũMISSING vì database ban đầu trống. Journal/backup cũ được giữ nguyên.

Tạo5 accounts mới qua UI + verify Mailpit, mỗi actor context riêng. Credentials chỉ ở Backend `.local/demo/readiness-20261102.json` (ignored). Hai Trip mới:

- `TEST — Readiness smoke 500000`: đã reject/re-report/confirm, balance500000, ledger2; Owner/Holder/Editor/Member đọc lại sau stop/start đều đúng, Plan vẫn còn.
- `DEMO TEST — sẵn sàng report và confirm`: Owner khác Holder, Editor được chọn, khoản200000/300000 đang chờ report; dùng cho diễn tập. Không dùng Trip smoke để confirm lần nữa.

Labels `personal-resume-1`, `personal-restart-check`, `personal-restart-verify`, `personal-stop-after-verify` đều exit0. Backend/Web launcher đã thoát sạch qua `demo:stop`; các volumes được giữ. Không gọi automation smoke này là diễn tập Edge hoặc30 phút. Bộ delivery Finance ở personal demo vẫn dùng flags mặc địnhfalse; delivery thật trong isolated acceptance không tự áp dụng sang cấu hình này.

## Dữ liệu và an toàn

Trước nâng bản: Docker inventory không có volume `wolfari-demo_*`, nhưng có29 file cấu hình/journal demo cũ. Đã sao lưu vào Backend `.local/backups/readiness-20261102/demo`, đối chiếu29/29 hash; đây là **backup file**, không phải database backup. Không xóa/reset journal để vượt kiểm tra. Không thao tác tài nguyên Supabase/OSRM ngoài phạm vi.

Live harness dùng project `wolfari-web-demo1-<runId>`, ports/volumes riêng. Chỉ stack test này bật Finance outbox/inbox mới; không tự bật shared development hoặc personal demo. Test worker Price Watch dùng `MOCK_FLIGHT`; không thanh toán/provider thật.

## Đọc đúng phạm vi bằng chứng

| Nhóm B3 | Browser live đã chạy | Bằng chứng bổ sung / phần chưa chạy live |
|---|---|---|
| Auth/Profile | Register/verify, login/logout, avatar/MinIO recovery, revoke session, change/reset password | Identity integration kiểm token/session/CSRF và lỗi quyền |
| Session | Hai tab cùng cookie; logout không khôi phục phiên; đổi actor cùngSPA không lộ Create Trip draft | Full matrix nhiều browser profiles do Edge rehearsal |
| Trip | Create/lost-response retry cùng intent, list/detail, timezone/year boundary; Settings conflict giữ draft và explicit resubmit đã đi qua trong expanded dev | Expanded dev tổng thể FAIL ở bước sau; không dùng Settings riêng để ghi full live PASS |
| Invitations | EMAIL/LINK, recipient mới register/verify/accept, sai actor, revoke ở chuỗi trước RD-09 | Đã thêm expired qua optional API expires_at và thời gian thật nhưng chưa chạy tới; vẫn NOT_RUN browser live |
| Plan | Unassigned/day-only/timed/overnight, edit/reorder/complete/reopen, reload | Expanded live thấy activity đã xóa, nhưng fail khi thao tác tiếp sau reload; RD-12 vẫn chặn công nhận live Delete hoàn chỉnh |
| Collaboration | Hai actor conflict giữ draft/reconcile, thu hồi Editor khi đang sửa | Không suy test đồng thời mọi thao tác hoặc offline collaboration |
| Members | Selected editors, leave/remove/rejoin, Holder bị chặn vì nghĩa vụ | Members protocol fixture riêng không thay các bước Finance thật trong live |
| Fund | Owner khác Holder và Owner=Holder; consent/destination version; report/reject/re-report/confirm ở bản trước RD-09 | Đã sửa refresh guard và bỏ workaround reload trong test; focused3/3 đạt, live post-fix chưa chạy tới Fund |
| Money safety | Mất response sau commit; retry cùng intent, balance500000/ledger2 ở chuỗi trước RD-09 | Đã viết browser double-click/hai confirm độc lập nhưng expanded run chưa chạy tới; coordinator/Finance integration là bằng chứng riêng |
| Notifications | Preferences, inbox/read sau reload, Finance contribution/Holder delivery đúng context | Personal flags Financefalse; không email/push/production delivery |
| Price Watch | Create/pause/resume/stop, observation worker, providerMOCK_FLIGHT | Stop có thể409; explicit reload/reconfirm tối đa3 lần, không bỏ guard |
| Recovery | App restart; Finance unavailable không thành0; MinIO/Postgres/RabbitMQ outage và recovery | Faults chỉ trên isolated stack; personal chỉ stop/start không fault injection |
| Capability boundaries | Map/Dress/Packing có trạng thái read-only đúng, không fixture marker | Admin placeholder có fixture/HTTP mock; browser live Admin chưa chạy |

Vì còn các ô chưa có browser live riêng, **không công bố toàn bộ B3 đã phủ đầy đủ** chỉ từ15 steps. Phần manual và quyết định chấp nhận coverage/known issues còn là gate riêng.

- `trip:members:test` dùng Finance protocol fixture; `finance:test` và live browser mới chứng minh nghĩa vụ với Finance thật.
- Outbox10 groups dùng capture queue; Finance notification61 groups chứng minh consumer thực nhưng chứa controlled SQL/concurrency/failure fixtures. Không là provider ngân hàng/production.
- Live preview trung gian đã chứng minh balance500000, ledger2, FundOPEN, lý do reject sau reload, contribution request/Holder inbox đọc lại, observationMOCK_FLIGHT và restart. Final proof chỉ ghi sau toàn bộ scenario; không dùng business-proof của các run cũ thất bại làm full PASS.
- Invitation expired, nhiều tình huống money concurrency và schema upgrade có API/integration/fixture evidence; không tự gắn tất cả thành browser live/manual. Checklist live chưa bao phủ hết ma trận người dùng chỉ bằng một test tổng hợp.
- Native Chrome200% có bài fixture/HTTP-mock riêng; CSS zoom trong live scenario không thay native Edge rehearsal.
- Đã thêm lệnh `test:e2e:built` / `test:e2e:gateway:built` và CI matrix tương ứng; CI mới chưa chạy vì chưa push.
- Đã tham khảo [Vite performance](https://v8.vite.dev/guide/performance) về warmup, nhưng **chưa áp warmup hoặc đổi app config**: timing hiện có chưa chứng minh transform CPU là nguyên nhân duy nhất. Không sửa security/antivirus hoặc đóng app ngoài Wolfari để ép kết quả.

## Điều kiện đóng

- `READY_FOR_LOCAL_DEMO`: full gates hiện hành PASS; không P0/P1; dev1 + preview2 liên tiếp cùng implementation; runbook và hai diễn tập/30 phút đạt; known issues được chấp nhận.
- `READY_TO_MERGE`: thêm candidate CI, reviewer approval, resolve threads và main synchronization.
- `MAIN_VERIFIED`: thêm hai PR merged, main CI và live/smoke trên đúng cặp main.
- Mọi gate bắt buộc chưa chạy vẫn giữ `NOT_READY`; không tự miễn manual/CI vì tool unavailable.

Hướng dẫn: [chạy hệ thống](../HUONG_DAN_BUILD_VA_CHAY_DEMO_1.md), [demo trực tiếp](HUONG_DAN_DEMO_TRUC_TIEP.md), [PR và merge](HUONG_DAN_PR_VA_MERGE_MAIN.md).
