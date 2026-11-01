# CP-08 — verification log

Ngày01/11/2026, W01 **baseline/source audit only**. CP08 IN_PROGRESS, chưa implementation UI, chưa nghiệm thu. CP07 APPROVED/DONE theo D38; [record](checkpoints/CP-08.md) và [decision packet](CP08_DESIGN_DECISIONS.md) giữ gate MBR01–MBR05.

## Snapshot và phạm vi

- Branch `draft/demo-ui-ux`, HEAD `4a4ff2687aac675c6614d92025534bf11afac3e0` khớp local origin tracking ref; không fetch. Dirty CP06/CP07 source/tests/docs/evidence giữ nguyên, cùng file ngoài scope `DANH_GIA_CHI_TIET_GIAO_DIEN.md`.
- CP08 W01 chỉ sửa docs. Members source, `src/infrastructure`, package/lock không có diff; sibling Backend sạch trên `feat/demo-1-backend`. Không commit/push, dependency/Backend/Figma writes.
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
- Recipient299:2010: hai lần `Transport closed`; [ảnh official lịch sử](evidence/figma-official/299-2010.png) đã mở để review proposal. **Chưa có successful fresh design context cho W05**; skill figma-design-to-code yêu cầu đọc thành công trước UI edits, ảnh cũ không thay điều kiện này.
- MBR01–MBR05 vẫn `DELTA_PENDING`. Không dùng baseline PASS hoặc D38 để suy design approval hay nghiệm thu CP08.
- Full lint/typecheck/unit/build và Preview regression **NOT_RUN lại trong W01 docs-only**. Các kết quả CP07 giữ nguyên là lịch sử, không đổi nhãn thành CP08 implementation QA.
- CP08 before/after visual QA, responsive/native200% zoom/axe/reduced-motion/focus review, live Backend, manual screen reader, physical device, performance và CI **NOT_RUN**. W06/W07 vẫn pending.

## Repository/document consistency

- `node docs/ui-redesign/evidence/verify-inventory.mjs`: **PASS**, 59 Markdown files/580 local links, 22 routes, existing inventory7239 frames/175 components/17 sets/257 variables, six original baseline screenshot hashes khớp. Đây là kiểm tra inventory đã lưu, không phải Figma resurvey.
- Strict UTF-8/replacement-character/trailing-whitespace/conflict-marker scan: **PASS 60 Markdown files**, gồm AGENTS. Node inline scan đầu tiên không chạy do PowerShell truyền quotes; rerun bằng PowerShell native hoàn tất, không sửa nội dung để né lỗi.
- `git diff --check`: **PASS**, chỉ có cảnh báo LF→CRLF. Recheck branch/HEAD/local origin tracking ref không đổi; Members/infrastructure/package/lock diff rỗng, Backend status sạch. Không coi worktree Frontend dirty là lỗi vì các thay đổi CP06/CP07 chưa commit phải được giữ nguyên.

## Next exact action

Chờ explicit user approval năm hàng MBR01–MBR05 trong decision packet theo D17. Sau đó W02 Members/lifecycle, W03 Owner invitations, W04 Policy, W05 Recipient (sau design-context gate), W06 QA, W07 acceptance và STOP trước CP09. Không tạo báo cáo nghiệm thu CP08 khi các gates này chưa hoàn tất.
