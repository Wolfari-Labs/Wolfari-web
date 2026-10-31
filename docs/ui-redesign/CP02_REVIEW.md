# CP-02 — Hồ sơ review từng phần

Ngày30/10/2026. **Hồ sơ review lịch sử — CP02 APPROVED/DONE theo D21, giữ exceptions D19/D20.** [Nghiệm thu](CP02_ACCEPTANCE.md) ghi D18 layouts và D19 visual-QA waiver. Bảng dưới giữ mức bằng chứng thực tế, không biến chưa verify thành PASS. D21 đã mở [CP03](checkpoints/CP-03.md); các câu STOP phía dưới chỉ là lịch sử đóng D20. Phạm vi Web; branch `draft/demo-ui-ux`, HEAD `dc99219241c4cf36d0952115fc93f646d4fc1581`.

## 1. Kết quả đã có thể kiểm tra

| Deliverable | Kết quả / giới hạn | Hồ sơ |
|---|---|---|
| W01–W03 | COMPLETE: scope, IA/journeys, source mapping22 routes. Không khảo sát lại toàn file, không thay thiết kế nguồn. | [UX architecture](UX_ARCHITECTURE.md), [Source map](SOURCE_MAP.md) |
| W04-A / W05-A | DONE_SPEC: Plan main/pool/day-map, editor fields,17 state/event rows; bổ sung nguồn centered editor26:406-A. | [Plan](PLAN_SPEC.md), [4 ảnh nguồn](evidence/cp02/figma-plan-review-2026-10-30/README.md) |
| W04-B / W05-B | DONE_SPEC: Home guest/user, Login/Register và recovery,13 state rows; Web402/menu source. | [Home/Auth](HOME_AUTH_SPEC.md), [6 ảnh nguồn](evidence/cp02/figma-home-auth-review-2026-10-30/README.md) |
| W04-C / W05-C | DONE_SPEC: Fund TEST/manual, fields/roles/contribution/history,18 state rows. | [Fund](FUND_SPEC.md) |
| W04-D / W05-D | DONE_SPEC: Members/invite/policy/recipient,23 state rows;4 cơ chế async tách biệt. | [Members](MEMBERS_SPEC.md), [Fund/Members evidence](evidence/cp02/figma-fund-members-review-2026-10-30/README.md) |
| W05-E | DRAFT_FOR_REVIEW: route gaps/Trip creation,22-route ownership, tokens/components/motion/contrast và performance proposal. | [Route gaps](ROUTE_GAPS_SPEC.md), [Foundations](FOUNDATIONS_HANDOFF.md) |
| W04-E/W05-F | Bản nháp D18 Plan/editor/Fund/Price/menu; typecheck riêng PASS, visual QA được miễn D19. | [QA disposition](evidence/cp02/layout-review/design-qa.md) |
| W06 | COMPLETE: final acceptance theo D20 với ngoại lệ D19. | [Nghiệm thu](CP02_ACCEPTANCE.md) và [checkpoint](checkpoints/CP-02.md) |

DONE_SPEC nghĩa là đã ghi đặc tả để review, không phải các màn hình đã được thiết kế trực quan đủ mọi state hoặc đã triển khai. Không cộng số state giữa các domain thành số test PASS.

## 2. Đối chiếu Definition of Done

Theo [MASTER_PLAN §4](MASTER_PLAN.md):

| Gate | Hiện trạng | Còn cần trước khi nghiệm thu CP02 |
|---|---|---|
| Canonical Web references, source-first | DONE_SPEC: W03 map22 routes; không dùng ba ảnh AI cũ. | Review cách biểu diễn các vùng nguồn vượt khả năng runtime. |
|22 routes + cross-route gaps có owner | DONE_SPEC: Route gaps §7; inbox/overlays/shell không tạo route mới. | Không cần lập lại roadmap. |
| Ít nhất4 journeys + member recipient | DONE_SPEC: Auth, Trip create, Plan edit, Fund contribution, invitation recipient. | Review compositions cho error/permission/conflict/recovery, không chỉ prose. |
| Fields/actions/components → contracts | DONE_SPEC: family matrices và Foundations. | Giữ các đề xuất chưa duyệt; không hợp nhất async mechanisms hoặc mở Backend features. |
| Responsive1440/402;320/768/820/short-height | SPEC/DRAFT_ONLY; thiếu captured comparisons. Visual QA CLOSED / WAIVED_BY_USER D19. | Nghiệm thu hiện trạng theo D20; không full-state/viewport PASS. Implementation quality gates giữ nguyên. |
| Tokens/type/elevation/icon/motion/a11y | SPEC_ONLY / PENDING_REVIEW. Có mapping và7 cặp contrast số; chưa full state/gradient proof. | Chốt font, component-specific color adjustments, motion/reflow và PERF01; giữ đúng assets. |
| Capture + review + approval | Source inspected; proposed-state comparison NOT_RUN; gate WAIVED_BY_USER D19. | D20 đóng CP02 với ngoại lệ, không tự mở CP03. |

## 3. Những lựa chọn cần review trước compositions tiếp theo

Ba bố trí đầu bảng đã được D18 duyệt: centered Plan editor + đủ fields; Fund/Price right→below form; source header/menu. Bảng giữ nội dung đã trình để truy vết, không hỏi duyệt lại3 bố trí. Các phương án khác vẫn là proposal chưa áp dụng. [DESIGN_DELTAS](DESIGN_DELTAS.md) là register quyết định. D19/D20 đóng checkpoint với ngoại lệ, không mặc định approve mọi token/motion/content delta.

