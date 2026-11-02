# Quy trình PR và merge Demo 1 — Backend trước, Web sau

**GIAI ĐOẠN D / DRAFT.** Người dùng đã yêu cầu chuyển D ngày03/11. Đây là hướng dẫn, không xác nhận PR/CI/reviewer đã đạt. Kiểm tra [bàn giao D](PHASE_D_HANDOFF.md), [readiness](demo-readiness-validation.md) và trạng thái GitHub thực tế trước mỗi thao tác. Gate live post-fix và Edge còn thiếu nên chưa merge.

Đã push và tạo [Draft PR Backend #17](https://github.com/Wolfari-Labs/Wolfari-backend/pull/17), [Draft PR Web #21](https://github.com/Wolfari-Labs/Wolfari-web/pull/21) bằng GitHub API theo chấp thuận của người dùng, không cài GitHub CLI. Các bước tạo PR dưới đây là hướng dẫn tham khảo, không tạo lại PR trùng. [Nội dung Backend](pr-drafts/demo-readiness-backend.md) và [nội dung Web](pr-drafts/demo-readiness-web.md) lưu phạm vi/gate; xem [báo cáo lỗi CI Web](WEB_PR21_CI_FIX.md) và CI trên HEAD hiện hành trước review/merge.

Repo canonical: [Wolfari-backend](https://github.com/Wolfari-Labs/Wolfari-backend) và [Wolfari-web](https://github.com/Wolfari-Labs/Wolfari-web). Backend local remote cũ `thepiece27/Wolfari` hiện redirect về repo canonical; không tự đổi remote hoặc push sang repo khác.

## 1. Luồng nhánh

| Repo | Nhánh nghiệm thu | PR base |
|---|---|---|
| Backend | `feat/demo-1-readiness-backend` | `main` |
| Web | `feat/demo-1-readiness-web` | `main` |

Nhánh Web đã chứa `feat/demo-1-web` và `draft/demo-ui-ux`; không mở ba PR trùng nội dung. Không cần đi vòng `develop` cho đợt này. Giữ nguyên các nhánh nguồn làm mốc; không tự xóa branch/tag/release.

Backend phải merge trước. Sau đó kiểm chứng Web candidate với **SHA Backend main sau merge**, rồi mới merge Web. Merge commit giữ lịch sử; không rebase/force-push hoặc dùng quyền admin bypass review.

## 2. Chuẩn bị local

Trong từng repo, trước commit:

```powershell
git status --short --branch
git diff --stat
git diff --check
git diff
```

Stage theo danh sách file đã review, không `git add .` nếu chưa kiểm hết untracked. Kiểm tra riêng code, test, docs, workflow và generated contracts. Không stage `.env`, `.local`, journal, raw logs, test-results, credentials hoặc build output.

Sau stage:

```powershell
git diff --cached --stat
git diff --cached --check
git diff --cached
```

Chỉ commit khi diff đúng phạm vi. Chia nhóm fix/test/docs nếu còn thay đổi độc lập; không sửa commit nguồn đã chia sẻ. Ghi rõ testedSHA + implementation hash nếu docs commit được thêm sau lượt test; runtime/config đổi thì chạy lại gate.

Trước push:

```powershell
git fetch origin
git log --oneline HEAD..origin/main
git log --oneline origin/main..HEAD
```

Nếu main có commit mới, merge main vào nhánh nghiệm thu và giải quyết conflict từng phần. Contract/generated code phải giữ cả chức năng Demo1 và Finance mới. Không dùng toàn bộours/theirs. Chạy lại test bị ảnh hưởng; runtime/contract/config thay đổi cần live acceptance mới.

## 3. Push và PR Backend

Chỉ thực hiện khi chủ dự án yêu cầu bước remote và local gates đủ bằng chứng:

```powershell
git switch feat/demo-1-readiness-backend
git push -u origin feat/demo-1-readiness-backend
```

Trên GitHub Backend: **Pull requests → New pull request**; base=`main`, compare=`feat/demo-1-readiness-backend`. Kiểm lại Files changed và commits trước khi tạo. Nếu còn gate thiếu thì tạo Draft PR, không ghi Ready.

Tiêu đề gợi ý: `Demo 1 readiness: integrate main, preserve contracts and verify local flows`.

Nội dung PR bắt buộc:

```markdown
## Mục tiêu và phạm vi
Web + Backend local demo; TEST Finance/MOCK_FLIGHT; không production/Mobile.

## Phiên bản tương thích
Backend tested SHA/hash: ...
Web tested SHA/hash: ...
Base main: ...

## Thay đổi
Tóm tắt fixes, test infrastructure, contract merge và docs.

## Kiểm chứng
Command | mode | count | exit code | artifact/report
Phân biệt unit/fixture/HTTP mock/live/manual; ghi NOT_RUN thật.

## Known issues và giới hạn
Các lỗi còn lại, ảnh hưởng, workaround và người chấp nhận.

## Rollback
Fix/revert qua PR; không reset DB/volume, kiểm schema compatibility trước code rollback.

## Liên kết
Readiness report; runbook; PR phụ thuộc.
```

Không đưa secrets/raw artifacts hoặc memory citations vào nội dung PR.

## 4. Điều kiện merge Backend

- CI trên **HEAD PR mới nhất** PASS, không dùng run của feature/main cũ.
- Review protobuf/REST/generated/catalog và migration/config.
- Ít nhất một approval hợp lệ từ reviewer khác tác giả; kiểm ruleset mới nhất trên GitHub.
- Resolve mọi discussion; push mới thì yêu cầu reviewer xem lại dù ruleset không tự dismiss approval.
- Không còn conflict, P0/P1 hoặc gate bắt buộc chưa xử lý.
- Chọn **Create a merge commit**, kiểm summary rồi merge khi được yêu cầu.

Nếu không có reviewer, dừng ở PR chờ review; không tự approval dưới danh tính tác giả hoặc bypass protection.

## 5. Backend main → Web PR

Sau merge Backend, ghi SHA merge và CI run. Với working tree sạch:

```powershell
git fetch origin
git switch main
git merge --ff-only origin/main
git rev-parse HEAD
```

Nếu `--ff-only` thất bại, kiểm local history; không reset main để ép đồng bộ. Giữ hai repo cạnh nhau vì harness Web import scripts Backend sibling.

Web vẫn ở `feat/demo-1-readiness-web`. Chạy lại:

```powershell
corepack pnpm test:e2e:demo1 --runtime=dev
corepack pnpm test:e2e:demo1 --runtime=preview
corepack pnpm test:e2e:demo1 --runtime=preview
```

Kết quả phải dùng Backend main mới. Nếu source/runtime khác bản nghiệm thu, chạy lại full gates theo báo cáo. Khi đạt, commit docs-only evidence nếu cần rồi:

```powershell
git push -u origin feat/demo-1-readiness-web
```

Tạo PR Web base=`main`, compare=`feat/demo-1-readiness-web`, liên kết PR Backend và cặpSHA. Đợi Web CI, reviewer approval và resolve threads. Live cross-repo evidence là gate riêng; CI fixture/mock không thay được. Dùng merge commit.

## 6. Kiểm chứng sau cả hai merge

- Fetch/fast-forward main của cả hai repo; working tree sạch; ghi haiSHA.
- Xác nhận CI main mới nhất thành công.
- Frozen install/build, live preview và smoke theo runbook.
- Login → Trip → Plan → Fund → reload, đúng persistence/ledger.
- Không có code chỉ tồn tại trên candidate chưa lênmain.
- Chỉ lúc này ghi `MAIN_VERIFIED`.

Nếu FAIL: dừng công nhậnmain, ghi lỗi, dùng cặp đã kiểm chứng trong checkout riêng cho demo. Chỉ fix/revert khi được yêu cầu; không xóa volume hoặc downgrade schema để né lỗi.

## 7. Hồ sơ đóng

Lưu PRURLs, reviewer, CIURLs, mergeSHAs, tested pair và ngày nghiệm thu. Giữ các trạng thái độc lập: `READY_FOR_LOCAL_DEMO`, `READY_TO_MERGE`, `MAIN_VERIFIED`. Không nâng trạng thái chỉ vì nút Merge đã thành công.
