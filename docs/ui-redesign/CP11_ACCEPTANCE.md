# CP11 — Nghiệm thu APPROVED / DONE_WITH_EXCEPTIONS

Ngày02/11/2026. **APPROVED / DONE_WITH_EXCEPTIONS — D56**. User chấp thuận đề nghị sửa lỗi current-page cuối và đóng với các giới hạn đã liệt kê bằng “được, sửa và xác nhận cho tôi”, tiếp đó “tiếp tục. và chốt đóng sẵn sàng cho tôi”. Final correction và focused gates đã PASS; hồ sơ được đóng với ngoại lệ rõ, không tuyên bố mọi gate DoD ban đầu đã đạt hoặc production-ready. CP11 chỉ Web. **STOP: không release/deploy/freeze hoặc mở checkpoint mới.**

## Nghiệm thu D56 và kiểm chứng sau sửa cuối

- Thêm `end` riêng vào Trip-list NavLink: trong Trip Drawer, chỉ trang workspace thực sự đang mở có `aria-current="page"`, không đồng thời đánh dấu “Chuyến đi của tôi”. Không đổi routes, layout, guards, API hoặc các quyền workspace/account.
- Fresh lint/typecheck/scoped Prettier và production/Preview builds PASS; shell-navigation unit **7/7**, Preview Drawer **1/1**, Preview denied routes **3/3**, final Gateway HTTP-mock Drawer **1/1 PASS**, clean exit0. Gateway kiểm tra overview/settings, Escape/focus, chọn Trip list và yêu cầu có Trip requests thực được quan sát nhưng không có mutation. [Closeout evidence](evidence/cp11/run-summary-closeout.json), [verification](CP11_VERIFICATION.md) lưu paths/hashes/modes và các lỗi test-authoring/setup đã sửa.
- D55 full unit **578/578**, Gateway HTTP-mock **126/126**, Preview fixture **208/208** PASS là evidence **trước final NavLink edit**. Full suites **NOT_RERUN** sau sửa một dòng; không gộp các focused tests thành full-suite PASS. Lab80+40 mẫu cũng trước D56, không chạy lại hoặc suy post-D56 performance.
- Git resume `draft/demo-ui-ux`, HEAD `c73e0ada4c1a846de61aabb93f1bc9f01c3991c6`, ahead local origin5, sạch trước sửa; source/test/docs cuối giữ uncommitted. Backend sạch, package/lock không đổi; không commit/push/Backend/dependency/Figma writes.
- D56 chấp nhận riêng full direct Figma/runtime visual review chưa hoàn tất, live Backend/provider/delivery, manual screen reader, CI và physical-device **NOT_RUN**. Các giới hạn này không biến thành PASS. Local lab không production p75/INP/SLA; CP09 deferred work và các design delta pending không được phê duyệt thêm.

## Snapshot D55 trước final NavLink correction — lịch sử

- Sau chỉnh sửa compact-name/denied-Drawer, fresh full unit **48 files/578 tests PASS**, built Gateway HTTP-mock **126/126 PASS** (4.1min) và Preview fixture **208/208 PASS** (4.6min), cả ba clean exit0. [Run summary D55](evidence/cp11/run-summary-d54.json) lưu report hashes và từng mode riêng; D53 full runs trước sửa giữ làm lịch sử. Lint/typecheck/scoped Prettier và production/Preview builds cũng PASS trên source cuối.
- Fresh local Gateway HTTP-mock lab **8/8 PASS/40 mẫu** trên source cuối; [summary](evidence/cp11/runtime-lab-d54.json) so với40 mẫu post-A01 lịch sử, không là production A/B. [Static payload D54](evidence/cp11/build-payload-d54.json) Home177113B/Auth198313B/Plan311496B/Fund236832B gzip local static JS/CSS closure;119 emitted assets5896577B. Mẫu ít, ranges chồng lấn; không suy hiệu năng production, network payload hoặc PERF01 SLA.
- Ở snapshot D55, full visual/source comparison qua CUA vẫn BLOCKED_TOOL. Live E2E cần Gateway13000/Docker Desktop Linux engine nhưng cả hai unavailable; manual screen reader/CI/physical device NOT_RUN. D56 sau đó chấp nhận các ngoại lệ để đóng checkpoint; không sửa kết quả kiểm chứng lịch sử.

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

## Disposition các gate khi đóng D56

| Gate | Bằng chứng và giới hạn | Disposition D56 |
| --- | --- | --- |
|20 findings/22 routes | Code/contract disposition COMPLETE; visual half PARTIAL, browser host unavailable; sampled screenshots không full source comparison | **ACCEPTED_EXCEPTION** cho phần full direct visual còn thiếu; không mở lại CP02 waived QA, không visual PASS. |
| Corrections | [CP11-A01–A05](CP11_DESIGN_DECISIONS.md) APPROVED/VERIFIED; final Drawer exact matching có post-fix unit/fixture/HTTP-mock gates PASS | **COMPLETE** trong approved scope; sampled axe không là full manual WCAG audit. |
| Full quality | D55 full unit578/578, Gateway126/126, Preview208/208 trước final NavLink edit; D56 fresh lint/typecheck/builds và focused unit7/7, fixture1/1+3/3, Gateway1/1 PASS | **COMPLETE_WITH_ACCEPTED_EXCEPTIONS**; full suites NOT_RERUN sau final fix; manual screen reader/live/CI/device NOT_RUN được chấp nhận. Native Plan200% HTTP-mock/history/dev failures giữ nguyên. |
| Performance | A01 historical80 mẫu + D54 lab8/8,40 mẫu và static closures, tất cả trước D56 | **MEASURED_WITH_LIMITS**; không post-D56 lab/production p75/Web Vitals/INP/PERF01 SLA PASS. Không tự áp optimization hoặc threshold mới. |
| Compatibility/release | Approved frontend-only changes; final Gateway no-write assertion có nonempty observed API traffic; Backend/package/lock giữ nguyên | **ACCEPTED_LIVE_EXCEPTION**, không production release approval. Live Backend/provider/delivery NOT_RUN; CP09/MockFlight/read-only/Admin boundaries giữ nguyên. |

## Kết luận và Stop Protocol

CP11 **APPROVED / DONE_WITH_EXCEPTIONS** theo D56, W06 hồ sơ hoàn tất. Các approved implementation work units đã kiểm chứng trong phạm vi nêu trên; những gate thiếu evidence được đóng theo explicit exception acceptance, không bị giả thành PASS. D55 blocker là lịch sử trước quyết định đóng mới, không còn là active next action.

**Dừng tại CP11.** Không mở checkpoint mới, deploy/freeze/release, commit/push hoặc mở rộng các delta pending. Hồ sơ sẵn sàng bàn giao checkpoint với giới hạn rõ; nếu sau này cần production release, full direct visual/live/manual/CI/device checks phải được lên phạm vi và thực hiện riêng. Không yêu cầu duyệt lại A01–A05 hoặc coi D56 là approval mọi20 đề xuất.
