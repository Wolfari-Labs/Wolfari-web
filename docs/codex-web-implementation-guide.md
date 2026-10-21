# Hướng dẫn triển khai Web bằng Codex

## Mục đích

Tài liệu này hướng dẫn Codex triển khai `Wolfari-web` độc lập theo Figma, nhưng giữ kiến trúc sẵn sàng tích hợp Backend về sau. Codex phải làm theo từng phase nhỏ, kiểm tra sau mỗi phase và không tự suy diễn API chưa có runtime.

## Phạm vi được phép thay đổi

Chỉ được sửa các file trong repository `Wolfari-web`.

Không được sửa:

- `Wolfari-backend/`.
- `Wolfari-mobile/`.
- File `.env` hoặc secret.
- Tài liệu hiện có nếu không cần thiết cho task.
- Figma gốc.

## Nguồn sự thật

Đọc theo thứ tự:

1. `README.md`.
2. `docs/implementation-baseline.md`.
3. `docs/domain-architecture.md`.
4. `docs/web-implementation-roadmap.md`.
5. `docs/integration-first-architecture.md`.
6. Figma file: `https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-%C2%B7-Travel-Workspace?node-id=194-1073&p=f`.
7. Backend runtime tại `../Wolfari-backend/` chỉ để đối chiếu, không sửa.

Ưu tiên runtime Gateway/service và OpenAPI hiện tại hơn SRS/ERD/API catalog khi xác định API đã dùng được.

## Kiến trúc bắt buộc

```text
Figma
  → route/page
  → feature hook/use-case
  → domain view model
  → repository interface
      ├─ fixture repository
      └─ Gateway repository
```

Component không được biết fixture hay HTTP. Component không được tự gọi `fetch`, ghép URL, gắn Bearer token hoặc đọc raw Gateway envelope.

## Các phase triển khai

### Phase 0 — Kiểm kê

- Đọc các tài liệu nguồn.
- Kiểm tra Git status.
- Đọc Figma page/frame/layer và lập screen map.
- Ghi actor, route, feature, trạng thái UI và Backend status.
- Không code nếu chưa xác định flow đang làm.

Đầu ra: screen map hoặc cập nhật `docs/figma-screen-map.md`.

### Phase 1 — Bootstrap

- Tạo React + TypeScript strict + Vite.
- Tạo app shell, router, providers, error boundary.
- Tạo lint, typecheck, test, build.
- Tạo CSS tokens và global styles.
- Giữ package/lockfile riêng cho Web.

Kiểm tra bắt buộc:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Phase 2 — Design system

- Chuyển token từ Figma thành CSS custom properties.
- Tạo component dùng chung thực sự xuất hiện trong nhiều frame.
- Hỗ trợ loading, empty, error, disabled và focus state.
- Kiểm tra desktop/tablet/mobile.

Không tạo UI kit lớn nếu Figma chưa chứng minh cần dùng.

### Phase 3 — UI preview bằng fixture

- Dựng từng flow nhỏ theo Figma.
- Tạo domain model và repository interface trước component.
- Tạo fixture scenarios: success, loading, empty, forbidden, not-found, conflict, unavailable.
- Không giả lập mutation đã lưu thành công.
- Có thể dùng branch `ui/<flow>` và commit; chưa cần Issue/PR.

### Phase 4 — Tích hợp Backend

Chỉ bắt đầu khi Gateway route và handler đã được xác minh.

- Tạo Issue có acceptance criteria.
- Tạo branch gắn số Issue.
- Viết Gateway repository adapter.
- Giữ nguyên domain model/component nếu có thể.
- Đối chiếu auth, permission, error, version và idempotency.
- Mở PR và chờ CI/review.

Thứ tự ưu tiên: Auth/Profile → Trip → Members/Invitations → Plan Activity.

### Phase 5 — Mở rộng theo Backend gate

Chỉ tích hợp Packing, Travel, DSS, Finance, Price Watch, Export/Share và Admin khi contract/runtime tương ứng đã có. Nếu chưa có, giữ ở fixture hoặc `unavailable`.

## Quy tắc Figma

Mỗi frame phải được ghi nhận:

