# CP-08 — verification log

Ngày01/11/2026, phần đầu hồ sơ là W01 **baseline/source audit only** trước implementation. D41 sau đó duyệt MBR01–MBR05; W02–W07 đã hoàn tất và CP08 hiện **READY_FOR_REVIEW**, chưa được user approve checkpoint. CP07 APPROVED/DONE theo D38; [record](checkpoints/CP-08.md), [decision packet](CP08_DESIGN_DECISIONS.md) và [acceptance](CP08_ACCEPTANCE.md) giữ các gate/giới hạn.

## Snapshot và phạm vi

- W01 snapshot: branch `draft/demo-ui-ux`, HEAD `4a4ff2687aac675c6614d92025534bf11afac3e0` khớp local origin tracking ref; không fetch. Dirty CP06/CP07 source/tests/docs/evidence giữ nguyên, cùng file ngoài scope `DANH_GIA_CHI_TIET_GIAO_DIEN.md`.
- Current resume audit: HEAD `6908b0b1b3debb5171dffdf358aa2029dc858172` ahead local origin tracking ref `4a4ff2687aac675c6614d92025534bf11afac3e0`; CP08 source/test/docs changes remain dirty and are preserved. Backend, dependencies, package và lock không có diff; không commit/push.
- W01 chỉ sửa docs tại thời điểm baseline. Members source, `src/infrastructure`, package/lock không có diff trong snapshot đó; sibling Backend sạch trên `feat/demo-1-backend`. Current resume không thêm source change, không commit/push, dependency/Backend/Figma writes.
- Đã đọc actual Members/Invitation/Policy code và contract docs, không suy behavior từ Figma. Members chỉ có `items/nextCursor`, không total/capacity/Holder; recipient preview có `id/tripName/inviterDisplayName/status/expiresAt`, không Trip dates/count.
- Giữ riêng remove/leave command coordinator + OperationStatus; policy actor+Trip journal + receipt reconciliation; owner invitations immutable memory attempt + one-time LINK; recipient token-memory isolation + URL scrub + receipt-driven navigation. Không đổi adapters/endpoints, membership IDs, opaque cursor, revisions/versions, query keys, session/CSRF hoặc guards.

## Baseline tests — trước implementation CP08

```powershell
node node_modules/vitest/vitest.mjs run tests/members-gateway.test.ts tests/members-preview.test.tsx tests/invitations-gateway.test.ts tests/invitations-flow.test.tsx tests/trip-policy.test.ts tests/policy-intent.test.ts
```

**PASS: 6 files / 114 tests, 10.84s.** Unit/component/repository tests với fixtures/mocks, không live Backend.

```powershell
node node_modules/@playwright/test/cli.js test --config playwright.gateway.config.ts --output .local/cp08-baseline-gateway tests/e2e-gateway/members-policy.spec.ts tests/e2e-gateway/invitations.spec.ts
```

**PASS: 10/10, 28.1s.** Vite dev port5174, Gateway HTTP mocks, 2 workers. Coverage hiện hữu: Owner EMAIL/LINK creation/management; recipient scrub/login-return/accept/decline/keyboard; opaque cursor/dedup/include-left; later-page error/retry; Owner policy save/conflict/unknown same-intent retry; SELECTED membership IDs/inactive assignments/archived và Member write boundaries. Không gửi email/lời mời thật. Remove/leave browser journey chưa được kiểm tra lại trong command này.

## Source review và giới hạn

