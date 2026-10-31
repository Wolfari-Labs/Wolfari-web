# CP-05 — nghiệm thu Trips Web

Ngày31/10/2026: **READY_FOR_REVIEW** sau W01–W13 và remediation D29/D30; CP-05 chưa được người dùng APPROVED. Snapshot W01–W07 ngày30/10 và các lượt FAIL lịch sử vẫn được giữ trong [verification](CP05_VERIFICATION.md). Hồ sơ: [record](checkpoints/CP-05.md), [ảnh và provenance](evidence/cp05/qa/README.md), [contracts](INTEGRATION_CONTRACTS.md).

## Deliverables và Definition of Done

| Gate | Kết quả |
|---|---|
| Scope/design | Web only; official List/Create/Overview/Settings Web sources and scoped MCP Create node `3:30` checked without whole-file resurvey. D29 approves only XRT01/02: Gateway Create uses source two-column geometry with supported fields/capability panel, shared accessible success dialog and draft reset. D26/D27/D30 color changes are selector-bounded. XRT03 remains pending; Figma-only controls do not become Gateway payload/actions. |
| Journey | List labels loaded cursor pages truthfully and retains cards on failed refetch. Create validates fields, retains date/timezone/idempotency, resets old draft only after confirmed success; secondary/Escape closes without extra POST. Overview separates Trip/Plan/Fund/Members and shows unavailable data truthfully. Settings retains draft/revisions, locks ambiguous PATCH intent across remount until exact retry or authoritative read; 403/404 remain distinct. |
| Backend compatibility | No API/schema/adapter, router/guard, query-key, shared session/CSRF, serializer or Backend edit. Opaque cursor, date-only/timezone/end-exclusive semantics, expected versions and immutable idempotency intent preserved. No optimistic success on unknown. Gateway HTTP-mock is separate from live Backend. |
| Static/unit/build | Lint, typecheck, production and preview builds **PASS** on31/10; Vitest 44 files/**564/564 PASS**. |
| Browser/visual/a11y | Built fixture full **205/205 PASS**, built Gateway HTTP-mock full **57/57 PASS**, including Create modal2/2 at1440/402; native Chromium 200% zoom is included in fixture suite. Sampled Web 1440/402/320/short height, axe/reflow/keyboard/focus/reduced motion. D29 Shell repair shows full Settings link initially at1440×960 and scrolls it into view at520 height. 26 evidence artifacts hash-listed. Pixel parity/manual accessibility conformance not claimed. |
| Full E2E failure disposition | Historical built fixture **194/196** before D26/D27 and Gateway **53/55** after colors are preserved as FAIL. Corrected focused reruns preceded the new full PASS suites above; neither historical run was relabeled. Original Gateway52/53 Overview contrast history also retained. |
| Evidence/doc/worktree | Source/runtime provenance, failure history, final gates and acceptance synchronized across master/state/route/decisions/record. CP01 inventory/baseline preserved. Dirty worktree on `draft/demo-ui-ux`; no commit/push, Backend/dependency/Figma writes or CP06 work. |

## Giới hạn còn lại

Live Backend, production environment, manual screen reader, thiết bị vật lý và runtime Web Vitals **NOT_RUN**. E2E fixture/Gateway chỉ chứng minh những route/state với dữ liệu minh họa hoặc HTTP mocks tương ứng. Source frame không xác định đủ mọi Web402 state, nên narrow QA là kiểm tra Web responsive. XRT03 và mọi delta khác chưa duyệt vẫn pending.

## Stop

CP-05 **READY_FOR_REVIEW** sau W01–W13, chờ người dùng nghiệm thu riêng. Dừng trước CP-06; không commit/push.
