# Wolfari Web

Wolfari Web is the web application for the **Wolfari** platform.

It provides a browser-based interface for users to access and interact with Wolfari's features, including trip planning, travel information, expense management, and other travel-related services.

## Tech Stack

- React
- TypeScript

## Project Status

🚧 **Under Development**

The project is currently in the early development stage. The architecture, folder structure, and technical implementation may change as the project evolves.

## Technical Baseline

The proposed Web source tree, module boundaries, frontend toolchain, Gateway connection, authentication flow, API contracts, and backend runtime limits are recorded in [docs/implementation-baseline.md](docs/implementation-baseline.md). The full product-domain structure, backend ownership boundaries, missing capabilities, cross-domain workflows, and implementation gates are recorded in [docs/domain-architecture.md](docs/domain-architecture.md). The staged Figma-to-Web workflow and delivery gates are in [docs/web-implementation-roadmap.md](docs/web-implementation-roadmap.md). Figma remains the source for interface design; these documents focus on project structure and technical integration.

## Run the Web fixture preview

Use Node.js 24 and pnpm 10.34.5 via Corepack. Run commands from this repository:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Open `http://127.0.0.1:5173/trips` for the Phase 3 Trip List. Development defaults to fixture: six readable trips with local status filters, name search and date sorting. Mobile search/sort expands from “Tìm kiếm và sắp xếp”. Card links open Trip Overview; its sidebar opens Plan and Members read previews. Create/edit/archive/delete and unconfirmed filters are disabled.

Phase 3 also includes Home `/`, local validation at `/login` and `/register`, and Self profile `/profile`. Open `http://127.0.0.1:5173/` for the Guest homepage: a fresh visit to Home, login or register defaults to Guest in fixture preview. To review User Home, expand “UI preview · Dữ liệu minh họa” at the end of the page and select `success`; this presentation choice lasts during SPA navigation, without creating a session. Direct visits to private fixture routes still default to the User preview. Login/register never authenticate or create a session. Plan has day selection/activity disclosure/unscheduled locations; Members uses IDs and roles while name/avatar enrichment is unavailable. Invitation preview validates email without sending or creating a link. All writes remain disabled, preview-only or unavailable. See [Auth](docs/auth-fixture-phase3.md), [Overview](docs/trip-overview-phase3.md), [Plan](docs/plan-preview-phase3.md) and [Members](docs/members-preview-phase3.md) for mapping, checks and remaining gaps.

The list preview controls at the end of the content select read states independently of the shell preview. Fixture lifecycles use the fixed reference `2026-09-23`; no API requests or token storage are involved. `corepack pnpm build:preview` creates an explicit fixture preview; production `build` excludes the fixture catalog and uses the unavailable Gateway boundary until integration is implemented. See [Trip List contract](docs/screen-contracts.md#contract-trip-list) and [Phase 1 shell mapping, reconcile and checks](docs/app-shell-reconcile-2026-10-15.md).

Browser verification: `corepack pnpm test:e2e` uses the installed Playwright Chromium binary. Install it with `corepack pnpm exec playwright install chromium` if needed.

### Demo login (fixture only)

Open `/login` in `corepack pnpm dev` or an explicit `build:preview` build. Use email **`trang.nguyen@example.com`** and password **`WolfariDemo2026!`**, or click “Điền tài khoản demo”, then “Đăng nhập”. This opens User Home with a visible demo banner. “Thoát phiên demo” returns to Guest; reloading Home also resets the demo. These are public sample credentials, checked locally without Backend authentication, tokens, cookies or persistent storage. Registration remains unavailable. Production/Gateway does not include this account or demo capability.

Phase 2 shared UI sandbox: open `http://127.0.0.1:5173/design-system.html` after `corepack pnpm dev`. It previews tokens, Button/Input/Select/Alert, shell states and the shared drawer without business features or API calls. `corepack pnpm build:preview` includes this sandbox; production `build` excludes it. See [Phase 2 design mapping and checks](docs/design-system-phase2.md).

The bootstrap includes an unconnected, read-only Gateway HTTP client with envelope/error parsing, timeout/cancellation, and an in-memory access-token store. The fixture shell sends no HTTP requests. CI in `.github/workflows/ci.yml` runs lint, typecheck, tests and both builds on pushes to `ui/**`, `develop` and `main`.

Screen and flow specifications are maintained separately from the visual Figma file: [screen inventory](docs/screen-inventory.md), [flow map](docs/flow-map.md), [screen contracts](docs/screen-contracts.md), [UI state matrix](docs/state-matrix.md), and [Figma implementation matrix](docs/figma-implementation-matrix.md). These documents are required input before implementing a feature screen or replacing a fixture with a Gateway adapter.

Branch flow: `main` is reserved for releases; create each UI flow branch from `develop` after its dependencies are merged. Trip List uses `ui/trip-list` after Phase 2; continue that branch for changes to the same flow and commit only when requested. See [Codex Git workflow](docs/codex-web-implementation-guide.md#quy-tắc-git).

## Wolfari Ecosystem

Wolfari is developed as a multi-platform system consisting of:

- **Wolfari Backend** — Backend services and APIs
- **Wolfari Web** — Web application
- **Wolfari Mobile** — Mobile application

## License

This project is part of the Wolfari ecosystem.
