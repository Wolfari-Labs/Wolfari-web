# CP-04 verification — Web Shell, Home, Auth, Profile

30/10/2026; branch `draft/demo-ui-ux`, HEAD `dc99219241c4cf36d0952115fc93f646d4fc1581`, dirty worktree inherited from CP03 and preserved. Commands run in `Wolfari-web` with Node24/pnpm10 via Corepack. The results below distinguish fixture, Gateway HTTP mocks and unrun live checks.

## Source and integration boundary

- Official Figma node contexts read for Home guest768:5376, Home user768:5746, Web402 Home780:6444, trip menu783:6655, login768:6118, register768:6211 and profile299:1847. Existing [inventory](FIGMA_INVENTORY.md) was sufficient; no whole-file resurvey or Figma write.
- CP04 source edits are limited to `features/shell/components/AppShell.*`, `features/home/HomePage.tsx`, `features/auth/IdentityActionPage.tsx`, `ProfilePage.tsx` and `model/auth-validation.ts`. CP03 edits in the same dirty worktree remain separate historical work; AuthPage required metadata predates CP04.
- `git diff --name-only -- src/app src/infrastructure src/features/members src/features/plan src/features/fund package.json pnpm-lock.yaml` returned empty. No router, guard, session manager, CSRF, query key, serializer, repository, Backend, dependency or Figma mutation. Backend `identity.service.ts` uses trimmed JS `.length` for full name, so Profile validation now matches its150 UTF-16-unit limit; password code-point rule is preserved.
- Gateway identity tests cover exact password bytes, accepted registration without authenticated session, token scrub, safe `returnTo`, profile expected version/conflict/retry, avatar attach, session revocation, pending and private-read expiry. Fixture tests do not establish those Gateway semantics.

## Automated gates

| Gate / exact command | Result and meaning |
|---|---|
| `corepack pnpm lint` | PASS after all CP04 source/test changes. |
| `corepack pnpm typecheck` | PASS after final test edits. |
| `corepack pnpm test -- --runInBand` | Vitest44 files / **550 tests PASS**. The extra forwarded flag did not change coverage. |
| `corepack pnpm build` then final `corepack pnpm build -- --logLevel error` | Production build PASS, including final Admin-header CSS correction. |
| `corepack pnpm build:preview -- --logLevel error` | Fixture preview build PASS after final source edit. |
| `corepack pnpm exec vitest run tests/auth-fixture.test.tsx tests/profile-gateway.test.tsx tests/identity-session-boundary.test.tsx` | Focused Auth/Profile3 files /45 PASS. |
| `corepack pnpm exec playwright test identity.spec.ts --config playwright.gateway.config.ts --workers=1 --reporter=line --output=.local/cp04-auth-gateway` | Dev Gateway **HTTP-mock19/19 PASS**, no retries; test-owned5174 exited. |
| `corepack pnpm exec playwright test --config playwright.cp03-preview.config.ts --workers=1 --reporter=line --output=.local/cp04-gateway-built` | Full built production Gateway **HTTP-mock51/51 PASS** in3.3min. Production build preceded one final Admin-only CSS correction; focused Admin test and final production build passed afterward. No live Backend. |
| Focused Shell/Home fixture: app-shell CP043/3, drawer focus1/1, workspace boundaries9/9, auth/public layout3/3; shell-navigation unit7/7 | PASS on dev fixture after Shell implementation; Admin402 initial overflow diagnosed and fixed, focused rerun1/1 PASS. |
| `corepack pnpm exec playwright test tests/e2e/cp04-review.spec.ts --workers=1 --output=.local/cp04-qa-final --reporter=line` | Fixture browser review **7/7 PASS**: guest/user Home1440/402, login/register/invalid, recovery/404 at1440/402/320/1366×520, axe zero violations in sampled1440/402 pages, keyboard/focus/scroll, reduced-motion drawer. |
| `corepack pnpm exec playwright test tests/e2e/cp04-zoom.spec.ts --workers=1 --output=.local/cp04-zoom-final --reporter=line` | Fixture native Chromium zoom **1/1 PASS**: factor2, DPR1→2, viewport1418→709 CSS px, CSS zoom1; Shell drawer/recovery/Profile reachable, focus/no horizontal overflow. |
| `corepack pnpm exec playwright test --config playwright.cp04-fixture-preview.config.ts --workers=1 --reporter=line --output=.local/cp04-fixture-built` | Full built fixture **184/190 PASS**, six test assertion failures detailed below. This run is not labeled190/190. |
| `corepack pnpm exec playwright test tests/e2e/app-shell.spec.ts tests/e2e/trip-list.spec.ts --config playwright.cp04-fixture-preview.config.ts --workers=1 --reporter=line --grep 'workspace boundaries (1440×800\|820×600)\|Trip List layout (768×900\|402×874\|320×600)\|Trip List Mobile drawer' --output=.local/cp04-fixture-focused-fixes` | Corrected six affected built-fixture tests **6/6 PASS** in15s. No source change was made for these failures. |
| Targeted `prettier --check` for CP04 files, final lint/typecheck, `git diff --check` | PASS; Git only emits LF→CRLF warnings. |
| `node docs/ui-redesign/evidence/verify-inventory.mjs` | Final PASS42 Markdown/348 local links/22 routes; original inventory and six CP01 baseline hashes unchanged. Strict UTF-8/replacement/conflict/trailing-whitespace scan43 files (42 Markdown + AGENTS) PASS. |

