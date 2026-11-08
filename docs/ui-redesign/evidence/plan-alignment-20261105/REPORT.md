# Plan alignment evidence - 2026-11-05

Phạm vi: Web Preview fixture và Gateway HTTP-mock, không ghi Backend hoặc Figma.

## Geometry

| Surface | Result at 1440px |
|---|---|
| Shared landscape hero | x238, y120, 1180x150 |
| Preview normal timeline | x238, y442, 1180x498 |
| Preview wide card | x317, y513, 1070x76 |
| Split timeline | x238, y442, 680x498 |
| Split pool | x930, y442, 488x498 |
| Split timeline card | x301, y513, 600x70 |

Các mốc được attach từ `tests/e2e/plan-redesign.spec.ts`; sai số hero Map/Plan/Settings <=2px.

## Screenshots

- `before-preview-1440x800.png`
- `after-preview-timeline-1440x960.png`
- `after-preview-pool-1440x960.png`
- `after-gateway-timeline-1440x960.png`
- `after-gateway-pool-1440x960.png`
- `after-gateway-map-1440x960.png`
- `figma-pool.png` (Figma node `439:2028` reference)

## Verification

- `pnpm test`: **643/643 PASS**.
- Preview built E2E: **13/13 PASS** (`plan-preview`, `plan-redesign`, `plan-draft-time`), viewports 1440, 1366, 1024, 820, 768, 402, 320.
- Gateway HTTP-mock built E2E: **14/14 PASS** (`plan`, `timeline-interaction`, `cp06-composition`), including mouse/touch/keyboard DnD, conflict/confirmation, resize, map/pool and axe checks.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `pnpm build:preview`: PASS.
- `pnpm build`: PASS.

The Vite build emits an existing PostCSS warning about the `from` option; it does not fail the build.

Live Backend, manual screen reader, CI and physical-device checks were not run in this worktree.