| Điểm cần chốt | Nguồn và current code | Phương án đề nghị / ảnh hưởng |
|---|---|---|
| Plan editor — PLN08 | [Board26:406, phần A](evidence/figma-official/26-406.png) có modal giữa màn hình; Gateway hiện right Drawer với nhiều fields hơn. | Ưu tiên modal nguồn: name → schedule → location; thêm type, descriptions và end-date đúng contract, scroll phần thân khi thiếu chiều cao. Nếu muốn giữ Drawer hiện tại, cần ghi rõ đó là delta. Cả hai phải giữ draft, focus/return, conflicts và unknown. |
| Fund/Price form — FND03, XRT05 | Source có vùng form phải; runtime dùng Drawer/stacked panels. | Ưu tiên form bên phải trên desktop và dưới nội dung trên Web hẹp theo source. Giữ mọi setup/destination/recovery/UTC fields; việc đóng form không hủy request. Giữ Drawer là lựa chọn khác nguồn cần xác nhận riêng. |
| Header/menu — HMA04, DLT03 | Source Web402 logo trái/Menu phải; runtime hamburger trái/logo giữa/account phải. | Bám header/menu nguồn, giữ notification/account access và phân biệt public/trip navigation. Không compact banner/sidebar mới mặc định. |
| Dữ liệu và controls chưa hỗ trợ — PLN02–05, HMA01–03, FND01/02/04/06, MBR01/02/04, XRT01/03/04/06/07 | Nguồn chứa presence/travel-time, share/transfer, destination, real-money/provider hoặc controls khác runtime. | Giữ hierarchy/section order; dùng dữ liệu thật, nhãn đúng và giải thích tại vùng chưa hỗ trợ. Required form fields vẫn hiện. Chi tiết từng vùng ở family specs; không duyệt chung việc xóa mọi vùng thiếu dữ liệu, không mở API để khớp ảnh. |
| Font/contrast — DLT04/05, PLN06 | Caveat nguồn vs Patrick Hand runtime; một số màu chữ nguồn trên trắng dưới4.5:1. | Ưu tiên font nguồn sau asset/license check; màu chữ/control được điều chỉnh riêng khi cần đọc rõ, không đổi toàn palette. Cần visual comparison trên đúng background/states trước chốt giá trị. |
| Missing states/reflow/motion — DLT08/09, HMA05, PLN07, FND05, MBR05, PERF01 | Chưa đủ dedicated source cho recovery/unknown/narrow/short-height; motion timings mới không lấy từ Figma. | Mở rộng trong cùng component family và giữ existing behavior; không thêm decorative workspace motion. Performance thresholds là proposal ở Foundations, không đo hoặc enforce trong CP02. |

Không thể tự chọn vị trí editor/form hoặc đổi font/màu chỉ dựa vào approval “tiếp tục CP02”. Review có thể theo từng nhóm/ID; mục chưa quyết định vẫn DELTA_PENDING. Không coi im lặng là approval. DLT06 light/dark vẫn chưa quyết định sản phẩm; các artifacts hiện tại chỉ tham chiếu light source.

## 4. Bằng chứng và kiểm tra

- Nguồn chính thức: https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace. Giữ CP01 inventory và invalidated evidence; không sửa/xóa lịch sử khảo sát code/Backend.
- Có14 ảnh nguồn bổ sung CP02:4 Plan,6 Home/Auth,4 Fund/Members; tách khỏi18 ảnh nguồn CP01 và6 ảnh runtime baseline HTTP-mock. Source screenshots không phải ảnh implementation hoặc kết quả runtime QA.
- `node docs/ui-redesign/evidence/verify-inventory.mjs`: kiểm tra inventory counts/route matrix/local links và6 baseline hashes. Kết quả cuối lượt được ghi ở STATE/checkpoint; verifier không kiểm tra visual fidelity hoặc sự đúng đắn mọi câu trong spec.
- Kết quả W06-A30/10: PASS31 Markdown/232 local links/22 routes;7.239 frames/175 components/17 sets/167 screen records/257 variables/5 collections và6 baseline hashes unchanged. Scan31 Markdown strict UTF-8 PASS; không replacement characters/trailing whitespace/conflict markers. Branch/HEAD unchanged, tracked diff rỗng.
- Git HEAD/status/no-source-diff được xác minh; toàn bộ AGENTS/docs đang untracked. `git diff --check` chỉ kiểm tra tracked diff, không chứng minh whitespace tài liệu mới; cần scan riêng UTF-8/whitespace.
- Application lint/typecheck/unit/build/E2E, browser/zoom/screen-reader, performance và live Backend: **NOT_RUN trong lượt CP02 này**. Không cần chạy lại mutation journeys để kiểm tra tài liệu.
- CP01 kế thừa: lint/typecheck/build PASS;545 unit PASS; fixture158 PASS/8 FAIL; Gateway HTTP-mock47 PASS/4 FAIL; live Backend NOT_RUN. Không đổi12 baseline failures hoặc dùng kết quả lịch sử khác làm nghiệm thu mới.
- Không sửa application/Backend/dependencies, canvas Figma; không commit/push/deploy hoặc mở CP03.

## 5. Handoff trong CP02

Next action chính xác: STOP sau CP02 COMPLETE; chờ explicit approval trước CP03. Không hỏi duyệt lại D18 hoặc chạy lại visual QA CP02 đã miễn.

Theo [MASTER_PLAN §5](MASTER_PLAN.md), [D19/D20](DECISIONS.md) và [AGENTS](../../AGENTS.md), checkpoint đã đóng bằng explicit approval với ngoại lệ. Không tự cấp quyền ghi official Figma hoặc bắt đầu application implementation; các hành động đó cần scope riêng.
