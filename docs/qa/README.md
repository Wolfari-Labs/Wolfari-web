# Kiểm thử Web theo SRS v1.2

Phạm vi: Web End-user và Web Admin, Backend thật trong TEST; không native, Appium hoặc backend unit tests. Bộ mới đang ở giai đoạn foundation và P0/P1 ban đầu, **chưa phải bộ nghiệm thu đầy đủ**. Không sửa mã sản phẩm, Backend hoặc kết quả cũ.

## Nguồn và audit

- `srs-source.json`: văn bản OOXML của tài liệu gốc, SHA256 và thứ tự đoạn (không phải số trang). Chỉ trích xuất nội dung; không đánh giá layout Word.
- `requirements.json` và `TRACEABILITY.md`: FR, IR, NFR, BR, DR, AT; giữ nguyên nội dung và loại trừ native riêng. AT-25 chỉ phần Web; hai browser không chứng minh Web–Android.
- `requirement-cases.json`: tiêu chí và ca kiểm chứng cấp yêu cầu, chưa được coi là ca nguyên tử tự động hóa.
- `scenarios.json`: ca thiết kế theo 18 nhóm, có tiền điều kiện, bước, kết quả, ưu tiên và trạng thái automation.
- `inventory.json`: toàn bộ file nguồn TS/TSX/CSS, 22 routes, vị trí API trong repository và các spec hiện có. Đây là quét tĩnh, không xác nhận mọi nhánh hoạt động.

SRS ghi Dự thảo/chưa phê duyệt. Các quy tắc rõ ràng có thể kiểm chứng kỹ thuật, nhưng không thay thế phê duyệt baseline. OQ-01 provider Map/Route/Weather, OQ-02 tái kích hoạt cảnh báo/nguồn thương mại, OQ-03 webhook giao dịch, OQ-04 browser hỗ trợ, OQ-05 hiệu năng, OQ-06 backup/retention, OQ-07 môi trường, OQ-08 usability cần được chốt riêng. Không biến p95 đề xuất thành tiêu chí nghiệm thu.

## Cách chạy

Yêu cầu Node theo `.node-version`, dependencies hiện có và browsers Playwright. Không cài dependency mới.

```powershell
node --test scripts/qa-report.check.mjs
node node_modules/typescript/bin/tsc -p tsconfig.qa.json
# Sau khi người quản lý xác nhận đây là TEST riêng, không production:
$env:WOLFARI_QA_ENV = 'TEST'
$env:WOLFARI_QA_TEST_DATA_ONLY = 'yes'
$env:WOLFARI_QA_WEB_URL = 'https://your-test-host.example'
$env:WOLFARI_QA_ALLOW_ORIGIN = 'https://your-test-host.example'
# Thiết lập OWNER_EMAIL/PASSWORD, OUTSIDER_EMAIL/PASSWORD bằng secret manager.
# Prefix tất cả: WOLFARI_QA_. Không commit credential.
# Ghi WOLFARI_QA_BACKEND_COMMIT và WOLFARI_QA_PRICE_SOURCE.
node scripts/qa-run.mjs smoke --project=chromium-desktop
node scripts/qa-run.mjs full
```

Không tự khởi động, seed hoặc sửa Backend. Preflight gọi endpoint CSRF đã tồn tại thông qua Web proxy; thiếu cấu hình thì không gửi request. TEST origin phải được người vận hành xác nhận; allowlist không tự chứng minh một host không phải production. Không trỏ production. Web phải build gateway, không fixture. Trip mới dùng UUID riêng mỗi ca; dữ liệu được giữ để điều tra, không tự xóa; danh sách ID nằm ở attachment. Tài khoản TEST phải dành riêng cho suite, không đồng thời dùng với suite khác. Các ca nhiều tài khoản sử dụng context riêng và đóng trong finally. Không thanh toán/mua vé thật.

## Báo cáo và bằng chứng

`BaoCaoKiemThu/YYYY-MM-DD/ChucNang/LanXX/KetQua_ChucNang_YYYY-MM-DD_LanXX.html` là HTML tiếng Việt tự chứa; ảnh/trace/video/log được sao chép vào `bang-chung` cùng chức năng. Bộ HTML Playwright gốc nằm nguyên cấu trúc tại `YYYY-MM-DD/LanXX/playwright-html`, không đổi tên index.html. JUnit, metadata, kết quả và coverage đặt trong thư mục lượt chạy. Tổng hợp full nằm tại `YYYY-MM-DD/TongHop_KiemThuWeb_YYYY-MM-DD_LanXX.html`; smoke có tên riêng. Cấp số lượt dùng mkdir độc quyền theo ngày Việt Nam, không ghi đè lịch sử.

Retries = 0 để giữ lỗi nguyên trạng. Assertions Passed không đồng nghĩa cả yêu cầu Passed. Coverage chỉ ghi FAILED khi có ca thất bại; BLOCKED nếu bị chặn môi trường; SPEC_BLOCKED cho tiêu chí chưa chốt; còn lại NOT RUN cho nghiệm thu toàn bộ yêu cầu. SKIPPED được báo riêng, không quy đổi Passed. Runner trả exit khác 0 khi có blocked/skipped/not-run/spec-blocked, lỗi toàn cục hoặc không có test. Full nghĩa là toàn bộ **script đã viết**, không phải đầy đủ SRS.

Trace/video/screenshot có thể chứa dữ liệu và credential TEST. Không sử dụng tài khoản thật; artifact chỉ truy cập trong repo/CI được kiểm soát, thời hạn 7 ngày. Chưa có cơ chế scrub trace bảo đảm an toàn để công khai; không publish Pages. CI cần protected environment `wolfari-test` với approval trước khi cấp secret cho PR; fork PR chỉ chạy foundation. CI file mới chưa được thực thi trên GitHub.

## Khoảng trống cần tiếp tục

Admin chỉ có placeholder (`AdminChrome.tsx`), chưa có quản trị tài khoản/cấu hình thực. Export/Public Share chưa có route Web thực thi. Trip lifecycle/transfer/clone thiếu luồng tích hợp đầy đủ. Preparation có consumer và capability gating mới; không dùng tài liệu CP07 cũ để kết luận mọi writes hiện vẫn read-only, cũng không suy từ HTTP-mock rằng Backend hỗ trợ.

Finance: consumer manual TEST có nhiều nghiệp vụ, nhưng chứng từ sau reload, kiểm chứng độc lập hoàn cho Holder, handover và đọc lý do đảo còn giới hạn đã ghi ở `../backend-integration-gaps.md`. Price Watch dùng nguồn mock được cấu hình phía Backend là phạm vi được SRS cho phép, **khác** mock Gateway; không chứng minh giá thương mại hoặc giao vé. Notification đọc/preferences không chứng minh delivery/reminder.

Các spec cũ được giữ nguyên. `tests/e2e` là fixture; `tests/e2e-gateway` dùng route.fulfill nên không là tích hợp thật; `e2e-live`/`e2e-demo1` cần kiểm tra manifest, seed và cleanup riêng trước khi chạy. Chưa import các suite đó vào suite mới do phụ thuộc seed Backend/local, dữ liệu chung và cấu hình artifact khác. Không ghép kết quả lịch sử thành kết quả mới.

Visual regression: NOT RUN; không tạo/cập nhật baseline bằng `--update-snapshots`. Responsive/axe tự động không thay manual screen reader, usability, visual diff được duyệt hoặc NFR load test.
