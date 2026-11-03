# UX/UI audit — CP-01 evidence-bounded

CP02/D17 clarification: giữ observations/baseline lịch sử; các proposal compact header/sidebar/progressive panels dưới đây không là approval thay Figma. SOURCE_MAP và DESIGN_DELTAS hiện hành quyết định source/delta review. First-row-before-scroll là proposal DLT03 chưa duyệt, không gate ép bỏ banner nguồn.

Đánh giá ngày29/10/2026, source commit trong [STATE](STATE.md). Skill product-design audit được dùng để đặt ảnh thực tế trước nhận xét; phân biệt observation và proposal. Không sử dụng audit cũ để tuyên bố đã xem runtime mới. Không có usability study/người dùng thật hoặc analytics funnel trong CP-01.

## 1. Ảnh đã xem

Figma chính thức: 18 PNG trong [evidence/figma-official](evidence/figma-official/README.md), coverage từng node tại [screen register](evidence/figma-official/SCREEN_REGISTER.md). Hai Admin directions, native-mobile Plan và Web402 Fund được xem riêng.

Current app: 6 ảnh do suite baseline hiện hữu xuất ở lượt CP-01, **Gateway HTTP-mock**, đã mở xem và copy nguyên bản:

- [Plan1366×520](evidence/baseline/plan-1366x520.png).
- [Fund320×600](evidence/baseline/fund-320x600.png).
- [Overview820×900](evidence/baseline/overview-820x900.png).
- [Members320×600](evidence/baseline/members-320x600.png).
- [Login1366×520](evidence/baseline/login-1366x520.png).
- [Create820×900](evidence/baseline/create-820x900.png).

Một số PNG là full-page (cao hơn viewport) nên không suy ra nội dung đều thấy không cần scroll. Đây là dữ liệu mock và có trường hợp quỹ chưa bật/Plan empty; không phải production. Browser host bị chặn, không có thao tác live CUA hoặc native zoom mới. Những screenshot khác trong `.local/cp01-baseline` chưa được xem không được tính visual inspected.

## 2. Findings có căn cứ

| ID / mức | Observation / bằng chứng | Tác động giả định và hướng đề xuất | Gate |
|---|---|---|---|
| U01 / High | Plan1366×520: header76 + banner/context + mô tả/sync/actions đẩy day tabs xuống gần đáy viewport; timeline không xuất hiện ở phần nhìn đầu. | Phải cuộn trước khi làm tác vụ chính. Dùng compact workspace header và gom sync vào status/disclosure, giữ chức năng hồi phục. | CP02/06: timeline hoặc empty-state actionable phải xuất hiện sớm ở viewport thấp. |
| U02 / Medium | Members320: banner và title/actions chiếm phần lớn màn đầu; tab quyền sửa xuống hàng riêng; list nằm sau khoảng500px. | Ưu tiên task title + role-aware action, banner thu gọn trong workspace; không chỉ giảm font/touch target. | CP04/08:320/402, long labels, keyboard, bottom reachability. |
| U03 / Medium | Overview820: sidebar220 + card2cols khiến card heading wrap nhiều, phần narrative nhỏ so với vùng chrome. | Cân nhắc compact sidebar theo content width, responsive grid theo minimum usable card width. | CP02/05:820×900 và768×1024, không mất nav labels/accessibility. |
| U04 / Medium | Fund320 có trạng thái “chưa bật quỹ”, TEST và CTA rõ; layout vẫn đặt banner trước action; Figma Fund lại full populated ledger và nhiều controls hơn runtime. | Preserve truthfulness; thiết kế not-enabled là first-class state, không populate demo số tiền chỉ để giống Figma. | CP09: not-enabled/403/503 khác nhau, Owner/Holder permissions. |
| U05 / Medium | Create820 runtime chỉ có supported fields, timezone text input và description; Figma3:30 còn destination/map/style/upload/budget. | Thiết kế hành trình tạo ngắn gọn, helper timezone và optional detail; không “hoàn thiện” bằng unsupported fields. | CP05: payload date/timezone tương đương, no silent data loss. |
| U06 / Medium | Login full-page1366×520 dùng art lớn và form dài hơn viewport; ảnh cho thấy focus email rõ. | Giữ focus/style brand; viewport thấp cần kiểm tra scroll và submit/recovery reachable, không ép fit bằng chữ nhỏ. | CP04: auth public baseline failures phải được phân tích, keyboard/autofill/zoom. |
| U07 / High — design | Figma muted #6c8bb2 trên trắng ≈3,52:1; blue #0089c7 ≈3,89:1; green #15b784 ≈2,58:1. Tính từ raw tokens bằng relative luminance, không đo ảnh. | Không dùng như text thường nhỏ trên trắng. Existing muted #4f7093≈5,16:1 và action #006b92≈5,97:1 tốt hơn; tránh regress vì copy Figma. | CP03: contrast theo actual text/background/state, không chỉ palette. |
| U08 / High — compatibility | Figma Holder handover477:* mâu thuẫn Web alignment notes; profile devices và notifications actions khác runtime; advanced Fund/Map/Dress chưa wired. | Canonical flow phải theo contracts; retain disabled/unavailable/read-only guidance. | CP02/feature gates: mapping approval, không fake success. |
| U09 / Medium — consistency | Native Mobile Plan317:2033 có status bar, glass bottom nav; Web402 contract lại cấm native chrome. | Chọn một ngôn ngữ Web responsive, chỉ học hierarchy/touch interactions; không trộn chrome iOS với desktop header. | CP02: design direction + Web viewport variants. |
| U10 / High — baseline | 8 fixture +4 HTTP-mock E2E thất bại. Cloud expected3 receivedNaN; auth load/locator timeouts; Members label missing; Gateway loading/locator expectations. | Chưa biết nguyên nhân gốc. Không quy mọi failure là CSS hoặc flake; cần focused diagnostic trước sửa UI. | CP01 record + đầu checkpoint implementation được duyệt; lưu trace gốc. |
| U11 / Medium — architecture | Các page lớn, Overview import formatter/error UI từ Fund page. | Rủi ro vô tình thay business state khi restyle; chia domain panels/pure presentation có tests. | CP03/06/08/09: payload tests và behavior parity. |

