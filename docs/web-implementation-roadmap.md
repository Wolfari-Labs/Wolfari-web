# Lộ trình triển khai Wolfari Web từ Figma

Cập nhật: 14/10/2026. Lộ trình này chuyển các phân tích trong [implementation baseline](implementation-baseline.md), [domain architecture](domain-architecture.md) và tài liệu chat đính kèm thành thứ tự công việc có đầu ra và điều kiện hoàn tất. Đây là kế hoạch triển khai Web; không sửa Backend/Mobile và không thiết kế lại giao diện đã có trong Figma.

## Những điều chỉnh cần áp dụng cho Wolfari

Đoạn chat đề xuất kiểm kê Figma trước, dùng React/TypeScript/Vite, xây design tokens và làm từng màn hình. Các nguyên tắc đó phù hợp. Kế hoạch Wolfari cần điều chỉnh ở các điểm sau:

| Đề xuất trong chat | Áp dụng cho Wolfari |
| --- | --- |
| Tạo `Wolfari-frontend` nếu chưa có frontend | Repository `Wolfari-web` đã tồn tại và có README, LICENSE, docs, Git. Tiếp tục trong repository này; không tạo repository khác và không ghi đè tài liệu để chạy scaffold. |
| Dùng npm để cài dependencies | Backend đã chuẩn hóa Node.js 24 và pnpm. Web dùng package/lockfile riêng nhưng nên giữ Node/pnpm tương thích để nhóm chỉ quản lý một toolchain. |
| Dùng Axios làm API client | Baseline Web đã chọn `fetch` bọc trong client nội bộ. Dùng một transport thống nhất cho envelope, cookie/CSRF, Bearer, timeout và correlation ID; chỉ thêm Axios nếu có nhu cầu cụ thể được chứng minh. |
| Làm tất cả màn hình rồi mới tích hợp API | Có thể làm một vòng prototype giao diện trước; fixture chỉ phục vụ render/đối chiếu. Sau đó tích hợp nghiệp vụ theo từng vertical slice gồm route, API runtime, quyền, trạng thái lỗi/loading/empty và test. Không mang mock mutation sang luồng production. |
| Tích hợp toàn bộ endpoint sau khi dựng UI | Chỉ nối endpoint có Gateway route và handler đã xác nhận. Schema, ERD hoặc API catalog chưa đủ chứng minh runtime. Các màn hình phụ thuộc API tương lai được giữ trong backlog/gate, không giả lập thành công. |
| Chuyển “toàn bộ Figma” trong một prompt | Kiểm kê toàn bộ file trước; sau đó triển khai theo page/flow nhỏ và node/frame cụ thể để hạn chế bỏ sót hoặc tự suy diễn. |
| Dùng Issue/PR ngay khi dựng lại UI | Trong giai đoạn mô phỏng UI, chỉ dùng nhánh và commit như bạn yêu cầu; chưa tạo Issue/PR. Bắt đầu Issue → nhánh → PR khi chuyển sang tích hợp API Backend. |

## Nguyên tắc điều phối

1. **Figma là nguồn hình ảnh và hành vi giao diện; backend runtime là nguồn khả năng nghiệp vụ.** Nếu một frame có thao tác chưa có API, ghi lại khoảng trống và không dựng request giả.
2. **Lập bản đồ trước khi code.** Mỗi frame cần route, feature, actor/quyền, API và trạng thái UI; đánh dấu phần nào chưa xác định.
3. **Tách prototype giao diện khỏi tích hợp nghiệp vụ.** Giai đoạn UI có thể dùng fixture cục bộ để đối chiếu Figma; khi API integration bắt đầu, mỗi capability đi thành vertical slice từ route tới response thật.
4. **Tách giao diện khỏi dữ liệu.** Dùng design tokens/components cho giao diện; dùng feature API/hooks cho dữ liệu; không đặt endpoint trong component trình bày.
5. **Thiết kế theo adapter ngay từ đầu.** UI dùng domain view model và repository interface; fixture adapter phục vụ Web độc lập, Gateway adapter phục vụ tích hợp. Xem [integration-first architecture](integration-first-architecture.md).

## Ma trận tương thích Figma — Web độc lập — Backend

