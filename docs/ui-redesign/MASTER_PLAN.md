# Master plan — Full Frontend UI/UX Redesign

Nguồn thiết kế chính thức: https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace

Chương trình bao phủ **mọi route hiện hữu**, responsive, accessibility, purposeful animations, component architecture và Backend compatibility. Không giảm scope thành CSS reskin hoặc chỉ những trang có Figma. Không mở rộng nghiệp vụ theo Figma-only controls khi chưa được duyệt.

## 1. Quy tắc điều hành

- CP-01/CP-02 **APPROVED / DONE**, giữ accepted exceptions D19/D20. CP-03 **APPROVED / DONE** theo D23. CP-04 **APPROVED / DONE** theo D25 ngày30/10/2026, giữ giới hạn [acceptance](CP04_ACCEPTANCE.md). CP-05 **READY_FOR_REVIEW** sau W01–W13/D29–D30 ngày31/10/2026, chưa APPROVED; STOP trước CP-06, chờ user approval riêng.
- Phạm vi chỉ Web. Không có deliverable ứng dụng mobile/native; các viewport320/402/768 là kiểm tra Web responsive. Page Mobile trong inventory là evidence lịch sử ngoài đích triển khai, không tạo workstream riêng.
- Work units trong checkpoint đã duyệt có thể tiếp tục; hoàn tất checkpoint phải cập nhật STATE/record/evidence rồi STOP, chờ explicit approval.
- Source of truth: actual code + contracts cho nghiệp vụ; thiết kế Web hiện có trong Figma là visual source, không chỉ moodboard; current UI/audit dùng đối chiếu gaps; repo/tests/records cho trạng thái. Correction30/10: không yêu cầu chọn ảnh AI thay Plan đã thiết kế; chỉ đề xuất delta khi có lý do và review riêng.
- CP-01 chỉ docs/evidence; không source/Backend/dependency/Figma mutation. Baseline FAIL được ghi nguyên trạng, không đổi thành PASS vì đây là discovery.
- User chốt30/10/2026: [DESIGN_DELTAS](DESIGN_DELTAS.md) là register duy nhất cho khác biệt cần review. Proposal trong tài liệu CP01 là lịch sử, không là design authority. Không dùng approval CP01 hoặc “tiếp tục CP02” để mặc định approve layout/token/motion mới.
- [ROUTE_MATRIX](ROUTE_MATRIX.md) theo dõi coverage; [INTEGRATION_CONTRACTS](INTEGRATION_CONTRACTS.md) là ranh giới; [DECISIONS](DECISIONS.md) phân biệt approved/proposed.

## 2. Roadmap theo nhóm nghiệp vụ thực tế

