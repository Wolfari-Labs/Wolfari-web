# CP-02 — Web source-to-route map

30/10/2026. W03-B COMPLETE ở mức mapping/coverage, không phải mọi frame/state đã visually verified. D17: giữ thiết kế người dùng; [delta register](DESIGN_DELTAS.md) là nơi duy nhất đề xuất khác nguồn. [Route matrix](ROUTE_MATRIX.md) giữ implementation ownership/contracts; không thay roadmap.

## Source precedence

1. User-approved source-first policy → frame Web hiện hữu + design annotations. Dữ liệu/nghiệp vụ theo actual contracts; conflict không tự resolve bằng thêm API hoặc giả data.
2. Giữ nguyên frame gốc. “Tham chiếu nguồn”768:* là bản tham chiếu cùng họ, không tự vô hiệu hoá các frame gốc hoặc state variants439/475/514:*.
3. Web alignment767:5377 ghi **giữ phong cách và bố cục Desktop nguồn**, ba trang SRS là **đề xuất**. Không coi nhãn SRS là approve toàn chức năng.
4. Web notes785:6670 quy định402 một cột/document flow/menu drawer, không native chrome. Bốn companion Web402 chỉ bao phủ Home/Fund/PriceWatch/Dress; không lấy Mxx làm target native hoặc nói mọi route có Web402 source.
5. Không dùng ảnh AI, không lấy “Cần cải tiến” trong CP01 làm quyền thay source. Admin business UI chưa canonical vì current route chỉ placeholder.

## 22-route mapping

`T = /trips/:tripId`. IDs thuộc file chính thức `hdy2sOZk6rfjKXKDJ9HW9y`. “Gap spec” là deliverable CP02, không là frame đã tồn tại. Inventory structural evidence tại [screen register](evidence/figma-official/SCREEN_REGISTER.md); trạng thái Đã xem/Cấu trúc của CP01 giữ nguyên.

| Route | Source family / anchor | W04/W05 source boundary, không redesign mặc định |
|---|---|---|
| `/` | Guest3:28/768:5376; user298:1642/768:5746; Web402780:6444 | Giữ content order/storytelling; map guest/session/CTA states; đổi nội dung chỉ qua DLT07. |
| `/trips` |3:29/768:6309 | Cards/list theo source; loading/empty/error/cursor. |
| `/trips/new` |3:30 | Giữ source form; map current required fields/date/timezone; không tự progressive wizard. |
| `T` |3:31/3:32/768:6807 | Overview source; phân biệt partial errors/not-enabled Fund, không thay card order mặc định. |
| `T/plan` |20:236/768:7123;439:2028 pool;439:2497 map;26:406-A editor | Bốn ảnh same-day và overlay board đã xem; ba design-context đã đọc. PLAN_SPEC và PLN01–08 phân biệt view/capability/state, centered editor nguồn vs runtime Drawer. |
| `T/map` |20:386/224:1253 | Giữ map/list visual; Gateway read projection vs preview editor, provider error fallback. |
| `T/dress-code` |20:565;768:8228 + notes777:6448; Web402781:6748 | Source/SRS proposal không cấp quyền upload/apply mutation; label preview/read-only đúng mode. |
| `T/packing` |23:312/256:1996 | Giữ grouped list; Gateway read-only, preview edits; permissions/empty/error. |
| `T/members` |25:360/768:7492;475:2294 invite;475:2530 policy;514:3370/3460;541:5410/5488 | Preserve source tabs/roles; pending/unknown/recipient transition; không Owner transfer chỉ vì có frame. |
| `T/fund` |23:506;768:7778 + notes777:6442; Web402781:6554;528:4683/5059 contribution/history | Giữ visual source, map TEST manual core; SRS advanced flows/Holder handover không tự thêm. |
| `T/price-watch` |23:657;768:7992 + notes777:6445; Web402781:6626;517:3692/3849 | Giữ form bên phải theo source note; MOCK_FLIGHT và observed/fetched time đúng truth; stop không DELETE. |
| `T/settings` |25:676/269:1234;514:3546;517:4741/4849/4953 | Giữ source sections; version/conflict/permission theo runtime; không mở archive/delete ngoài integration. |
| `/profile` |299:1847/768:7694;514:3660/3715;541:5579 | Account/security/preferences; session revocation không xóa push device. |
| `/invitations` |299:2010 | Preview/accept/decline, token/recipient/session/expired/error; không chỉ owner view. |
| `/invitations/local` |299:2010 cùng family, không dedicated frame | Preserve local/preview mode label và URL, không giả production invitation. |
| `/login` |298:1893/768:6118 | Form/brand composition nguồn; submitting/error/safe returnTo. |
| `/register` |298:2007/768:6211 | Form nguồn + accepted/verify state bổ sung;202 không login. |
| `/forgot-password` |Chưa có dedicated Web frame xác định | Gap spec trong cùng Auth family; neutral accepted/error/rate limit. |
| `/verify-email` |Chưa có dedicated Web frame xác định | Gap spec invalid/expired/resend/success; không auto-login. |
| `/reset-password` |Chưa có dedicated Web frame xác định | Gap spec form/token/pending/success theo Auth family. |
| `/admin` |Hai họ538:* và page194:1073 | Chỉ guarded placeholder/denied hiện hữu. Canonical business Admin cần scope riêng, không blocker để tự mở CRUD. |
| `*` |Chưa có dedicated404 frame xác định | Gap spec theo shared ContentState/shell, recovery link và focus. |

