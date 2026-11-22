# Wolfari Web V2 — Master Implementation Plan

Ngày lập: 21/11/2026. Nguồn yêu cầu: kế hoạch "Wolfari Web V2 – Master Plan & Autonomous Implementation" của nhóm.

Phạm vi sửa: **chỉ Wolfari-web**. Wolfari-backend (`feat/poi-overture`) chỉ đọc để đối chiếu contract.

## 1. Trạng thái nguồn (đã kiểm tra)

| Nguồn | Giá trị | Ghi chú |
|---|---|---|
| Web `origin/develop` | `62ea04c` (PR #29 web-integration-completion) | Nền của nhánh A |
| Web POI có sẵn | `origin/feat/poi-overture-web` `5afb307` (thepiece27, 12 commit) | Tách từ develop cũ `d9d2035`; thiếu ~30 commit của develop |
| Backend POI | `origin/feat/poi-overture` `ef266df` | Đã gồm merge main `0329c2a` |
| Figma V2 | file `hdy2sOZk6rfjKXKDJ9HW9y`, node `930-6658` | **BLOCKED**: phiên hiện tại không có Figma MCP/token. Inventory cũ (29/10, `docs/ui-redesign/FIGMA_INVENTORY.md`) không chứa node V2 |

## 2. Chiến lược nhánh

| Nhánh | Tạo từ | Nội dung | Push |
|---|---|---|---|
| A `feat/web-poi-integration` | `origin/develop` `62ea04c` | Merge `origin/feat/poi-overture-web` (giữ lịch sử/tác giả), giải conflict, căn contract backend POI, kiểm thử | Người dùng tự push sau nghiệm thu |
| B `feat/web-v2-figma-redesign` | commit nghiệm thu của A | Redesign theo Figma V2 | Không push |

Quy ước commit: commit local dưới tên người dùng, không có dòng tác giả/công cụ AI. Không merge vào develop/main, không force push, không tạo PR.

## 3. Phase và tiêu chí

| Phase | Mục tiêu | Phụ thuộc | Kiểm thử bắt buộc | Trạng thái |
|---|---|---|---|---|
| A0 Audit | Khảo sát Web/Backend POI, lập matrix | — | — | DONE (xem [POI_INTEGRATION.md](POI_INTEGRATION.md)) |
| A1 Branch | Tạo worktree/nhánh A từ develop | A0 | `git status`, base commit | DONE |
| A2 Integration | Merge nhánh POI Web, giải 40 file conflict, căn contract | A1 | typecheck, lint | TESTED |
| A3 Testing | lint, typecheck, unit, build, E2E fixture + Gateway HTTP-mock | A2 | Toàn bộ suite | TESTED (mock/fixture; backend thật NOT_RUN — [báo cáo](POI_TEST_REPORT.md)) |
| A4 Commit | Merge commit + docs commit; người dùng push | A3 | `git log`, diff | COMMITTED local, chờ người dùng push |
| B0 Branch V2 | Tạo nhánh B từ commit A đã nghiệm thu | A4 push xác minh | — | TODO |
| B1 Figma | Kiểm kê W01–W22, A00–A06, tokens, components (Node ID thật) | Figma MCP | — | BLOCKED (Figma) |
| B2 Mapping | Figma-to-Code mapping | B1 | — | BLOCKED |
| B3–B10 | Tokens → components → shell → màn hình → responsive → visual diff → regression → final audit | B2 | Theo từng phase | BLOCKED |

Critical path: A2 → A3 → A4 (người dùng push) → B0 → B1 (cần Figma) → B2 → B3 → B4 → B5 → B6 → B8 → B9 → B10.

## 4. Quy tắc bảo toàn

- Giữ routes, guards, query keys, session/CSRF, idempotency, `expected_plan_version`, cursors, trạng thái nghiệp vụ.
- Finance/Payment/Price Watch: logic và decoder theo develop (phần mới hơn, đã merge PR #26–#29).
- POI/Map: chức năng theo nhánh POI (Overture, Geoapify, bbox explore, clusters, DnD lưu backend, "Thêm vào ngày", OSRM).
- Không tuyên bố PASS với backend thật khi chỉ chạy fixture/HTTP-mock.

## 5. Test plan (nhánh A)

1. `pnpm lint`, `pnpm typecheck`.
2. `pnpm test` (Vitest unit/component, gồm places-*, plan-*, finance-*).
3. `pnpm build`, `pnpm build:preview`.
4. `pnpm test:e2e` (Preview fixture) và `pnpm test:e2e:gateway` (Gateway HTTP-mock).
5. Live backend POI: chỉ khi có môi trường backend `feat/poi-overture` chạy được; nếu không ghi NOT_RUN.

## 6. Risk register

| ID | Rủi ro | Tác động | Xử lý |
|---|---|---|---|
| R1 | Declutter UI của nhánh POI (5afb307) chồng lên thiết kế develop mới hơn | Layout/E2E hình học lệch | Ưu tiên cấu trúc develop cho Finance/Overview; chạy E2E để phát hiện |
| R2 | Không có Figma V2 | Không thể làm B1–B10 đúng Node ID | Dừng nhánh B đến khi kết nối Figma MCP |
| R3 | Backend dev DB đã áp migration POI cần reset | Live test sai | Ghi NOT_RUN nếu chưa có môi trường sạch |
| R4 | E2E Web flaky khi máy tải nặng | Kết quả giả FAIL | Chạy lại riêng lẻ trước khi kết luận |