| CP / status | Scope và deliverables | Modules dự kiến | Dependencies / rủi ro riêng | Acceptance và test trọng tâm |
|---|---|---|---|---|
| CP-01 / APPROVED | Full structural Figma inventory mới, Frontend/API/route map, baseline, UX/architecture audit, direction proposal, roadmap/handoff | docs/ui-redesign, AGENTS; read-only src/Backend/Figma | Sai nguồn cũ, metadata thiếu descendants, live browser blocked, baseline failures |3 pages, all frame/component/token catalogs,22 routes, evidence scope rõ, no source changes. Xem record để biết FAIL/NOT_RUN.|
| CP-02 / COMPLETE — accepted exceptions | UX architecture, canonical sources, family state/flow specs, D18 approved layouts, responsive review draft, component/motion handoff | docs/design artifacts; không application implementation |D19 visual-QA waiver, D20 explicit closure; Web-only/contracts giữ nguyên |Nghiệm thu đặc tả/bản nháp hiện có theo CP02_ACCEPTANCE; visual QA chưa thực hiện, không PASS. Delta chưa duyệt không tự áp dụng.|
| CP-03 / APPROVED — DONE | Semantic aliases preserving values; shared Button/Field/Card/Overlay/ContentState, existing state grid + Auth region; D22 Alert contrast fix |shared/styles,shared/components,preview,Auth metadata,tests/docs |D21 scope; no Backend/dependency/domain edits; pending deltas untouched |548 unit; dev24; Gateway built51; fixture178/179 then fixed matcher+focused40 PASS; native200% zoom/axe/contrast/reflow. See CP03_ACCEPTANCE for limits and preserved failure history.|
| CP-04 / APPROVED — DONE | Shell/navigation, Home guest/auth, login/register/recovery/verify/reset, profile/security,404 |features/shell/home/auth,shared patterns,tests/docs |D23 approval + CP03; session/CSRF/guards/returnTo preserved; pending deltas untouched |550 unit, Gateway HTTP-mock51/51, fixture CP04 review7/7, native zoom1/1 PASS; full built fixture184/190 then six test-only corrections focused6/6 PASS. [Acceptance/limits](CP04_ACCEPTANCE.md), [record](checkpoints/CP-04.md).|
| CP-05 / READY_FOR_REVIEW | Trips list/create/overview/settings usable end-to-end, plus approved Shell/Home repair |features/trips,Trip shared components; bounded Shell/Home repairs |D25 + D29/D30; cursor/date/timezone/version preserved; XRT01/02 and CP04-R01/R02 approved, XRT03 pending |W01–W13 complete; lint/typecheck,564 unit, both builds, built fixture205/205 and Gateway HTTP-mock57/57 PASS. W07 full failures194/196 and53/55 remain history; live Backend/manual a11y NOT_RUN. [Acceptance](CP05_ACCEPTANCE.md), [record](checkpoints/CP-05.md).|
| CP-06 / PLANNED | Collaborative Plan/timeline/unassigned/edit/reorder/day-map layout |features/plan,shared Drawer/motion |CP05; full-order IDs, conflict, touch/keyboard, dirty forms |Read/add/edit/complete/delete/reorder; overnight/day-only/unassigned; keyboard parity; Plan command/unit + Gateway tests; short-height workspace visual QA.|
| CP-07 / PLANNED | Map/Dress/Packing experiences across existing preview and runtime capabilities |features/map,dress-code,packing,DeferredReadPage |CP06; conflating preview writes with Gateway reads/provider availability |Readable, responsive projections and clear capability boundaries; existing preview flows preserved; loading/empty/error/read-only states; no new business endpoints.|
| CP-08 / PLANNED | Members/invitations/PlanEditPolicy/remove/leave journeys |features/members,policy presentation,shared operation UI |CP05/06; actor/token/version/permission + ambiguous operation |Owner/member flows, invite preview/accept/decline, expire/revoke, removal/leave recovery; focused policy/command tests, Gateway mocks and responsive keyboard review.|
| CP-09 / PLANNED | TEST manual Finance: setup/consent/budget/destination/contribution/ledger UI + panel refactor |features/fund;pure shared money/error utilities |CP03/05/08; int64 money, Holder boundaries, report≠confirm, duplicate writes |Preserve complete current Fund workflow, pending/reject/review/recovery, ledger correctness. Unit/command + Finance Gateway E2E; isolated live Demo1 Finance when approved/available. No advanced Finance expansion.|
| CP-10 / PLANNED | Runtime Price Watch, Notifications/preferences, Admin truthful placeholder |features/price-watch/notifications/auth preferences/shell AdminChrome |CP04/05/09; MOCK_FLIGHT claims, stale data, notification delivery vs read |Watch create/edit/pause/resume/stop + observations; paginated inbox/read/versioned prefs; Admin denied/placeholder. Contract tests + new targeted runtime E2E coverage as needed. No Admin CRUD.|
| CP-11 / PLANNED | System-wide quality, consistency, motion polish, performance, accessibility, release-readiness report |all affected frontend/docs/tests |CP04–10 approved; baseline failures, mobile/zoom, live environment |All quality gates below; zero unaccepted new regressions, complete routes/states, evidence-backed NOT_RUN exceptions require user acceptance. No automatic deploy/freeze.|

## 3. Chung cho từng implementation checkpoint

Deliverables: coherent usable feature journey, shared component reuse, tests, visual evidence before/after, updated matrix/decisions/state/checkpoint. Không chia checkpoint thành đổi vài button; không gộp tất cả domains vào một lần.

