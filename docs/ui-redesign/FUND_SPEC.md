# CP-02 — Quỹ nhóm Web: đặc tả bám nguồn

30/10/2026; W04-C **SPEC_COMPLETE_FOR_REVIEW**, W05-C Fund slice complete ở mức mapping. HEAD `dc99219241c4cf36d0952115fc93f646d4fc1581`. Không implementation, không giao dịch, không approval delta. Phạm vi TEST/manual hiện hữu, không mở thêm Finance nghiệp vụ.

## 1. Source hierarchy và responsive source

Nguồn đã mở: desktop [768:7778](evidence/figma-official/768-7778.png), [Web402781:6554](evidence/figma-official/781-6554.png), contribution528:4683 và history528:5059 trong [evidence mới](evidence/cp02/figma-fund-members-review-2026-10-30/README.md). Notes777:6442/785:6670 tại [alignment notes](evidence/figma-official/alignment-notes.json). Source vẫn có phần đề xuất/contradiction; không lấy ảnh làm Backend authority.

- Desktop1440: header76/sidebar220 → breadcrumb → landscape Trip banner → Finance state bar →4 summary cards → workspace trái + contextual panel phải. Không bỏ banner, đổi dashboard direction hay rút hết thông tin vào toolbar.
- MCP metadata528:4683: banner x238/y120/w1180/h150; state x238/y286/w1180/h72; stats y374/h102/w282; main x238/y492/w792/h442, side x1046/y492/w372/h442. Gap16 giữa main/side. Đây là source anchors, không height giới hạn cho live data/forms dài.
- Contribution source: tabs, rows đợt/thành viên/nghĩa vụ/đã nhận/hạn/trạng thái; form phải tên đợt/số tiền mỗi người/hạn/người. History source: thời điểm/sự kiện/người/chi tiết + filter panel bên phải.
- Web402: logo/Menu, banner, state,4 stats xếp dọc, rows thành cards đủ thông tin, form ở dưới. Notes yêu cầu document flow/ảnh giữ tỷ lệ/text auto-height. Không native tab/status bar, không dùng frame height làm CSS fixed height.

## 2. Khác biệt cần review trước CP09

| ID | Source/current gap | Proposed treatment — DELTA_PENDING |
|---|---|---|
| FND01 | Source expense/refund/close/holder management; current core chưa có writes tương ứng | Giữ source shell/card/tab language; giải thích capability chưa khả dụng ở đúng vùng. Chỉ đóng góp/lịch sử và core setup wired mới active. Không lấy disabled control làm thay thế nghiệp vụ mới. Handover Holder không triển khai (D07). |
| FND02 | Source contributions-received/expense totals và partial payment example; RuntimeFund chỉ budget/current/reserved/available | Giữ4-card geometry nhưng review labels đúng4 server fields hiện có. Không lấy một trang contributions/ledger cộng thành total hoặc khẳng định partial settlement. |
| FND03 | Current GatewayFundPage nhiều stacked panels + Drawer; source tabs/main+right form | APPROVED_LAYOUT D18: contribution workspace trái, context form phải desktop/dưới content ở Web hẹp; giữ setup/destination/recovery. Default tab chưa quyết định riêng; không sửa lifecycle. CP02 đóng theo D20, visual QA miễn theo D19. |
| FND04 | Source equal amount/recipient selector/history filters; current per-member amounts/opaque cursor | Giữ per-member input, confirmed destination, note và timezone deadline; không silently equal-split. History filters chưa wired không được giả remote full-history filtering. |
| FND05 | Source thiếu operation recovery/rejection/async/destination consent states đầy đủ | Persistent OperationStatus ở vùng state/main trước tác vụ; error theo từng panel; reject reason dưới contribution. Không đóng drawer đồng nghĩa request bị hủy. |
| FND06 | Source old “Luồng tiền thật”/QR/payment notes khác TEST manual | Giữ TEST warning, instruction text đúng dữ liệu; không external QR/provider request, receipt-upload, webhook/settlement simulation hoặc tiền thật. |

