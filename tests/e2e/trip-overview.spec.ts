import { test, expect } from '@playwright/test';
const trip = '/trips/11111111-1111-4111-8111-111111111111';
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
  test(`Trip overview ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size);
    const api: string[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).pathname.startsWith('/api/')) api.push(r.url());
    });
    await page.goto(trip);
    await expect(
      page.getByRole('heading', { name: 'Đà Nẵng – Hội An', exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      size.width,
    );
    await page.getByText('Thông tin và phiên bản', { exact: true }).click();
    await expect(page.getByText('1 / 1 / 1', { exact: true })).toBeVisible();
    if (size.width > 768) {
      expect(await page.evaluate(() => scrollY)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
        size.height,
      );
    } else expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await page.locator('main').evaluate((e) => (e.scrollTop = 0));
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('overview.png'), fullPage: true });
    await page.getByRole('link', { name: '4 thành viên', exact: true }).click();
    await expect(page).toHaveURL(trip + '/members');
    await page.goBack();
    await page.locator('[data-preview=trip-detail] summary').click();
    for (const [scenario, text] of [
      ['error', 'Chưa thể tải nội dung'],
      ['forbidden', 'Bạn không có quyền truy cập'],
      ['not-found', 'Không tìm thấy nội dung'],
      ['conflict', 'Dữ liệu đã thay đổi'],
      ['unavailable', 'Chức năng chưa khả dụng'],
      ['empty', 'Chưa có nội dung'],
      ['loading', 'Đang tải…'],
    ] as const) {
      await page.getByLabel('Trạng thái tổng quan').selectOption(scenario);
      await expect(page.getByRole('heading', { name: text, exact: true })).toBeVisible();
    }
    expect(api).toEqual([]);
  });
