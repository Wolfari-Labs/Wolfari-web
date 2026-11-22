# PR #31 CI repair — 22 November 2026

PR: https://github.com/Wolfari-Labs/Wolfari-web/pull/31

Base: `76c3725535dcc2893bdcf6ddedc1c18c7d60f122` on
`feat/web-v2-figma-redesign`. Work is isolated in `Wolfari-web-pr31`;
the original worktree's uncommitted QA/configuration files are not included.

## Failure and correction

Run https://github.com/Wolfari-Labs/Wolfari-web/actions/runs/44980866415
failed `checks` and `built-browser (fixture)` at the same Home screenshot.
Each fixture suite passed 251 tests and failed one. The built Gateway job passed.

The Linux baseline still described the old 1440×2144 Home page. The committed
feature-showcase redesign (`09d27a9`) updated the Windows baseline and layout
assertions, but not Linux. CI rendered 1440×4627, with 798,119 differing pixels.
`V2_TEST_REPORT.md` already recorded the missing Linux baseline as open work.

Reviewed the actual CI screenshot against the committed Windows baseline,
Home source and unchanged section geometry assertions. Both show the hero,
nine feature cards, three showcases, onboarding steps, destinations and footer.
Replaced only the stale Linux PNG with the reviewed Linux actual screenshot
from artifact `browser-built-fixture-1` (ID `14737328669`). SHA-256:
`c5f6dd1d6733635f895f1d5528da433481f581e4b06e8724a7924642961c7221`.

No UI/runtime source, screenshot thresholds, assertions, dependencies or
workflow gates are changed. The screenshot comes from the failed CI run;
copying it is not a claim that a fresh Linux verification has passed.

## Verification

Local Windows verification: lint PASS, typecheck PASS, fixture Preview build
PASS, and the complete focused Auth/Home browser file 25/25 PASS. Includes
the unchanged Windows snapshot, responsive layouts and existing behavior
assertions. Scoped Markdown formatting and `git diff --check`: PASS.
A fresh Linux CI run is required after push.
The local-only Playwright configuration uses port 5187 because port 5173 is
owned by an existing user process. Full local suites and live Backend: NOT_RUN.
The initial local test launch failed because the temporary configuration's
web-server working directory defaulted to `.local`; set the explicit worktree
directory and reran successfully. No application/test assertion was changed.

The user explicitly authorized this CI repair and push. No PR merge,
deployment, secret changes or new redesign checkpoint are authorized here.
