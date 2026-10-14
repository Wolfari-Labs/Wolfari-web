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

## Run the Phase 1 App Shell

Use Node.js 24 and pnpm 10.34.5 via Corepack. Run commands from this repository:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Open `http://127.0.0.1:5173`. Development defaults to fixture; the UI preview controls link to the trip shell and select its states. Feature screens and server mutations are deferred. `corepack pnpm build:preview` creates an explicit fixture preview; production `build` contains the unavailable Gateway boundary until integration is implemented. See [Phase 1 shell mapping, reconcile and checks](docs/app-shell-reconcile-2026-10-15.md).

Browser verification: `corepack pnpm test:e2e` uses the installed Playwright Chromium binary. Install it with `corepack pnpm exec playwright install chromium` if needed.

Phase 2 shared UI sandbox: open `http://127.0.0.1:5173/design-system.html` after `corepack pnpm dev`. It previews tokens, Button/Input/Select/Alert, shell states and the shared drawer without business features or API calls. `corepack pnpm build:preview` includes this sandbox; production `build` excludes it. See [Phase 2 design mapping and checks](docs/design-system-phase2.md).

The bootstrap includes an unconnected, read-only Gateway HTTP client with envelope/error parsing, timeout/cancellation, and an in-memory access-token store. The fixture shell sends no HTTP requests. CI in `.github/workflows/ci.yml` runs lint, typecheck, tests and both builds on pushes to `ui/**`, `develop` and `main`.

Screen and flow specifications are maintained separately from the visual Figma file: [screen inventory](docs/screen-inventory.md), [flow map](docs/flow-map.md), [screen contracts](docs/screen-contracts.md), [UI state matrix](docs/state-matrix.md), and [Figma implementation matrix](docs/figma-implementation-matrix.md). These documents are required input before implementing a feature screen or replacing a fixture with a Gateway adapter.

Branch flow: `main` is reserved for releases; create UI branches from `develop`. Continue `ui/app-shell` when its base matches `develop`; commit only on the UI branch when requested. See [Codex Git workflow](docs/codex-web-implementation-guide.md#quy-tắc-git).

## Wolfari Ecosystem

Wolfari is developed as a multi-platform system consisting of:

- **Wolfari Backend** — Backend services and APIs
- **Wolfari Web** — Web application
- **Wolfari Mobile** — Mobile application

## License

This project is part of the Wolfari ecosystem.
