# Single-host trial Web

Operator runbook: `../../HUONG_DAN_DEPLOY_WOLFARI_GOOGLE_CLOUD.md` in the PBL6 workspace root (outside Git repositories).

Branch `feat/single-host-trial-deploy`, base `e196652`; no commit/push or public deployment. No UI redesign. `corepack pnpm build:deploy` forces production Gateway mode into `dist-deploy`; existing HTTP client enforces same-origin `/api/v1/`, and unavailable Backend does not select fixture repositories.

Caddy serves only that static directory. API prefix is retained, unknown `/api` routes404 instead of SPA fallback, helpers/internal paths blocked, X-Real-IP overwritten from socket, and access/debug logs intentionally absent to protect link tokens. DNS-only Cloudflare is required by this trust model; do not enable proxied DNS without separate trusted-proxy review.

## Local verification 2026-11-11

- Build deploy, lint, typecheck and full unit609 tests/51 files. React Router flushSync warning remains non-fatal.
- Runtime audit0; full audit1 moderate minimatch/ESLint,0 high/critical/low after patched undici7.30.1 in jsdom. Full audit exits1, not zero vulnerabilities.
- Caddy2.11.9 binary validated against official release SHA512 checksum; `caddy validate` PASS.
- `CADDY_BIN=/path/to/caddy node scripts/test-deploy-proxy.mjs`: real loopback Caddy + stub upstream, preserved API path/query, spoofed IP overwritten,7 blocked routes and3 SPA deep links PASS. It does not prove real Backend/session/email/public TLS or browser acceptance.
- New generated dist-deploy excluded from lint/Git; a regression prevents lint scanning bundles after deploy build.

## Isolated live-browser acceptance

Docker Linux engine is available. Final dev run `20261111124234-658fa3db` and built-preview run `20261111124900-9e4b7090` PASS/exit0, one scenario with17 business steps each, no skipped/unexpected/flaky tests and no retries. Both record matching before/after source hashes:

- Web implementation SHA256: `7a6286ffabe872577925551adf4522ff06f6930d06633551e0ebd6078fb98446`.
- Backend tree SHA256: `6bf847b4db209c353296ecc07c34f1989f78bb540f3dde9ed5b67facf7de0de2` (before post-run documentation updates).
- Local artifacts: `test-results/demo1/<run>/snapshot.json`, `final-source.json`, `<runtime>/results.json`; ignored by Git/export. These are local evidence, not CI or public validation.

Coverage includes five accounts and Mailpit verification, avatar/storage outage, Trip/Plan permissions/conflicts, invitations/rejoin, TEST ledger, same-cookie sessions, service/DB/broker restart, responsive views and cross-account draft isolation. These use local/test Backend, Mailpit and disposable volumes, not trial production-profile security/real SMTP/public TLS. MOCK_FLIGHT/Finance notifications/outbox are enabled only inside the test harness, not deployment config.

### Failure history retained

- Preview `20261111090817-b5364660`: outdated expectation that already-authenticated verification returns to Login; current app returns to Profile. Fixed test only.
- Preview `20261111091028-63967891`, `20261111091628-8c590e4c`: stale same-token navigation/expiry boundary. Explicitly revalidate through real API; assert requested server expiry, bounded polling for409 STATE_CONFLICT, no accept button. No clock/SQL mutation. Preview `20261111092204-b301912a` then passed before the later synchronization additions.
- Dev `20261111092651-3fbb5803`: rejoin remained on invitation page with409 observed; precise server cause not captured. Added explicit acceptance status/receipt assertion and verified removal projection before rejoining; final dev and preview pass. Do not claim a proven production root cause from the old artifact.
- Dev `20261111122935-96d08a12`, `20261111123219-22e42570`: initial navigation timeout. Standalone dev probe subsequently loaded normally; root cause unproven, not silently treated as PASS.
- Dev `20261111123616-93fe64e0`, preview `20261111124721-0a715ce3`: harness stopped before browser; second stopped between MinIO and Mailpit checks. No browser result; infrastructure check failure, not an application acceptance failure.
- Dev `20261111123748-6f4bf822`: observation poll closed dialog before async data settled. Test now waits for real API200 and loading completion before counting, retains bounded polling and all business assertions. No UI/runtime change.

Public hostname/session/email/invitation/upload and Linux systemd/reboot/backup/restore/rollback remain NOT RUN. Public release blocked until runbook gates pass. Never replace these gaps with local evidence.
