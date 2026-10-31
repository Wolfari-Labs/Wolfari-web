# Wolfari — chương trình UI/UX Redesign

Nguồn thiết kế chính thức: https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace

Snapshot CP-01: 29/10/2026, branch `draft/demo-ui-ux`, commit `dc99219241c4cf36d0952115fc93f646d4fc1581`. Đây là chương trình nâng cấp toàn diện UI/UX, motion và component architecture, không phải chuyển Figma thành code 1:1. Backend compatibility là ràng buộc bắt buộc.

CP-01 APPROVED; [CP-02](checkpoints/CP-02.md) **APPROVED / DONE** theo D21, giữ exceptions D19/D20. Scope chỉ Web; [CP-03](checkpoints/CP-03.md) **APPROVED / DONE** theo D23, [CP-04](checkpoints/CP-04.md) **APPROVED / DONE** theo D25 với [verification limits](CP04_ACCEPTANCE.md) giữ nguyên. [CP-05](checkpoints/CP-05.md) **READY_FOR_REVIEW** sau W01–W13/D29–D30, có [nghiệm thu và giới hạn](CP05_ACCEPTANCE.md); STOP trước CP-06, chờ user approval.

CP02 source-first đã chốt: [source map22 routes](SOURCE_MAP.md), [delta register](DESIGN_DELTAS.md), [Plan specification](PLAN_SPEC.md). W04/W05 bàn giao đặc tả/bản nháp hiện có với ngoại lệ; W06 đóng hồ sơ. [Review dossier](CP02_REVIEW.md) giữ lịch sử; các ảnh AI cũ không dùng làm direction. Không coi code bản nháp hoặc waiver là visual/runtime PASS.

Home/Auth W04-B: [đặc tả nguồn và trạng thái](HOME_AUTH_SPEC.md), [sáu ảnh nguồn](evidence/cp02/figma-home-auth-review-2026-10-30/README.md). HMA04 layout đã duyệt D18; các đề xuất khác chưa được tự áp dụng.

W04-C/D và W05-E: [Fund](FUND_SPEC.md), [Members](MEMBERS_SPEC.md), [các route còn lại](ROUTE_GAPS_SPEC.md), [Foundations/component/motion/performance](FOUNDATIONS_HANDOFF.md). Các family specs cùng nhau phụ trách22 routes và cross-route surfaces; chưa là runtime hoặc visual QA PASS.

## Đọc và tiếp tục

1. [Trạng thái](STATE.md) và [master roadmap](MASTER_PLAN.md).
2. [Checkpoint hiện tại CP-05](checkpoints/CP-05.md), [acceptance](CP05_ACCEPTANCE.md) và [verification](CP05_VERIFICATION.md); CP04/CP03/CP02 acceptance và record CP01 giữ exceptions/baseline lịch sử.
3. [Figma inventory](FIGMA_INVENTORY.md), [frontend inventory](FRONTEND_INVENTORY.md), [route matrix](ROUTE_MATRIX.md).
4. [Integration contracts](INTEGRATION_CONTRACTS.md), [UX audit](UX_AUDIT.md), [design direction](DESIGN_SYSTEM.md), [decisions](DECISIONS.md).

## Quy tắc bằng chứng

- `SOURCE_VERIFIED`: đọc code/contract ở snapshot trên; không chứng minh Backend đang chạy.
- `MCP_ENUMERATED`: được đọc từ file Figma chính thức qua MCP; không đồng nghĩa từng màn hình đã được xem ảnh/chạy prototype.
- `VISUALLY_INSPECTED`: ảnh cụ thể đã mở và xem; viewport và mode phải ghi rõ.
- `HTTP_MOCK` / `FIXTURE`: không phải dữ liệu hay giao dịch Backend thật.
- `NOT_RUN` / `UNVERIFIED`: chưa có bằng chứng tương ứng; không được suy ra PASS từ tài liệu cũ.

Khảo sát nhầm nguồn trước khi người dùng đính chính được giữ tại [evidence/figma](evidence/figma/README.md), toàn bộ **INVALIDATED**. Không tái sử dụng node ID/ảnh/kết luận từ đó. [Evidence chính thức](evidence/figma-official/README.md) thay thế hoàn toàn nguồn Figma của chương trình này.

Các tài liệu cũ ngoài chương trình như `docs/UI_UX_AUDIT.md`, `docs/figma-screen-map-2026-10-15.md`, `docs/gateway-integration-matrix.md` là lịch sử; không xóa. Những tài liệu vốn trỏ đúng file key mới không bị coi là khảo sát nhầm nguồn, nhưng trạng thái runtime phải đối chiếu code hiện tại. Chương trình này không sửa lại lịch sử để biến kết quả cũ thành bằng chứng mới.
