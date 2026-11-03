# CP-07 Gateway composition evidence

Captured 01/11/2026 from `tests/e2e-gateway/cp07-composition.spec.ts` on branch `draft/demo-ui-ux`, HEAD `4a4ff2687aac675c6614d92025534bf11afac3e0`. The run completed **15/15 PASS** across Map, Dress code and Packing at 1440×960, 820×900, 402×874, 320×600 and 1366×520.

These PNGs show the running Web frontend in **Gateway mode with Playwright HTTP mocks** for Trip and Plan. The Map provider is intentionally unavailable because no browser key is configured. The data is a test response, not a live Backend or production trip. Official Figma source nodes for comparison are Map `20:386`, Dress `20:565` and Packing `23:312`; these screenshots are runtime evidence, not Figma exports. Preview interactions and native browser zoom have separate test evidence.

The archived full-page screenshots cover desktop (1440×960), narrow (402×874) and minimum width (320×600) for each route. The `*-end.png` images show the final content reachable in the 320×600 viewport. The suite also checked primary/secondary reading order, no document horizontal overflow, keyboard filter activation and visible focus at 402px, reduced and normal motion settings, and zero Trip writes. The populated Packing rows assert assignee and due date remain visible at 402px and 320px.

The desktop Dress `main` scrolls internally, so its desktop PNG shows the visible portion rather than every card below the fold. The test scrolls the final panel into view; the 402px full-page image captures the vertical card content. Native zoom PNGs are viewport captures.

`*-axe-page.json` contains full-page axe results; `*-axe-route.json` scans only the CP-07 route. Both use WCAG 2 A/AA and 2.1 AA tags. All six archived full-page scans and all six route scans returned **zero violations**. These automated scans do not establish manual screen-reader coverage.

Native browser zoom was checked separately by `tests/e2e-gateway/cp07-native-zoom.spec.ts`: **1/1 PASS** for the three Gateway routes with the same HTTP-mock boundary. A Chrome extension called `chrome.tabs.setZoom(..., 2)` and confirmed `getZoom() = 2`; viewport width changed from 1418 to 709 CSS pixels, device pixel ratio from 1 to 2, while computed CSS zoom stayed `1`. The three `native-zoom-*.png` files are browser-surface screenshots at that zoom, and [native-zoom.json](native-zoom.json) preserves the measurements. Focus, route controls and no horizontal overflow were checked. This is not a physical-device or screen-reader test.

## Pre-CP07 Gateway comparison

The three `before-*-1440x960.png` images are actual full-page browser captures from an isolated `.local/cp07-before-app` copy, not reconstructed mockups. Its 448 `src` files were checked byte-for-byte: `TripMapPage.tsx`, `DressCodePage.tsx`, `PackingPage.tsx` and `PackingPage.module.css` were restored from `HEAD` (`4a4ff2687aac675c6614d92025534bf11afac3e0`); the other 444 files matched the current workspace. Thus the comparison shows the **pre-CP07 feature implementations with the current CP06 worktree**, not an entire historical checkout. The old Gateway Map and Dress routes use `DeferredReadPage`; Packing uses the earlier read-only presentation.

The isolated Vite app ran at `127.0.0.1:5175` with `VITE_DATA_MODE=gateway`. A temporary Playwright test reused the exact populated Trip+Plan HTTP mock from `tests/e2e-gateway/cp07-composition.spec.ts` at 1440×960; the capture passed **1/1** and checked the three saved projections and zero Trip writes. These images are comparable to the `*-1440x960-full.png` after images for layout and affordances. They do not establish live Backend, map provider, accessibility or other viewport behavior before CP07. The temporary app, capture config and verification script remain in ignored `.local/cp07-before-app`; the active `src` was not changed by this capture.

## SHA-256