Web được phép triển khai độc lập bằng fixture, nhưng phạm vi tích hợp phải mở theo bằng chứng runtime của Backend. Bảng này là gate bắt buộc để tránh việc Figma có màn hình nhưng Web gọi vào endpoint chưa tồn tại.

| Nhóm trong Figma | Giai đoạn Web độc lập | Trạng thái Backend cần xác nhận trước tích hợp | Lát cắt tích hợp |
| --- | --- | --- | --- |
| Auth, Profile, session | UI + fixture đầy đủ | Gateway Identity route, refresh cookie, CSRF, Origin và `X-Client-Type: web` | Giai đoạn 4 |
| Trip list/detail/settings cơ bản | UI + fixture đầy đủ | Trip CRUD, permission projection, `plan_version`/`membership_revision`/`export_revision` và 409 conflict | Giai đoạn 5 |
| Members, Invitations | UI + one-time-link fixture | Member projection, invitation route, accept/decline/revoke/resend, lifecycle flag và quyền | Giai đoạn 5 |
| Activity/timeline | UI + fixture trạng thái | Plan snapshot, Activity CRUD/reorder/completion, version và idempotency | Giai đoạn 6 |
| Packing, selected locations, dress code | UI + projection fixture | CRUD/runtime handler riêng; hiện chỉ được coi là projection nếu Plan trả dữ liệu | Giai đoạn 6 mở theo capability |
| Travel/map/weather và DSS | UI + provider/error fixture | Gateway route, provider policy/cache, source/time/stale state và proposal Apply/version | Giai đoạn 7A |
| Finance/quỹ nhóm | UI + sandbox-labelled fixture | Fund/Holder guard, payment/webhook sandbox, ledger/closure, idempotency và Trip cross-service guard | Giai đoạn 7B |
| Price watch/notifications | UI + queued/failed fixture | Watch/scheduler/provider adapter, preference/inbox/read và cooldown/revoke behavior | Giai đoạn 7C–7D |
| Export/share/history | UI + job-state/private-file fixture | Export job, snapshot/version, private download, public share whitelist/expiry/revoke | Giai đoạn 7E |
| Admin | UI + permission/action fixture | System role, support reason, audit/projection, feature flag và provider contract; Admin không thay Holder/Owner | Giai đoạn 7F |

### Quy tắc mở gate

- `fixture` chỉ được dùng để dựng và review UI; không được dùng để tuyên bố mutation đã thành công.
- Chỉ chuyển một hàng sang tích hợp thật khi đã đối chiếu Gateway route, handler service, request/response, quyền, lỗi, version và idempotency.
- Nếu Backend chưa sẵn sàng, route UI vẫn có thể tồn tại ở trạng thái preview/unavailable, nhưng không được gọi service port nội bộ hoặc tạo API giả.
- Khi thay fixture adapter bằng Gateway adapter, view model và component không được đổi chỉ vì transport thay đổi.
- Một release Web độc lập phải ghi rõ đó là `UI preview` hay `integrated release`; không trộn hai trạng thái trong cùng một acceptance criterion.
5. **Giữ lại mọi thay đổi trong `Wolfari-web`.** Không thao tác tạo/sửa file trong backend hoặc mobile. Giữ Git history nhỏ, mỗi lát cắt review được.

## Git và công cụ làm việc theo từng giai đoạn

### Giai đoạn mô phỏng giao diện — nhánh và commit, chưa Issue/PR