## Failure history and corrections

1. First CP04 fixture QA spec run:3/7 PASS; four recovery tests failed on final assertion requiring guest frame after404→Home. Fixture state may have an authenticated viewer, while route recovery worked. Changed assertion to `[data-flow="home"]`; final run7/7 PASS. Original screenshots/error contexts retained at `.local/cp04-qa-first-run/`.
2. Initial Admin shell mobile test2/3 PASS: at402×600, a flex alignment change caused horizontal overflow in the original Admin grid. Restored `justify-self:end` only for Admin account actions and its54px layout height; focused Admin402 rerun1/1 PASS. The public/trip72px header remains D18 source aligned. No Admin business UI was added.
3. Full built fixture184/190: two desktop Shell tests read sidebar width220 immediately after Enter while the existing width transition was still running, despite button/state already changing. Test now polls for final72px width. Three Trip List viewport tests still selected old mobile `data-node-id` and54px header; one Trip List drawer test still expected width≤280, while approved D18 layout is max300px. Updated those assertions to current source-aligned geometry and logo/menu order; all six focused built tests then PASS. Initial full run and failure contexts retained in `.local/cp04-fixture-built/`. No test timeout was raised or assertion removed.

## Visual and accessibility scope

[CP04 evidence](evidence/cp04/README.md) contains selected, visually inspected screenshots and native zoom measurements;10/10 copied artifact SHA256 hashes match source artifacts. Source-family composition is retained in sampled screens; this is bounded visual inspection, not exhaustive pixel parity. The full-page register-invalid screenshot may show the offscreen fixed skip link at a scrolled capture offset. The live viewport assertion confirmed focus on the name input, and sampled axe/reflow passed; this capture artifact is not called a rendered UI failure without viewport reproduction.

Reduced motion: effective animation duration is globally overridden to0.01ms; Drawer local stylesheet still names keyframes, but browser computed duration and focus behavior passed. Test coverage includes Web320/402/768/820/1440 and short-height cases; native200% is browser zoom, not document CSS zoom or physical-device testing.

Live Backend, production environment, manual screen reader, physical devices and runtime Web Vitals/LCP/CLS/INP **NOT_RUN**. CP04 does not assert live session/email delivery, full product WCAG certification or native app support. Historical CP01/CP03 failures remain historical evidence; CP02 visual-QA waiver does not turn them into PASS.

Final Git audit: `git diff --check` PASS (line-ending warnings only), branch/HEAD unchanged. App/infrastructure/other feature/package/lock diff empty. CP03 dirty files and all original evidence remain present. Test-owned ports5173/5174/5193/5194/5195 were not listening at the final check; no process was stopped manually.
