# WOLFARI — UI/UX AUDIT

**Ngày đánh giá:** 17/10/2026  
**Phạm vi:** Figma Desktop/Mobile/Admin, website Web chạy bằng fixture, source Wolfari-web, tài liệu Web và tài liệu nghiệp vụ/backend.  
**Trạng thái:** Báo cáo đánh giá và đề xuất; chưa triển khai thay đổi nào.

## 1. Kết luận điều hành

Wolfari đã có một lớp trình bày giàu bản sắc và khá nhất quán với Figma ở những màn đã triển khai: logo, mascot, watercolor, travel collage, palette xanh–teal, Be Vietnam Pro và chữ viết tay đều tạo được cảm giác thân thiện, khác biệt. Home, Trip List, Login và khung workspace là các phần mạnh nhất về nhận diện và visual hierarchy.

Điểm yếu lớn nhất hiện không nằm ở “độ đẹp”, mà ở khoảng cách giữa **giao diện có vẻ là sản phẩm hoàn chỉnh** và **capability Web thực tế**:

- Production source mặc định chọn Gateway, nhưng Shell Gateway hiện trả unavailable nên page body không được mount. Đây là **P0 theo source/architecture**, chưa được xác minh trên deployment production.
- Login/Register thật chưa gọi Identity API; phần lớn tác vụ tạo, sửa, mời, quản lý quỹ, theo dõi giá và tài khoản vẫn disabled hoặc preview-only.
- Nhiều chức năng chưa khả dụng vẫn được đặt ngang hàng trong navigation hoặc được marketing như capability sẵn có, làm tăng kỳ vọng sai.
- Một số cặp màu chữ/control chưa đạt WCAG 2.2 AA theo phép tính từ CSS tĩnh; disabled control thường chỉ giải thích bằng thuộc tính title, không đủ cho keyboard, touch và screen reader.
- Figma có phạm vi rất rộng hơn frontend hiện tại, nhưng cũng thiếu các state production quan trọng như pending, unknown outcome, conflict, forbidden, provider stale/error và recovery.

Khuyến nghị tổng thể là **phương án B — tối ưu cân bằng**: giữ nguyên brand và composition mạnh của Figma, ưu tiên capability thật, recovery, accessibility và information architecture trước; chỉ thay layout khi có bằng chứng UX cụ thể.

### 1.1 Tóm tắt trạng thái

| Lĩnh vực | Đánh giá | Kết luận |
| --- | --- | --- |
| Nhận diện thương hiệu | Mạnh | Nên giữ logo, mascot, watercolor, collage, palette và giọng điệu thân thiện |
| Figma fidelity | Khá ở các màn lõi đã làm | Home/Trip List/Login gần source; Overview/Plan/Members/Profile có deviation có chủ đích; nhiều family chưa có route |
| Khả dụng tác vụ | Yếu | Core journey hiện thiên về read preview; production integration là blocker |
| Information architecture | Trung bình | Route rõ, nhưng sidebar/admin quảng bá nhiều destination không có body/capability |
| Feedback và recovery | Trung bình | Có vocabulary state tốt, nhưng recovery theo ngữ cảnh và flow auth còn thiếu |
| Accessibility | Có nền tốt nhưng chưa đạt mức có thể tuyên bố AA | Có skip link, label, live region, focus trap; còn contrast, page title, disabled guidance, focus destination |
| Responsive | Khá trong phạm vi đã kiểm tra | Không thấy document overflow ở 1440/402/320; horizontal scroll thiếu cue; tablet không có Figma source riêng |
| Frontend architecture | Nền tảng tốt, integration chưa hoàn thiện | Lazy route, repository boundary và shared state tốt; gateway adapters/capability registry/token consistency còn thiếu |

### 1.2 Trả lời 10 câu hỏi trọng tâm

| Câu hỏi | Kết luận |
| --- | --- |
| 1. Đủ trực quan với người mới chưa? | **Trực quan về visual, chưa trọn vẹn về task.** Home và navigation dễ hiểu, nhưng onboarding/create bị chặn và ranh giới demo chưa đủ rõ. |
| 2. Chức năng dễ tìm và dễ hiểu không? | Chức năng rất dễ nhìn thấy, nhưng nhiều mục không dùng được. Discoverability cao hơn actual availability, tạo kỳ vọng sai. |
| 3. Bố cục, màu, typography, spacing hợp lý chưa? | Bố cục và typography nhìn chung tốt, brand rõ; một số contrast dưới AA, Home mobile dài và dead-state chiếm không gian. |
| 4. Thành phần gây nhiễu? | Unavailable cards trên Overview, nhiều disabled control trên Plan/Profile và preview selector ngoài bối cảnh demo. |
| 5. Thao tác quá phức tạp/nhiều bước? | Read flow đơn giản. Auth recovery, permission, invitation, finance lifecycle phức tạp nhưng UI lại chưa hướng dẫn đủ, không phải đang có quá nhiều bước. |
| 6. Thiếu hướng dẫn/loading/error/feedback? | Có nền shared state tốt; thiếu recovery và nhánh verification theo ngữ cảnh, domain pending/unknown/conflict, field-level error Fund/Price Watch và accessible disabled guidance. |
| 7. Các trang thống nhất không? | Visual shell khá thống nhất; hành vi chưa thống nhất: disabled có/không giải thích, Fund có silent CTA, Admin dùng local selection. |
| 8. Có giữ bản sắc Wolfari không? | **Có, ở mức tốt.** Logo, mascot, màu, collage, watercolor và giọng điệu nên giữ. |
| 9. Frontend chưa giống Figma ở đâu? | Overview aggregate, Plan writes, Members hero/identity, Profile toggles/device, Admin body và nhiều Figma-only family. Chi tiết ở mục 9. |
| 10. Figma nên điều chỉnh gì? | Sửa Register contract, tách export/share và session/push-device, thêm production state, annotate unsupported field và chọn canonical Admin/Fund/Price Watch. |

## 2. Phương pháp và mức bằng chứng

### 2.1 Nguồn đã đọc hoặc kiểm tra

- Nghiệp vụ và kiến trúc: [Backend README](../../Wolfari-backend/README.md), [SRS chính thức](../../Wolfari-backend/docs/Wolfari_SRS_v2.3_ChinhThuc.docx), [domain architecture](./domain-architecture.md), [flow map](./flow-map.md), [state matrix](./state-matrix.md), [screen contracts](./screen-contracts.md).
- Trạng thái capability: [runtime evidence](./runtime-evidence-2026-10-15.md), [Web README](../README.md), repository selectors/adapters và route/page source.
- Figma read-only qua Figma MCP chính thức, file key **hdy2sOZk6rfjKXKDJ9HW9y**:
  - Desktop page [0:1](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=0-1), Mobile page [310:2025](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=310-2025) và Admin page [194:1073](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=194-1073).
  - Enumeration MCP hiện tại trả 79/54/17 root frame; snapshot inventory lưu sẵn ghi 78/54/18. Báo cáo không dùng chênh lệch phân loại root này để suy coverage, mà dựa vào node-level evidence.
  - Metadata, variables, component/context và screenshot trực tiếp của các node 3:28, 3:29, 298:1893, 299:1847, 3:31, 20:236, 25:360, 23:506, 23:657, 768:7778, 768:7992 và 194:1093.
- Website local tại **http://127.0.0.1:4173** ở fixture mode:
  - Quan sát trực tiếp desktop 1440 px, mobile 402 px và 320 px.
  - Kiểm tra route chính, title, page length, disabled control, horizontal scroll và document-level overflow.
  - Đối chiếu thêm screenshot artifact lưu trong test-results và baseline Home trong tests/e2e; các ảnh này được gắn **ARTIFACT-VERIFIED**, không dùng để suy test suite hiện tại đã pass.

