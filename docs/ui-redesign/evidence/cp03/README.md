# CP03 evidence index

Date30/10/2026; base `dc99219241c4cf36d0952115fc93f646d4fc1581`, uncommitted worktree. [Scope](../../CP03_FOUNDATIONS.md), [verification](../../CP03_VERIFICATION.md), [checkpoint](../../checkpoints/CP-03.md).

## Local evidence locations

Raw logs/traces remain under repository `.local`, separate from CP01/CP02. Do not copy Gateway traces/payloads into published reports; the suites use explicit HTTP mocks, not live users or Backend. No old evidence was removed.

| Folder/file | Meaning |
|---|---|
| `.local/cp03-baseline/unit.log`, `build.log`, `build-sizes.json` | Before source edits; unit545 PASS/build PASS. Sizes JSON is PowerShell UTF-16LE output, not UTF-8. |
| `.local/cp03-baseline/fixture.log`, `fixture/` | Full prechange dev fixture suite158/166; snapshots/errors retained. |
| `.local/cp03-baseline/gateway.log`, `gateway/` | Full prechange dev Gateway HTTP-mock49/51; traces show unfinished lazy module graph. |
| `.local/cp03-verification/unit.log`, `typecheck.log`, `lint-final-v2.log`, `build-v2.log` | Postchange static/unit evidence. |
| `.local/cp03-verification/foundations/`, `foundations-v2/` and sibling logs | Diagnostic failures preserved: Alert contrast before D22; corrected keyboard-modality test; grid/Auth test split. |
| `.local/cp03-verification/fixture-built/` and `fixture-built.log` | Full built-preview fixture run including new CP03 state/axe/contrast/native zoom tests. Build in `test-results/cp03-build-fixture`, served5193. |
| `.local/cp03-verification/gateway-built-v2/`, `gateway-identity-invitations/` | Port-specific invitation mock failure; unchanged decoder rejects cross-origin5174 link from5194. |
| `.local/cp03-verification/gateway-final/` and `gateway-final.log` | Final production build served5194 with HTTP mocks; invitation fixture derives same request origin. |

## Screenshot review scope

Before/after Auth captures are fixture browser renders, not proof of live Backend. Đã mở xem prechange320 registration; postchange fields1440/768/402/320, Auth invalid1440/320 và native200% popup/Auth. Fields reflow3/2/1 columns theo available width, errors/hints wrap, no page overflow. Native single-line Input giữ scrolling text bên trong, không phải full-value wrap. Popup200% action/focus còn visible; cạnh trái ring bị clip nhẹ theo padding cũ, ghi follow-up polish chứ không tự thay geometry.

Curated copies SHA256-match final focused run: [fields1440](fields-1440.png), [fields768](fields-768.png), [fields402](fields-402.png), [fields320](fields-320.png), [Auth1440](auth-invalid-1440.png), [Auth320](auth-invalid-320.png), [native zoom popup](native-zoom-overlay.png), [native zoom Auth](native-zoom-auth.png), [zoom measurements](native-zoom.json), [contrast ratios](contrast-ratios.json). Initial blank/cropped Playwright native-zoom screenshots are not visual acceptance; raw browser-surface capture resolves the capture clipping.

Final logs: `foundations-dev-final-v2.log`24/24 PASS; `fixture-final-focused.log`40/40 PASS (all app-shell plus new CP03 tests); `gateway-final.log`51/51 PASS. Full fixture-built run178/179 retains the dev-only matcher failure, fixed and covered by focused40; no fabricated full179/179 result.

Native zoom test uses a temporary isolated Chromium profile and a test-only extension calling tabs.setZoom/getZoom; checks zoom2, DPR×2, viewport÷2 and root CSS zoom1. No extension is installed in the user's browser. This is automated native browser zoom, not manual screen-reader or physical device testing.
