# Wolfari — chương trình UI/UX Redesign

Nguồn thiết kế chính thức: https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace

Snapshot CP-01: 29/10/2026, branch `draft/demo-ui-ux`, commit `dc99219241c4cf36d0952115fc93f646d4fc1581`. Đây là chương trình nâng cấp toàn diện UI/UX, motion và component architecture, không phải chuyển Figma thành code 1:1. Backend compatibility là ràng buộc bắt buộc.

CP-01 APPROVED; [CP-02](checkpoints/CP-02.md) **APPROVED / DONE** theo D21, giữ exceptions D19/D20. Scope chỉ Web; [CP-03](checkpoints/CP-03.md) **APPROVED / DONE** theo D23, [CP-04](checkpoints/CP-04.md) **APPROVED / DONE** theo D25, [CP-05](checkpoints/CP-05.md) **APPROVED / DONE** theo D32, [CP-06](checkpoints/CP-06.md) **APPROVED / DONE** theo D35, [CP-07](checkpoints/CP-07.md) **APPROVED / DONE** theo D38 và [CP-08](checkpoints/CP-08.md) **APPROVED / DONE** theo D43, giữ giới hạn trong các acceptance tương ứng. [CP-09](checkpoints/CP-09.md) **APPROVED / DONE_WITH_EXCEPTIONS** theo D44; W03–W05 deferred và full gate W06 NOT_RUN, xem [acceptance](CP09_ACCEPTANCE.md). [CP-10](checkpoints/CP-10.md) **APPROVED/DONE** theo D48, giữ [nghiệm thu](CP10_ACCEPTANCE.md). [CP-11](checkpoints/CP-11.md) **APPROVED/DONE_WITH_EXCEPTIONS** theo D56 cho chất lượng toàn hệ thống Web; [nghiệm thu](CP11_ACCEPTANCE.md) giữ NOT_RUN/accepted limits, không production release approval. Proposal khác nguồn vẫn theo D17. **STOP sau CP11.**

CP02 source-first đã chốt: [source map22 routes](SOURCE_MAP.md), [delta register](DESIGN_DELTAS.md), [Plan specification](PLAN_SPEC.md). W04/W05 bàn giao đặc tả/bản nháp hiện có với ngoại lệ; W06 đóng hồ sơ. [Review dossier](CP02_REVIEW.md) giữ lịch sử; các ảnh AI cũ không dùng làm direction. Không coi code bản nháp hoặc waiver là visual/runtime PASS.

Home/Auth W04-B: [đặc tả nguồn và trạng thái](HOME_AUTH_SPEC.md), [sáu ảnh nguồn](evidence/cp02/figma-home-auth-review-2026-10-30/README.md). HMA04 layout đã duyệt D18; các đề xuất khác chưa được tự áp dụng.

W04-C/D và W05-E: [Fund](FUND_SPEC.md), [Members](MEMBERS_SPEC.md), [các route còn lại](ROUTE_GAPS_SPEC.md), [Foundations/component/motion/performance](FOUNDATIONS_HANDOFF.md). Các family specs cùng nhau phụ trách22 routes và cross-route surfaces; chưa là runtime hoặc visual QA PASS.

## Đọc và tiếp tục

CP11 D56 closeout: [verification](CP11_VERIFICATION.md), [20-item disposition/22 routes](CP11_REVIEW_DISPOSITION.md), [CP11-A01–A05 approved/verified](CP11_DESIGN_DECISIONS.md), [80+40 local performance samples trước final fix](CP11_PERFORMANCE.md), [nghiệm thu với ngoại lệ](CP11_ACCEPTANCE.md). Final Drawer current-page fix có fresh lint/typecheck/both builds và focused shell unit7/7, Preview Drawer1/1, denied3/3, Gateway HTTP-mock Drawer1/1 PASS/exit0. D55 full unit578/578, Gateway126/126, Preview208/208 là pre-final-NavLink evidence; full suites NOT_RERUN sau sửa. Full direct visual/manual/live/CI/device NOT_RUN được user chấp nhận D56, không là PASS hoặc production-ready. Hồ sơ checkpoint đã đóng; không tự release/checkpoint mới.

1. [Trạng thái](STATE.md) và [master roadmap](MASTER_PLAN.md).
2. [Checkpoint hiện tại CP-11](checkpoints/CP-11.md) và [STATE](STATE.md). [CP10 acceptance](CP10_ACCEPTANCE.md) giữ bằng chứng đã duyệt; [CP09 acceptance](CP09_ACCEPTANCE.md) giữ ngoại lệ và các FND decisions pending.
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