Impact là đánh giá chuyên môn, chưa phải số liệu conversion/task-time đo được. Không tuyên bố redesign đã cải thiện UX thực tế vì CP-01 không sửa UI.

## 3. Đánh giá toàn bộ journey ở cấp source/design

- Auth → verify/recovery → returning session: cần thêm Figma states cho3 routes recovery; giữ202 neutral acceptance, error announcements, safe return.
- Home → list → create → workspace: CTA thống nhất, route/auth consistency; phân biệt editorial cards với user Trips. Create success chỉ sau receipt thật.
- Plan → unassigned/day view → edit/reorder → conflict: giữ context khi mở Drawer, tránh toolbar dày, clear unsaved changes; keyboard reorder tương đương drag.
- Members/invite → recipient login → accept/decline → membership: owner actions theo quyền, one-time token/link, expired và wrong-recipient state; không gộp member role và FundHolder.
- Fund setup → consent → contribution request → report → confirm/reject → ledger: progressive panels theo vai trò; pending/unknown không làm mất intent; thiết kế cancel/leave dependencies rõ.
- Price Watch create → observation → pause/resume/stop: currency/source/timezone/passenger inputs được giải thích ngắn, stale/error giữ dữ liệu cũ và label source. Không dùng graph giả để lấp empty.
- Profile → preferences/sessions/security: tách independent saves, session logout/revoke và push preferences khác nhau; notifications Drawer retain deep-link safety.
- Map/Dress/Packing: honest read-only experience vẫn hữu ích; preview editing không phải real integration. Admin và export/share giữ backlog rõ, không có dead-end CTA hứa chức năng thật.

## 4. Accessibility/motion/performance coverage

Source đã có skip link, shared focus styles, Radix Drawer,44/48px targets, reduced-motion global/MotionConfig. Không kết luận toàn hệ đạt accessibility chỉ từ source. Suite có axe assertions nhưng toàn suite FAIL; không ghi blanket accessibility PASS. Manual screen-reader, native200% zoom và tất cả hover/focus/disabled/keyboard combinations **NOT_RUN** ở lượt này.

Motion proposal: micro-feedback nhanh, continuity khi add/reorder, content transitions không trì hoãn response; no continuous scenic animation trong task workspace. Existing motion library đủ khả năng, chưa cần dependency mới. Performance profiling/Web Vitals/bundle comparison/low-end device **NOT_RUN**; build PASS không chứng minh performant.

## 5. Ưu tiên

P0 bảo toàn contracts và baseline evidence; P1 task area density, auth/recovery states, truthful asynchronous controls; P2 unified components/token contrast/responsive layout; P3 refinements/illustrations/motion polish. Product direction phải duyệt tại CP-02; CP-01 chỉ đề xuất.
