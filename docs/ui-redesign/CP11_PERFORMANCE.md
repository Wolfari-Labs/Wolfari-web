# CP11 — Hiệu năng local có giới hạn

Ngày02/11/2026. **MEASURED_WITH_LIMITS**, không production SLA PASS. Hồ sơ có cặp lịch sử trước/sau CP11-A01 (80 mẫu) và lượt trên source D54 (40 mẫu), trước final NavLink exact-matching correction D56. Không chạy lại lab sau D56 hoặc suy các số dưới đây là post-D56 performance. Đây là local Gateway HTTP-mock lab, không phải phép đo production hoặc toàn bộ chương trình redesign.

## D55 — Source D54, local lab trước D56

- Build Gateway cuối `.local/cp11-compact-gateway`; `CP11_TEST_MODE=gateway`, `CP11_RUN_TAG=lab-d54`, một worker. Lab **8/8 PASS/exit0,40 mẫu**: Home/Auth/Plan/Fund × Web1440/402 ×5 mẫu, cache disabled, CPU1/unthrottled localhost. [Summary và raw sanitized samples](evidence/cp11/runtime-lab-d54.json), [run report/hash](evidence/cp11/run-summary-d54.json), raw Playwright `.local/cp11-lab-d54-lab.json`. Cột “trước” bên dưới là40 mẫu post-A01 **lịch sử** trong `runtime-lab.json`; không phải concurrent A/B hoặc cùng lần chạy.

| Route / Web width | LCP median post-A01→D54 (ms) | D54 range (ms) |
| --- | --- | --- |
| Home1440 |260→216 |164–712 |
| Home402 |268→200 |140–356 |
| Auth1440 |456→452 |232–532 |
| Auth402 |480→436 |424–500 |
| Plan1440 |612→632 |624–724 |
| Plan402 |600→596 |548–608 |
| Fund1440 |640→592 |540–612 |
| Fund402 |604→556 |524–580 |

Ranges trước/sau chồng lấn và chỉ5 mẫu/route/width; không suy thay đổi source D54 làm nhanh hơn hoặc chậm hơn. Plan editor Event Timing median D54 là72ms ở cả hai width, không phải INP. CLS/resource data có trong summary/raw; field p75, thiết bị thật, mạng chậm, live Backend/provider và long session vẫn NOT_RUN. Không có PERF01 SLA đã duyệt.

- [Static payload D54](evidence/cp11/build-payload-d54.json) từ production Gateway manifest: local gzip static JS/CSS closure Home**177113B**, Auth**198313B**, Plan**311496B**, Fund**236832B**; **119 emitted assets/5896577B**. Tính theo manifest+local gzip, không gồm mọi dynamic imports/ảnh/font của route và không là browser request graph, wire bytes hoặc runtime latency. [Verification](CP11_VERIFICATION.md) giữ full automated gate current-source riêng.

## D51 — Cặp lab trước/sau A01, lịch sử

Gói A02–A05 và D54 compact-name/denied-Drawer được triển khai sau cặp đo này. Kết quả80 mẫu bên dưới chỉ là lịch sử trước gói; không dùng thay phép đo source D54 phía trên. Giữa hai build D51 chỉ đổi một token màu breadcrumb.

### Phương pháp và khả năng tái lập của cặp D51

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

### Kết quả D51

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

### Diễn giải D51 và release gate

Median LCP thay đổi từ−2.99% đến+21.82% giữa các cặp; ranges chồng lấn, mẫu ít và hai lượt theo thứ tự có thể chịu warm-up/background load. Không đủ cơ sở kết luận một token màu làm nhanh hơn/chậm hơn hoặc đã tối ưu toàn redesign. Không xóa các mẫu đầu chậm (Home1440 trước có1036ms).

W05 có static và runtime lab evidence tái lập được cho cả D51 và D54, không còn hoàn toàn NOT_RUN. Production field p75, INP, mạng chậm/thiết bị thật, live Backend/provider, long-session behavior và approved performance budgets vẫn chưa được xác minh. Không dùng kết quả này để tự deploy hoặc tuyên bố production ready.
