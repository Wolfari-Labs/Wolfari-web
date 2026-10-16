import { test, expect } from '@playwright/test';

const route = '/trips/11111111-1111-4111-8111-111111111111/fund';

for (const size of [
  { width: 1440, height: 800 },
  { width: 1366, height: 600 },
  { width: 1024, height: 600 },
  { width: 820, height: 600 },
  { width: 768, height: 600 },
  { width: 402, height: 874 },
  { width: 320, height: 600 },
]) {
  test(`Fund preview ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size);
    const api: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url());
    });
    await page.goto(route);
    await expect(page.getByRole('heading', { name: /Quỹ nhóm/ }).first()).toBeVisible();
    await expect(page.getByText('9.000.000đ', { exact: true })).toBeVisible();
    await expect(page.getByText('500.000đ', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      size.width,
    );
    if (size.width === 1440) {
      const hero = page.getByRole('region', { name: 'Thông tin chuyến đi' });
      const box = (await hero.boundingBox())!;
      expect(Math.abs(box.x - 238)).toBeLessThanOrEqual(4);
      expect(Math.abs(box.y - 120)).toBeLessThanOrEqual(4);
      expect(Math.abs(box.width - 1180)).toBeLessThanOrEqual(4);
      expect(Math.abs(box.height - 150)).toBeLessThanOrEqual(4);
    }
    await page.getByRole('tab', { name: 'Đóng góp' }).click();
    await expect(page.getByRole('tab', { name: 'Đóng góp' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.getByRole('tab', { name: 'Chi quỹ' }).click();
    await page.getByLabel('Số tiền (VND)').fill('');
    await page.getByRole('button', { name: 'Kiểm tra bản nháp' }).click();
    await expect(page.getByText(/chưa trừ số dư/i)).toBeVisible();
    await page.screenshot({ path: info.outputPath('fund.png'), fullPage: true });
    expect(api).toEqual([]);
  });
}

test('Fund preview states stay truthful and do not claim a ledger mutation', async ({ page }) => {
  await page.goto(route);
  await page.locator('[data-preview="fund"] summary').click();
  const scenario = page.locator('[data-preview="fund"] select');
  for (const [value, heading] of [
    ['empty', 'Chưa có nội dung'],
    ['error', 'Chưa thể tải nội dung'],
    ['forbidden', 'Bạn không có quyền truy cập'],
    ['not-found', 'Không tìm thấy nội dung'],
    ['conflict', 'Dữ liệu đã thay đổi'],
    ['unavailable', 'Chức năng chưa khả dụng'],
  ] as const) {
    await scenario.selectOption(value);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await scenario.selectOption('success');
  await expect(page.getByText(/TEST|sandbox/i).first()).toBeVisible();
  await expect(page.getByText(/Chưa gửi, chưa trừ số dư/i)).toBeVisible();
});