### 2.2 Nhãn bằng chứng

| Nhãn | Ý nghĩa |
| --- | --- |
| **LIVE-VERIFIED** | Quan sát trực tiếp trên website local đang chạy |
| **FIGMA-VERIFIED** | Kiểm tra trực tiếp frame/component/context trong Figma |
| **SOURCE-VERIFIED** | Xác nhận từ JSX/CSS/router/repository/config |
| **ARTIFACT-VERIFIED** | Xem screenshot/export lưu sẵn; không đồng nghĩa build hiện tại |
| **DOC-CLAIM** | Tài liệu dự án mô tả; chưa xác minh độc lập bằng runtime |
| **TEST-SPEC-ONLY** | Có assertion trong test source nhưng không coi là kết quả PASS |
| **EXPERT-ASSESSMENT** | Nhận định chuyên môn có căn cứ, chưa có user test |

### 2.3 Giới hạn đánh giá

- Website được kiểm tra là **local fixture preview**, không phải deployment production và không chứng minh API integration.
- Không chạy lại toàn bộ Playwright suite trong audit này; test source chỉ được dùng để đánh giá coverage dự kiến.
- Chưa kiểm thử NVDA/VoiceOver, speech input, forced-colors, zoom 200%/400%, text-spacing override, orientation/landscape hoặc thiết bị thật.
- Không có Figma top-level tablet canonical; kết luận 768–1024 px là Web adaptation.
- Chưa có nghiên cứu định tính với người dùng thật. Các nhận định về cognitive load, discoverability và kỳ vọng được ghi là **EXPERT-ASSESSMENT**.
- Một số tài liệu inventory có trạng thái lịch sử không còn khớp source hiện tại; source hiện tại được ưu tiên cho route/UI, runtime evidence được ưu tiên cho capability gate.

## 3. Người dùng mục tiêu, nghiệp vụ và luồng chính

### 3.1 Nhóm người dùng

Theo SRS và tài liệu domain, đối tượng chính là cá nhân hoặc nhóm du lịch nhỏ, điển hình 2–6 người và chuyến 2–4 ngày. Các vai trò cần được biểu diễn theo **phạm vi quyền**, không coi là một hierarchy đơn giản:

| Actor | Nhu cầu chính | Rủi ro UX cần tránh |
| --- | --- | --- |
| Guest | Hiểu giá trị, đăng ký/đăng nhập, mở public share | Marketing vượt capability; không có đường recovery |
| User | Quản lý hồ sơ, tạo hoặc tham gia chuyến đi | Không biết demo khác phiên thật; create bị dead-end |
| Owner | Quản lý Trip, member, policy và lifecycle | Nhầm Owner với Plan Editor/Fund Holder |
| Member | Xem/cộng tác trong phạm vi được cấp | Action khóa không giải thích lý do |
| Plan Editor | CRUD/reorder Plan theo policy | UI suy quyền từ membership role thay vì capability |
| Fund Holder | Ghi nhận/đối soát quỹ | Hiểu nhầm Wolfari giữ tiền hoặc giao dịch đã hoàn tất |
| Admin | Support-read/audit theo lý do | UI giả quyền sửa dữ liệu Trip/ledger hoặc thiếu audit context |

Wolfari là workspace điều phối; theo SRS, sản phẩm **không giữ tiền thật, không đặt vé/phòng, không phải ví điện tử và không phải debt-settlement app**. Vì vậy mọi Finance/payment/provider UI phải nói rõ ledger, sandbox/TEST, nguồn dữ liệu và trạng thái stale/pending.

### 3.2 Luồng mục tiêu

| Journey | Luồng đúng theo tài liệu | Hiện trạng Web |
| --- | --- | --- |
| Onboarding | Home → Register accepted, không tạo session → Login; verification là prompt/nhánh riêng và là gate khi chấp nhận EMAIL invitation | Form có nhưng submit thật unavailable; thiếu recovery và verification branch |
| Login | Login → session-confirmed → Home/Trip List | Demo chỉ đổi fixture shell; production chưa tích hợp Identity |
| Tạo chuyến đi | Trip List → minimal create → Trip workspace | CTA disabled; Figma form có field vượt backend contract |
| Cộng tác | Invitation preview → auth nếu cần → accept/decline → workspace | Backend candidate có, Web route/flow chưa có |
| Lập kế hoạch | Overview → Plan → activity CRUD/reorder/completion | Read preview; write actions disabled |
| Thành viên/quyền | Members → invitations/policy/leave/remove/transfer | Read/preview; lifecycle state chưa hoàn chỉnh |
| Quỹ nhóm | Fund → contribution/expense/ledger/close | Fixture presentation; hai CTA trông active nhưng không hành vi |
| Theo dõi giá | Price Watch → create → active/stale/error/pause | Read visualization tốt; write chỉ preview |
| Export/share | Private export job hoặc public share allowlist | Figma có flow, Web chưa có route; hai semantics dễ bị trộn |

### 3.3 Information architecture hiện tại

