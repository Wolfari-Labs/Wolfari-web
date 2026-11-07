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
  await page.getByRole('tab', { name: 'Hoàn dư' }).click();
  await expect(page.getByText('Đang chờ', { exact: true })).toBeVisible();
  await scenario.selectOption('read-only');
  await expect(page.getByText('SANDBOX · OPEN', { exact: true })).toBeVisible();
  await expect(page.getByText('—', { exact: true })).toBeVisible();
  await scenario.selectOption('closed');
  await expect(page.getByText('TEST · CLOSED', { exact: true })).toBeVisible();
  await expect(page.getByText('Closure: COMPLETED', { exact: true })).toBeVisible();
  await expect(page.getByText('Không còn blocker', { exact: true })).toBeVisible();
});

test('Fund preview tabs keep panel semantics and expose the complete ledger', async ({ page }) => {
  await page.goto(route);

  const tabs = page.getByRole('tab');
  const panel = page.getByRole('tabpanel');
  await expect(tabs).toHaveCount(5);
  await expect(page.locator('#fund-tab-expenses')).toHaveAttribute('aria-selected', 'true');
  await expect(panel).toHaveAttribute('aria-labelledby', 'fund-tab-expenses');
  await expect(panel.getByRole('row')).toHaveCount(5);

  const contributions = page.locator('#fund-tab-contributions');
  await contributions.click();
  await expect(contributions).toHaveAttribute('aria-selected', 'true');
  await expect(panel).toHaveAttribute('aria-labelledby', 'fund-tab-contributions');
  await expect(panel.getByRole('listitem')).toHaveCount(1);

  await contributions.press('ArrowRight');
  await expect(page.locator('#fund-tab-outside')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#fund-tab-history').press('End');
  await expect(page.locator('#fund-tab-history')).toBeFocused();
  await page.locator('#fund-tab-history').press('Enter');
  await expect(panel).toHaveAttribute('aria-labelledby', 'fund-tab-history');
  await expect(panel.getByRole('listitem')).toHaveCount(5);
  await expect(panel.getByRole('listitem').first()).toContainText('#1');
});
