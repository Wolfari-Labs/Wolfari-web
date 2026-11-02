# CP11 — Hồ sơ kiểm chứng và điều kiện nghiệm thu

Ngày02/11/2026. **BLOCKED_USER/BLOCKED_TOOL — chờ quyết định các ngoại lệ nghiệm thu, chưa DONE/APPROVED**, không deploy/freeze hoặc mở checkpoint mới. Phần triển khai được duyệt và các full automated gates đã hoàn tất. D50 duyệt CP11-A01; không là waiver các gate chưa thực hiện. CP10 APPROVED/DONE theo D48, giữ toàn bộ giới hạn lịch sử. CP11 chỉ Web.

## Kết quả đã có

- [20 nhận xét và22 routes](CP11_REVIEW_DISPOSITION.md) đã đối chiếu code/contracts/test modes. Không sửa file nhận xét của người dùng, thay roadmap hay tự áp phương án chưa duyệt.
- Test Map tách readiness/provider/error, giữ saved places/no-fabrication và router cleanup; full unit post-D50 **577/577 PASS** (48 files). Baseline576/577 vẫn được giữ.
- D50/CP11-A01 chỉ đổi `.breadcrumb a` Plan sang token có sẵn #006b92. Browser xác nhận foreground/background #006b92/#f4fbfe; tỷ lệ từ computed colors5.7066:1, axe contrast PASS. Không thay layout/font/hành vi hoặc mở rộng PLN06.
- Full built Gateway post-A01 **126/126 PASS**, clean exit0,4.5min. Bao gồm Members policy, native Chrome zoom200% mới cho Plan (không CSS zoom), keyboard editor/footer/focus, routes/guards/business states hiện có. Gateway dùng **HTTP mocks**, không live Backend.
- Full built Preview fixture post-A01 **208/208 PASS**, clean exit0,5.1min. Skip-link Web402/320, Settings/sidebar height, keyboard/focus, reduced motion/native zoom nằm trong suite. Đây là lượt mới trên `.local/cp11-a01-preview`, tách với208/208 trước sửa.
- Full lint/typecheck, standalone lab TypeScript và cả hai builds PASS (production2911/Preview2930 modules). [Evidence](evidence/cp11/README.md) tách static payload, test artifacts và runtime lab; không dùng build time làm UX latency.
- [Performance lab trước/sau](CP11_PERFORMANCE.md):8/8 mỗi lượt PASS,80 mẫu Home/Auth/Plan/Fund × Web1440/402. LCP/CLS/resource timing và Plan editor Event Timing có raw data, ranges, method/limits; không suy production p75/INP hoặc đạt SLA PERF01.
- Application diff duy nhất: một token trong Plan CSS. Không sửa Backend, package/lock, routes/guards/session/CSRF/query keys/money/date/version/cursor/idempotency hoặc official Figma. Không commit/push. Giữ branch/HEAD `draft/demo-ui-ux` / `f6e1b424a968d11b9fc7ee366da578a752ba7856`; user report hash giữ nguyên.

## Failure history được bảo toàn

Unit baseline576/577, dev Gateway116/123 (7 FAIL), focused dev Members0/3 và pre-A01 built Gateway124/125 (contrast FAIL) vẫn nằm trong [verification](CP11_VERIFICATION.md), không bị đổi thành PASS. Post-A01 lượt đầu121/126 (5 FAIL) do CP06 tests đòi lỗi contrast cũ phải tồn tại; sửa expectation lỗi thời rồi mới chạy full126/126. Không tăng timeout hay tắt axe rule để đạt kết quả này.

## Gate chưa đạt

| Gate | Kết quả hiện tại | Điều kiện còn lại |
| --- | --- | --- |
|20 findings/22 routes | Code/contract disposition COMPLETE; visual half PARTIAL | Browser host hiện unavailable; cần công cụ capture hoạt động để review trực tiếp/source comparison. Không mở lại CP02 waived QA. |
| Corrections | [CP11-A01](CP11_DESIGN_DECISIONS.md) APPROVED/VERIFIED; Map/Members/Map matcher corrections verified | Default CP06 axe còn baseline `label-content-name-mismatch` ở profile/Menu (5 scans,7 nodes). Suite PASS cho phép đúng finding đã ghi, không phải zero-violation toàn app. |
| Full quality | Unit577/577, Gateway126/126, Preview208/208, lint/typecheck/builds PASS | Manual screen reader/live Backend/CI/physical-device NOT_RUN; native Gateway Plan zoom nay PASS HTTP-mock, không thay lịch sử CP06. Dev load failures có disposition nhưng không có dev rerun PASS. |
| Performance | Static + runtime before/after MEASURED_WITH_LIMITS,80 mẫu | PERF01 chưa là SLA đã duyệt; không tuyên bố production p75/Web Vitals/INP PASS từ localhost HTTP mocks. |
| Compatibility/release | Only approved CSS token changed; tests bảo vệ hợp đồng | HTTP mocks không chứng minh live Backend/provider/delivery. Ngoại lệ CP09, MOCK_FLIGHT, read-only projections và Admin placeholder là scope đã ghi, không tự mở capability mới. |

## Kết luận và next action

Chưa đạt toàn bộ DoD CP11; **không đề nghị release** hoặc đánh dấu checkpoint hoàn tất. Hồ sơ này không phải miễn gate hay user acceptance. Không có yêu cầu duyệt lại CP11-A01 hoặc toàn bộ20 đề xuất.

1. Khôi phục công cụ browser capture để hoàn tất full visual/source review; resolve hoặc explicit accept baseline shell label/name findings. Manual/live/CI/physical-device limitations cần được chấp nhận rõ nếu đóng với ngoại lệ.
2. Nếu user chọn đóng CP11 với ngoại lệ, ghi một quyết định **APPROVED/DONE_WITH_EXCEPTIONS** đúng danh sách trên; NOT_RUN vẫn là NOT_RUN, không tuyên bố production ready. Nếu không chấp nhận ngoại lệ, tiếp tục các gate còn thiếu khi đủ công cụ/thẩm quyền. Không tự waiving gate từ câu “hoàn tất CP11”. Không rerun automated suites đã PASS nếu source/build không thay đổi.

Sau khi thật sự đạt DoD và hoàn tất nghiệm thu CP11 mới chuyển READY_FOR_REVIEW rồi **STOP**; không tự deploy/freeze/chuyển checkpoint.