| Trường | Nội dung |
|---|---|
| Frame/node | Tên hoặc URL node Figma |
| Actor | Guest/User/Owner/Member/Plan Editor/Holder/Admin |
| Route | URL Web dự kiến |
| Feature | Domain sở hữu |
| Data mode | fixture/gateway |
| Backend status | runtime/partial/target/unknown |
| States | loading/empty/error/permission/conflict |
| Open questions | Vấn đề chưa xác định |

Nếu không đọc được Figma, Codex không được tự bịa spacing, màu, text, asset hoặc interaction.

## Quy tắc Git

Khởi tạo branch flow một lần:

```powershell
git status --short
git switch main
git switch -c develop
git push -u origin develop
git switch -c ui/app-shell
```

Nếu `develop` đã tồn tại thì dùng:

```powershell
git switch develop
git switch -c ui/app-shell
```

Không chạy các lệnh trên nếu đang có thay đổi chưa rõ nguồn gốc hoặc branch hiện tại chưa được xác định.

### Nếu lỡ tạo branch UI từ `main`

Không cần xóa branch, reset hoặc tạo lại commit. Xử lý theo thứ tự:

1. Kiểm tra trạng thái và commit hiện tại:

```powershell
git status --short
git log --oneline --decorate --graph --all -n 20
```

2. Nếu branch `ui/<flow>` chưa có thay đổi chưa commit và `develop` chưa tồn tại, tạo `develop` từ `main`:

```powershell
git switch main
git switch -c develop
```

Nếu `develop` trỏ cùng commit mà branch UI đã dùng làm base, branch UI không cần rebase; về lịch sử nó đã cùng nền với `develop`.

3. Nếu `develop` đã có commit mới hơn branch UI, cập nhật UI branch bằng `git merge develop` hoặc `git rebase develop` chỉ khi branch chưa được chia sẻ. Với branch đã push/chia sẻ, ưu tiên `git merge develop` để không viết lại lịch sử.

4. Nếu đang có thay đổi chưa commit, không chuyển branch tùy tiện. Commit vào branch UI hoặc lưu giữ có chủ đích trước; không dùng `reset --hard` hay `clean -fd`.

5. Từ thời điểm này, mọi branch mới phải tạo từ `develop`; `main` chỉ dành cho release.

Phase 0–3:

- Không cần Issue/PR.
- Tạo hoặc chuyển sang `develop` được tạo từ `main`, sau đó dùng branch `ui/<flow>` từ `develop`.
- Commit nhỏ, rõ nghĩa.
- Tự review diff và chạy kiểm tra local.

Phase 4 trở đi:

- Bắt buộc Issue → branch → commit → PR → CI → review → merge.
- Branch feature/fix/docs phải được tạo từ `develop`; PR tích hợp target `develop`.
- PR phải có link Figma, API mapping, screenshot, test và gap còn lại.
- `main` chỉ nhận release từ `develop`; không commit trực tiếp vào `main` hoặc `develop`.
- Không force-push, reset rộng hoặc xóa thay đổi chưa xác định.

Mẫu commit:

```text
feat(ui): add trip list preview
style(ui): align trip workspace tokens
fix(ui): handle empty trip state
feat(trips): add gateway repository
```

## Definition of Done

Một flow chỉ hoàn tất khi:

- Route và component tồn tại.
- UI khớp Figma trong phạm vi đã chọn.
- Có responsive state.
- Có loading/empty/error/permission/conflict state phù hợp.
- Component không gọi trực tiếp HTTP/fixture.
- Có repository interface và adapter tương ứng.
- Có test cần thiết.
- `lint`, `typecheck`, `test`, `build` thành công.
- Không sửa Backend/Mobile.
- Báo cáo rõ file đã sửa, command đã chạy và việc còn lại.

## Khi bị chặn

Codex phải dừng và báo rõ nếu:

- Figma không truy cập được.
- Không xác định được frame/route.
- Backend contract mâu thuẫn.
- Cần sửa Backend/Mobile.
- Có thay đổi Git không rõ nguồn gốc.
- Cần secret hoặc quyền bên ngoài.

Không được tự giải quyết bằng cách bịa API, xóa file, bỏ qua test hoặc sửa repository khác.
