# CP-04 Web visual evidence

30/10/2026. Captures use Playwright fixture preview unless labeled native zoom; they are not live Backend screenshots or proof of exact Figma pixel parity. Official source Web frames and review notes remain in [CP02 Home/Auth evidence](../cp02/figma-home-auth-review-2026-10-30/README.md), including guest/user Home, login/register, Web402 Home and the trip menu. CP04 queried the corresponding node design contexts rather than resurveying the whole file.

| Artifact | Mode / review point |
|---|---|
| [Home guest Web402](home-guest-402.png) | Fixture; five source sections and logo-left/Menu-right header. |
| [Home user Web402](home-user-fixture-402.png) | Fixture demo session; authenticated CTA/notification/account, no Gateway API. |
| [Login1440](login-fixture-1440.png) | Fixture; source two-column introduction/collage/form family. Preview controls below card are fixture only. |
| [Register invalid Web402](register-invalid-fixture-402.png) | Fixture; required fields, readable errors, preserved user input/focus. Full-page screenshot may paint the fixed, offscreen skip link at the scrolled viewport offset; live-viewport focus and axe assertions passed. |
| [404 Web402](not-found-402.png) | Fixture; shared shell and Home recovery link. |
| [Trip drawer Web402](trip-drawer-402.png) | Fixture; D18 HMA04 source geometry, keyboard/focus/scroll and reduced-motion check. |
| [Native zoom drawer](native-zoom-drawer.png), [recovery](native-zoom-recovery.png), [Profile](native-zoom-profile.png) | Fixture browser surface captures at native 200% Chromium zoom, not CSS zoom. Some captures show a scrolled viewport by design to prove lower controls are reachable. [Measurements](native-zoom.json): factor2, DPR1→2, viewport1418→709, CSS zoom1. |

The final CP04 fixture review run passed7/7 and native zoom passed1/1. Initial fixture review3/7 failed four times on a test assumption that Home after404 must be guest; the fixture can have an authenticated viewer. Original artifacts remain in `.local/cp04-qa-first-run/`; corrected final artifacts remain in `.local/cp04-qa-final/`. The copied screenshots above were inspected and SHA256 checked against their source copies. The broader built fixture/Gateway results and any subsequent test corrections are recorded in [verification](../../CP04_VERIFICATION.md).
