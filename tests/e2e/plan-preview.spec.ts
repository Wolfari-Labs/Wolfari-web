import { test, expect } from '@playwright/test';
const route = '/trips/11111111-1111-4111-8111-111111111111/plan';
for (const size of [
  { width: 1440, height: 800 },
  { width: 1366, height: 600 },
  { width: 1366, height: 520 },
  { width: 1024, height: 600 },
  { width: 820, height: 600 },
  { width: 768, height: 600 },
  { width: 402, height: 874 },
  { width: 320, height: 480 },
])
  test(`Plan preview ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size);
    const api: string[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).pathname.startsWith('/api/')) api.push(r.url());
    });
    await page.goto(route);
    await expect(page.getByText('Bán đảo Sơn Trà', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      size.width,
    );
    const timeline = page.getByRole('list', { name: 'Các hoạt động trong ngày' });
    await timeline.focus();
    if (size.width > 768) {
      await page.keyboard.press('End');
      await expect.poll(() => timeline.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
      expect(await page.evaluate(() => scrollY)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
        size.height,
      );
    } else {
      await page.getByText('Plan 1', { exact: false }).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
    }
    await page.getByRole('button', { name: /Ngày 2/ }).click();
    await expect(page.getByRole('heading', { name: 'Chưa có nội dung' })).toBeVisible();
    await page.getByRole('button', { name: /Ngày 1/ }).click();
    await page.getByRole('button', { name: /Đã chọn · Chưa xếp lịch/ }).click();
    await expect(page.getByText('Chùa Linh Ứng', { exact: true })).toBeVisible();
    await page.getByLabel('Xem hoạt động Bán đảo Sơn Trà').click();
    await expect(
      page.locator('details[open] dd').filter({ hasText: /08:00.*10:30/ }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Chỉnh sửa hoạt động' })).toBeDisabled();
    const images = await page.locator('img:visible').evaluateAll((elements) =>
      elements.map((element) => {
        const img = element as HTMLImageElement,
          box = img.getBoundingClientRect();
        return {
          src: img.currentSrc,
          loaded: img.complete && img.naturalWidth > 0,
          width: box.width,
          height: box.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        };
      }),
    );
    for (const img of images) {
      expect(img.loaded, img.src).toBe(true);
      if (img.src.includes('.svg') || img.src.startsWith('data:image/svg')) {
        expect(Math.round(img.width), img.src).toBe(img.naturalWidth);
        expect(Math.round(img.height), img.src).toBe(img.naturalHeight);
      }
    }
    await page.locator('main').evaluate((e) => (e.scrollTop = 0));
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('plan.png'), fullPage: true });
    expect(api).toEqual([]);
  });
test('Plan states keep selection and pending/unknown do not claim saved', async ({ page }) => {
  await page.goto(route);
  await expect(page.getByText('Bán đảo Sơn Trà', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Ngày 2/ }).click();
  await page.locator('[data-preview=plan] summary').click();
  for (const [scenario, text] of [
    ['error', 'Chưa thể tải nội dung'],
    ['forbidden', 'Bạn không có quyền truy cập'],
    ['not-found', 'Không tìm thấy nội dung'],
    ['conflict', 'Dữ liệu đã thay đổi'],
    ['unavailable', 'Chức năng chưa khả dụng'],
    ['empty', 'Chưa có nội dung'],
    ['loading', 'Đang tải…'],
  ] as const) {
    await page.getByLabel('Trạng thái lịch trình').selectOption(scenario);
    await expect(page.getByRole('heading', { name: text, exact: true })).toBeVisible();
  }
  await page.getByLabel('Trạng thái lịch trình').selectOption('read-only');
  await expect(page.getByRole('button', { name: /Ngày 2/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText(/Không có quyền sửa lịch trình/)).toBeVisible();
  for (const state of ['pending', 'unknown']) {
    await page.getByLabel('Trạng thái thao tác preview').selectOption(state);
    await expect(page.getByText(/Minh họa/, { exact: false }).last()).toBeVisible();
  }
  await expect(page.getByText(/Plan 1 · Membership 1 · Export 1/)).toBeVisible();
});
