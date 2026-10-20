# WOLFARI — UI/UX IMPROVEMENT OPTIONS

**Ngày lập:** 17/10/2026  
**Nguồn:** [UI/UX Audit](./UI_UX_AUDIT.md)  
**Mục đích:** Tập hợp phương án để người dùng quyết định sau; không phương án nào đã được triển khai.

Các nhãn bằng chứng và mức giới hạn được dùng theo [mục 2.2 của báo cáo audit](./UI_UX_AUDIT.md#22-nhãn-bằng-chứng).

## 1. Nguyên tắc ra quyết định

- Ưu tiên capability thật, task completion, accessibility và recovery trước polish.
- Giữ logo, mascot, palette, asset, typography và composition Wolfari khi không có lý do UX rõ ràng để thay đổi.
- Không coi Figma là đúng tuyệt đối khi prototype mâu thuẫn runtime contract.
- Không mở write action trước khi có permission và recovery behavior tương ứng; version/idempotency key chỉ dùng khi endpoint contract quy định, không áp một quy tắc chung cho Auth/Profile/session.
- Không tạo nghiệp vụ mới; phương án C chỉ mở rộng khi đã có căn cứ từ SRS/Figma/backend roadmap.
- Khuyến nghị mặc định là **B — tối ưu cân bằng**. Một số mục chọn A khi thay đổi tối thiểu mang lại đủ lợi ích hoặc capability backend chưa tồn tại.

## 2. Bảng lựa chọn tổng hợp

| ID | Trang/Component | Vấn đề | Phương án A | Phương án B | Phương án C | Khuyến nghị | Ưu tiên |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UX-001 | App bootstrap / Shell | Production source bị chặn bởi Shell Gateway unavailable | Landing unavailable rõ ràng | Compose Shell từ reader đã xác minh và capability-aware mount | Thiết kế lại bootstrap/repository toàn diện | **B** | P0 trước production |
| UX-002 | Login/Register/Recovery | Auth thật và recovery chưa hoạt động | Giữ unavailable nhưng nói rõ | Identity + accepted → Login; verification branch + reset | — | **B** | P0 trước production; recovery P1 |
| UX-003 | Core write journeys | Create/edit/invite/plan/profile/watch chủ yếu disabled | Thu gọn/hide action chưa dùng | Mở theo vertical slice đúng contract | Hoàn thiện toàn bộ workspace writes | **B** | P1 |
| UX-004 | Home/demo/sandbox | Product promise vượt capability hiện tại | Thêm disclaimer chung | Copy/badge theo capability tại context | Tách demo playground khỏi product | **B** | P1 |
| UX-005 | Trip/Admin navigation | Mục không có destination vẫn trông khả dụng | Disabled + “Sắp có” | Nhóm available/upcoming và dùng URL thật | — | **B** | P1 |
| UX-006 | Disabled controls | title không đủ guidance/accessibility | Adjacent help text | Capability-aware control/panel pattern | — | **B** | P1 |
| UX-007 | Color/contrast | Text/button/border có cặp dưới AA | Vá các cặp lỗi chính | Semantic accessible token palette + regression | — | **B** | P1 |
| UX-008 | Fund | Silent CTA, context và semantics sai | Fix blocker tối thiểu | Chuẩn hóa form/tab/role/mobile/state | Full ledger/close/reconciliation UX | **B** | P1 |
| UX-009 | Roles/permissions | Role và capability khó hiểu | Tooltip/badge | Giải thích quyền theo action/context | — | **B** | P1 |
| UX-010 | State/recovery | Generic state thiếu domain recovery | Mở rộng ContentState | Domain state patterns + draft/retry/status check | — | **B** | P1 |
| UX-011 | Home | Mobile dài, video disabled, disclosure chưa tối ưu | Giữ composition, sửa tối thiểu | Rút gọn section/capability-aware content | Recompose landing page | **A** | P2 |
| UX-012 | Trip List/Create | Create, pagination và filter semantics chưa hoàn chỉnh | Giữ preview có giải thích | Minimal create + server-aware list | Full wizard/template/search backend | **B** | P2 |
| UX-013 | Overview | Unavailable cards chiếm ưu thế | Giữ card và giảm visual weight | Gom unavailable, ưu tiên data hữu ích, retry từng vùng | — | **B** | P2 |
| UX-014 | Plan | Viewer dày disabled action, thiếu state/cue | Read-only mode rõ hơn | Incremental writes + capability render + scroll cue | — | **B** | P2 |
| UX-015 | Members | Filter defect; invitation và lifecycle coverage không đồng đều | Fix defect và label preview | Hoàn thiện invitation candidate; giữ lifecycle chưa có contract ở trạng thái rõ | — | **B** | P2 |
| UX-016 | Profile | Read-only; session và push device nhập nhằng | Giữ preview, label rõ | Tách resource và mở capability được hỗ trợ | — | **B** | P2 |
| UX-017 | Price Watch | Write mock-only, validation/provider state/motion | Giữ read-only, sửa lỗi UX/a11y | Mở write khi provider contract sẵn sàng | — | **A hiện tại** | P2 |
| UX-018 | Responsive/tablet | Scroll cue, mobile metadata và tablet spec thiếu | Vá từng màn | Responsive acceptance + cues + detail alternative | Full tablet frame family | **B** | P2 |
| UX-019 | Admin | Sáu placeholder, Figma chưa canonical | Một unavailable landing | Chọn canonical IA + route/contract từng section | — | **B** | P2 |
| UX-020 | Metadata/focus/recovery | Title tĩnh, main focus ẩn, 404/fatal thiếu CTA | Sửa ba điểm trực tiếp | Route metadata + standardized recovery layer | — | **A** | P2 |
| UX-021 | Design system | Hard-code token gây drift | Sửa token thiếu/contrast cục bộ | Semantic token consolidation + visual/a11y guard | — | **B** | P2 |
| UX-022 | Figma ↔ runtime | Frame/field/success vượt contract | Annotate unsupported/future | Canonical node-route-capability registry | — | **B** | P2 |
| UX-023 | Micro defects | Undefined token, motion, dead CSS, misleading glyph | Vá từng lỗi | Vá + thêm lint/regression guard | Refactor toàn bộ liên quan | **B** | P3 |

## 3. Chi tiết phương án

### UX-001 — Production bootstrap và Shell Gateway

**Bằng chứng — SOURCE-VERIFIED, tin cậy cao cho source; deployment chưa kiểm chứng:** [main.tsx](../src/main.tsx#L29), [shell.gateway-repository.ts](../src/infrastructure/repositories/shell.gateway-repository.ts#L6), [App.tsx](../src/app/App.tsx#L226).  
**Mục tiêu:** Production phải render được shell/page theo session thật, không giả fixture.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A — Chỉnh tối thiểu** | Giữ hard-fail nhưng thay error bằng landing “Dịch vụ chưa sẵn sàng”, Home/Reload/Support và correlation ID. Người dùng hiểu trạng thái thay vì thấy app chết. | Không đổi frame feature; chưa giải quyết task completion. | Thấp; rủi ro biến blocker kỹ thuật thành trạng thái bị chấp nhận lâu dài. |
| **B — Cân bằng** | Compose bootstrap/snapshot Shell từ Identity/Trip reader đã được xác minh; không tạo endpoint /shell mới. Mount page khi snapshot tối thiểu hợp lệ; capability phụ fail độc lập. Thêm loading, refresh failure, forbidden snapshot và logout/session recovery. | Tác động Figma thấp; chủ yếu bổ sung state chưa có. | Cao; rủi ro auth/cookie/CORS và waterfall loading. Cần integration test. |
| **C — Chuyên sâu** | Thiết kế lại bootstrap thành route-level data architecture, streaming/parallel loaders và central capability registry. | Không đổi brand nhưng thay kiến trúc rộng. | Rất cao; migration/race/cache invalidation lớn, chưa cần cho quy mô hiện tại. |

**Khuyến nghị: B.** Đây là blocker P0; A chỉ phù hợp như safety net, C chưa có tỷ lệ lợi ích/chi phí hợp lý.

### UX-002 — Auth, verification branch và recovery

**Bằng chứng — SOURCE-VERIFIED + DOC-CLAIM, tin cậy cao cho contract/source:** [AuthPage.tsx](../src/features/auth/AuthPage.tsx#L43), [router.tsx](../src/app/router.tsx#L93), [runtime evidence](./runtime-evidence-2026-10-15.md#capabilityaction-matrix).  
**Mục tiêu:** Có journey account đúng contract, không đi thẳng từ Register vào session giả; không ép verification trước mọi Login.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Giữ form preview; bỏ affordance submit thật, thêm copy “Demo”, link Điều khoản/Chính sách và recovery contact. | Fidelity cao, nhưng vẫn không có authenticated journey. | Thấp; rủi ro kỳ vọng vẫn cao nếu Home không disclosure. |
| **B** | Tích hợp login/register; Register → accepted, không tạo session → cho phép Login. Verification có prompt/terminal state riêng và được yêu cầu khi EMAIL invitation cần verified/matching identity. Thêm forgot/reset, intended return và session failure. | Cần bổ sung frame Figma; giữ visual Auth hiện tại. | Cao; token/cookie/rate-limit/one-time-link là rủi ro chính. |

**Khuyến nghị: B.** Đây là flow tối thiểu để sản phẩm hoạt động và phù hợp backend contract hiện có.

### UX-003 — Core write journeys

**Bằng chứng — SOURCE-VERIFIED + LIVE-VERIFIED, tin cậy cao:** [TripListHero.tsx](../src/features/trips/components/TripListHero.tsx#L34), [PlanPage.tsx](../src/features/plan/PlanPage.tsx#L79), [MembersPage.tsx](../src/features/members/MembersPage.tsx#L169), [ProfilePage.tsx](../src/features/auth/ProfilePage.tsx#L121).  
**Mục tiêu:** Giao diện chỉ hiển thị action thật hoặc giải thích preview ở cấp page.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Ẩn action không có contract; một page-level banner thay cho nhiều disabled button; giữ read preview. | Giảm độ giống Figma và discovery future capability. | Thấp; có thể làm sản phẩm trông ít chức năng. |
| **B** | Mở từng vertical slice: minimal Trip create, Profile update/session, Plan activity, Invitation. Mỗi slice theo đúng endpoint contract; chỉ dùng version/idempotency key khi được quy định, đồng thời có permission/conflict/unknown recovery và test phù hợp. | Figma giữ được phần action đã sẵn sàng; future action được label/hide. | Cao theo từng slice, nhưng kiểm soát được; rủi ro contract drift. |
| **C** | Hoàn thiện đồng thời toàn bộ create/edit/share/plan/member/fund/watch/profile. | Fidelity cao nhất khi xong. | Rất cao; nhiều domain chưa có runtime contract, dễ tạo mock success. |

**Khuyến nghị: B.** Cho phép tạo giá trị thật sớm mà không giả capability.

### UX-004 — Product promise, demo và sandbox disclosure

**Bằng chứng — SOURCE-VERIFIED + DOC-CLAIM + EXPERT-ASSESSMENT, tin cậy cao cho mismatch, trung bình cho impact:** [HomePage.tsx](../src/features/home/HomePage.tsx#L87), [runtime evidence](./runtime-evidence-2026-10-15.md#capabilityaction-matrix).  
**Mục tiêu:** Người dùng biết đâu là capability thật, preview, sandbox và roadmap.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Thêm một banner demo toàn cục và nhãn TEST ở Finance. | Ít chạm Figma; banner dễ bị bỏ qua và không giải thích từng action. | Thấp; rủi ro “banner blindness”. |
| **B** | Copy capability-aware ở Home và tại point of action; badge Demo/Preview/TEST thống nhất; không quảng bá realtime/sync như đã sẵn sàng. | Chỉ thay copy/badge, giữ composition. | Trung bình; cần nguồn capability canonical để tránh drift. |
| **C** | Tách demo playground/domain khỏi product route và public marketing. | Thay URL/navigation, nhưng rõ ràng nhất. | Cao; maintenance hai trải nghiệm và analytics tách biệt. |

**Khuyến nghị: B.** Đủ minh bạch mà không phá flow và nhận diện; cân nhắc C khi public launch rộng.

### UX-005 — Navigation và dead-end capability

**Bằng chứng — SOURCE-VERIFIED + LIVE-VERIFIED, tin cậy cao:** [AppShell.tsx](../src/features/shell/components/AppShell.tsx#L8), [AdminChrome.tsx](../src/features/shell/components/AdminChrome.tsx#L10).  
**Mục tiêu:** Mọi navigation item phải có destination có ý nghĩa hoặc trạng thái future rõ ràng.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Giữ đủ mục Figma nhưng disable các mục chưa có route, kèm “Sắp có”. | Fidelity cao; sidebar vẫn dài và tập trung vào future. | Thấp; disabled nav vẫn tạo noise. |
| **B** | Nhóm “Đang dùng” và “Tiện ích sắp có”; chỉ mục có body dùng link/URL; unavailable có landing/context chứ không local state giả. | Thay thứ tự/section sidebar nhẹ, giữ visual system. | Trung bình; cần migration route và selected-state. |

**Khuyến nghị: B.** Cải thiện orientation/back/refresh và giảm kỳ vọng sai với tác động Figma hợp lý.

### UX-006 — Disabled action guidance

**Bằng chứng — SOURCE-VERIFIED + LIVE-VERIFIED, tin cậy cao:** [TripHero.tsx](../src/features/trips/components/TripHero.tsx#L58), [ProfilePage.tsx](../src/features/auth/ProfilePage.tsx#L97), [HomePage.tsx](../src/features/home/HomePage.tsx#L51).  
**Mục tiêu:** Lý do không thể thao tác phải đọc được bằng mắt, keyboard, touch và assistive technology.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Thêm adjacent help text/aria-describedby; chỉnh disabled styling để khác active. | Thêm copy nhỏ quanh control. | Thấp; dễ lặp và làm page dày. |
| **B** | Shared capability pattern: ẩn action không có quyền; nếu cần discovery thì dùng focusable “Tìm hiểu”/callout nêu lý do và next action. | Có thể giảm số button so với Figma, nhưng semantics tốt hơn. | Trung bình; cần capability/reason mapping và content guideline. |

**Khuyến nghị: B.** Giải quyết cả accessibility và information architecture, không phụ thuộc title.

### UX-007 — Accessible color system

**Bằng chứng — SOURCE-VERIFIED + tính toán contrast tĩnh, tin cậy cao cho các cặp đã tính; chưa phải audit toàn app:** [tokens.css](../src/shared/styles/tokens.css#L2), [Button.module.css](../src/shared/components/Button.module.css#L1), [Field.module.css](../src/shared/components/Field.module.css#L14).  
**Mục tiêu:** Đạt contrast phù hợp mà không đổi bản sắc xanh–teal Wolfari.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Làm đậm muted/info text, primary button và field border tại vị trí fail rõ nhất. | Sai khác màu Figma nhẹ; có thể bỏ sót hard-code khác. | Thấp; regression cục bộ. |
| **B** | Tạo semantic token text-muted-on-light, action-primary, border-control, status-info; chọn value AA, thay hard-code và thêm contrast/visual regression. | Cập nhật variables/style Figma tương ứng nhưng giữ hue/brand. | Trung bình; diện ảnh hưởng rộng, cần review screenshot. |

**Khuyến nghị: B.** Vấn đề mang tính hệ thống; vá trang riêng sẽ tiếp tục drift.

### UX-008 — Fund correctness và interaction semantics

**Bằng chứng — SOURCE-VERIFIED + LIVE-VERIFIED; holder non-viewer là EXPERT-ASSESSMENT risk, tin cậy cao trừ risk này:** [FundPage.tsx](../src/features/fund/FundPage.tsx#L59), [FundPage.module.css](../src/features/fund/FundPage.module.css#L30).  
**Mục tiêu:** Không có silent action; giữ context, auditability và semantics tài chính.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Disable/hide hai CTA không handler; dùng trip.name; đổi tab thành button group hoặc hoàn thiện ARIA; hoàn thiện role table/row/columnheader/cell; dùng form thật; mobile mở detail chứa actor/time. | Tác động visual nhỏ; chưa có Finance workflow thật. | Thấp–trung bình; ít rủi ro. |
| **B** | A + field-level error/focus, viewer-holder check khi có non-holder projection, bind OPEN/CLOSING/CLOSED đã có ở fixture vào server-confirmed transitions, pending/unknown write outcome, stale source và transaction detail responsive. | Cần bổ sung state Figma/proposal. | Trung bình–cao; phụ thuộc projection/permission. |
| **C** | Full contribution/expense/close/refund/reconciliation flow với operation recovery. | Mở rộng nhiều frame và interaction. | Rất cao; Finance runtime chưa đủ, rủi ro compliance/trust. |

**Khuyến nghị: B (staged; phase đầu chính là A).** Đây là một lựa chọn duy nhất: B bao gồm safety fixes trước khi mở Finance state.

### UX-009 — Role, permission và member identity

**Bằng chứng — DOC-CLAIM + SOURCE-VERIFIED + EXPERT-ASSESSMENT, tin cậy cao cho contract và trung bình cho comprehension:** [domain architecture](./domain-architecture.md#actor-va-trust-boundary), [MembersPage.tsx](../src/features/members/MembersPage.tsx#L333), [runtime evidence](./runtime-evidence-2026-10-15.md#capabilityaction-matrix).  
**Mục tiêu:** Người dùng hiểu “tôi làm được gì và vì sao”, không suy quyền từ một badge role duy nhất.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Tooltip/copy cạnh badge và short ID fallback. | Ít thay Figma; tooltip không tốt trên touch và không đủ context. | Thấp. |
| **B** | Render action theo capability; read-only reason tại section; phân biệt Owner/Editor/Holder; unknown member có neutral identity và disclosure ID. | Card/action count có thể khác Figma theo user. | Trung bình; cần permission projection đáng tin cậy. |

**Khuyến nghị: B.** Phù hợp domain hiện có và giảm disabled clutter.

### UX-010 — State, feedback và recovery

**Bằng chứng — DOC-CLAIM + SOURCE-VERIFIED, tin cậy cao:** [state matrix](./state-matrix.md), [ContentState.tsx](../src/shared/components/ContentState.tsx#L24), [error-boundary.tsx](../src/app/error-boundary.tsx#L9).  
**Mục tiêu:** Mỗi lỗi/trạng thái cho biết điều gì xảy ra, dữ liệu có an toàn không và bước tiếp theo là gì.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Mở rộng ContentState copy/CTA; Home/Reload/Support; giữ form draft; field focus. | Thêm state frame nhỏ; component chung có thể vẫn generic. | Thấp–trung bình. |
| **B** | Pattern theo domain: read, form, invitation, provider, finance, job; phân biệt conflict, pending, unknown, stale; retry/status check đúng contract. | Cần bổ sung nhiều variant Figma, nhưng không đổi brand. | Trung bình–cao; cần governance để tránh state explosion. |

**Khuyến nghị: B.** Shared shell vẫn dùng được, nhưng copy/recovery phải theo semantics từng domain.

### UX-011 — Home composition và độ dài

**Bằng chứng — FIGMA-VERIFIED + SOURCE-VERIFIED + LIVE-VERIFIED, tin cậy cao cho số đo và trung bình cho impact:** Figma [3:28](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=3-28), [HomePage.tsx](../src/features/home/HomePage.tsx#L24); fixture page cao khoảng 2.355 px ở desktop, 4.653 px ở 402 px và 4.494 px ở 320 px, có gồm preview controls.  
**Mục tiêu:** Giữ landing giàu bản sắc, đồng thời không để content future hoặc disabled CTA làm loãng conversion.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Giữ composition/section order; xử lý video CTA, contrast và capability copy; đảm bảo CTA chính xuất hiện sớm. | Fidelity cao nhất; page vẫn dài. | Thấp; rủi ro chiều dài chưa giảm. |
| **B** | Rút gọn hoặc progressive-disclose section feature chưa sẵn sàng, giảm art chiều cao mobile, ưu tiên CTA/available capability. | Thay nhịp Figma vừa phải. | Trung bình; có thể mất storytelling nếu cắt quá mạnh. |
| **C** | Recompose landing theo task-oriented funnel hoặc split marketing/product dashboard. | Thay source mạnh, ảnh hưởng brand composition. | Cao; chưa có conversion/user research để biện minh. |

**Khuyến nghị: A.** Home là phần fidelity mạnh; chỉ cần sửa vấn đề có bằng chứng, chưa có lý do thay composition.

### UX-012 — Trip List, minimal create và server-aware controls

**Bằng chứng — SOURCE-VERIFIED + LIVE-VERIFIED + FIGMA-VERIFIED, tin cậy cao:** [TripListPage.tsx](../src/features/trips/TripListPage.tsx#L74), [TripListHero.tsx](../src/features/trips/components/TripListHero.tsx#L34), Figma [3:29](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=3-29) và [3:30](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=3-30).  
**Mục tiêu:** Entry point từ danh sách tới workspace phải hoàn thành được, không giả search trên dữ liệu chưa tải đủ.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Giữ read-only; một CTA demo rõ; ghi “Tìm trong danh sách đã tải”; pagination unavailable có explanation. | Giữ list visual, nhưng core task vẫn bị chặn. | Thấp. |
| **B** | Minimal create chỉ name/description/date/timezone được xác nhận; server-aware lifecycle/cursor; local filter chỉ khi dataset complete; giữ empty states riêng. | Create form đơn giản hơn Figma personalization. | Trung bình–cao; idempotency và cursor state cần test. |
| **C** | Full two-step wizard, template/cover/style/budget/member count và server search/sort. | Khớp Figma hơn khi backend được mở rộng. | Rất cao; nhiều field hiện không có contract. |

**Khuyến nghị: B.** Tạo value thật sớm và tránh submit field backend không biết.

### UX-013 — Overview information hierarchy

**Bằng chứng — SOURCE-VERIFIED + FIGMA-VERIFIED + EXPERT-ASSESSMENT, tin cậy cao cho structure và trung bình cho impact:** [TripOverviewPage.tsx](../src/features/trips/TripOverviewPage.tsx#L61), Figma [3:31](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=3-31).  
**Mục tiêu:** Overview trả lời nhanh “chuyến đi đang ở đâu và tôi cần làm gì tiếp theo”.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Giữ mọi unavailable card nhưng giảm contrast/height và đưa xuống cuối. | Fidelity structure cao; dead-state vẫn nhiều. | Thấp. |
| **B** | Ưu tiên Trip/Plan data; gom capability chưa có thành một module “Tiện ích chưa khả dụng”; mỗi data card retry độc lập và có last-updated. | Layout khác Figma aggregate, nhưng giảm noise. | Trung bình; cần partial-query model. |

**Khuyến nghị: B.** Cân bằng integrity với scan efficiency, không bịa content Figma.

### UX-014 — Plan viewer/editor

**Bằng chứng — SOURCE-VERIFIED + LIVE-VERIFIED + FIGMA-VERIFIED, tin cậy cao:** [PlanPage.tsx](../src/features/plan/PlanPage.tsx#L79), Figma [20:236](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=20-236).  
**Mục tiêu:** Viewer thấy lịch trình sạch; editor mới thấy action; mobile nhận biết ngày còn phía bên phải.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Ẩn editor action khi capability false; page-level read-only callout; thêm fade/partial-day cue. | Ít giống frame editor nhưng sạch hơn. | Thấp–trung bình. |
| **B** | A + tích hợp activity CRUD/completion/reorder từng slice; capability-specific controls; conflict reload, unknown state, keyboard reorder alternative. | Cần state frame mới; giữ timeline visual. | Cao; version/idempotency và concurrent edit là rủi ro. |

**Khuyến nghị: B.** Plan đã có candidate runtime tốt hơn các domain khác; mở dần trên nền viewer sạch.

### UX-015 — Members, invitations và lifecycle

**Bằng chứng — SOURCE-VERIFIED + FIGMA-VERIFIED + DOC-CLAIM, tin cậy cao:** [MembersPage.tsx](../src/features/members/MembersPage.tsx#L277), Figma [25:360](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=25-360), [475:2294](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=475-2294).  
**Mục tiêu:** Quản lý nhóm đúng identity, permission, token và async lifecycle.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Fix filtered-empty, label preview, neutral ID fallback, giảm warning trùng lặp. | Ít thay Figma; mutation vẫn unavailable. | Thấp. |
| **B** | Hoàn thiện vertical slice Invitation: preview/login-return/accept/decline, wrong-account và terminal state từ runtime candidate. Leave/remove chỉ hiển thị operation polling cho initiator khi endpoint tạo operation; Owner transfer và Finance guard chưa có contract tiếp tục ở unavailable state rõ. | Bổ sung nhiều state ngoài happy-path Figma; không mở toàn bộ lifecycle cùng lúc. | Cao cho token secrecy/wrong-account; thấp hơn gói lifecycle toàn phần. |

**Khuyến nghị: B (staged; phase đầu chính là A).** Invitation là slice có căn cứ; Owner transfer/lifecycle chưa đủ contract không nằm trong phần được mở.

### UX-016 — Profile, session và push device

**Bằng chứng — SOURCE-VERIFIED + LIVE-VERIFIED + FIGMA-VERIFIED, tin cậy cao:** [ProfilePage.tsx](../src/features/auth/ProfilePage.tsx#L36), Figma [299:1847](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=299-1847), mobile P14 [450:4607](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=450-4607).  
**Mục tiêu:** Quản lý đúng resource và không để một screen “actionable-looking” nhưng read-only.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Giữ preview; label rõ “Phiên đăng nhập” khác “Thiết bị nhận thông báo”; disable styling/guidance tốt hơn. | Fidelity tốt; người dùng vẫn không sửa được. | Thấp. |
| **B** | Tích hợp profile update/avatar/session/logout theo contract; push preferences/device ở unavailable section riêng; conflict/pending/empty states. | Toggle/action count khác theo capability. | Trung bình–cao; avatar two-step attach và session revoke cần test. |

**Khuyến nghị: B.** Có nhiều Identity capability candidate; tách resource giúp mở đúng phần đã sẵn sàng.

### UX-017 — Price Watch preview và provider semantics

**Bằng chứng — SOURCE-VERIFIED + LIVE-VERIFIED + FIGMA-VERIFIED, tin cậy cao:** [PriceWatchPage.tsx](../src/features/price-watch/PriceWatchPage.tsx#L283), [PriceWatchPage.module.css](../src/features/price-watch/PriceWatchPage.module.css#L29), Figma [768:7992](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=768-7992).  
**Mục tiêu:** Read preview hữu ích, không ngụ ý đặt vé hoặc persist watch khi chưa có provider/runtime contract.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Giữ read-only; bảo toàn ACTIVE/PAUSED/STALE/provider-error và provenance/time đã có; thêm field-level validation/focus, user-facing environment copy, reduced-motion và token fix; hide write CTA hoặc label preview. | Một số action Figma bị ẩn/giảm prominence. | Thấp–trung bình; an toàn nhất hiện tại. |
| **B** | Khi contract sẵn sàng, bind create/edit/pause/delete vào persistence thật; giữ read state hiện có và bổ sung confirmation/unknown mutation outcome. | Giữ visual, bổ sung write state. | Cao; provider quota/rate/stale semantics và notification dependency. |

**Khuyến nghị: A hiện tại.** Chuyển sang B chỉ sau khi provider/API được xác minh.

### UX-018 — Responsive, tablet và information preservation

**Bằng chứng — SOURCE-VERIFIED + LIVE-VERIFIED + FIGMA-VERIFIED, tin cậy cao:** [breakpoints.ts](../src/shared/styles/breakpoints.ts#L1), [FundPage.module.css](../src/features/fund/FundPage.module.css#L30), [PlanPage.module.css](../src/features/plan/PlanPage.module.css#L32); live tại 1440/402/320.  
**Mục tiêu:** Responsive không chỉ “không overflow” mà còn giữ discoverability, audit data và keyboard/zoom usability.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Thêm fade/chevron cho row scroll; transaction details thay cột ẩn; sửa target nhỏ trên các page hiện có. | Ít chạm layout/Figma. | Thấp–trung bình. |
| **B** | A + responsive acceptance cho 320/402/768/820/1024/1100, zoom/landscape/safe-area/long text; tablet navigation/grid/dialog spec canonical. | Tạo thêm documentation/companion frame, không đổi brand. | Trung bình; test matrix rộng. |
| **C** | Tạo full tablet frames cho mọi route/state và breakpoint-specific component family. | Khối lượng Figma lớn. | Cao; dễ over-specify trước khi capability ổn định. |

**Khuyến nghị: B.** Đủ kiểm soát Web adaptation mà không yêu cầu pixel-design mọi tablet state.

### UX-019 — Admin canonical IA

**Bằng chứng — SOURCE-VERIFIED + FIGMA-VERIFIED, tin cậy cao:** [AdminChrome.tsx](../src/features/shell/components/AdminChrome.tsx#L10), Figma [194:1093](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=194-1093).  
**Mục tiêu:** Không trình bày sáu module như đã hoạt động khi chỉ có shell; chọn một source thiết kế canonical.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Một /admin unavailable landing, giữ chrome và ẩn section nav. | Fidelity giảm so với A01–A06, nhưng honest. | Thấp. |
| **B** | Chọn canonical Admin set; lập route/actor/data/action/audit contract từng section; chỉ mở nav khi body có minimum viable read. | Cần archive/mapping bộ Figma còn lại. | Trung bình–cao; phụ thuộc backend/admin policy. |

**Khuyến nghị: B (staged; phase đầu chính là A).** Chọn canonical/contract là mục tiêu, unavailable landing là trạng thái an toàn trước đó.

### UX-020 — Route title, focus destination và global recovery

**Bằng chứng — SOURCE-VERIFIED + LIVE-VERIFIED, tin cậy cao:** [index.html](../index.html#L8), [App.tsx](../src/app/App.tsx#L93), [global.css](../src/shared/styles/global.css#L37), [error-boundary.tsx](../src/app/error-boundary.tsx#L9).  
**Mục tiêu:** Orientation và recovery đạt chuẩn với chi phí thấp.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | document.title theo route/trip; visible focus target; Home/Reload/Support cho 404/fatal. | Không ảnh hưởng Figma chính, chỉ state. | Thấp; cần tránh title stale khi data đổi. |
| **B** | A + route metadata registry, breadcrumb/help/recovery action chuẩn theo error kind. | Thêm governance/metadata. | Trung bình; registry drift nếu không làm canonical. |

**Khuyến nghị: A.** High-impact, low-cost và không làm thay đổi nhận diện; B có thể gộp với UX-022 sau.

### UX-021 — Design token và consistency

**Bằng chứng — SOURCE-VERIFIED, tin cậy cao:** [tokens.css](../src/shared/styles/tokens.css#L2), [HomePage.module.css](../src/features/home/HomePage.module.css#L13), [TripListPage.module.css](../src/features/trips/TripListPage.module.css#L101).  
**Mục tiêu:** Một thay đổi accessibility/brand không phải sửa lặp ở từng page.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Khai báo token thiếu, sửa vài hard-code và font lệch. | Ít tác động; debt còn lại. | Thấp. |
| **B** | Audit hard-code, chuyển sang semantic token cho surface/text/action/status/border/type; sync Figma variables; visual + contrast regression. | Có thể tạo diff rộng nhưng hue/brand giữ nguyên. | Trung bình; cần migration theo batch để tránh regression. |

**Khuyến nghị: B.** Đây là nền để UX-007 được sửa bền vững.

### UX-022 — Figma và runtime contract governance

**Bằng chứng — FIGMA-VERIFIED + DOC-CLAIM + SOURCE-VERIFIED, tin cậy cao:** [figma screen map](./figma-screen-map-2026-10-15.md), [runtime evidence](./runtime-evidence-2026-10-15.md), [router.tsx](../src/app/router.tsx#L35).  
**Mục tiêu:** Mọi frame/action biết rõ route, actor, capability, data source và success criterion.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Annotate frame/action unsupported/future; sửa prototype Register/success/export-share label. | Ít tooling; annotation dễ cũ. | Thấp–trung bình. |
| **B** | Một registry canonical node ↔ route ↔ actor ↔ capability ↔ contract/state; Figma/source/docs cùng tham chiếu; CI/report phát hiện drift. | Cần discipline và cập nhật source docs. | Trung bình; rủi ro registry trở thành nguồn thứ ba nếu không có owner. |

**Khuyến nghị: B.** Giữ Figma và engineering đồng bộ mà không ép backend theo prototype.

### UX-023 — Micro defects và guard

**Bằng chứng — SOURCE-VERIFIED, tin cậy cao:** [PriceWatchPage.module.css](../src/features/price-watch/PriceWatchPage.module.css#L29), [PriceWatchPage.tsx](../src/features/price-watch/PriceWatchPage.tsx#L336), [TripListPage.module.css](../src/features/trips/TripListPage.module.css#L214), [AppShell.tsx](../src/features/shell/components/AppShell.tsx#L220).  
**Mục tiêu:** Loại bỏ lỗi nhỏ có thể tích lũy thành drift hoặc accessibility regression.

| Phương án | Nội dung, lý do và lợi ích | Nhược điểm / tác động Figma | Độ phức tạp / rủi ro |
| --- | --- | --- | --- |
| **A** | Định nghĩa/thay --color-red, tôn trọng reduced motion, xóa/bật đúng dead mobile controls, bỏ glyph menu giả. | Diff nhỏ, không đổi visual chủ đạo. | Thấp; lỗi tương tự có thể tái diễn. |
| **B** | A + style/token lint, dead-style check, reduced-motion test và interaction-name review trong regression suite. | Không ảnh hưởng Figma. | Thấp–trung bình; cần cấu hình guard phù hợp để tránh false positive. |
| **C** | Refactor toàn bộ CSS/component liên quan. | Diff lớn không cần thiết. | Cao so với P3; regression risk. |

**Khuyến nghị: B.** Chi phí vừa phải, ngăn lỗi quay lại; thực hiện sau P0/P1.

## 4. Thứ tự triển khai nếu các khuyến nghị được duyệt

1. **Safety và truthfulness:** UX-001, UX-002, UX-004, UX-006, UX-008.
2. **Accessibility/system foundation:** UX-007, UX-010, UX-020, UX-021, UX-023.
3. **Core value slices:** UX-003, UX-012, UX-014, UX-015, UX-016.
4. **IA và aggregate experience:** UX-005, UX-009, UX-013, UX-018, UX-019.
5. **Provider/Figma governance:** UX-017, UX-022.
6. **Landing polish:** UX-011.

Thứ tự này không phải lịch triển khai đã được phê duyệt; nó chỉ thể hiện dependency và risk.

## 5. Những phần không nên thay đổi nếu không có dữ liệu mới

- Logo, mascot, watercolor, travel collage và palette xanh–teal Wolfari.
- Be Vietnam Pro và chữ viết tay dùng cho accent/heading có kiểm soát.
- Composition Home và Trip List đang có fidelity cao.
- Shared shell, responsive grid, minimum target policy và native dialog drawer.
- Skip link, semantic labels, aria-invalid/describedby, live region và reduced-motion foundation.
- Nguyên tắc không giả saved/success hoặc dữ liệu provider/backend.
- Phân biệt public share, private export, auth session và push device ở cấp domain.

## 6. DANH SÁCH QUYẾT ĐỊNH CHỜ NGƯỜI DÙNG

- [ ] UX-001: A / B / C
- [ ] UX-002: A / B
- [ ] UX-003: A / B / C
- [ ] UX-004: A / B / C
- [ ] UX-005: A / B
- [ ] UX-006: A / B
- [ ] UX-007: A / B
- [ ] UX-008: A / B / C
- [ ] UX-009: A / B
- [ ] UX-010: A / B
- [ ] UX-011: A / B / C
- [ ] UX-012: A / B / C
- [ ] UX-013: A / B
- [ ] UX-014: A / B
- [ ] UX-015: A / B
- [ ] UX-016: A / B
- [ ] UX-017: A / B
- [ ] UX-018: A / B / C
- [ ] UX-019: A / B
- [ ] UX-020: A / B
- [ ] UX-021: A / B
- [ ] UX-022: A / B
- [ ] UX-023: A / B / C

Sau khi lựa chọn, cần xác nhận dependency runtime của từng mục trước khi triển khai. Báo cáo này không tự cấp quyền sửa source, Figma, asset hoặc cấu hình.
