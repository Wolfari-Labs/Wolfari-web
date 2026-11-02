# CP11 — Hồ sơ kiểm chứng và điều kiện nghiệm thu

Ngày02/11/2026. **BLOCKED_USER/BLOCKED_TOOL — còn full visual/manual/live gate, chưa DONE/APPROVED**, không deploy/freeze hoặc mở checkpoint mới. D50 duyệt A01; D52 duyệt A02–A05 sau khi user chọn gói bốn nhóm và yêu cầu implementation. D55 ghi full automated gate/current local lab sau source edit cuối; đó không phải checkpoint approval hoặc miễn gate. CP10 APPROVED/DONE theo D48, giữ toàn bộ giới hạn lịch sử. CP11 chỉ Web.

## Bổ sung sau D55

- Sau chỉnh sửa compact-name/denied-Drawer, fresh full unit **48 files/578 tests PASS**, built Gateway HTTP-mock **126/126 PASS** (4.1min) và Preview fixture **208/208 PASS** (4.6min), cả ba clean exit0. [Run summary D55](evidence/cp11/run-summary-d54.json) lưu report hashes và từng mode riêng; D53 full runs trước sửa giữ làm lịch sử. Lint/typecheck/scoped Prettier và production/Preview builds cũng PASS trên source cuối.
- Fresh local Gateway HTTP-mock lab **8/8 PASS/40 mẫu** trên source cuối; [summary](evidence/cp11/runtime-lab-d54.json) so với40 mẫu post-A01 lịch sử, không là production A/B. [Static payload D54](evidence/cp11/build-payload-d54.json) Home177113B/Auth198313B/Plan311496B/Fund236832B gzip local static JS/CSS closure;119 emitted assets5896577B. Mẫu ít, ranges chồng lấn; không suy hiệu năng production, network payload hoặc PERF01 SLA.
- Full visual/source comparison qua CUA vẫn BLOCKED_TOOL. Live E2E cần Gateway13000/Docker Desktop Linux engine nhưng cả hai unavailable; manual screen reader/CI/physical device NOT_RUN. CP11 vẫn chờ hoàn tất hoặc user chấp nhận cụ thể các ngoại lệ.

## Bổ sung D54 trước full rerun (lịch sử)

- A02 compact profile link ở Web769–1100 có accessible name chứa initials/tên dù tên hiển thị bị ẩn; cả AccountMenu và fallback nhất quán. A03 Drawer cho viewer đăng nhập nhưng không có quyền đọc Trip vẫn đưa tới Trip list/Profile thật, còn workspace items disabled. Denied-route test click Trip list kiểm tra URL, Drawer close và focus main.
- Sau chỉnh sửa này: lint/typecheck/scoped Prettier, production/Preview builds, shell-navigation unit **7/7**, Gateway CP06 default axe **5/5 zero** (bao gồm820×900/1366×520), Preview workspace boundaries **9/9**, denied Trip routes **3/3** và Drawer composition **1/1 PASS**. Ở thời điểm D54 handoff, full unit/Gateway/Preview chỉ có run D53 trước source edit; D55 sau đó đã chạy lại đầy đủ.
- Screenshots test Web820/1366 đã mở kiểm tra. CUA `getState` báo `browsers: []`/browser access host unavailable nên full direct Figma/runtime comparison vẫn BLOCKED_TOOL. Live Gateway `127.0.0.1:13000` không có listener; Docker Desktop Linux engine thiếu pipe `dockerDesktopLinuxEngine` (`docker info`/`docker ps` exit1). Live E2E/demo **NOT_RUN**; không chạy legacy suite trên personal data. Manual screen reader/CI/physical device vẫn NOT_RUN. Lab80 mẫu là lịch sử trước A02–A05; D55 thêm current40 mẫu.

## Kết quả D52/D53 trước source edit cuối (lịch sử)

- A02 sửa shell accessible name: default CP06 axe năm viewport hiện **5/5 zero violations**; historical 5 scans/7 nodes trước sửa giữ riêng. A03 thêm hai lối đi trực tiếp từ Trip Drawer tới Trip list/Profile; keyboard/focus/reflow test PASS. A04 Settings tách nhóm read-only và chỉ giữ ba input hỗ trợ; A05 Create timezone preset + custom IANA, kể cả DST và retry giữ intent.
- Full unit **578/578 PASS**, full built Gateway HTTP-mock **126/126 PASS** và full built Preview fixture **208/208 PASS** sau D52/trước D54. Sửa CSS responsive D53 được Gateway Plan/Identity/acceptance focused **32/32 PASS** sau rebuild. Full lint, typecheck, Prettier scoped và production/Preview builds PASS; native zoom trong suites vẫn qua. [Verification](CP11_VERIFICATION.md) ghi rõ hai lượt E2E đầu FAIL và lý do.
- Test screenshots Gateway Create402 và Preview Settings edit402 đã mở xem; direct full Figma/runtime visual audit vẫn không thể hoàn tất vì browser host không khả dụng. 80 mẫu performance lab trước/sau A01 là lịch sử trước A02–A05, không phải đánh giá hiệu năng source mới. Không có claim production SLA.
- HEAD đã chuyển sang `f1b2dcf685ee3d09f91de6d5ac68407f35fc55d6` trong lượt làm việc; agent không commit/push. Backend worktree sạch; package/lock, API/schema/guards/session/CSRF/query keys/versions/cursors/idempotency/date serializer không đổi.

## Kết quả D51 trước gói D52 (lịch sử)