| Artifact | SHA-256 |
|---|---|
| [before-map-1440x960.png](before-map-1440x960.png) | 20feeafd39f1a4651a07d966edd32617641271553d3e18544ec8dc0c56f6cfb4 |
| [before-dress-code-1440x960.png](before-dress-code-1440x960.png) | f2671437ad386839c729827895c9b120486f724e331bf4691a3b8b436e938522 |
| [before-packing-1440x960.png](before-packing-1440x960.png) | 864816e638d43029f7302f387c3fc024cee66cd9c8dcbe10a2dbe1010d35c3c2 |
| [dress-code-1440x960-axe-page.json](dress-code-1440x960-axe-page.json) | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| [dress-code-1440x960-axe-route.json](dress-code-1440x960-axe-route.json) | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| [dress-code-1440x960-full.png](dress-code-1440x960-full.png) | e0411efb8aab450180eff1206f975609d1cdae89097fa83c2867eb06302c6dc2 |
| [dress-code-320x600-end.png](dress-code-320x600-end.png) | f32798822020430f0418df3723529c403869789c9940a355bb39da4afeb9e7ad |
| [dress-code-320x600-full.png](dress-code-320x600-full.png) | af9b83584006141ae8a4b63108be3299bae14841401cd45aa2cf2f19e4ac9b54 |
| [dress-code-402x874-axe-page.json](dress-code-402x874-axe-page.json) | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| [dress-code-402x874-axe-route.json](dress-code-402x874-axe-route.json) | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| [dress-code-402x874-full.png](dress-code-402x874-full.png) | c8e6e9223ba338bbbccdb1730ed163022f9024b37e582923ac51fbd0188c623a |
| [map-1440x960-axe-page.json](map-1440x960-axe-page.json) | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| [map-1440x960-axe-route.json](map-1440x960-axe-route.json) | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| [map-1440x960-full.png](map-1440x960-full.png) | ce47b42e94af13e271ec0bfe9bcae4b4964e6751c7a295b2cf94af710d0ab0da |
| [map-320x600-end.png](map-320x600-end.png) | 961d004135440371bbb14f5f4113678446e0d802fb28d35cf66bbc63b2ae7ce5 |
| [map-320x600-full.png](map-320x600-full.png) | b61887b4971bc7b412d143a43f3c435aaf5a344828abf71e0626cb31e68c9e18 |
| [map-402x874-axe-page.json](map-402x874-axe-page.json) | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| [map-402x874-axe-route.json](map-402x874-axe-route.json) | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| [map-402x874-full.png](map-402x874-full.png) | ee812e8c126065354182a60994b9891b6da0c87b19c9ef81cea9a36eb02669fb |
| [packing-1440x960-axe-page.json](packing-1440x960-axe-page.json) | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| [packing-1440x960-axe-route.json](packing-1440x960-axe-route.json) | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| [packing-1440x960-full.png](packing-1440x960-full.png) | 015683f3b8c28ae0098c3df1ce42f808af02e05f4546fcc8662a58b5b03b4cab |
| [packing-320x600-end.png](packing-320x600-end.png) | f1ddd2e1f856cbee92003532044b4a3ff656c3c900a9d34f59d90021ccb49f20 |
| [packing-320x600-full.png](packing-320x600-full.png) | ded6cf5f6acda1404295e3aec04e7c001f49073be208680313c3bd45d0f31118 |
| [packing-402x874-axe-page.json](packing-402x874-axe-page.json) | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| [packing-402x874-axe-route.json](packing-402x874-axe-route.json) | 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 |
| [packing-402x874-full.png](packing-402x874-full.png) | 125437ef10cf87904cb9044214768ecd20497bb08474ad97d2eed12608777cb5 |
| [native-zoom.json](native-zoom.json) | 1aefde67783c3af1f6b275c6f131cf6de4452624d42d0a1fa84d25237b1a3f13 |
| [native-zoom-map.png](native-zoom-map.png) | b7d23bd1a7d5ced04dfaecb726e445700563175bc4e6a71731f4df85dfb72d7e |
| [native-zoom-dress.png](native-zoom-dress.png) | 61b697e22c9653a05ac0df0e4c784d44c6af88200976776bf7b1e456809b5207 |
| [native-zoom-packing.png](native-zoom-packing.png) | 5cdc383a441a25f19b9c01f640de121382e00c5824af588f5478beb1b59e8491 |
