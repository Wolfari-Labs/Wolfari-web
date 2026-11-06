# Plan presentation cleanup — 06/11/2026

Bounded maintenance explicitly approved by the user; [PLN09–PLN11](DESIGN_DELTAS.md). No new checkpoint, release approval or change to historic acceptance evidence.

## Implementation

- Shared Gateway/Preview metrics retain their calculations and four slots; labels use Hoạt động, Địa điểm, Trải nghiệm and Di chuyển with `D/M`, Cả chuyến or Chưa chọn ngày. Day-filter labels are unchanged.
- Unknown travel remains `—` without the no-data explanation. The missing-hours note remains screen-reader-only.
- Only the Gateway success Alert is removed; pending, errors, conflict and recovery semantics remain intact.
- Shared timeline padding connects adjacent activity rows only. Single/final rails stop at the card bottom, including read-only lists and ALL groups. Preview spacing and Gateway insertion indicators use the same gap variable.
- Live DnD assertions now check authoritative snapshots/order, unlocked controls and completed recovery instead of waiting for success text.

## Verification

Source: branch `fix/plan-draft-time-on-day-change`, base HEAD `74632ef73da610182a88367276ed97fd2ee2178a`, with uncommitted changes above. All commands run in `Wolfari-web`.

| Gate | Result |
| --- | --- |
| `corepack pnpm typecheck` | PASS |
| `corepack pnpm lint` | PASS |
| Focused unit/component tests, 6 files | PASS 86/86 |
| Built Gateway HTTP-mock E2E, 6 files | PASS 28/28 |
| Built Preview fixture E2E, 3 files | PASS 22/22 |
| Isolated live Backend DnD, preview runtime | PASS 1/1; harness exit 0 |
| Production/Gateway, fixture Preview and demo builds | PASS through the respective harnesses |
| Scoped source/test Prettier, demo spec syntax, `git diff --check` | PASS |

Commands for the focused suites:

```powershell
corepack pnpm test tests/plan-metrics.test.tsx tests/gateway-plan-panel.test.tsx tests/runtime-timeline-readonly.test.tsx tests/plan-preview.test.tsx tests/plan-commands.test.tsx tests/plan-arrangement.test.ts --maxWorkers=2
corepack pnpm test:e2e:gateway:built tests/e2e-gateway/cp06-composition.spec.ts tests/e2e-gateway/timeline-rail.spec.ts tests/e2e-gateway/plan.spec.ts tests/e2e-gateway/gateway-plan-dnd.spec.ts tests/e2e-gateway/timeline-interaction.spec.ts tests/e2e-gateway/cp06-readonly.spec.ts
corepack pnpm test:e2e:built tests/e2e/timeline-rail.spec.ts tests/e2e/plan-preview.spec.ts tests/e2e/plan-preview-dnd.spec.ts
corepack pnpm test:e2e:demo1 --runtime=preview '--grep=Gateway DnD live'
```

Geometry assertions cover 0/1/multiple/1 visible activities at 1440px and 402px, plus Gateway editable/read-only and ALL grouping, and expanded Preview cards. Direct screenshot review covered Gateway single-row desktop/two-row narrow and Preview single-row desktop/narrow. Artifacts are local, ignored test output under `test-results/gateway-preview` and `test-results/fixture-preview`.

Live isolated run: `20261106081921-3669091b`, artifacts under `test-results/demo1/20261106081921-3669091b`, including `preview/results.json`, `snapshot.json` and `final-source.json`. The harness verified unchanged source during the run. Its dedicated containers, volumes and network were removed afterward; post-run Docker label queries returned none. Only harness-owned test data was removed, not personal demo data.

Backend worktree stayed clean; no API/model/dependency/Figma writes or detached-worktree edits. Existing untracked `docs/Wolfari_SRS_v1.2.docx` was preserved. No commit/push.

Limits: these are focused suites, not a full-app rerun. Manual screen-reader, physical-device and CI checks were NOT_RUN. Existing non-failing PostCSS `from` and `NO_COLOR` warnings remain. Earlier checkpoint evidence is not upgraded by this maintenance verification.