Các ID cũng ghi trong [delta register](DESIGN_DELTAS.md). DLT04/05/08/09 vẫn áp dụng token/font/motion/narrow extension; không cho phép restyle mặc định.

## 3. Field/action/contract mapping — PRESERVE_RUNTIME

Owner: [GatewayFundPage/FundCommandForm](../../src/features/fund/GatewayFundPage.tsx), [runtime model](../../src/features/fund/model/runtime-fund.ts), [repository](../../src/infrastructure/repositories/fund.gateway-repository.ts), [coordinator](../../src/infrastructure/operations/command-coordinator.ts). Prefix `/api/v1`; body versions đúng captured intent, không field editable.

| Command → endpoint | Fields/validation phải giữ | Quyền/UI guard hiện tại |
|---|---|---|
| enable →POST `/trips/{tripId}/fund` | Active member holder_user_id, currency VND, VIETQR config; budget blank omitted, otherwise integer string>=0 | Owner, chưa bật Fund, có members; không handover holder sau enable. |
| budget →PATCH `/funds/{id}/budget` | budget_amount blank→null;0 hợp lệ | Owner; expected_finance_version. |
| destination-create/edit →POST `/funds/{id}/destinations`, PATCH `/{destinationId}` | bank_code/account_number/account_name trimmed required; active/is_default booleans; max30/80/150 trên form | Owner; edit chỉ VIETQR; Finance + resource version theo intent. |
| destination-confirm →POST destination `/{id}/confirm` | Versions; explicit responsibility confirmation; không sửa bank fields | Holder + active + chưa confirmed; không coi consent là bank verification. |
| request-create →POST `/funds/{id}/contribution-requests` | title required≤200, note≤2000, due_at optional theo Trip timezone; contributions cho active member có amount nhập, mỗi amount>0 + confirmed active destination_id | Owner, destination VIETQR confirmed; ít nhất1 người. Không suy blank=0. |
| request-edit →PATCH request `/{id}` | title/note, due_at blank **omitted** để giữ hạn; không đưa contributions mới vào edit | Owner/request OPEN, expected versions. |
| amount →PATCH `/contributions/{id}` | amount positive int64 string | Owner + contribution PENDING. |
| waive/cancel →POST contribution `/waive` hoặc `/cancel` | Nonempty reason≤1000, no bank/secrets in reason | Owner + PENDING. |
| report →POST contribution `/report-transfer` | Captured version-only body theo current serializer | Chính người đóng + PENDING; chỉ báo đã chuyển, không ledger receipt. |
| reject →POST contribution `/reject-transfer` | Nonempty reason; preserve rejected_reason hiển thị lần gần nhất | Holder + TRANSFER_REPORTED. |
| confirm →POST contribution `/confirm-received` | Không sửa amount khi xác nhận; versions captured | Holder + TRANSFER_REPORTED; authoritative result trước refetch. |
| Instruction →GET `/contributions/{id}/vietqr` | Text bank/name/account/reference/amount, TEST warning; query gcTime0 | PENDING own contribution; không external QR render/fetch. |
| Reads | Fund/destinations/requests/contributions/transactions | Actor/Trip-scoped query keys, cursor đúng repo; loaded rows dedupe ID, no fake totals. |

Common guard: operation busy/unresolved, Trip archived, Fund không OPEN→blocked. Owner≠Holder; admin không bypass. Members query có pagination và lỗi riêng; không auto select holder là owner. Integer money giữ string tới formatter, không Number/float; max9223372036854775807. Budget không thay balance.

## 4. State/feedback specification — visual placement FND05

