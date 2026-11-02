# CP11 — Hiệu năng local có giới hạn

Ngày02/11/2026. **MEASURED_WITH_LIMITS**, không production SLA PASS. Baseline ở đây là CP11 **trước CP11-A01**, không phải trước toàn bộ chương trình redesign. Thay đổi application giữa hai build chỉ là một token màu breadcrumb.

## Phương pháp và khả năng tái lập

- Production builds `.local/cp11-production` và `.local/cp11-a01-production`; [payload trước](evidence/cp11/build-payload.json)/[sau](evidence/cp11/build-payload-a01.json) giữ manifest SHA, assets, Node/CPU/platform.
- [Lab config](evidence/cp11/playwright-lab.config.ts), [test](evidence/cp11/lab-tests/runtime.spec.ts): một worker, trước rồi sau, không chạy đồng thời heavy suites. Mỗi build có8 nhóm Home/Auth/Plan/Fund × Web1440/402,5 mẫu/nhóm: **40+40=80 samples**. Hai lượt đều8/8 PASS, clean exit0,89.92s/90.84s.
- Chromium qua Playwright, CPU rate1, localhost không network throttling, cache disabled/cleared trước mỗi target navigation. Gateway dùng HTTP mocks; Plan/Fund đã đăng nhập trước navigation. Session/auth/provider latency thật không được đo.
- LCP và CLS được quan sát đến sau font ready/ảnh đang hiển thị decode +1s. CLS dùng max session-window; thay đổi sau cutoff không nằm trong kết quả. Resource Timing chỉ lưu pathname/type/time/bytes, không query strings, bodies hoặc credentials. Số transfer không phải toàn bộ wire bytes của một real user session.
- Plan mở/cancel editor để thu Event Timing ≥16ms; đây **không phải INP**. Không có entry không có nghĩa latency bằng0. Không nhận PERF01 là SLA đã duyệt.

```powershell
$env:CP11_TEST_MODE = 'gateway'
$env:CP11_RUN_TAG = 'lab-before'
$env:CP11_BUILD_DIR = '.local/cp11-production'
corepack pnpm exec playwright test --config docs/ui-redesign/evidence/cp11/playwright-lab.config.ts
# Chỉ sau khi lượt trước kết thúc:
$env:CP11_RUN_TAG = 'lab-after'
$env:CP11_BUILD_DIR = '.local/cp11-a01-production'
corepack pnpm exec playwright test --config docs/ui-redesign/evidence/cp11/playwright-lab.config.ts
node docs/ui-redesign/evidence/cp11/summarize-lab.mjs .local/cp11-lab-before-lab .local/cp11-lab-after-lab
```

Các tag trên là evidence hiện có; khi chạy lại hãy đổi tag cả command và đường dẫn summarizer để giữ nguyên artifacts cũ. [Raw sanitized samples, request-resource lists và summary](evidence/cp11/runtime-lab.json); [run hashes](evidence/cp11/run-summary.json).

## Kết quả

| Route / Web width | LCP median trước→sau (ms) | LCP range sau (ms) | CLS median sau |
| --- | --- | --- | --- |
| Home1440 |268→260 |236–924 |0.000033 |
| Home402 |220→268 |228–572 |0.006244 |
| Auth1440 |456→456 |384–472 |0.000056 |
| Auth402 |448→480 |376–484 |0.000202 |
| Plan1440 |616→612 |600–764 |0.000612 |
| Plan402 |580→600 |592–672 |0.000202 |
| Fund1440 |592→640 |580–656 |0.011480 |
| Fund402 |568→604 |556–608 |0.033009 |

Event Timing click mở Plan editor sau sửa: median80ms tại cả hai width; range64–88ms desktop và72–88ms narrow. Static JS/CSS closure gzip sau sửa: Home176918B, Auth198116B, Plan311295B, Fund236634B. Tổng119 emitted assets5893216B, tăng8B; static closure không gồm mọi dynamic request/ảnh/font.

## Diễn giải và release gate

Median LCP thay đổi từ−2.99% đến+21.82% giữa các cặp; ranges chồng lấn, mẫu ít và hai lượt theo thứ tự có thể chịu warm-up/background load. Không đủ cơ sở kết luận một token màu làm nhanh hơn/chậm hơn hoặc đã tối ưu toàn redesign. Không xóa các mẫu đầu chậm (Home1440 trước có1036ms).

W05 có static và runtime lab evidence tái lập được, không còn hoàn toàn NOT_RUN. Production field p75, INP, mạng chậm/thiết bị thật, live Backend/provider, long-session behavior và approved performance budgets vẫn chưa được xác minh. Không dùng kết quả này để tự deploy hoặc tuyên bố production ready.
