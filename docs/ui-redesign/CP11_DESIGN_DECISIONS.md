# CP11 — Điều chỉnh contrast đã duyệt

Status: **APPROVED_BY_USER — D50 / IMPLEMENTED_AND_VERIFIED**,02/11/2026. User xác nhận “ok, hoàn tất CP-11 cho tôi” ngay sau câu hỏi duyệt CP11-A01. Đã áp đúng selector và kiểm tra computed colors/axe sau sửa. Không thay đổi palette/layout/motion toàn app.

| Mã | Vấn đề xác minh | Phương án giới hạn | Trạng thái |
| --- | --- | --- | --- |
| CP11-A01 (subset PLN06) | Axe HTTP-mock tại1440×900 đo link breadcrumb “Tổng quan chuyến đi” trên Plan: chữ13px #079fc5 trên #f4fbfe,2.96:1, yêu cầu4.5:1 của gate hiện có. | Chỉ `.breadcrumb a` trong `src/features/plan/PlanPage.module.css` dùng existing `--color-action-primary` #006b92 thay `--color-active`. CSS shared áp dụng cùng breadcrumb trong Gateway và Preview. Không đổi nền, bố cục, font, nav active state, day buttons hay các selector khác. | **APPROVED D50 / VERIFIED**. Browser computed #006b92 trên #f4fbfe; tỷ lệ5.7066:1 từ màu thực tế, axe contrast PASS. |

Source context: Plan Web20:236 và các approved CP06 adaptations D33; inventory hiện có đủ, không resurvey/Figma write. D26 chỉ duyệt Overview, không mở rộng sang Plan. Mã này không duyệt toàn PLN06 hoặc các delta khác.

Evidence: dev Gateway test `ui-acceptance.spec.ts` desktop1440×900, path `.local/cp11-resume-gateway/ui-acceptance-Gateway-visual-and-accessibility-1440x900/`. `plan.png` đã mở/xem đúng trạng thái; `error-context.md` giữ raw axe foreground/background/font/rule. Đây là ảnh test HTTP-mock, không phải live Backend hay direct visual audit.

Formula check dùng sRGB relative luminance: `(Llighter +0.05)/(Ldarker +0.05)` cho hai màu nêu trên trả2.9635 và5.7066. Post-D50 browser xác nhận computed colors mới tại sáu viewport; sampled Plan axe không còn contrast violation. Đây không là full accessibility PASS: default CP06 scans còn shell label/name finding riêng.

Historical built Gateway full125 cases xác nhận cùng lỗi là failure duy nhất (124 PASS/1 FAIL). [Raw axe JSON](evidence/cp11/plan-breadcrumb-axe.json) giữ foreground/background/selector trước sửa; [verification](CP11_VERIFICATION.md) tách các lượt post-fix và expectation cũ. Không ghi đè evidence trước approval.

Các đề xuất trong20 nhận xét khác nằm ở [disposition](CP11_REVIEW_DISPOSITION.md). Không yêu cầu người dùng duyệt lại toàn bộ chúng để tiếp tục quality gate; không tự áp Drawer Fund, compact banner, password8, custom selects hoặc provider writes.