| State/event | Vùng trình bày / hành động |
|---|---|
| Fund loading | ContentState trong main; không render0đ hoặc enable form trước kết quả. |
| Not-enabled (valid null/404 handling) | Setup explanation + enable nếu Owner; khác denied/unavailable. |
| Read denied/error/unavailable | Read error + retry theo repository; không đổi lỗi thành chưa bật quỹ. |
| OPEN | Actions theo role/status, TEST và holder rõ. |
| CLOSING/CLOSED/archive | Read history còn được nếu access hợp lệ; mutation blocked, giải thích; không nút reopen/close mới. |
| Child read loading/empty/error | Đúng panel destinations/requests/contributions/ledger; lỗi một panel không xóa dữ liệu panel khác. Empty destinations cần copy rõ (visual gap), không fake destination. |
| Invalid form | Error giữ draft, no request; no fabricated success; field association/focus improvement cần test CP09. |
| PROCESSING/PENDING_RECOVERY | Persistent warning, bounded poll do useCommandSession, không progress% giả hoặc submit thay thế. |
| UNKNOWN | Check/retry đúng intent; body không còn→reenter để fingerprint đối chiếu, không key mới. |
| NEEDS_REVIEW/recoveryBlocked | Giữ warning/hỗ trợ, không tự replay hoặc xóa recovery data để unblock. |
| FAILED/version/state/permission/idempotency conflict | Domain-specific guidance và authoritative reload; draft mới chỉ khi safe explicit action. Không silently substitute expected version. |
| SUCCEEDED | Operation confirmed; invalidate finance/Trip; không suy tất cả read refresh đã thành công. |
| PENDING contribution | Own report/instruction; Owner amount/waive/cancel. |
| TRANSFER_REPORTED | Chờ Holder confirm/reject; không gắn “đã nhận” trước confirmation. |
| CONFIRMED/WAIVED/CANCELLED/REVERSED | Status text tương ứng + reasons nếu có; không reuse mutable PENDING actions. |
| Rejected report | Hiển thị rejected_reason gần amount/status sau reload; không chỉ toast, không mất lý do khi narrow. |
| Cursor next-page failure | Giữ loaded rows, retry trang tiếp theo; không reset cả list/đổi thành page number. |
| Drawer dismissed while request unresolved | Request vẫn tồn tại; OperationStatus ngoài Drawer tiếp tục; không toast “đã hủy”. |

Current FundCommandForm đóng khi trạng thái khác FAILED (kể cả unresolved). Đây là behavior đọc từ source, không guarantee UX tốt; proposal persistent state/return-to-recovery phải giữ trước khi refactor. Fields hiện không bị disabled toàn form khi pending, chỉ submit guard; không claim blanket form-lock đã có.

## 5. Component, reflow và motion handoff

Reuse TripHero/AppShell, Input/Select/Button/Alert/Drawer/ContentState/OperationStatus. CP09 có thể tách presentation FundSummary, DestinationList, ContributionRequestList, ContributionList, LedgerList, FundCommandForm; tên này là proposed code ownership, không components đã triển khai. Giữ coordinator và query ownership ở container, không mount command session mới theo tab để mất recovery.

Desktop giữ source792/372 grid khi đủ chỗ; error/form auto-height. 402 source stats/card/form dưới; contribution/history companions chưa có source-specific narrow nên card mapping là FND03/04 adaptation: member/request→amount→status/deadline/reasons→actions; history giữ sequence/direction/amount/balance và metadata thực tế, không cắt số tiền. 320 wrap bank/reference/long names, action stacks;768/820/short-height xem context column có thể xuống dưới, không tự đổi breakpoint đến khi review. Scroll đến cuối và focus trên submit/recovery không bị sticky che. Không force KPI trên fold.

Không animate balance thành số thành công trước server; không confetti/coin loops. Existing Drawer/status shared motion preserve, reduced-motion không ảnh hưởng polling/focus. Source typography/instance radii phải map CP03/09, không suy tất cả cards16px. Read-only screenshot không chứng minh contrast/keyboard/runtime.

## 6. Verification / acceptance CP09

W04-C: source images+metadata và current source đọc; docs verifier chạy riêng. App lint/typecheck/unit/build/E2E/browser/live Backend **NOT_RUN**; CP01 failures giữ nguyên. Không financial/legal advice; đây là product-contract/UI specification, không giao dịch tiền.

Gate implementation: source1440/402 comparison;320/768/820/short-height, native200% zoom, keyboard Drawer/focus; Owner≠Holder/own report/Holder rejection-confirmation; null vs0/int64; due blank omission; exact key/body/version recovery và actor change; partial/cursor errors. HTTP mocks/fixture không thay isolated live TEST acceptance khi được duyệt.
