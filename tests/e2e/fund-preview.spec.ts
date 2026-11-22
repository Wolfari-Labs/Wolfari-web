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
      // Web v2 W/Trip header 937:7647 at the content origin.
      expect(Math.abs(box.x - 312)).toBeLessThanOrEqual(4);
      expect(Math.abs(box.y - 112)).toBeLessThanOrEqual(4);
      expect(Math.abs(box.width - 1104)).toBeLessThanOrEqual(4);
      expect(Math.abs(box.height - 84)).toBeLessThanOrEqual(4);
    }
    const transactions = page.locator('[data-finance-transactions]');
    await transactions.getByRole('tab', { name: /Đóng góp/ }).click();
    await expect(transactions.getByRole('tab', { name: /Đóng góp/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.getByRole('tab', { name: 'Chi quỹ' }).click();
    // A valid local draft confirms that nothing was sent or deducted.
    await page.getByLabel('Hạng mục').selectOption('food');
    await page.getByLabel('Số tiền (VND)').fill('120000');
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
  await expect(
    page.getByRole('heading', { name: 'Quỹ nhóm · Đang mở', exact: true }),
  ).toBeVisible();
  // Raw enums and per-card preview notes stay out of the page; the money disclaimer appears once.
  const content = page.locator('[data-flow="fund-preview"] > :not([data-preview])');
  await expect(content.getByText(/TEST · |SANDBOX · |Closure:|MEMBER|Gateway command/)).toHaveCount(
    0,
  );
  await expect(page.getByText(/không giữ hoặc chuyển tiền thật/)).toHaveCount(1);
  await page.getByLabel('Hạng mục').selectOption('hotel');
  await page.getByLabel('Số tiền (VND)').fill('100000');
  await page.getByRole('button', { name: 'Kiểm tra bản nháp' }).click();
  await expect(
    page.getByText('Bản nháp hợp lệ · Chưa gửi, chưa trừ số dư.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Hoàn dư' }).click();
  await expect(page.getByText('Đang chờ', { exact: true })).toBeVisible();
  await scenario.selectOption('read-only');
  await expect(
    page.getByRole('heading', { name: 'Quỹ nhóm · Đang mở', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kiểm tra bản nháp' })).toBeDisabled();
  await expect(
    page.getByRole('region', { name: 'Mục tiêu quỹ' }).getByText('—', { exact: true }),
  ).toBeVisible();
  await scenario.selectOption('closed');
  await expect(
    page.getByRole('heading', { name: 'Quỹ nhóm · Đã đóng', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Đóng quỹ · Đã hoàn tất', { exact: true })).toBeVisible();
  await expect(page.getByText('Không còn khoản cần xử lý', { exact: true })).toBeVisible();
});

test('Fund preview transaction shell exposes Figma filters and ledger details', async ({
  page,
}) => {
  await page.goto(route);

  const transactions = page.locator('[data-finance-transactions]');
  await expect(page.locator('[data-finance-goal]')).toBeVisible();
  await expect(transactions.getByRole('tab')).toHaveCount(4);
  await expect(transactions.getByRole('columnheader', { name: 'Thời gian' })).toBeVisible();
  await expect(transactions.getByRole('row')).toHaveCount(6);
  await transactions.getByRole('tab', { name: /Đóng góp/ }).click();
  await expect(transactions.getByRole('tab', { name: /Đóng góp/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(transactions.getByRole('row')).toHaveCount(2);
  await transactions
    .getByRole('button', { name: /Đóng góp/ })
    .first()
    .click();
  await expect(transactions.getByText('Số dư sau')).toBeVisible();
});
