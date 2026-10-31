# Design system — CP-02 proposal, chưa APPROVED

Nguồn: https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace

Phạm vi được xác nhận29/10/2026: **Web only**. Không xây app mobile/native. Những mentions mobile trong evidence chỉ là lịch sử; spec hiện hành dùng thuật ngữ narrow-browser Web. Correction30/10: visual source là thiết kế Web hiện có của người dùng trong Figma; không yêu cầu chọn direction mới từ ảnh AI. Các thông số/delta đề xuất dưới đây vẫn chưa được approve mặc định.

## 1. Visual direction đề xuất

**Direction hiện hành: bám thiết kế Web của người dùng.** D17 approve nguyên tắc source-first/delta-review, không approve direction mới. “Travel journal, calm workspace” đã rút như direction thay thế. Giữ logo/mascot, imagery, hierarchy và bố cục nguồn. Mọi khác biệt theo [DESIGN_DELTAS](DESIGN_DELTAS.md), không áp rule giảm trang trí hoặc đổi density mặc định.

Các frame Web đang dùng là light source; quyết định light-first/dark nằm ở DLT06, chưa duyệt. Web responsive không dùng status/tab bar iOS theo source785:6670. Không thiết kế variants mới khi đã có frame tương ứng.

W02 [UX architecture](UX_ARCHITECTURE.md) đã có bản để review. [Ba visual alternatives](evidence/cp02/README.md) đã SUPERSEDED_FOR_DIRECTION; không dùng làm target. Plan bám20:236/439:2028/439:2497 và reference768:7123. “Travel journal, calm workspace”, compact context hoặc bỏ banner chỉ là đề xuất cũ chưa duyệt, không ghi đè layout người dùng đã thiết kế.

## 2. Foundations: hiện tại → hướng hợp nhất

| Foundation | Evidence | Đề xuất CP02/03 |
|---|---|---|
| Colors | Figma raw ink/blue/green/pale/line; CSS đã có semantic action/text/status | Primitive palette → semantic surface/text/action/border/status → component tokens. Giữ accessible CSS adaptations; contrast check ở state thực. |
| Typography | Web Be Vietnam Pro; Figma Caveat/Kalam/SF Pro; code Patrick Hand | Map từng text role nguồn; body16/24/title24/32/heading32/40 là proposal cũ/current CSS, không ép mọi node. Font substitution thuộc DLT04/05. |
| Spacing | Figma4/8/12/16/24/32/48/64; CSS còn14/20/28 | Map số đo nguồn và CSS; đồng nhất4px base là DLT04 chưa duyệt, không xóa giá trị khác chỉ để đồng nhất. |
| Radius | Catalog và current CSS có nhiều giá trị | Plan live20:236 dùng hero10,row8,thumbnail6,nav7; defaults12/16/24 không ghi đè instance. DLT04 cần review theo component. |
| Border/elevation | Line nhạt, soft shadow0/8/24;15 effects gồm Mobile glass | Match source từng surface;3-level normalization là DLT04. Không đưa glass native vào Web ngoài nguồn. |
| Layout | Header76/Web narrow54, sidebar220/collapsed72; Figma1440/Web402 | Giữ hierarchy/source geometry, không compact header mặc định (DLT03). Web402 drawer/document flow theo notes785:6670; page-specific reflow DLT09 phải review, chưa runtime test. |
| Breakpoints | Code768/360/1100/950 và source402 companion | Preserve until tested; state rõ behavior ở320/402/768/820/1366/1440, viewport520/600 và200% zoom. |
| Icons/assets | Existing Lucide + brand SVG/PNG | Reuse exact source asset; Lucide chỉ khi glyph match, không chỉ tên. Không redraw brand hoặc dùng ảnh AI; mismatch theo DLT05. Giữ aspect-ratio/alt và dimensions. |

Token catalogs thực tế ở [Figma evidence](evidence/figma-official/README.md). Không copy74 prototype variables vào CSS. Tokens đề xuất chưa được áp dụng source.

## 3. Component contract matrix