Testing plan: lint/typecheck/unit/component/build; relevant fixture and Gateway HTTP-mock E2E; representative Web desktop/narrow browser,320px and short viewport, native200% zoom, reduced motion, keyboard/focus, loading/empty/error/permission/conflict/unknown. Source tests không thay thế live Backend; isolated live E2E ghi rõ environment và data ownership. Performance budgets/profiling phải chốt CP02/03 và đo trước/sau, không lấy build time làm UX latency.

Compatibility gates: no endpoint/schema/guard/session/route semantics drift, exact serializers/cursors/money/date handling, no optimistic completion before authoritative receipt. Mọi business action phải theo current source contracts, không theo prototype animation.

Rollback: incremental module-sized changes; keep adapters/domain contracts stable; approved commits có thể revert theo checkpoint sau này, không tự commit/revert/reset. Không rollback bằng xóa user changes. Assets/tokens changes giữ mapping và before snapshots. No DB migrations/deployment changes.

Evidence: command/date/commit/mode/viewport/artifact paths; distinguish PASS/FAIL/BLOCKED/NOT_RUN. Record baseline and new failures separately. Unresolved baseline failures phải được diagnose hoặc explicitly accepted trước nghiệm thu implementation; không âm thầm tăng timeout/xóa assertion.

## 4. CP-02 acceptance chi tiết

1. Xác định canonical Web frames hiện có và bám visual source; nêu nguyên tắc landing/workspace. Compact-header hay đổi layout chỉ là adaptation proposal khi có evidence, không yêu cầu thay thiết kế nguồn mặc định.
2. Coverage đầy đủ22 routes + cross-route surfaces; design gaps recovery/404/async states có owner/spec.
3. Prototype/spec ít nhất4 representative journeys (Auth, Trip creation, Plan editing, Fund contribution), bao gồm error/permission/conflict/recovery; member invitation flow không bỏ recipient transition.
4. Screen/state/component mapping tới contracts, không thêm chức năng unsupported; xử lý rõ contradictions Holder/Owner/Admin/native Mobile.
5. Responsive1440/402 và constraints320/768/820/short-height; menu/focus/scroll/long text có spec, không chỉ resize screenshot.
6. Semantic color/type/spacing/radius/elevation/icon/motion matrix, readable contrast, keyboard/focus và reduced motion; reuse existing dependencies.
7. Capture và review designs; record những gì chỉ spec/chưa runtime. User phê duyệt trước CP-03.

Ngoại lệ nghiệm thu30/10/2026, D19/D20: người dùng miễn visual QA chưa hoàn tất và yêu cầu đóng CP02 với đặc tả/bản nháp hiện có. Phần capture/visual comparison còn thiếu được ghi WAIVED_BY_USER, không giả đáp ứng bằng chứng ở các gate5–7. Các proposal chưa chọn được bàn giao riêng, không giữ CP02 mở và không thành quyền implementation. Quality gates ở CP03–11 vẫn áp dụng. Hồ sơ đóng chính thức: [CP02_ACCEPTANCE](CP02_ACCEPTANCE.md).

## 5. Điều kiện dừng hiện tại

CP-02 APPROVED/DONE theo D21, giữ exceptions D19/D20 và baseline history. CP-03/CP-04 APPROVED/DONE theo D23/D25 với verification limits giữ nguyên. **CP-05 READY_FOR_REVIEW sau W01–W13/D29–D30; STOP trước CP-06, chờ user approval CP05 riêng.** [Acceptance](CP05_ACCEPTANCE.md), [record](checkpoints/CP-05.md), [STATE](STATE.md). Không mở lại visual QA CP02 đã miễn hoặc coi checkpoint approval là duyệt các delta pending.

Lịch sử CP02: W01–W03 complete; W04 specs/bản nháp với ngoại lệ; W05 handoff accepted; W06 đóng hồ sơ complete. [Review dossier](CP02_REVIEW.md) giữ lịch sử lựa chọn, [nghiệm thu](CP02_ACCEPTANCE.md) ghi giới hạn; D21 mở CP03 mà không approve các delta pending.