## Cross-route và component anchors

| Surface | Source | Existing code family / rule |
|---|---|---|
| Header/sidebar |135:483/135:1357; Plan instances135:406/135:608 | AppShell + navigation; active route/state giữ đúng router, không copy prototype hotspot overlay. |
| Web menu |783:6655; notes785:6670 | Existing Drawer/shell semantics, chưa suy keyboard/zoom PASS từ frame. |
| Notifications |299:1926/514:3801 | Inbox/individual read/preferences; không thêm route hoặc bulk-read chưa wired. |
| Shared overlays |26:406 | Đã xem board, A=centered activity editor; Drawer/ConfirmDialog/ActionMenu là runtime families. Source editor không đủ extra fields/async states; xem PLN08. |
| Brand/buttons/type |14:2 logo,14:4 mascot,33:502 reading;11:9 primary,11:14 outline | Source descriptions không cho redraw brand. Reuse exact asset/matching glyph; instance overrides ưu tiên hơn generic radius. |

## Evidence và giới hạn

- Plan context đọc live30/10: [main](evidence/cp02/source-context/plan-20-236.reference.txt), [pool](evidence/cp02/source-context/plan-439-2028.reference.txt), [day-map](evidence/cp02/source-context/plan-439-2497.reference.txt). React/Tailwind do MCP sinh chỉ là evidence, không app source; asset URLs tạm đã bỏ, không commit thành runtime URL.
- Screenshot/visual facts: [bốn Plan frames](evidence/cp02/figma-plan-review-2026-10-30/README.md), [sáu Home/Auth frames](evidence/cp02/figma-home-auth-review-2026-10-30/README.md), [Fund/Members targeted review](evidence/cp02/figma-fund-members-review-2026-10-30/README.md). Các route còn lại dùng inventory/evidence hiện có, chưa đọc lại mọi node; không full Figma resurvey.
- Spec handoff: [Plan](PLAN_SPEC.md), [Home/Auth](HOME_AUTH_SPEC.md), [Fund](FUND_SPEC.md), [Members](MEMBERS_SPEC.md), [Route gaps](ROUTE_GAPS_SPEC.md), [Foundations](FOUNDATIONS_HANDOFF.md). [Review dossier](CP02_REVIEW.md) tách spec completion khỏi visual review/approval.
- W03 COMPLETE nghĩa là nguồn/gaps/capability boundaries đã định vị và không cần chọn lại AI direction. Không có nghĩa W04/W05 hay CP02 hoàn tất. Không full Figma resurvey, code/Backend/Figma writes, commit/push.
