# CP-09 evidence — in progress

CP-09 đang `IN_PROGRESS`. Thư mục này hiện chỉ lưu bằng chứng W02 cho placement FND03/D18 và review correction; chưa phải nghiệm thu CP-09. Gateway screenshots dùng HTTP mock, không chứng minh live Backend hoặc giao dịch thật.

## W02 Gateway Web

Snapshot 01/11/2026, branch `draft/demo-ui-ux`, HEAD `4900d59aa079c1d6b23da359788ef9ddee7ffc81`, source/test/docs CP09 còn uncommitted. Command cuối: `corepack pnpm test:e2e:gateway tests/e2e-gateway/finance-operations.spec.ts --workers=1 --reporter=line` → **2/2 PASS**. Mock bảo đảm không có request nào tới Backend thật. Test đo context bên phải ở desktop1280, bên dưới ở Web900 và Web402; kiểm tra no horizontal overflow, form setup khi chưa bật quỹ, focus mở/đóng/fallback, draft không bị thay bởi action khác, 202/NEEDS_REVIEW và int64/cursor. Lần chạy đầu của ca setup mới FAIL do test quên kích hoạt fixture; lần sau FAIL do focus fallback khi Fund read lỗi; cả hai đã sửa và kết quả cuối2/2 PASS.

| Ảnh                                                                | Mode / điều quan sát                                                                         | SHA-256                                                            |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [fund-setup-desktop](w02/fund-setup-desktop.png)                   | Gateway HTTP mock, desktop1280×720, Owner setup form ở panel phải                            | `5C733720E189D9623E707F11211357837C25C2688225F0D974F8F143802905C9` |
| [fund-budget-context-desktop](w02/fund-budget-context-desktop.png) | Gateway HTTP mock, desktop1280×720, budget form ở panel phải                                 | `5C6CD4629487A010876B0597751287C829805C2698BA1F55FEAC4CBA307D58A0` |
| [fund-review-web402](w02/fund-review-mobile.png)                   | Gateway HTTP mock, responsive Web402×874, context xuống dưới main khi operation NEEDS_REVIEW | `B72F1CEB58580CEA3485EED9C1822F5DD98E23812A527FBDAFD2C948A2293ABF` |

Desktop captures chỉ chụp phần đang nhìn thấy trong scroll container của app; ảnh setup/budget cho thấy panel phải nhưng không là full-page visual QA. Web900 được kiểm tra bằng bounding boxes trong test, không có ảnh riêng. W05/W06 cần thêm so sánh 1440/820/768/402/320, short-height, native zoom, keyboard/reduced motion, trạng thái nghiệp vụ và before/after theo DoD.

Focused regression trên cùng W02 snapshot trước follow-up bên dưới: `corepack pnpm exec vitest run tests/demo1-finance.test.ts tests/fund-repository.test.ts --reporter=dot` → **26/26 PASS**; `corepack pnpm test:e2e tests/e2e/fund-preview.spec.ts --workers=2 --reporter=line` → **8/8 PASS** (fixture Preview; bảy viewport và state case). Scoped ESLint và typecheck PASS. Full lint, full unit, builds, live Backend, manual accessibility, physical device, CI và production performance chưa chạy tại snapshot đó.

## W02 follow-up — draft retention 01/11/2026

User yêu cầu sửa lỗi từ quick review. Branch/HEAD không đổi; source/test/docs vẫn uncommitted. Quỹ đã bật trước đây có context ở cây render khác nhánh lỗi: refresh503 tạo lại `FundCommandForm`, xóa local draft. Bản sửa giữ context ở một vị trí ổn định, chỉ đổi nội dung summary/main theo trạng thái query; giữ nguyên bố cục, focus fallback, serializers, expected versions, idempotency và coordinator.

Fresh verification (không phải kết quả lịch sử phía trên):

| Check | Command / artifact | Result |
| --- | --- | --- |
| Regression trước sửa | `corepack pnpm test:e2e:gateway tests/e2e-gateway/finance-operations.spec.ts --workers=1 --reporter=line --output=.local/cp09-draft-before` | **1 PASS / 1 FAIL**: budget draft expected `1000000`, received empty sau Fund read503. Trace/screenshot trong output directory được giữ nguyên. |
| Sau sửa | Cùng command với `--output=.local/cp09-draft-after` | **2/2 PASS**; enabled Fund draft giữ nguyên qua error/recovery. |
| Final mở rộng setup assertions | Cùng command với `--output=.local/cp09-draft-final` | **2/2 PASS**; thêm budget/bank draft retention khi setup read lỗi. |
| Finance unit | `corepack pnpm exec vitest run tests/demo1-finance.test.ts tests/fund-repository.test.ts --reporter=dot --maxWorkers=2` | **2 files / 26 tests PASS** |
| Typecheck | `corepack pnpm typecheck` | **PASS** |
| Scoped lint | `corepack pnpm exec eslint src/features/fund/GatewayFundPage.tsx tests/e2e-gateway/finance-operations.spec.ts` | **PASS** |
| Scoped format | `corepack pnpm exec prettier --check src/features/fund/GatewayFundPage.tsx tests/e2e-gateway/finance-operations.spec.ts` | **PASS** |
| Production build | `corepack pnpm build --outDir .local/cp09-draft-build` | **PASS**; không phải browser test của production build |

Final Gateway suite chạy dev server + HTTP mocks: budget draft `1000000` giữ nguyên sau503 và recovery, `writes=0` trước submit, submit vẫn chỉ gửi một immutable request đúng body/version; setup draft ngân sách `2500000` và bank `TESTBANK` giữ nguyên khi503. Các assertions focus/reflow/no-overflow/202/NEEDS_REVIEW/int64/cursor vẫn PASS. Không gọi Backend thật; không phát sinh giao dịch thật. Ảnh bảng W02 phía trên là snapshot trước follow-up, không bị ghi đè hoặc gán thành visual QA mới.

Giới hạn: full lint/unit, Preview build, Preview fixture rerun, full viewport/native zoom/manual accessibility, live Backend, CI/performance **NOT_RUN trong follow-up này**. Không kết luận CP09 READY_FOR_REVIEW. W03–W05 vẫn chờ FND01/FND02/FND04/FND05/FND06; không mở CP10.