- [20 nhận xét và22 routes](CP11_REVIEW_DISPOSITION.md) đã đối chiếu code/contracts/test modes. Không sửa file nhận xét của người dùng, thay roadmap hay tự áp phương án chưa duyệt.
- Test Map tách readiness/provider/error, giữ saved places/no-fabrication và router cleanup; full unit post-D50 **577/577 PASS** (48 files). Baseline576/577 vẫn được giữ.
- D50/CP11-A01 chỉ đổi `.breadcrumb a` Plan sang token có sẵn #006b92. Browser xác nhận foreground/background #006b92/#f4fbfe; tỷ lệ từ computed colors5.7066:1, axe contrast PASS. Không thay layout/font/hành vi hoặc mở rộng PLN06.
- Full built Gateway post-A01 **126/126 PASS**, clean exit0,4.5min. Bao gồm Members policy, native Chrome zoom200% mới cho Plan (không CSS zoom), keyboard editor/footer/focus, routes/guards/business states hiện có. Gateway dùng **HTTP mocks**, không live Backend.
- Full built Preview fixture post-A01 **208/208 PASS**, clean exit0,5.1min. Skip-link Web402/320, Settings/sidebar height, keyboard/focus, reduced motion/native zoom nằm trong suite. Đây là lượt mới trên `.local/cp11-a01-preview`, tách với208/208 trước sửa.
- Full lint/typecheck, standalone lab TypeScript và cả hai builds PASS (production2911/Preview2930 modules). [Evidence](evidence/cp11/README.md) tách static payload, test artifacts và runtime lab; không dùng build time làm UX latency.
- [Performance lab trước/sau](CP11_PERFORMANCE.md):8/8 mỗi lượt PASS,80 mẫu Home/Auth/Plan/Fund × Web1440/402. LCP/CLS/resource timing và Plan editor Event Timing có raw data, ranges, method/limits; không suy production p75/INP hoặc đạt SLA PERF01.
- Ở snapshot D51, application diff duy nhất là một token Plan CSS; branch/HEAD lúc đó `draft/demo-ui-ux` / `f6e1b424a968d11b9fc7ee366da578a752ba7856`. Snapshot D52/D53 hiện tại nằm ở phần đầu hồ sơ. User report và giới hạn Backend/Figma giữ nguyên.

## Failure history được bảo toàn

Unit baseline576/577, dev Gateway116/123 (7 FAIL), focused dev Members0/3 và pre-A01 built Gateway124/125 (contrast FAIL) vẫn nằm trong [verification](CP11_VERIFICATION.md), không bị đổi thành PASS. Post-A01 lượt đầu121/126 (5 FAIL) do CP06 tests đòi lỗi contrast cũ phải tồn tại; sửa expectation lỗi thời rồi mới chạy full126/126. Không tăng timeout hay tắt axe rule để đạt kết quả này.

## Gate chưa đạt

| Gate | Kết quả hiện tại | Điều kiện còn lại |
| --- | --- | --- |
|20 findings/22 routes | Code/contract disposition COMPLETE; visual half PARTIAL | Browser host vẫn unavailable; screenshots Web820/1366 chỉ là local test review, chưa direct full source comparison. Không mở lại CP02 waived QA. |
| Corrections | [CP11-A01–A05](CP11_DESIGN_DECISIONS.md) APPROVED/VERIFIED; D54 compact-name/denied-Drawer focused gates PASS; default CP06 axe5/5 zero | Các findings cũ giữ ở historical evidence; sampled axe không là full manual WCAG audit. |
| Full quality | D55 fresh full unit578/578, Gateway HTTP-mock126/126, Preview fixture208/208 PASS/exit0 **sau source edit cuối**; D54 focused unit7/7, Gateway axe5/5, Preview boundaries9/9, denied3/3, Drawer1/1 PASS; current lint/typecheck/builds PASS | Manual screen reader/live Backend/CI/physical-device NOT_RUN; native Gateway Plan zoom PASS HTTP-mock trong full suite. Dev load failures vẫn là history. |
| Performance | Historical A01 before/after80 mẫu + D55 current lab8/8,40 mẫu; current static manifest closures measured | Ranges chồng lấn/mẫu ít; không có production p75/Web Vitals/INP hoặc PERF01 SLA PASS. |
| Compatibility/release | A01–A05 là thay đổi frontend đã duyệt; focused tests bảo vệ route/permission contract | HTTP mocks không chứng minh live Backend/provider/delivery. Gateway13000 không có listener và Docker Linux engine unavailable; live suites NOT_RUN. Ngoại lệ CP09, MOCK_FLIGHT, read-only projections và Admin placeholder là scope đã ghi. |

## Kết luận và next action

Chưa đạt toàn bộ DoD CP11; **không đề nghị release** hoặc đánh dấu checkpoint hoàn tất. Hồ sơ này không phải miễn gate hay user acceptance. Không có yêu cầu duyệt lại CP11-A01 hoặc toàn bộ20 đề xuất.

1. Khôi phục công cụ browser capture để hoàn tất full visual/source review. Shell label/name finding đã được xử lý và kiểm tra trong D55 full Gateway; không cần xin waiver cho nó. Live E2E cần Gateway listener/Docker Linux engine; manual/live/CI/physical-device limitations cần được chấp nhận rõ nếu đóng với ngoại lệ.
2. Nếu user chọn đóng CP11 với ngoại lệ, ghi một quyết định **APPROVED/DONE_WITH_EXCEPTIONS** đúng danh sách trên; NOT_RUN vẫn là NOT_RUN, không tuyên bố production ready. Nếu không chấp nhận ngoại lệ, tiếp tục các gate còn thiếu khi đủ công cụ/thẩm quyền. Không tự waiving gate từ câu “hoàn tất CP11”. Không rerun automated suites đã PASS nếu source/build không thay đổi.

Sau khi thật sự đạt DoD và hoàn tất nghiệm thu CP11 mới chuyển READY_FOR_REVIEW rồi **STOP**; không tự deploy/freeze/chuyển checkpoint.