Route đang đăng ký tại [router.tsx](../src/app/router.tsx#L35):

- Public/account: /, /login, /register, /profile.
- Trip: /trips, /trips/:tripId, /trips/:tripId/plan, /trips/:tripId/members, /trips/:tripId/fund, /trips/:tripId/price-watch.
- Admin: /admin.
- Wildcard: not-found.

Trip sidebar tại [AppShell.tsx](../src/features/shell/components/AppShell.tsx#L8) còn quảng bá Map, Dress code, Packing list và Settings dù chưa có route/body thực. Admin có sáu mục nhưng chỉ đổi local state trong cùng placeholder. Đây là khoảng cách giữa **navigation label** và **destination thật**, không chỉ là thiếu polish.

### 3.4 Hệ thống Figma, component, asset và interaction

- Inventory dự án ghi nhận 3 page, khoảng 150 frame/component board/set cấp page, 17 component set với 81 variant và hơn 2.100 prototype action entry. Action entry có lặp/conditional và **không tương đương API hay feature thật**.
- Desktop system có Header và Trip Sidebar với expanded/collapsed/active variants. Mobile có Button, Field, Chip, Segmented control, Search, Quick action, Progress, Status badge, Switch, Checklist và Trip stepper.
- Mobile Tab bar và Trip section switcher là source native; quyết định Web dùng header 54 px + drawer là hợp lý, không nên copy trực tiếp native navigation.
- Prototype dùng navigation, state/variant change và local variable để mô phỏng success/selection. SET_VARIABLE hoặc frame “Đã lưu” chỉ chứng minh interaction prototype, không chứng minh server commit.
- Frontend có 167 asset Figma local, gồm 154 SVG và 13 PNG trong [figma assets](../src/shared/assets/figma). Các asset chính được gom qua [asset-map.ts](../src/shared/assets/asset-map.ts#L1) và [scene-assets.ts](../src/shared/assets/scene-assets.ts#L1), nên không phụ thuộc URL Figma runtime.
- Style foundation dùng Be Vietnam Pro, Caveat/Kalam, watercolor và xanh–teal. Vấn đề không phải thiếu style, mà là token/hard-code drift và contrast.
- Fund/Price Watch hiện bám proposal node 768:7778/768:7992 nhiều hơn source 23:506/23:657; Admin có source cạnh tranh. Cần đánh dấu canonical trước vòng fidelity tiếp theo.

## 4. Điểm mạnh nên giữ nguyên

1. **Brand fidelity:** logo, mascot, watercolor, travel collage, xanh–teal và typography viết tay tạo cá tính rõ mà không cần chạy theo trend.
2. **Home composition:** hero, CTA, collage và section storytelling của node [3:28](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=3-28) có hierarchy tốt.
3. **Nền accessibility:** lang=vi, skip link, semantic label, aria-invalid/describedby, live region và aria-busy đã có ở [index.html](../index.html#L2), [Field.tsx](../src/shared/components/Field.tsx#L47) và [ContentState.tsx](../src/shared/components/ContentState.tsx#L6).
4. **Drawer đúng hành vi:** native dialog, Escape, backdrop, focus trap và scroll lock ở [Drawer.tsx](../src/shared/components/Drawer.tsx#L15).
5. **State integrity:** UI ưu tiên nói “chưa khả dụng/chỉ xem trước” thay vì giả saved/success.
6. **Responsive policy:** shared breakpoint, target tối thiểu 44 px, mobile control 52 px và reduced-motion cho skeleton/spinner là nền tảng tốt.
7. **Chart accessibility:** Price Watch có SVG role=img, description và bảng dữ liệu thay thế tại [PriceWatchPage.tsx](../src/features/price-watch/PriceWatchPage.tsx#L173).
8. **Search/filter feedback:** Trip List có result announcement, empty state do filter và CTA xóa bộ lọc.
9. **Asset locality:** Figma assets được lưu local, tránh phụ thuộc URL thiết kế ở runtime.
10. **Không có document-level horizontal overflow** ở các route/viewport chính đã quan sát tại 1440, 402 và 320 px.

## 5. Đánh giá theo Nielsen’s 10 Usability Heuristics

| Heuristic | Đánh giá có bằng chứng | Mức |
| --- | --- | --- |
| 1. Visibility of system status | Shared loading/error/empty/conflict vocabulary tốt; nhưng CTA Fund im lặng, nhiều write chỉ disabled, pending/unknown theo domain chưa hiển thị đầy đủ | P1 — UX-006, UX-008, UX-010 |
| 2. Match between system and real world | Copy thân thiện; song Finance/provider cần nói rõ ledger/TEST và Home quảng bá capability chưa dùng được | P1 — UX-004, UX-008, UX-017 |
| 3. User control and freedom | Drawer Escape/dismiss tốt; draft Profile được giữ. Thiếu cancel/recovery ở auth, fatal/404 và mutation unknown | P1/P2 — UX-002, UX-010, UX-020 |
| 4. Consistency and standards | Shared shell/token tốt; route title tĩnh, Fund tab ARIA chưa hoàn chỉnh, màu/font hard-code gây drift | P2 — UX-008, UX-020, UX-021 |
| 5. Error prevention | Unsupported mutation bị khóa, validation auth tốt; nhưng silent enabled CTA và prototype success có nguy cơ ngụ ý commit | P1 — UX-008, UX-022 |
| 6. Recognition rather than recall | Sidebar và selected state rõ; nhưng mục unavailable ngang hàng, horizontal scroll không có cue, quyền phức tạp thiếu giải thích | P1/P2 — UX-005, UX-009, UX-018 |
| 7. Flexibility and efficiency | Search/filter/sort và collapsible sidebar hữu ích; pagination và advanced filters chưa dùng được | P2 — UX-012 |
| 8. Aesthetic and minimalist design | Brand mạnh; Overview bị dead-state chiếm ưu thế, Home rất dài trên mobile, preview controls là noise ngoài ngữ cảnh demo | P2 — UX-011, UX-013 |
| 9. Help users recognize/diagnose/recover | Correlation ID/retry có nền; thiếu forgot/reset/verify, CTA Home/Reload/Support, field-level errors ở Fund/Price Watch | P1 — UX-002, UX-010 |
| 10. Help and documentation | Có copy giải thích fixture; title tooltip không đủ, role/capability và provider state cần guidance tại chỗ | P1 — UX-006, UX-009 |

## 6. WCAG 2.2 AA và accessibility

Không thể tuyên bố Wolfari “đạt WCAG 2.2 AA” từ audit này. Kết quả dưới đây kết hợp live inspection, source inspection và phép tính contrast tĩnh.

| Tiêu chí | Kết quả | Bằng chứng / ghi chú |
| --- | --- | --- |
| 1.1.1 Non-text content | Có alt/role ở các asset chính; chưa audit toàn bộ 167 asset | SOURCE-VERIFIED; cần scan toàn bộ trước release |
| 1.3.1 Info and relationships | Heading/landmark/form label nhìn chung tốt; Fund draft dùng section thay vì form, tabs thiếu panel relationship; ledger role=table/row thiếu columnheader/cell | [FundPage.tsx](../src/features/fund/FundPage.tsx#L75), UX-008 |
| 1.4.3 Contrast (Minimum) | **Không đạt ở một số cặp tĩnh** | #6c8bb2/white ≈ 3.52:1; #5980ae/white ≈ 4.10:1; white trên primary gradient ≈ 3.85:1 |
| 1.4.11 Non-text contrast | Có rủi ro fail | Field border #bae4f4/white ≈ 1.36:1 nếu là dấu hiệu duy nhất của control |
| 1.4.10 Reflow | Không thấy document overflow ở 320/402 live | LIVE-VERIFIED; chưa kiểm chứng zoom tương đương 400% |
| 1.4.12 Text spacing | Chưa kiểm chứng | Cần override test |
| 2.1.1 Keyboard | Shared components có nền tốt | Chưa traversal toàn bộ; disabled title không keyboard-discoverable |
| 2.4.1 Bypass blocks | Có triển khai; chưa xác minh end-to-end bằng keyboard | Skip link trỏ tới main |
| 2.4.2 Page titled | Có rủi ro không đủ mô tả theo route | document.title luôn “Wolfari · Travel Workspace”, [index.html](../index.html#L8); cần đánh giá topic/purpose từng route |
| 2.4.3 Focus order | Có nền đúng ở shell/drawer | Chưa keyboard-traverse toàn bộ form/modal nên chưa kết luận conformance |
| 2.4.7 Focus visible | Có focus ring; main destination bị xóa outline | [global.css](../src/shared/styles/global.css#L37), UX-020 |
| 2.4.11 Focus not obscured | Chưa kiểm chứng đầy đủ | Cần kiểm tra sticky header/mobile keyboard |
| 2.5.8 Target size | Shared policy là 44 px; Fund tab live cao 34 px | 34 px thấp hơn policy nội bộ nhưng không tự chứng minh fail mức tối thiểu WCAG 24×24/spacing exception; cần đo đủ hitbox và spacing |
| 3.1.1 Language of page | Đạt | html lang=vi |
| 3.2.3/3.2.4 Consistent navigation/identification | Khá nhất quán trong component đã kiểm tra; chưa kết luận toàn app | Label Việt/Anh và dropdown glyph còn gây lệch kỳ vọng; UX-005, UX-021 |
| 3.3.1/3.3.3 Error identification/suggestion | Auth tốt; Fund/Price Watch chỉ Alert tổng quát | UX-008, UX-017 |
| 3.3.4 Error prevention | Chưa đủ bằng chứng với finance/destructive action | Figma có confirm state nhưng Web chưa có runtime flow |
| 4.1.2 Name, role, value | Shared form tốt; Fund tabs và ARIA table chưa đủ role relationship | UX-008 |
| 4.1.3 Status messages | Có role=status/alert | Cần domain-specific success/pending/unknown, UX-010 |

### 6.1 Contrast cần xử lý ở token, không vá từng trang

Các tỷ lệ trên được tính từ foreground/background CSS tĩnh trong [tokens.css](../src/shared/styles/tokens.css#L2), không phải đo mọi computed style/gradient pixel. Vấn đề là hệ thống: muted text, info text, active cyan, primary gradient và border cùng cần một accessible palette vẫn giữ sắc Wolfari. Chi tiết phương án ở UX-007.

## 7. Responsive design

### 7.1 Đã kiểm chứng trực tiếp

- 1440, 402 và 320 px: không thấy document-level horizontal overflow trên các route chính.
- Home fixture page dài khoảng 2.355 px ở desktop, 4.653 px ở 402 px và 4.494 px ở 320 px; số đo gồm preview controls. Product composition desktop được tài liệu khóa ở 2.144 px. Đây không tự động là lỗi, nhưng là tín hiệu cần kiểm tra discoverability của content cuối.
- Mobile Plan và Members dùng row horizontal scroll; nội dung bên phải có thể truy cập nhưng thiếu fade/chevron/partial-item cue.
- Fund mobile ẩn actor và ngày giao dịch theo CSS; dữ liệu audit không có alternative hiển thị.
- Document title không đổi khi chuyển route.

### 7.2 Nền tảng source/test

- Breakpoint code: 360, 768, 950 và 1100 px tại [breakpoints.ts](../src/shared/styles/breakpoints.ts#L1).
- Test source có matrix rộng từ 320 đến 2560 px, overflow/target/drawer/focus/reduced-motion. Đây là **TEST-SPEC-ONLY**, không phải tuyên bố test pass trong audit này.
- Không có tablet frame canonical trong Figma. Vì vậy 768/820/1024 phải được định nghĩa như acceptance của Web, không gọi là pixel fidelity.

### 7.3 Kết luận responsive

Responsive foundation tốt hơn nhiều so với mức độ hoàn thiện capability, nhưng cần UX-018: cue cho horizontal scroll, bảo toàn metadata quan trọng trên mobile, specification tablet, kiểm tra zoom/landscape/safe-area/long Vietnamese labels.

### 7.4 Visual hierarchy và consistency

- **Tốt:** Hero/title/primary CTA, card grouping, whitespace và handwritten accent tạo hierarchy rõ ở Home, Trip List và Auth.
- **Chưa tốt:** Overview đặt nhiều unavailable panel ngang trọng số với Plan; disabled control trên Plan/Profile trông gần action thật; Admin nav có hierarchy của sản phẩm hoàn chỉnh dù body chưa tồn tại.
- **Consistency visual:** Shared shell, card radius và palette khá đồng bộ.
- **Consistency hành vi:** Chưa đồng bộ giữa disabled, unavailable, silent enabled CTA, local-only navigation và preview write.
- **Kiến trúc design system:** Shared token/component là nền đúng; hard-code màu/font/radius ngoài token làm accessibility fix khó lan truyền an toàn.

## 8. Đánh giá theo từng trang

### 8.1 Home — /

**Bằng chứng — FIGMA-VERIFIED + SOURCE-VERIFIED + LIVE-VERIFIED:** Figma [3:28 Guest](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=3-28), [298:1642 authenticated](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=298-1642); [HomePage.tsx](../src/features/home/HomePage.tsx#L24); live ở 1440/402/320.

- **Tổng quan:** Đây là trang có fidelity và storytelling tốt nhất. Hero, mascot, collage và nhịp nội dung truyền tải đúng tinh thần “workspace du lịch thân thiện”.
- **Điểm mạnh nên giữ:** Logo, hero copy, primary CTA, watercolor background, travel collage, section order và chữ viết tay có kiểm soát.
- **Điểm yếu:** Trang dài đáng kể trên mobile; video CTA là disabled; một số muted/brand text có contrast dưới 4.5:1 theo CSS tĩnh.
- **Vấn đề UX:** Home quảng bá quỹ nhóm, thông báo realtime, Price Watch và đồng bộ đa thiết bị như capability hiện hữu, trong khi runtime evidence đánh dấu nhiều phần mock-only. Người mới có nguy cơ hiểu preview là sản phẩm sẵn sàng.
- **Sai lệch Figma:** Composition gần Figma. Runtime có thêm nhãn/demo state hoặc giới hạn capability; đây là deviation đúng hướng nếu được thể hiện gọn.
- **State còn thiếu:** Không có trạng thái rõ khi CTA dẫn tới capability chưa sẵn sàng; video không có alternative explanation tiếp cận được.
- **Hướng cải tiến:** Giữ layout; hiệu chỉnh copy theo capability, thêm disclosure demo ở nơi ra quyết định, xử lý contrast và video CTA tối thiểu. Xem UX-004, UX-007, UX-011.

### 8.2 Login và Register — /login, /register

**Bằng chứng — FIGMA-VERIFIED + SOURCE-VERIFIED:** Figma [298:1893 Login](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=298-1893), [298:2007 Register](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=298-2007); [AuthPage.tsx](../src/features/auth/AuthPage.tsx#L18).

- **Tổng quan:** Cấu trúc form rõ, label thật, validation và focus field lỗi đầu tiên là các pattern tốt.
- **Điểm mạnh nên giữ:** Hai cột/illustration, field hierarchy, giữ input khi lỗi, không giả success và chuyển mode Login/Register dễ thấy.
- **Điểm yếu:** Submit ngoài demo chỉ chuyển sang unavailable, không gọi Identity repository/API. Không có “Quên mật khẩu”, verification prompt/terminal state, reset password hoặc intended-return flow. Điều khoản/Chính sách chỉ là text, không có link.
- **Vấn đề UX:** Register runtime mục tiêu trả accepted/202 nhưng không tạo session; account ACTIVE chưa verify vẫn có thể Login. Verification/matching là gate riêng khi chấp nhận EMAIL invitation. Prototype đi thẳng vào workspace vẫn sai contract vì giả session, nhưng không được sửa thành “mọi người phải verify trước Login”.
- **Sai lệch Figma:** Web thêm demo-access panel nên cao hơn source; Register giữ full name + consent có chủ đích. Sai lệch này chấp nhận được nếu demo panel không xuất hiện production.
- **State còn thiếu:** Rate limit, invalid credentials, verify pending/success/expired/used, forgot/reset, refresh failure và return-to-invitation.
- **Hướng cải tiến:** Ưu tiên integration đúng contract và full recovery state trước thay đổi visual. Xem UX-002.

### 8.3 Profile — /profile

**Bằng chứng — FIGMA-VERIFIED + SOURCE-VERIFIED + LIVE-VERIFIED:** Figma [299:1847](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=299-1847); [ProfilePage.tsx](../src/features/auth/ProfilePage.tsx#L13).

- **Tổng quan:** Hai panel “Thông tin cá nhân” và “Thông báo & thiết bị” dễ quét, chuyển một cột hợp lý trên mobile.
- **Điểm mạnh nên giữ:** Draft không mất khi save unavailable; copy nói rõ thay đổi profile không đổi role trong Trip; không map sai push device thành auth session.
- **Điểm yếu:** Đổi ảnh, đăng xuất, preferences và revoke đều disabled; Save trông khả dụng nhưng chỉ trả unavailable. Live page có nhiều control “—” và unavailable panel nên cảm giác như màn quản lý nhưng gần như không quản lý được.
- **Vấn đề UX:** Figma Desktop nói “thiết bị nhận push”, Mobile có “thiết bị đang đăng nhập”; API session và push-device là hai resource khác nhau.
- **Sai lệch Figma:** Toggles/device actions được thay bằng unavailable để không giả backend. Đây là deviation chính xác về integrity nhưng cần hierarchy nhẹ hơn.
- **State coverage:** Session loading/error/empty/list đã có ở fixture UI. Còn thiếu gateway integration/revoke, Profile update pending/success/conflict, upload validation/progress, logout và preference/device persistence.
- **Hướng cải tiến:** Tách rõ “Phiên đăng nhập” và “Thiết bị nhận thông báo”; mở từng capability đã có contract, giữ phần còn lại read-only có lý do. Xem UX-016.

### 8.4 Trip List — /trips

**Bằng chứng — FIGMA-VERIFIED + SOURCE-VERIFIED + LIVE-VERIFIED:** Figma [3:29](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=3-29); [TripListPage.tsx](../src/features/trips/TripListPage.tsx#L30); [TripListHero.tsx](../src/features/trips/components/TripListHero.tsx#L10).

- **Tổng quan:** Danh sách có hierarchy tốt, card dễ nhận diện, search/status/sort rõ và empty filtered state hữu ích.
- **Điểm mạnh nên giữ:** Result announcement, “Xóa bộ lọc”, lifecycle badge, responsive grid 3/2/1 cột, visual hero gần Figma.
- **Điểm yếu:** Tạo chuyến đi, role/time/advanced filter, card actions và pagination chưa khả dụng. Live desktop có khoảng 12 disabled control. Mobile status row scroll ngang thiếu cue.
- **Vấn đề UX:** Tác vụ entry-point quan trọng nhất là “Tạo chuyến đi” lại là dead-end. Search/sort fixture local trên sáu trip không thể mặc định giữ nguyên semantics khi runtime dùng cursor và chưa tải đủ collection.
- **Sai lệch Figma:** Screen visual khá sát; create flow node [3:30](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=3-30) chưa có route. Một số mobile controls tồn tại trong JSX nhưng CSS không bật.
- **State coverage:** Fixture đã phân biệt repository-empty và filtered-empty. Còn thiếu create persistence/pending/conflict/unknown, server pagination, permission và archived read-only gắn dữ liệu thật.
- **Hướng cải tiến:** Tạo minimal create chỉ từ field backend xác nhận; định nghĩa search/filter/pagination theo server capability; không phục hồi toàn bộ Figma personalization trước contract. Xem UX-003, UX-012, UX-022.

### 8.5 Trip Overview — /trips/:tripId

**Bằng chứng:** Figma [3:31 expanded](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=3-31), [3:32 collapsed](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=3-32); [TripOverviewPage.tsx](../src/features/trips/TripOverviewPage.tsx#L105); **FIGMA-VERIFIED + LIVE-VERIFIED + SOURCE-VERIFIED**.

- **Tổng quan:** TripHero và Plan summary tạo được entry point rõ, nhưng phần lớn chiều cao dashboard bị chiếm bởi Weather/Fund/Packing/Map/Fare unavailable.
- **Điểm mạnh nên giữ:** Shared TripHero, trip context, phân vùng card và partial failure theo panel thay vì bịa dữ liệu.
- **Điểm yếu:** Tỷ trọng unavailable card lớn hơn nội dung hữu ích, tạo “dead-state dashboard”.
- **Vấn đề UX:** Người dùng vào Overview để hiểu “tiếp theo cần làm gì”; năm thông báo chưa khả dụng cạnh tranh sự chú ý với lịch trình.
- **Sai lệch Figma:** Figma có dữ liệu tổng hợp, map, fund, packing và fare dày hơn; Web trung thực hơn về capability nhưng mất visual priority.
- **State còn thiếu:** Per-card loading/stale/error/retry, partial data summary, role-specific quick action và last-updated.
- **Hướng cải tiến:** Giữ dữ liệu thật đã tải, gom capability chưa có vào một module gọn, retry từng vùng. Xem UX-013.

### 8.6 Plan — /trips/:tripId/plan

**Bằng chứng — FIGMA-VERIFIED + SOURCE-VERIFIED + LIVE-VERIFIED:** Figma [20:236](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=20-236), unscheduled [439:2028](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=439-2028); [PlanPage.tsx](../src/features/plan/PlanPage.tsx#L249).

- **Tổng quan:** Day switcher, timeline và unscheduled locations có cấu trúc dễ hiểu; read experience là một trong các workspace page tốt hơn.
- **Điểm mạnh nên giữ:** Timeline hierarchy, activity disclosure, date grouping, “Chưa xếp giờ” và PlanSummary.
- **Điểm yếu:** Add/edit/delete/reorder/complete/map gần như đều disabled; live desktop khoảng 18 disabled control. Web preview có bốn activity và unscheduled, trong khi frame chính thể hiện sáu activity cùng edit/reorder.
- **Vấn đề UX:** Mật độ disabled action làm viewer trông như editor bị lỗi. Day row trên mobile cuộn ngang nhưng không gợi ý còn ngày ở bên phải.
- **Sai lệch Figma:** Shared implementation giản lược interaction và activity count; đây là capability gap, không nên sửa bằng dữ liệu giả.
- **State coverage:** Page đã đọc permission/revision và có VERSION_CONFLICT read state. Còn thiếu capability-aware mutation controls, pending/unknown/conflict recovery sau write, completion persistence và reorder keyboard alternative.
- **Hướng cải tiến:** Giữ visual timeline, chỉ render action người dùng có thể dùng; tích hợp từng vertical slice theo đúng contract endpoint, chỉ dùng version/idempotency key khi endpoint quy định. Xem UX-003, UX-009, UX-014.

### 8.7 Members — /trips/:tripId/members

**Bằng chứng:** Figma [25:360](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=25-360), invitations [475:2294](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=475-2294); [MembersPage.tsx](../src/features/members/MembersPage.tsx#L333); **FIGMA-VERIFIED + LIVE-VERIFIED + SOURCE-VERIFIED**.

- **Tổng quan:** Phân tách member, role, responsibility và invitation là đúng hướng; nhưng mutation/lifecycle chưa hoạt động.
- **Điểm mạnh nên giữ:** Không suy diễn avatar/name nếu projection thiếu; cảnh báo quyền; section rõ.
- **Điểm yếu:** Khoảng 10 control disabled ở desktop; invite/leave/remove/transfer/policy preview-only; horizontal tab scroll thiếu cue.
- **Vấn đề UX:** Owner, Member, Plan Editor và Fund Holder là bốn phạm vi khác nhau nhưng người dùng chưa thấy capability cụ thể của mình. Nhiều warning làm tăng cognitive load.
- **Lỗi logic đã kiểm chứng:** Code kiểm tra data.items.length trước khi filter theo tripId; response chứa item của trip khác có thể render danh sách rỗng mà không có empty state tại [MembersPage.tsx](../src/features/members/MembersPage.tsx#L277).
- **Sai lệch Figma:** Web dùng shared TripHero thay decorative hill ở node 25:360; visual ít giống hơn nhưng tăng consistency. Tên/avatar Figma vượt member projection hiện có.
- **State coverage:** Fixture đã có các read state invitation expired/revoked/accepted-used. Còn thiếu persistence, EMAIL wrong-account, pending/unknown và filtered-empty đúng logic. Polling chỉ áp dụng cho leave/remove operation do initiator tạo; Owner transfer hiện mock-only, chưa có Gateway route/HTTP contract nên không được giả polling hay Finance guard đã hoạt động.
- **Hướng cải tiến:** Sửa logic empty, hiển thị quyền theo action, hoàn thiện invitation/lifecycle state trước polish. Xem UX-009, UX-015.

### 8.8 Fund — /trips/:tripId/fund

**Bằng chứng:** Figma source [23:506](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=23-506), proposal mới [768:7778](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=768-7778); [FundPage.tsx](../src/features/fund/FundPage.tsx#L59); **FIGMA-VERIFIED + LIVE-VERIFIED + SOURCE-VERIFIED**.

- **Tổng quan:** Money formatting và phân vùng summary/ledger/draft hợp lý, nhưng đây là trang có affordance sai nghiêm trọng nhất.
- **Điểm mạnh nên giữ:** Integer-string VND, nhãn TEST/preview, ledger visual và không giả thanh toán.
- **Điểm yếu đã kiểm chứng:**
  - “Bắt đầu đóng quỹ” và “Thông tin giữ quỹ” trông enabled nhưng không có handler.
  - Breadcrumb hard-code “Đà Nẵng 3N2Đ” thay vì trip.name.
  - Draft expense là section, không phải form; Enter/semantics không chuẩn.
  - Tabs khai role=tab nhưng thiếu tabpanel, aria-controls và keyboard model.
  - Badge “Bạn giữ quỹ” render vô điều kiện. Fixture hiện luôn đặt viewer làm holder nên live state chưa sai; đây là **SOURCE-VERIFIED + EXPERT-ASSESSMENT risk** nếu có non-holder data.
  - Mobile CSS ẩn actor và ngày giao dịch, không có alternative detail.
  - Ledger dùng role=table/row nhưng thiếu columnheader/cell relationship.
  - Error chỉ ở Alert tổng, không gắn field/aria-invalid/focus.
- **Vấn đề UX:** Với dữ liệu tài chính, silent action và thiếu actor/time làm giảm trust và auditability.
- **Sai lệch Figma:** Frontend bám proposal 768:7778 hơn source cũ. Cần chốt canonical trước khi tiếp tục.
- **State coverage:** Fixture/model đã biểu diễn OPEN/CLOSING/CLOSED. Còn thiếu server-confirmed transition/persistence, viewer-holder permission, confirmed/pending/unknown write outcome, stale balance, transaction detail và recovery.
- **Hướng cải tiến:** Pha đầu phải vô hiệu hóa đúng hai silent CTA và sửa context/semantics; sau đó mới mở ledger workflow theo contract. Xem UX-008.

### 8.9 Price Watch — /trips/:tripId/price-watch

**Bằng chứng:** Figma source [23:657](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=23-657), proposal [768:7992](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=768-7992); [PriceWatchPage.tsx](../src/features/price-watch/PriceWatchPage.tsx#L350); **FIGMA-VERIFIED + LIVE-VERIFIED + SOURCE-VERIFIED**.

- **Tổng quan:** Đây là page hoàn thiện nhất về read visualization và accessibility chart, nhưng write workflow chỉ là preview.
- **Điểm mạnh nên giữ:** Chart description, data table alternative, threshold/source/last-updated concepts và section hierarchy.
- **Điểm yếu:** Create/edit/pause/delete không persist; field error chỉ nằm trong Alert; environment badge còn thiên kỹ thuật; smooth scroll không tôn trọng reduced motion; CSS dùng biến màu chưa định nghĩa.
- **Vấn đề UX:** Provider error phải giữ last known value và nói rõ stale; không được render 0 hoặc ngụ ý Wolfari đặt vé.
- **Sai lệch Figma:** Frontend bám proposal mới hơn source cũ; cần ghi rõ canonical. Một số success frame prototype không chứng minh server commit.
- **State coverage:** Fixture đã biểu diễn ACTIVE/PAUSED/STALE/provider-error, source, observed time và last-known value. Còn thiếu persistence/transition thật, unknown mutation outcome, pause/delete confirmation và permission.
- **Hướng cải tiến:** Giữ page read-only trung thực, sửa validation/motion/token; chỉ mở write sau khi provider/runtime contract được xác minh. Xem UX-017.

### 8.10 Admin — /admin

**Bằng chứng:** Figma [194:1093 Overview](https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=194-1093), [AdminChrome.tsx](../src/features/shell/components/AdminChrome.tsx#L10), [App.tsx](../src/app/App.tsx#L76); **FIGMA-VERIFIED + SOURCE-VERIFIED**.

- **Tổng quan:** Chrome có chất lượng visual tốt và role guard rõ, nhưng không có feature body.
- **Điểm mạnh nên giữ:** Admin tone khác end-user vừa đủ, navigation và topbar rõ, không giả dashboard data.
- **Điểm yếu:** Sáu mục chỉ đổi local section/title, cùng một generic placeholder, không đổi URL và không giữ state qua refresh/back.
- **Vấn đề UX:** Navigation khiến người dùng tin rằng Accounts/Providers/Monitoring/Audit/Configuration là destination thật. Figma còn có hai bộ Admin cạnh tranh, chưa có canonical source.
- **Sai lệch Figma:** Chỉ shell/topbar/sidebar được triển khai; các table, modal và action từ A01–A06 chưa có runtime contract.
- **State còn thiếu:** Per-section route, loading/empty/forbidden/audit reason/job retry/config conflict và support-read boundaries.
- **Hướng cải tiến:** Trước mắt hiển thị một unavailable landing thay vì sáu fake destinations; sau đó chốt canonical IA và contract. Xem UX-019.

### 8.11 Not-found, fatal error và global shell

**Bằng chứng — SOURCE-VERIFIED:** [router.tsx](../src/app/router.tsx#L107), [error-boundary.tsx](../src/app/error-boundary.tsx#L9), [ContentState.tsx](../src/shared/components/ContentState.tsx#L24), [AppShell.tsx](../src/features/shell/components/AppShell.tsx#L92).

- **Tổng quan:** Copy rõ, shared state có semantics tốt; global recovery còn mỏng.
- **Điểm mạnh nên giữ:** Skip link, route focus, error vocabulary, correlation ID và retry chỉ khi hợp lệ.
- **Điểm yếu:** Fatal/non-retryable và 404 thiếu Home/Reload/Support; document title không theo route; focus tới main nhưng CSS xóa outline.
- **Vấn đề UX:** Người dùng có thể hiểu lỗi nhưng không có next action; tab/history/screen reader khó phân biệt route.
- **Hướng cải tiến:** Route metadata, contextual recovery CTA và visible focus destination. Xem UX-010, UX-020.

### 8.12 Các family có trong Figma nhưng chưa có page Web hoàn chỉnh

| Family | Figma evidence | Hiện trạng | Kết luận |
| --- | --- | --- | --- |
| Create/Edit Trip | 3:30 và mobile stepper 461:5075 | Chưa route; backend chỉ hỗ trợ subset field | Không triển khai nguyên Figma trước khi tách supported/personalization |
| Map/Locations | 20:386, 224:1253, 439:2497 | Sidebar local selection/unavailable | Giữ unavailable; cần provider/source/stale contract |
| Dress code | 20:565 và proposal 768:8228 | Local selection/unavailable | Projection read có thể dùng; write chưa có contract |
| Packing | 23:312, 256:1996, mobile drawers | Local selection/unavailable | Không map checkbox vào Activity completion |
| Export/Share | 25:518, mobile P10/P11 | Chưa route | Tách private export job và public share allowlist |
| Trip Settings/Lifecycle | 25:676, 269:1234, delete/archive modals | Local selection/unavailable | Finance guard và unknown outcome phải đi trước UI success |
| Notifications | 299:1926 | Chưa route | Không quảng bá realtime như capability sẵn sàng |
| Invitation response | 299:2010 | Chưa route | Backend candidate có; cần deep-link/auth return/terminal states |
| Public share | 299:2066, 299:2133, 299:2173 | Chưa route | Cần password/unavailable/read-only projection rõ |
| Mobile native navigation | 320:2178, 562:7774 | Không dùng trong Web | Đúng quyết định: không copy native bottom tab vào Web shell |
| Tablet | Không có top-level frame | Web adaptation | Cần specification, không gọi là Figma fidelity |

## 9. Sai lệch Figma ↔ frontend và đề xuất cho chính Figma

| Khu vực | Mức fidelity | Sai lệch frontend | Điều Figma nên điều chỉnh |
| --- | --- | --- | --- |
| Home | Cao | Thêm demo/capability context; page mobile rất dài | Thêm variant unavailable/demo, kiểm tra contrast text nhỏ |
| Login/Register | Khá cao | Demo panel; form cao hơn | Sửa Register success thành accepted, không tạo session → Login; verification là nhánh riêng; thêm recovery |
| Profile | Trung bình | Toggle/device action thành unavailable | Tách push device và auth session; thêm conflict/loading/error |
| Trip List | Cao về visual | Create/actions/pagination disabled | Tạo minimal create variant theo field backend; server pagination states |
| Overview | Trung bình | Aggregate card unavailable | Thêm partial failure, per-card retry và capability-empty |
| Plan | Trung bình | Read preview, ít item, không edit/reorder | Thêm permission/pending/conflict/unknown và keyboard reorder |
| Members | Trung bình | Shared TripHero; thiếu name/avatar projection | Thiết kế fallback ID/unknown member và lifecycle operation states |
| Fund | Trung bình, theo proposal mới | Silent CTA/context/semantics chưa đúng | Chốt canonical source, thêm TEST/ledger/pending/unknown/audit detail |
| Price Watch | Khá, theo proposal mới | Write preview-only | Giữ/canonicalize stale/provider-error/provenance/last-known-value đã có; thêm persistence, confirmation và unknown mutation |
| Admin | Chỉ chrome | Body placeholder | Chọn một bộ Admin canonical trước khi implementation |
| Mobile Web | Adaptive, không pixel-match native | 54 px header + drawer | Cập nhật companion Web source, không áp native tab bar |

### 9.1 Figma không mặc định là “đúng”

Các điểm Figma cần thay đổi trước khi dùng làm acceptance:

1. Register không được đi thẳng vào authenticated workspace khi runtime chỉ trả accepted và không tạo session; account có thể Login sau accepted, còn verification là nhánh riêng theo ngữ cảnh.
2. Frame tên “Đã lưu/Hoàn tất” phải có server-confirmed prerequisite; prototype transition không phải commit.
3. Các field create/edit vượt backend contract phải được đánh dấu future/personalization preview.
4. Member card phải có fallback khi projection không có display name/avatar.
5. Push-device và auth-session phải là hai resource khác nhau.
6. Export riêng tư và public share phải là hai flow khác nhau.
7. Mỗi domain cần variant loading, empty, forbidden, conflict, pending, unknown và unavailable phù hợp.
8. Tablet cần specification riêng nếu là release target; hiện không có source canonical.

## 10. Phân tích user journey

### 10.1 Người dùng mới

**Home → Register accepted → Login → Trip List → Create Trip; verification là nhánh riêng khi cần**

- Home tạo động lực tốt nhưng không nói rõ mức độ demo/capability.
- Register có validation tốt nhưng flow thật bị chặn; prototype success sai contract.
- Không có recovery page hoặc verification branch cho trường hợp cần EMAIL invitation matching, nên onboarding production chưa khép kín.
- Trip List có thông tin tốt nhưng CTA cốt lõi Create Trip lại disabled.

**Kết luận:** action journey bị chặn tại UX-002 và UX-003; không nên ưu tiên polish card trước hai điểm này. UX-002 là P0 trước production vì không có session thật; nhóm write rộng ở UX-003 giữ P1.

### 10.2 Người dùng quay lại

**Login → Trip List → Overview → Plan**

- Navigation, card và visual context dễ nhận biết.
- Nếu đi theo production source, shell gateway unavailable chặn body trước khi đến page.
- Trong fixture, người dùng đọc được dữ liệu nhưng phần lớn action là disabled.
- Document title không đổi, làm nhiều tab/history khó phân biệt.

**Kết luận:** read journey dễ hiểu; action journey chưa khớp affordance.

### 10.3 Owner mời và quản lý nhóm

**Members → Invitation → Permission → Lifecycle**

- Role/responsibility decomposition đúng về mặt domain.
- Backend có candidate cho invitation nhưng Web không có deep-link flow.
- Leave/remove là partial-runtime và chỉ operation initiator được poll; Finance/shared guard còn unresolved. Owner transfer vẫn mock-only, chưa có Gateway route/HTTP contract. Figma success frame chưa đủ để biểu diễn các khác biệt này.

**Kết luận:** cần capability-based UI và state lifecycle, không chỉ thêm button/modal.

### 10.4 Member lập kế hoạch

**Overview → Plan → Activity completion**

- Timeline, day grouping và unscheduled location dễ hiểu.
- UI hiện không phân biệt đủ quyền complete của Member với CRUD/reorder của Editor.
- Nhiều action disabled cùng lúc làm page giống editor hỏng hơn là viewer có chủ đích.

**Kết luận:** render action theo capability, kèm lý do ở context; không hiển thị toàn bộ editor control rồi disable.

### 10.5 Fund Holder và dữ liệu tài chính

**Fund summary → Ledger → Expense/Close**

- Integer VND và TEST disclosure là nền tốt.
- Silent CTA, badge holder vô điều kiện và mobile ẩn actor/time là rủi ro trust/audit.
- Finance là ledger, không phải tiền thật; copy và status phải nhất quán với giới hạn nghiệp vụ.

**Kết luận:** UX-008 là P1 dù backend chưa có full runtime, vì affordance hiện tại có thể gây hiểu sai ngay trong preview.

### 10.6 Người dùng theo dõi giá

**Create watch → Active → Stale/provider error → Pause/Delete**

- Read visualization tốt và có alternative table.
- Write chưa persist; fixture provider state đã khá đầy đủ nhưng production provider contract chưa có.
- Giá cũ phải được giữ cùng timestamp/source khi provider lỗi; không dùng 0.

**Kết luận:** giữ provenance/stale semantics hiện có trong read preview; chỉ mở mutation sau khi có production contract, confirmation và unknown-outcome recovery.

## 11. Danh sách vấn đề theo mức ưu tiên

### P0 — chặn tác vụ hoặc rủi ro nghiêm trọng trước production release

| ID | Trang/component | Vấn đề | Bằng chứng | Tin cậy |
| --- | --- | --- | --- | --- |
| **UX-001** | App bootstrap / Shell | Production source chọn Gateway nhưng Shell adapter luôn trả SERVICE_UNAVAILABLE; App không mount page body | SOURCE-VERIFIED: [main.tsx](../src/main.tsx#L29), [shell.gateway-repository.ts](../src/infrastructure/repositories/shell.gateway-repository.ts#L6), [App.tsx](../src/app/App.tsx#L226) | Cao cho source; deployment production chưa kiểm chứng |
| **UX-002** | Login/Register/Recovery | P0 trước production vì Login/Register thật không gọi Identity và không tạo session; recovery/verification branch là sub-gap P1 cùng family | SOURCE-VERIFIED: [AuthPage.tsx](../src/features/auth/AuthPage.tsx#L43), [router.tsx](../src/app/router.tsx#L93) | Cao cho source; deployment production chưa kiểm chứng |

### P1 — ảnh hưởng lớn tới usability, trust hoặc accessibility

| ID | Trang/component | Vấn đề | Bằng chứng | Tin cậy |
| --- | --- | --- | --- | --- |
| **UX-003** | Trip/Create/Plan/Members/Profile/Price Watch | Core write journey chủ yếu disabled hoặc preview-only | SOURCE-VERIFIED + LIVE-VERIFIED; ví dụ [TripListHero.tsx](../src/features/trips/components/TripListHero.tsx#L34), [PlanPage.tsx](../src/features/plan/PlanPage.tsx#L79) | Cao |
| **UX-004** | Home + fixture/sandbox UI | Lời hứa sản phẩm và dữ liệu minh họa có thể vượt capability Web hiện có | DOC-CLAIM + SOURCE-VERIFIED + EXPERT-ASSESSMENT: [HomePage.tsx](../src/features/home/HomePage.tsx#L87), [runtime evidence](./runtime-evidence-2026-10-15.md#capabilityaction-matrix) | Cao cho mismatch; Trung bình cho user impact |
| **UX-005** | Trip sidebar / Admin nav | Navigation quảng bá destination không có route/body; state local không bền qua URL/back/refresh | SOURCE-VERIFIED + LIVE-VERIFIED: [AppShell.tsx](../src/features/shell/components/AppShell.tsx#L8), [AdminChrome.tsx](../src/features/shell/components/AdminChrome.tsx#L10) | Cao |
| **UX-006** | Disabled/unavailable controls | Lý do thường chỉ ở title; disabled control không focus/hover trên keyboard/touch; một số CTA nhìn gần active | SOURCE-VERIFIED + LIVE-VERIFIED: [TripHero.tsx](../src/features/trips/components/TripHero.tsx#L58), [ProfilePage.tsx](../src/features/auth/ProfilePage.tsx#L97) | Cao |
| **UX-007** | Shared tokens/components | Một số text, gradient button và border không đạt contrast AA theo CSS tĩnh | SOURCE + tính toán tĩnh: [tokens.css](../src/shared/styles/tokens.css#L2), [Button.module.css](../src/shared/components/Button.module.css#L1) | Cao cho cặp tĩnh |
| **UX-008** | Fund | Silent enabled CTA, breadcrumb hard-code, form/tab/table semantics và mobile audit metadata chưa đúng; holder badge là non-holder risk chưa live-confirm | SOURCE-VERIFIED + LIVE-VERIFIED + EXPERT-ASSESSMENT: [FundPage.tsx](../src/features/fund/FundPage.tsx#L59), [FundPage.module.css](../src/features/fund/FundPage.module.css#L30) | Cao, trừ holder risk ở mức Trung bình |
| **UX-009** | Members/Plan/Fund roles | Owner/Member/Editor/Holder chưa được giải thích theo capability; member identity projection không đủ tên/avatar | DOC-CLAIM + SOURCE-VERIFIED + EXPERT-ASSESSMENT: [domain architecture](./domain-architecture.md#actor-va-trust-boundary), [MembersPage.tsx](../src/features/members/MembersPage.tsx#L333) | Cao cho contract; Trung bình cho comprehension |
| **UX-010** | Shared state / Fatal / Mutations | Recovery generic; thiếu domain-specific pending/unknown/conflict, field recovery và Home/Reload/Support | SOURCE-VERIFIED: [ContentState.tsx](../src/shared/components/ContentState.tsx#L24), [error-boundary.tsx](../src/app/error-boundary.tsx#L9) | Cao |

### P2 — cải thiện đáng kể chất lượng trải nghiệm

| ID | Trang/component | Vấn đề | Bằng chứng | Tin cậy |
| --- | --- | --- | --- | --- |
| **UX-011** | Home | Page rất dài trên mobile, video disabled và disclosure capability chưa nằm đúng context | LIVE-VERIFIED + SOURCE-VERIFIED + EXPERT-ASSESSMENT | Cao cho đo đạc; Trung bình cho impact |
| **UX-012** | Trip List | Create/pagination/advanced filters không dùng được; local search semantics không chắc đúng với cursor runtime | SOURCE-VERIFIED + LIVE-VERIFIED: [TripListPage.tsx](../src/features/trips/TripListPage.tsx#L74) | Cao |
| **UX-013** | Overview | Unavailable panels chiếm ưu thế, làm loãng nội dung Plan có ích; khác mạnh Figma aggregate | SOURCE-VERIFIED + FIGMA-VERIFIED + EXPERT-ASSESSMENT: [TripOverviewPage.tsx](../src/features/trips/TripOverviewPage.tsx#L61) | Cao cho structure; Trung bình cho impact |
| **UX-014** | Plan | Viewer hiển thị dày editor control disabled; read permission/revision/conflict đã có nhưng mutation recovery và scroll cue chưa đủ | LIVE-VERIFIED + SOURCE-VERIFIED + FIGMA-VERIFIED | Cao |
| **UX-015** | Members | Invitation/lifecycle chưa hoàn chỉnh; filtered-empty logic có defect | SOURCE-VERIFIED: [MembersPage.tsx](../src/features/members/MembersPage.tsx#L277) | Cao |
| **UX-016** | Profile | Màn quản lý gần như read-only; push device và auth session dễ bị nhập nhằng | SOURCE-VERIFIED + LIVE-VERIFIED + FIGMA-VERIFIED | Cao |
| **UX-017** | Price Watch | Write preview-only; production provider contract, field validation, confirmation/unknown outcome, environment copy và motion chưa hoàn chỉnh | SOURCE-VERIFIED: [PriceWatchPage.tsx](../src/features/price-watch/PriceWatchPage.tsx#L283) | Cao |
| **UX-018** | Responsive/tablet | Horizontal-scroll thiếu cue; Fund mobile mất metadata; tablet không có canonical Figma | LIVE-VERIFIED + SOURCE-VERIFIED + FIGMA-VERIFIED + EXPERT-ASSESSMENT | Cao |
| **UX-019** | Admin | Sáu mục nav nhưng cùng placeholder; hai bộ Figma chưa chọn canonical | SOURCE-VERIFIED + FIGMA-VERIFIED | Cao |
| **UX-020** | Route metadata/focus/recovery | document.title tĩnh; main focus không visible; 404/fatal thiếu next action | LIVE-VERIFIED + SOURCE-VERIFIED: [index.html](../index.html#L8), [global.css](../src/shared/styles/global.css#L37) | Cao |
| **UX-021** | Design system | Màu/radius/font hard-code ngoài token, làm sửa contrast/theme dễ drift | SOURCE-VERIFIED: [tokens.css](../src/shared/styles/tokens.css#L2), [HomePage.module.css](../src/features/home/HomePage.module.css#L13) | Cao |
| **UX-022** | Figma ↔ runtime contract | Create/Edit, success frame, member identity, profile device và export/share vượt hoặc trộn contract | FIGMA-VERIFIED + DOC-CLAIM + SOURCE-VERIFIED | Cao |

### P3 — tinh chỉnh nhỏ

| ID | Trang/component | Vấn đề | Bằng chứng | Tin cậy |
| --- | --- | --- | --- | --- |
| **UX-023** | Price Watch/Trip List/Shell | Biến --color-red chưa định nghĩa; smooth scroll chưa theo reduced motion; mobile controls dead CSS; profile glyph gợi menu | SOURCE-VERIFIED: [PriceWatchPage.module.css](../src/features/price-watch/PriceWatchPage.module.css#L29), [TripListPage.module.css](../src/features/trips/TripListPage.module.css#L214) | Cao |

## 12. Phân biệt lỗi đã kiểm chứng và nhận định chuyên môn

### Lỗi hoặc mismatch đã kiểm chứng

- Gateway production source, Auth submit, disabled action, silent Fund CTA, hard-coded breadcrumb.
- Route/title, ARIA markup Fund, Members filtered-empty logic, undefined CSS token.
- Cặp contrast tính từ CSS tĩnh.
- Figma node/route/capability coverage và khác biệt frame đã đọc trực tiếp.
- Không có document overflow trong các viewport đã kiểm tra.

### Nhận định chuyên môn, chưa có user test

- Overview unavailable cards gây cognitive load.
- Home dài làm giảm discoverability của content cuối.
- Horizontal-scroll thiếu cue có thể khiến người dùng bỏ sót.
- Role/capability hiện khó hiểu với người mới.
- Preview controls và technical environment badge làm giảm cảm giác product-ready.

Các nhận định trên có lý do và bằng chứng vị trí, nhưng không được trình bày như kết quả nghiên cứu hành vi người dùng.

## 13. Kết luận audit

Wolfari không cần thay nhận diện hoặc “làm hiện đại hơn”. Giá trị lớn nhất đến từ việc:

1. Gỡ P0 integration/auth.
2. Điều chỉnh IA và affordance để UI chỉ hứa những gì thật sự làm được.
3. Chuẩn hóa recovery, permission và domain state.
4. Sửa contrast/disabled guidance ở cấp design system.
5. Giữ composition Figma tốt, nhưng sửa những prototype mâu thuẫn runtime.

Các phương án A/B/C, trade-off, độ phức tạp và checklist quyết định nằm trong [UI_UX_IMPROVEMENT_OPTIONS.md](./UI_UX_IMPROVEMENT_OPTIONS.md).