- Figma session `492bcf5e-e505-4d46-adef-d83215ceb82c`: context + screenshot Members768:7492, invite475:2294, policy475:2530 đọc thành công. Không khảo sát lại toàn file/inventory.
- Recipient299:2010 full frame vẫn có hai lần `Transport closed`; [ảnh official lịch sử](evidence/figma-official/299-2010.png) giữ để truy vết. Scoped recipient card `299:2042` đã đọc thành công qua Figma MCP (code/screenshot/assets) và đủ gate kỹ thuật trước W05, nhưng không thay thế MBR approval.
- MBR01–MBR05 đã được duyệt theo D41. Không dùng baseline PASS hoặc D38 để suy ra implementation acceptance; phải dùng rerun W02–W06 và evidence hiện hành.
- Full lint/typecheck/unit/build và Preview regression **NOT_RUN lại trong W01 docs-only**. Các kết quả CP07 giữ nguyên là lịch sử, không đổi nhãn thành CP08 implementation QA.
- CP08 before/after visual QA, responsive/native200% zoom/axe/reduced-motion/focus review, live Backend, manual screen reader, physical device, performance và CI **NOT_RUN**. W06/W07 vẫn pending.

## Repository/document consistency

- `node docs/ui-redesign/evidence/verify-inventory.mjs`: **PASS**, 59 Markdown files/580 local links, 22 routes, existing inventory7239 frames/175 components/17 sets/257 variables, six original baseline screenshot hashes khớp. Đây là kiểm tra inventory đã lưu, không phải Figma resurvey.
- Strict UTF-8/replacement-character/trailing-whitespace/conflict-marker scan: **PASS 60 Markdown files**, gồm AGENTS. Node inline scan đầu tiên không chạy do PowerShell truyền quotes; rerun bằng PowerShell native hoàn tất, không sửa nội dung để né lỗi.
- `git diff --check`: **PASS**, chỉ có cảnh báo LF→CRLF. Recheck branch/HEAD/local origin tracking ref không đổi; Members/infrastructure/package/lock diff rỗng, Backend status sạch. Không coi worktree Frontend dirty là lỗi vì các thay đổi CP06/CP07 chưa commit phải được giữ nguyên.

## Transition from W01 baseline to W06

D41 cho phép W02–W05; hồ sơ W06 hiện hành dưới đây bổ sung bằng chứng sau baseline W01. Các kết quả W01 ở trên được giữ nguyên làm lịch sử, không thay kết quả hiện tại.

## W06 current verification — 01/11/2026, HEAD `6908b0b`