| Pattern | Variants / states bắt buộc | Behavior cần giữ |
|---|---|---|
| Button/link/icon button | Primary/secondary/outline/plain/ghost/destructive; default/compact/icon; default/hover/focus/pressed/disabled/loading | Native element đúng semantics, accessible name, stable width, loading không mất label; destructive confirmation khi có rủi ro. |
| Field/Input/Select/Textarea | Label/helper/error/required/optional; default/focus/invalid/disabled/read-only/pending | Persistent label, error linked, keyboard/autofill; validators domain không trộn vào style primitive. |
| Search/autocomplete/date/time | Empty/results/no-results/loading/error; clear/selection; timezone/date-only | Keyboard active option, escape, cancellation; chỉ gắn provider thực có contract. |
| Tabs/segmented/navigation | Active/inactive/focus/disabled; wide/compact/drawer | Tab keyboard vs route links đúng semantics, active path, focus return và safe back/forward. |
| Card/table/list/metric | Loading/empty/populated/partial/error; selected/read-only | Preserve IDs/cursors/loaded-count; responsive rows giữ đủ status, amount, actor, date. |
| Dialog/Drawer/popover/menu/tooltip | Confirm/edit/detail/mobile; opening/open/closing | Focus trap/return/escape/scroll lock; accessible descriptions; no animation-dependent security/cleanup. |
| Toast/status/skeleton/error | Info/success/warning/error/pending/unknown | aria-live phù hợp; không toast success trước receipt; stable skeleton dimensions; actionable retry không double-write. |
| Stepper/progress | Current/completed/pending/error; determinate/indeterminate | Progress thật, không coi state prototype là server completion; small-screen readable labels. |
| Timeline/map/itinerary | Day/unassigned/complete/read-only/conflict; list/map/details | Full IDs reorder, keyboard/touch equivalence, day-only/overnight preserved; map failure còn list fallback. |

Layering: design primitives → reusable UI → patterns → domain panels → page orchestration → layouts. Tận dụng cấu trúc hiện tại; không bắt buộc tạo thêm thư mục hoặc framework. Feature validators/serialization/repositories giữ riêng.

## 4. Motion specification dự thảo

Toàn bộ duration/transform mới trong bảng dưới là **DLT08 / DELTA_PENDING**, không lấy từ Figma và không phải giá trị implementation đã duyệt. Existing behavior/reduced motion phải được preserve; W05 cần source/current/proposed mapping trước approval.

| Token / interaction | Target proposal | Reduced motion / safety |
|---|---|---|
| feedback.fast |120ms, hover/press color/opacity; press transform≤1px |Bỏ dịch chuyển, phản hồi trạng thái tức thì.|
| feedback.standard |180ms, dropdown/tab indicator/toast |Không animation layout của form, giữ focus không trễ.|
| overlay.enter / exit |220ms /160ms, opacity + transform≤12px, easing ease-out / ease-in |Không di chuyển khi reduce; lock/focus theo lifecycle Radix, không theo timer.|
| content.swap |160–200ms, fade nhẹ khi cùng task context |Không trì hoãn data render; skeleton không chạy shimmer khi reduce.|
| list.reorder |180–240ms, layout continuity có giới hạn |Dnd keyboard announcements, no motion không mất order state.|
| route transition |Chỉ khi giúp hiểu navigation, không anim toàn page bắt buộc |Không reset scroll/focus ngoài router semantics; không delay auth guards.|

Các thời lượng là **đề xuất**, chưa phải giá trị trích Figma đã duyệt. Ưu tiên transform/opacity, tránh layout thrashing/CLS, no decorative loops trong workspace. Sử dụng motion hiện có khi CSS không đủ; không thêm library trùng chức năng.

W05-E bổ sung [Foundations handoff](FOUNDATIONS_HANDOFF.md): source-to-token/type/radius/elevation mapping, primitive-state ownership, current-motion vs proposed policy, numeric contrast evidence, responsive gates và performance budgets đề xuất PERF01. Đây là tài liệu review, không thay đổi CSS hoặc quyết định approved.

## 5. Acceptance cho design direction

CP03 execution update30/10: D21 đã approve checkpoint implementation trong scope [CP03 foundations](CP03_FOUNDATIONS.md). D22 chỉ approve Alert error text contrast; các bảng proposal khác vẫn pending. D19 waiver chỉ CP02; xem [CP03 verification](CP03_VERIFICATION.md) cho bằng chứng implementation, không suy từ phần spec bên dưới.

CP-02 phải có representative layouts (Home/Auth, task-dense Plan, asynchronous Fund, member flow) ở Web desktop/narrow-browser/short viewport; token semantic mapping; complete component/state matrix; accessible contrast/focus; supported vs deferred capability labels; motion/reduced-motion rationale; actual Backend field/action mapping. Chưa approve thì không triển khai CP-03.
