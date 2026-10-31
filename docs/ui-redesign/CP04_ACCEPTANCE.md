# CP-04 — nghiệm thu Shell/Home/Auth/Profile Web

**Bổ sung31/10/2026, D29:** CP04 vẫn APPROVED/DONE theo D25 với toàn bộ giới hạn nghiệm thu lịch sử bên dưới. Review sau CP05 phát hiện link “Cài đặt” bị cắt22px lúc mở tại1440×960 và chữ Home TravelCollage thiếu tương phản; user duyệt riêng CP04-R01/R02. Bản sửa trong lượt CP05 remediation cho link hiển thị đủ44px trên desktop (1440×960 scrollTop0; viewport thấp cuộn selected link) và chỉ chữ Home liên quan dùng token #006b92. Focused dev fixture Playwright11/11, targeted lint/typecheck/format PASS; [ảnh/số đo](evidence/cp05/qa/README.md). CP05 W13 built fixture full205/205 PASS sau sửa. Kết quả full fixture184/190 và NOT_RUN của nghiệm thu CP04 gốc vẫn là lịch sử, không bị đổi thành PASS.

Ngày30/10/2026. **APPROVED / DONE theo D25**: user đã chấp thuận CP-04 sau khi W01–W06 hoàn tất và mở CP-05 bằng chỉ thị riêng. Mọi kết quả FAIL/NOT_RUN và giới hạn verification bên dưới giữ nguyên. Hồ sơ chi tiết: [record](checkpoints/CP-04.md), [verification](CP04_VERIFICATION.md), [ảnh](evidence/cp04/README.md), [contracts](INTEGRATION_CONTRACTS.md).

## Deliverables và Definition of Done

| Gate | Kết quả |
|---|---|
| Scope/design | Web only. Nguồn Home guest/user/Web402, Login/Register, Profile và trip menu đã đọc node-specific qua Figma MCP; inventory cũ đủ dùng. HMA04 header/menu theo D18, giữ account/notification và route context. Home năm section/ảnh nguồn giữ nguyên; copy device giải thích dùng trình duyệt. Không áp dụng HMA01/02/03/05, XRT06/07 hoặc font/palette/motion delta pending. |
| Usable journeys | Guest/user Home, login/register/recovery/verify/reset, Profile/security, 404 recovery và drawer navigation có tests. Consent error đúng Gateway; reset thiếu token báo ngay/khóa submit; fields có required/autocomplete; tên Profile khớp giới hạn Backend. |
| Backend compatibility | Không đổi router/guards, session/CSRF, repositories, query keys, serializer hoặc API. Gateway HTTP-mock identity19/19 và full built51/51 PASS; register202 vẫn chưa authenticated, recovery trung lập, token scrub, version/session behavior giữ nguyên. Không suy ra live Backend. |
| Static/unit/build | Lint, typecheck, production/fixture builds PASS; Vitest44 files/550 tests PASS; Prettier/diff-check PASS. |
| Browser/visual/a11y | CP04 fixture review7/7 PASS, native200% zoom1/1 PASS; source comparison bounded qua ảnh1440/402, reflow320/768/820/short height, keyboard/focus/reduced motion/axe sampled. Full built fixture184/190 then exactly six test-only corrections focused6/6 PASS; không tuyên bố full190/190 sau sửa. |
| Evidence/doc | Original failure artifacts retained, final screenshots copied and10/10 hashes matched; CP01 inventory/baseline unchanged. STATE/MASTER_PLAN/record/route matrix/decisions updated; no commit/push, Backend/dependency/Figma write or CP05 work. |

## Ngoại lệ và giới hạn

Full fixture run had six failures caused by outdated/timing-sensitive test assertions after approved CP04 navigation geometry; focused rerun of all six passed after test-only changes. The full suite was not rerun afterward. Initial CP04 QA and Admin402 failures, causes and fixes are retained in [verification](CP04_VERIFICATION.md); none is silently counted as PASS in its original run.

Live Backend, production, manual screen reader, physical devices and runtime Web Vitals **NOT_RUN**. Figma pixel parity of every state is not claimed. The CP02 visual-QA waiver stays historical and does not replace these implementation checks. CP03 accepted verification limits remain unchanged.

## Stop

CP04 **APPROVED / DONE** theo D25 after W01–W06. CP05 Trips được mở riêng; STOP trước CP06 cho đến khi có explicit user approval CP05. Worktree remains uncommitted on `draft/demo-ui-ux`; no Git history action was taken.