| Gate / command | Result and disposition |
|---|---|
| `corepack pnpm exec vitest run tests/members-gateway.test.ts tests/members-preview.test.tsx tests/invitations-gateway.test.ts tests/invitations-flow.test.tsx tests/trip-policy.test.ts tests/policy-intent.test.ts` | **PASS 6 files / 117 tests**. Includes recipient token/unknown/receipt, Owner LINK secret and clipboard fallback, policy IDs/journal, member projection. Fixtures/mocks, not live Backend. |
| `corepack pnpm test` | **FAIL 573/574, 46/47 files**: only `tests/trip-map-nearby.test.tsx` provider-error text timed out under full parallel suite. Map source was unchanged in CP08. Focused rerun `corepack pnpm exec vitest run tests/trip-map-nearby.test.tsx` **PASS 4/4**. Preserve initial failure; do not call full suite574/574. |
| `corepack pnpm typecheck`; `corepack pnpm build`; `corepack pnpm build:preview` | **PASS**. Both builds use current source; no Backend deployment. |
| `corepack pnpm lint` | **FAIL 2863 errors**, all reported under archived generated `.local/cp07-build-preview/assets/*.js`, a Vite build output omitted from ESLint ignore rules. `corepack pnpm exec eslint src tests` and `corepack pnpm exec eslint . --ignore-pattern '.local/cp07-build-preview/**'` both **PASS**. No CP08 source lint error; failure remains an infrastructure hygiene issue, not silently relabeled PASS. |
| `corepack pnpm exec prettier --check` on CP08 source/tests | **PASS** for affected files at the time of check. New focused E2E files independently passed Prettier/ESLint; final scoped check is recorded in W07. |
| `corepack pnpm exec playwright test --config playwright.gateway.config.ts --output .local/cp08-composition-final tests/e2e-gateway/cp08-composition.spec.ts` | **PASS 24/24**, clean runner exit. Members, Owner invitations, Policy and Recipient × 1440×960, 820×900, 768×1024, 402×874, 320×600, 1366×520. No horizontal overflow; panel order, reduced-motion mode and no Trip writes checked. 8 route axe scans at1440/402 yielded zero violations. [Curated before/after/axe evidence](evidence/cp08/README.md). Earlier recipient axe `link-in-text-block` failures at1440/402 remain history; final run passed. |
| `corepack pnpm exec playwright test --config playwright.gateway.config.ts tests/e2e-gateway/members-policy.spec.ts tests/e2e-gateway/invitations.spec.ts` | All **10 individual cases printed `ok`**: Owner invitation, recipient, pagination, policy save/conflict/unknown/selected/permission. Runner hung after tests and was interrupted (exit1); **no clean suite 10/10 claim**. Existing fixture and focused unit evidence support affected contracts. |
| `corepack pnpm exec playwright test --config playwright.gateway.config.ts tests/e2e-gateway/cp08-lifecycle.spec.ts` | Two **individual cases printed `ok`**: Owner remove PROCESSING→confirmed, Member leave unknown→same-key/body retry→recovery→confirmed/access loss. Runner hung after tests; `--workers=1 --reporter=line` retry also hung after second case. Both runs interrupted (exit1); **no clean suite 2/2 claim**. The tests use synthetic HTTP responses and make no real removal. |
| `corepack pnpm exec playwright test --config playwright.config.ts --output .local/cp08-preview-regression tests/e2e/members-preview.spec.ts` | All **9 individual cases printed `ok`** across Preview viewports and state matrix. Runner hung after tests and was interrupted (exit1); **no clean suite 9/9 claim**. Preview is fixture only. |
| `tests/e2e-gateway/cp08-native-zoom.spec.ts` | One **individual scenario printed `ok`** using native Chrome `tabs.setZoom(2)`; width1418→709, DPR1→2 and CSS zoom1. Members/invite/policy/recipient no horizontal overflow, keyboard/focus, URL token scrub and no writes checked. Runner hung after scenario and was interrupted (exit1); **no clean suite1/1 claim**. [Proof and images](evidence/cp08/README.md). |

The Playwright post-test hangs are runner/teardown failures in this environment. They do not erase individual assertion observations, and they prevent a clean suite PASS claim for those commands. The clean 24/24 composition run is separate. Test-owned servers were stopped after interruption. Live Backend, manual screen reader, physical device, performance and CI remain **NOT_RUN**. No production invitation/email or membership mutation was sent.

## W06 evidence and repository boundaries

- [CP08 evidence](evidence/cp08/README.md): four before and twelve after Gateway HTTP-mock screenshots, eight zero-violation axe JSON, four native zoom screenshots and proof JSON. 29 copied artifacts have a SHA-256 manifest; inspected Members desktop/320, Owner invitations desktop, Policy402, Recipient320 and official Members source image. Visual comparison is scoped, not full Figma state parity.
- Official Figma recipient card `299:2042` context was read successfully before W05; full parent `299:2010` Transport-closed history remains recorded. The stored inventory is sufficient, so no full resurvey or Figma write occurred.
- Current `git diff` is limited to CP08 Members/Invitation source, CP08 tests/evidence/docs and an unrelated user-edited `DANH_GIA_CHI_TIET_GIAO_DIEN.md` that was left untouched. No `src/infrastructure`, package/lock, routing or Backend changes. Sibling Backend Git status was clean using a command-local safe-directory override; no global Git config change.

## Final action after W07

W07 [acceptance](CP08_ACCEPTANCE.md) and checkpoint/state/roadmap/route/delta records are complete. **READY_FOR_REVIEW and STOP before CP09**; await explicit user approval CP08. Do not treat D41 or individual `ok` output as approval of a new checkpoint.