- Tạo `develop` một lần từ `main` làm nhánh tích hợp phát triển. Giữ `main` cho release/production. Mỗi nhóm màn hình/flow Figma tạo nhánh từ `develop`, ví dụ `ui/auth`, `ui/trip-list`, `ui/plan-timeline`; không tạo một nhánh khổng lồ cho toàn bộ Figma.
- Commit theo thay đổi hoàn chỉnh, dễ đọc và có thể chạy lại: `feat(ui): recreate auth screens`, `style(ui): match trip workspace to figma`, `fix(ui): correct mobile navigation spacing`. Dùng Conventional Commits như quy ước commit thống nhất, không cần cài thêm công cụ để bắt buộc ngay từ đầu. Định dạng này phân biệt `feat`, `fix`, scope và mô tả trong lịch sử commit. ([specification](https://www.conventionalcommits.org/en/v1.0.0/))
- Chưa tạo GitHub Issue, Pull Request hoặc Project board cho công việc mô phỏng UI. Trước khi nhập nhánh vào `develop`, tự review diff, đối chiếu Figma, chạy `lint`/`typecheck`/`test`/`build`; merge local vào `develop` sau khi đạt. Không commit trực tiếp lên `main` hoặc `develop`.
- Có thể push nhánh để dự phòng hoặc chia sẻ; push nhánh không đồng nghĩa mở PR. Nếu dùng GitHub Actions, cho CI chạy trên `push` để phát hiện lỗi sớm dù chưa dùng PR.
- Chỉ dùng fixture có nhãn/đường dẫn dành cho preview khi cần dựng trạng thái Figma. Không mô phỏng một mutation giả như thể Backend đã lưu thành công; không đưa fixture vào production route.

### Giai đoạn tích hợp Backend — Issue, nhánh gắn Issue, PR và CI

Khi bắt đầu nối Identity/Trip/API thật, tạo Issue cho một lát cắt có acceptance criteria; link Frame Figma, route, endpoint/runtime status, quyền và các dependency Backend. Issue có thể ghi dependency cần nhóm Backend xử lý nhưng mọi thay đổi mã vẫn giới hạn trong `Wolfari-web`. GitHub Issues hỗ trợ liên kết branch/PR và theo dõi dependency giữa các việc. ([GitHub Issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues))

Quy trình mỗi lát cắt:

1. Chọn/viết Issue vừa đủ lớn để có thể nghiệm thu độc lập, ví dụ “Đăng nhập Web và refresh session”; không tạo Issue cho mỗi component nhỏ.
2. Tạo nhánh từ `develop`, gắn số Issue: `feat/42-web-auth-session`, `fix/57-trip-version-conflict`.
3. Commit nhỏ theo Conventional Commits; có thể thêm footer `Refs: #42`. Không gộp nhiều feature không liên quan vào một nhánh.
4. Mở PR vào `develop`, ghi mục tiêu/phạm vi, Issue liên quan (`Closes #42` khi PR hoàn tất đúng Issue), screenshot so với Figma, API/runtime đã xác minh, permission/version/idempotency, test đã chạy và gap còn lại.
5. CI chạy lint, typecheck, test và build. Thành viên khác review phần có thể ảnh hưởng contract/quyền; sửa feedback trên cùng nhánh và chờ check xanh rồi mới merge.
6. Merge PR, đóng Issue và cập nhật Project board. Không đóng Issue khi API dependency hoặc acceptance criteria vẫn chưa xong.

### Quy tắc Git áp dụng xuyên suốt

1. **Kiểm tra trạng thái trước khi thao tác.** Bắt đầu bằng `git status --short`; trước commit xem `git diff` và `git diff --cached`. Nếu có thay đổi chưa biết nguồn gốc, xác định chủ sở hữu trước, không ghi đè hay đưa chúng vào commit.
2. **Giữ đúng phạm vi repository.** Mọi file của công việc này phải thuộc `Wolfari-web`. Stage đường dẫn cụ thể như `git add src/features/trips/...`; không dùng `git add` ở workspace gốc. Trước commit xác nhận không có file Backend/Mobile, `.env`, token, secret, `node_modules`, `dist` hay log.
3. **Dùng đúng branch flow.** `main` là release/production; `develop` là nhánh tích hợp. Tạo `develop` từ `main` nếu chưa có, sau đó tạo `ui/<flow>`, `feat/<issue-number>-<slug>`, `fix/<issue-number>-<slug>`, `docs/<slug>` hoặc `chore/<slug>` từ `develop`. Không commit trực tiếp lên `main` hoặc `develop`.
4. **Commit nhỏ, nhất quán và có mục đích.** Mỗi commit để lại trạng thái có thể build hoặc giải thích được; tách feature, fix và format không liên quan. Dùng mẫu `<type>(<scope>): <mô tả ngắn>`, ví dụ `feat(ui): add trip list prototype` hoặc `fix(auth): handle expired refresh session`. Trong giai đoạn UI không cần mã Issue; ở giai đoạn PR, gắn `Refs: #<id>` khi hữu ích.
5. **Không viết lại lịch sử đã chia sẻ.** Không force-push, amend hoặc rebase nhánh đã push/chia sẻ nếu chưa thống nhất với người cùng làm. Không chạy `reset --hard`, `clean -fd` hay lệnh xóa/khôi phục rộng để xử lý diff chưa hiểu. Nếu cần thay lịch sử, chỉ thao tác trên nhánh riêng chưa chia sẻ và kiểm tra diff sau đó.
6. **Không bỏ qua trạng thái chưa commit.** Trước khi chuyển nhánh, commit công việc vào đúng nhánh hoặc lưu giữ có chủ đích; không checkout/merge khiến thay đổi đang làm bị lẫn sang flow khác. Khi merge nhánh UI/feature vào `develop`, kiểm tra nhánh đích và `git status` lại sau merge.
7. **Commit cấu hình có thể tái lập, không commit máy cá nhân.** Khi có `package.json`, commit pnpm lockfile cùng thay đổi dependency; `.env.example` chỉ chứa giá trị mẫu giả, `.env.local` phải được ignore. Asset Figma chỉ commit nếu là asset được phép dùng và cần cho ứng dụng.
8. **Kết thúc mỗi lát cắt bằng bằng chứng.** Ghi lại nhánh/commit đã hoàn thành và các lệnh kiểm tra đã chạy. Trước khi merge xác nhận test/build; sau merge kiểm tra `git status --short` và nội dung commit/PR.

### Checklist bắt buộc cho Issue và PR khi tích hợp Backend

Checklist này **chỉ áp dụng từ Giai đoạn 4**, khi Web bắt đầu nối Identity/Trip/API thật. Giai đoạn 0–3 không cần tạo Issue hoặc PR; chỉ cần branch ngắn, commit rõ nghĩa, self-review và kiểm tra local.

Issue tích hợp phải có đủ:

- Frame/node Figma và actor liên quan.
- Route Web và feature/component dự kiến.
- Backend route/handler/OpenAPI đã xác minh hoặc ghi rõ dependency chưa sẵn sàng.
- Acceptance criteria cho success, loading, empty, error, permission và conflict.
- Phân loại `runtime`, `partial`, `target` hoặc `unknown`.
- Dependency với Backend/Mobile và điều kiện mở gate.

PR tích hợp phải có đủ:

- Link Issue và frame Figma; dùng `Closes #<id>` chỉ khi PR thực sự hoàn thành Issue.
- Phạm vi file chỉ trong `Wolfari-web`.
- Screenshot hoặc recording đối chiếu Figma cho flow thay đổi.
- Bảng API đã dùng: method/path, request/response, auth, error, version/idempotency.
- Xác nhận fixture đã được gỡ khỏi production path hoặc adapter đã được chuyển sang Gateway.
- Kết quả `lint`, `typecheck`, `test`, `build`; E2E nếu flow đã có môi trường tích hợp.
- Gap còn lại, migration note và ảnh hưởng tới các flow khác.

### Quy tắc merge và release

- UI preview có thể merge local từ nhánh `ui/<flow>` vào `develop` sau self-review; không gọi đó là integrated release.
- Backend integration phải đi qua PR vào `develop`; không merge trực tiếp vào `main`.
- `main` chỉ nhận release đã được kiểm tra từ `develop`, không chứa secret, fixture mutation hoặc endpoint giả.
- PR tích hợp không được merge khi thiếu acceptance criteria, thiếu API/runtime evidence, CI đỏ hoặc còn conflict chưa xử lý.
- Squash merge được ưu tiên cho PR feature; giữ commit rõ nghĩa trước khi merge để dễ review và rollback.
- Sau merge, xóa branch đã hoàn tất và cập nhật Issue/Project; không xóa branch còn dependency hoặc đang được dùng để phục hồi.

GitHub mô tả PR là nơi đề xuất, thảo luận, review và chạy kiểm tra trước khi nhập thay đổi; Issues dùng để theo dõi công việc và dependency. Bảo vệ `main` bằng PR bắt buộc và status checks bắt buộc; có thể bảo vệ `develop` sau khi bắt đầu dùng PR. Không bật quy trình PR cho phase UI 0–3 nếu nhóm chưa cần. ([Pull requests](https://docs.github.com/en/pull-requests/get-started/about-pull-requests), [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches))

### Công cụ nên dùng, không cài cả bộ ngay từ đầu

| Khi nào | Công cụ | Mục đích |
| --- | --- | --- |
| Từ đầu | Git + repository `Wolfari-web` | Branch, commit, diff và history; backend/mobile vẫn ở repository riêng. |
| Kiểm kê và dựng giao diện | Figma + Figma MCP | Đọc metadata/node/frame, design context, assets và ảnh tham chiếu từng flow. |
| Bootstrap | Node.js/pnpm, React, TypeScript, Vite | Khớp baseline dự án, build SPA và proxy Gateway. |
| Dựng giao diện | React Router, CSS Modules/CSS variables, React Hook Form + Zod | Route, styling và validation theo Figma; không cần cài design-system lớn khi chưa cần. Storybook chỉ thêm nếu nhóm cần catalog/duyệt riêng nhiều component dùng chung. |
| Bắt đầu có code | ESLint + Prettier; Vitest + Testing Library | Lint/format và kiểm thử hành vi client/API quan trọng. |
| Có luồng chạy ổn định | Playwright | E2E trên trình duyệt và so sánh từng flow. |
| Từ bootstrap nếu repo có GitHub remote | GitHub Actions | Chạy `lint`, `typecheck`, `test`, `build` trên push; khi dùng PR thì yêu cầu check thành công. GitHub hướng dẫn dùng Actions để build/test Node.js project. ([Node.js CI](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)) |
| Khi bắt đầu Issue/PR | GitHub Issues + Pull Requests + Projects | Theo dõi acceptance criteria, dependency, review và trạng thái Backlog/Ready/In progress/Review/Done. Dùng automation Projects sau khi board đã có các việc thực tế, tránh dựng workflow rỗng. ([Projects best practices](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/best-practices-for-projects)) |
| Sau khi có dependencies ổn định | Dependabot | Nhận PR đề xuất cập nhật dependency; review changelog và chạy CI trước khi merge. Bắt đầu với lịch tuần, không bật cập nhật tự động hàng ngày gây nhiễu lúc bootstrap. ([Dependabot version updates](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-version-updates)) |

GitHub Actions chỉ là kiểm tra tự động; ở giai đoạn UI không PR, người phát triển vẫn tự review trước khi merge local. Khi đã dùng PR, status check thành công mới là điều kiện merge trên `main` nếu branch protection được bật. ([status checks](https://docs.github.com/en/pull-requests/reference/status-checks))

## Giai đoạn 0 — Kiểm kê Figma, API và luồng người dùng

**Mục tiêu:** biến file Figma và ba baseline kỹ thuật thành danh sách phạm vi Web có thể ước lượng.

**Công việc:**

- Dùng Figma MCP để đọc metadata, Page/Frame/node ID và quan hệ prototype. Sau đó lấy design context và ảnh tham chiếu cho các frame theo từng flow; không cần kéo mọi screenshot vào một lần.
- Ghi lại token/asset có sẵn, typography, variants, breakpoint, trạng thái hover/focus/disabled/loading/empty/error, component lặp lại và liên kết giữa các frame.
- Đối chiếu từng hành động với Gateway route, OpenAPI, handler và quyền. Gắn nhãn `runtime`, `partial`, `target` hoặc `unknown` theo tài liệu; không suy ra API từ tên màn hình.
- Chốt route web kỹ thuật và actor cho từng flow; đánh dấu Guest, User, Owner, Member, Plan Editor, Holder, Admin và capability tương ứng.
- Ghi câu hỏi còn thiếu như màn hình không có frame mobile, response thiếu display name, hoặc thao tác trong Figma chưa có backend contract.

**Đầu ra:** `docs/figma-screen-map.md` hoặc bảng tương đương được cập nhật trong tài liệu bàn giao, gồm tối thiểu:

Bộ tài liệu hiện tại được duy trì tại [screen inventory](screen-inventory.md), [flow map](flow-map.md), [screen contracts](screen-contracts.md), [state matrix](state-matrix.md) và [Figma implementation matrix](figma-implementation-matrix.md). Đây là input bắt buộc cho mọi flow mới; không bắt đầu triển khai chỉ từ screenshot hoặc tên frame đơn lẻ.

| Page / Frame / node ID | Flow và actor | Route Web | Feature/component | API cần dùng + trạng thái | States/responsive | Câu hỏi còn mở |
| --- | --- | --- | --- | --- | --- | --- |

**Hoàn tất khi:** các màn hình MVP và các frame dùng chung đều được kiểm kê; không còn endpoint nào được gắn nhãn runtime chỉ dựa trên SRS/ERD/API catalog. Danh sách capability chưa chạy được đưa vào backlog có gate.

## Giai đoạn 1 — Khởi tạo an toàn trong repository hiện có

**Mục tiêu:** tạo nền build/test mà không làm mất tài liệu hoặc đổi cấu trúc repository.

**Công việc:**

- Kiểm tra `git status`, README, docs và cấu hình trước khi tạo source. Scaffold React + TypeScript + Vite bên trong `Wolfari-web` bằng thay đổi được review; không dùng lệnh force hoặc ghi đè file hiện có.
- Chốt Node/pnpm theo baseline đã chọn; tạo `package.json`, pnpm lockfile và `.node-version`/cấu hình tương ứng. Không dùng chung `node_modules` hoặc lockfile với backend.
- Tạo TypeScript strict, Vite SPA, lint/format, `typecheck`, `test`, `build`; thêm Playwright khi có host API test ổn định.
- Cấu hình dev server `127.0.0.1:5173` và proxy `/api/v1` tới Gateway `127.0.0.1:3000`; biến public mặc định chỉ cần API base path, không nhúng secret.
- Tạo app shell, router, error boundary, QueryClient và API client chưa chứa logic feature.

**Đầu ra:** app khởi chạy/build được, route fallback hoạt động, proxy cùng origin hoạt động khi backend chạy; README chỉ rõ cách cài/chạy/test.

**Hoàn tất khi:** lint/typecheck/test/build nền đều chạy được và diff chỉ thêm source/config trong Web, không ghi đè docs hiện có.

## Giai đoạn 2 — Design tokens, assets và component nền

**Mục tiêu:** chuyển ngôn ngữ thị giác từ Figma thành lớp dùng chung, không tự sáng tác lại UI.

**Công việc:**

- Chuyển màu, typography, spacing, radius, shadow và breakpoint từ Figma thành CSS custom properties; lưu nguồn Figma/node để truy vết.
- Lấy logo, font và asset gốc theo quyền truy cập/định dạng phù hợp; tránh vẽ lại icon đã có trong bộ asset.
- Tạo primitive và layout được lặp lại thật sự trong Figma: Button, Input, Select, Dialog/Drawer, Toast/Alert, loading/empty/error, app shell và navigation.
- Kiểm tra trạng thái focus/keyboard và các viewport desktop/tablet/mobile có trong thiết kế.
- Tránh tạo cả thư viện UI tổng quát khi chỉ mới thấy một màn hình; chỉ trừu tượng hóa component khi có nhiều trường hợp dùng xác nhận.

**Đầu ra:** token file, asset map, component nền và một trang/sandbox kiểm tra trực quan đối chiếu Figma.

**Hoàn tất khi:** các thành phần nền khớp Figma và có trạng thái responsive; thay đổi token không làm lệch các component dùng chung.

## Giai đoạn 3 — Mô phỏng giao diện từ Figma, chưa tích hợp API

**Mục tiêu:** hoàn thành phần tái hiện giao diện trong phạm vi Figma để duyệt trực quan trước khi xử lý hợp đồng Backend.

**Công việc:**

- Triển khai theo flow/page đã kiểm kê; mỗi flow trên một nhánh `ui/<flow>` và commit theo phần giao diện hoàn chỉnh. Giai đoạn này không tạo Issue/PR.
- Dùng fixture cục bộ, tập trung trong `src/mocks/` hoặc vùng preview tương đương và chỉ bật trong development. Mô hình fixture chỉ phục vụ render các trạng thái mẫu, không được coi là DTO/backend contract.
- Làm điều hướng, tab, modal, form input và trạng thái trình bày có thể mô phỏng an toàn. Với thao tác cần lưu dữ liệu thật, gắn nhãn preview/chưa tích hợp hoặc giữ disabled; không hiển thị thông báo “đã lưu” giả.
- Đối chiếu frame desktop/tablet/mobile, typography, token, asset và responsive; kiểm tra loading/empty/error/disabled theo thông tin có trong Figma hoặc screen map. Trên mobile web, trip navigation dùng drawer ẩn/hiện từ cạnh trái; không dùng bottom tab hoặc mô hình điều hướng kiểu native app.
- Giữ API client chưa kết nối feature hoặc dùng adapter tách riêng; tuyệt đối không đặt dữ liệu fixture trong lớp API production.

**Hoàn tất khi:** các frame thuộc scope UI prototype đã được đối chiếu và review; fixture dễ nhận biết, không bị import vào production API flow; lint/typecheck/test/build đạt. Review/merge bằng nhánh và commit, không cần Issue/PR.

## Giai đoạn 4 — Guest và Identity tích hợp thật

**Mục tiêu:** hoàn tất một lát cắt dùng được từ public entry đến session Web.

**Thứ tự màn hình:** public/landing nếu có trong Figma; login/register; verify/reset email; profile/session nếu cần cho MVP.

**Tích hợp:**

- Dùng đúng Identity Web flow trong implementation baseline: access token chỉ ở memory, refresh cookie HttpOnly, CSRF, `Origin` và `X-Client-Type: web` theo contract.
- Xử lý verification/reset/invitation URL riêng theo reverse-proxy routing đã mô tả; không để token một lần lọt vào query cache/log/persistent storage.
- Không đưa Google login lên giao diện có thể gửi request nếu Identity Web OAuth handler/contract chưa được xác nhận.

**Hoàn tất khi:** flow thành công, validation, lỗi xác thực, hết phiên, reload/refresh và logout được kiểm tra; so khớp các frame Figma và không lưu token trong storage trình duyệt.

## Giai đoạn 5 — Trip Workspace và collaboration hiện có

**Mục tiêu:** người dùng đăng nhập có thể bắt đầu và điều hướng Trip theo đúng API runtime.

**Thứ tự lát cắt:**

1. Trip list/loading/empty/error và điều hướng detail.
2. Tạo Trip với `client_request_id`, chi tiết và cập nhật metadata có version.
3. Invitation create/preview/accept/decline/revoke/resend, bao gồm xử lý secret link một lần.
4. Member projection và Plan policy; hiển thị rõ giới hạn dữ liệu nếu API chưa trả profile.

**Hoàn tất khi:** quyền Owner/Member và lỗi 404/409/503 thể hiện đúng; timeout mutation không tạo ý định mới; lifecycle leave/remove đang bị tắt mặc định không được mở bằng nút UI tưởng như khả dụng.

## Giai đoạn 6 — Plan core và các năng lực phụ thuộc

**Mục tiêu:** hoàn thiện timeline theo runtime, rồi mở rộng nội dung Plan theo độ sẵn sàng API.

- **Activity:** đọc snapshot, create/edit/delete/reorder/completion theo `plan_version`, idempotency và ma trận quyền. Đối chiếu Figma cho timeline/list/calendar và các trạng thái.
- **Selected locations / map:** chỉ triển khai CRUD/search khi API Trip/Travel tương ứng hoạt động; giữ provider source/time và snapshot thuộc Trip. Provider lỗi vẫn cho xem Plan đã lưu.
- **Dress code / Packing:** triển khai theo CRUD runtime; packing phải tách chỉnh cấu trúc/phân công khỏi trạng thái Self của assignee, giữ lịch sử và rule reset TODO khi reassignment.
- **DSS:** sau Travel/Trip orchestration; preview không ghi, Apply kiểm tra proposal còn hiệu lực và Plan version. Không biến recommendation thành dữ liệu đã áp dụng trước khi server xác nhận.

**Hoàn tất khi:** mỗi capability được mở bằng API gate riêng và test quyền/version riêng; phần chưa có handler hiển thị unavailable hoặc chưa được đưa vào release.

## Giai đoạn 7 — Các miền mục tiêu khi backend sẵn sàng

Triển khai từng miền độc lập, sau khi các điều kiện dưới đây được kiểm chứng ở Gateway và service:

| Thứ tự | Miền | Điều kiện mở trước khi code API thật |
| --- | --- | --- |
| 6A | Travel và DSS nâng cao | Place/route/weather API, provider policy/cache, recommendation preview/apply contract, permission và version đã có runtime. |
| 6B | Finance | Fund/Holder guard, contribution/payment/webhook sandbox, idempotency/receipt, state/operation/recovery, ledger/refund/closure và Trip cross-service guard đã tích hợp test. |
| 6C | Notifications/reminders | Preference/inbox/read API, source revision, kiểm tra membership trước dispatch và trạng thái delivery rõ. |
| 6D | Price watch | Watch API, scheduler/query grouping/provider adapter, cooldown/revoke/leave/archive behavior đã xác nhận. |
| 6E | Export/share/history | Snapshot/version, private file download/re-authorize, public whitelist/password/revoke/cache, history projection đã hoạt động. |
| 6F | Admin | System role, cấu hình không bí mật, support reason, service audit/projection; không có thao tác tài chính thay Holder. |

**Hoàn tất từng miền khi:** có ít nhất một luồng end-to-end đọc/ghi thực với quyền đúng; lỗi và trạng thái pending rõ; test tích hợp liên quan chạy được. Các miền độc lập không cần chờ tất cả hoàn thành mới được phát hành.

## Giai đoạn 8 — Đối chiếu Figma, bảo mật và nghiệm thu

**Công việc:**

- Với từng flow, so sánh trên browser ở viewport thiết kế; kiểm tra desktop/tablet/mobile, keyboard/focus, loading/empty/error/permission state.
- Chạy unit/component cho API parser, schemas và tương tác; E2E cho luồng end-to-end đã mở runtime.
- Tập trung các kịch bản ảnh hưởng Web: refresh cookie/CSRF, retry idempotent, Plan version conflict, quyền sau leave/revoke, payment trạng thái chưa xác nhận, download sau revoke/leave, Finance sandbox label.
- Kiểm tra request same-origin, CSP/security headers theo hosting, không log token/PII, không có secret trong `VITE_*`, object private không bị cache/public.
- Đo Web load/render tách biệt backend/provider latency; nghiệm thu NFR toàn hệ thống cần số liệu và cấu hình đo đúng SRS, không lấy build PASS làm bằng chứng hiệu năng.
- Kiểm tra production route fallback SPA và proxy `/api/v1`; xác minh domain/HTTPS/cookie/WEB_ORIGIN trước release.

**Hoàn tất khi:** kiểm thử của các feature trong release đạt, Figma comparison được review, build tạo static artifact; mọi tính năng chưa có runtime được loại khỏi luồng tương tác phát hành.

## Nhịp thực hiện cho mỗi Frame hoặc flow

1. Chọn một flow nhỏ và frame/node ID cụ thể; Codex đọc Figma context/screenshot đúng phần đó.
2. Đọc API runtime/contract của flow; ghi rõ actor, permission, request, response, version/idempotency và giới hạn chưa hỗ trợ.
3. Xác định component dùng chung trước khi tạo mới; giữ route/feature/API tách lớp.
4. Dựng frame và trạng thái tương tác/loading/empty/error; lấy dữ liệu thật nếu API runtime đã có.
5. Chạy kiểm tra phù hợp, mở browser và đối chiếu ảnh Figma; sửa sai lệch trước khi mở flow tiếp theo.
6. Trong UI prototype, review diff và commit trên nhánh; khi tích hợp API, dùng Issue/PR/checklist theo quy trình Git ở trên. Không để một prompt tạo toàn bộ pages/components.

## Thứ tự ưu tiên và điểm bắt đầu

**P0 — chuẩn bị:** cung cấp đường dẫn file Figma hoặc project key để kiểm kê frame; hoàn thành Giai đoạn 0, xác nhận screen map/API map và các câu hỏi còn mở. Chưa cần viết UI trong bước kiểm kê này.

**P1 — nền và prototype giao diện:** Giai đoạn 1–3; mô phỏng Figma bằng nhánh/commit, chưa tạo Issue/PR.

**P2 — API integration đầu tiên:** dùng quy trình Issue → branch → PR cho các capability runtime ở Giai đoạn 4–6; ưu tiên Identity, Trip/collaboration và Activity.

**P3 — mở rộng theo backend:** phần còn lại của Plan và các miền mục tiêu ở Giai đoạn 6–7 theo feature gates; mỗi lát cắt có Issue/PR sau khi API runtime sẵn sàng.

**P4 — phát hành:** Giai đoạn 8, chỉ sau khi domain/origin/TLS và API của phạm vi release đã được kiểm tra.

Đầu ra đầu tiên nên là screen map Figma → route → feature/component → API/status. Sau khi bảng này được duyệt, bắt đầu bootstrap trong repository `Wolfari-web`; không tạo thêm repository frontend.
