import { test, expect, login } from './gateway-fixture';
import AxeBuilder from '@axe-core/playwright';

const tripId = '11111111-1111-4111-8111-111111111111';
const fundId = '77777777-1111-4111-8111-111111111111';

test('HTTP mock: Finance 202 survives reload, NEEDS_REVIEW blocks replacement; pagination does not manufacture balance', async ({
  page,
  gateway,
}) => {
  let key = '',
    writes = 0,
    review = false,
    fundReadFails = false;
  const pages: string[] = [];
  const fund = {
    id: fundId,
    trip_id: tripId,
    holder_user_id: gateway.profile.id,
    currency: 'VND',
    budget_amount: null,
    current_balance: '9007199254740993',
    reserved_refund: '0',
    available_balance: '9007199254740993',
    status: 'OPEN',
    finance_version: 3,
    closed_at: null,
  };
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname;
    const respond = (data: unknown, status = 200) =>
      route.fulfill({ status, json: { data, meta: { correlation_id: 'mock-only' } } });
    if (path === `/api/v1/trips/${tripId}/fund`) {
      if (fundReadFails)
        return route.fulfill({
          status: 503,
          json: { error: { code: 'SERVICE_UNAVAILABLE', message: 'Fund read unavailable' } },
        });
      return respond(fund);
    }
    if (path === `/api/v1/funds/${fundId}/budget`) {
      writes++;
      key = route.request().headers()['idempotency-key']!;
      expect(route.request().postDataJSON()).toEqual({
        budget_amount: '1000000',
        expected_finance_version: 3,
      });
      return respond({ operation_id: key, trip_id: tripId, state: 'PENDING_RECOVERY' }, 202);
    }
    if (path === `/api/v1/operations/${key}`)
      return respond({
        operation_id: key,
        trip_id: tripId,
        state: review ? 'NEEDS_REVIEW' : 'PENDING_RECOVERY',
      });
    if (path === `/api/v1/funds/${fundId}/destinations`) return respond([]);
    if (path === `/api/v1/funds/${fundId}/transactions`) {
      const cursor = url.searchParams.get('cursor');
      pages.push(cursor ?? 'first');
      return respond({
        items: [
          {
            id: cursor
              ? '88888888-2222-4222-8222-222222222222'
              : '88888888-1111-4111-8111-111111111111',
            fund_id: fundId,
            sequence: cursor ? '9007199254740993' : '9007199254740992',
            direction: 'IN',
            transaction_type: 'CONTRIBUTION',
            amount: '1',
            balance_after: '9007199254740993',
            contribution_id: null,
            expense_id: null,
            refund_id: null,
            reversal_of_id: null,
            actor_user_id: gateway.profile.id,
            reason: null,
            created_at: '2026-10-28T00:00:00Z',
          },
        ],
        next_cursor: cursor ? null : 'page_2',
      });
    }
    if (path.startsWith(`/api/v1/funds/${fundId}/`))
      return respond({ items: [], next_cursor: null });
    return route.fallback();
  });
  await login(page);
  await page.goto(`/trips/${tripId}/fund`);
  await expect(page.getByRole('region', { name: 'Trạng thái quỹ' })).toContainText(
    '9.007.199.254.740.993 ₫',
  );
  await page.screenshot({ path: test.info().outputPath('fund-populated.png'), fullPage: true });
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations).toEqual([]);
  const desktopMain = await page.getByRole('region', { name: 'Đích nhận' }).boundingBox();
  const desktopContext = await page
    .getByRole('complementary', { name: 'Ngữ cảnh thao tác quỹ' })
    .boundingBox();
  expect(desktopMain).not.toBeNull();
  expect(desktopContext).not.toBeNull();
  expect(desktopContext!.x).toBeGreaterThanOrEqual(desktopMain!.x + desktopMain!.width);
  await page.getByRole('button', { name: 'Tải thêm lịch sử' }).click();
  await expect(page.getByRole('region', { name: 'Lịch sử quỹ' }).getByRole('listitem')).toHaveCount(
    2,
  );
  expect(pages).toContain('page_2');
  const budgetButton = page.getByRole('button', { name: 'Sửa ngân sách', exact: true });
  await budgetButton.click();
  await expect(page.getByRole('heading', { name: 'Sửa ngân sách', exact: true })).toBeFocused();
  await page.screenshot({ path: test.info().outputPath('fund-budget-context-desktop.png') });
  await page.getByRole('button', { name: 'Đóng biểu mẫu' }).click();
  await expect(budgetButton).toBeFocused();
  await budgetButton.click();
  await page.getByLabel('Ngân sách (VND)').fill('1000000');
  await page.getByRole('button', { name: 'Thêm đích nhận TEST' }).click();
  await expect(page.getByRole('heading', { name: 'Sửa ngân sách', exact: true })).toBeFocused();
  await expect(page.getByLabel('Ngân sách (VND)')).toHaveValue('1000000');
  await expect(page.getByLabel('Mã ngân hàng TEST')).toHaveCount(0);
  // A visible form must also retain its draft through read failure and recovery.
  fundReadFails = true;
  await page.getByRole('button', { name: 'Tải lại quỹ' }).click();
  await expect(page.getByRole('heading', { name: 'Chưa thể tải nội dung' })).toBeVisible();
  await expect(page.getByLabel('Ngân sách (VND)')).toHaveValue('1000000');
  expect(writes).toBe(0);
  fundReadFails = false;
  await page.getByRole('button', { name: 'Tải lại quỹ' }).click();
  await expect(page.getByRole('region', { name: 'Trạng thái quỹ' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chưa thể tải nội dung' })).toHaveCount(0);
  await expect(page.getByLabel('Ngân sách (VND)')).toHaveValue('1000000');
  expect(writes).toBe(0);
  await page.getByRole('button', { name: 'Xác nhận · Sửa ngân sách', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Ngữ cảnh thao tác quỹ' })).toBeFocused();
  await expect(page.getByText(/Đang chờ kết nối phục hồi/)).toBeVisible();
  await expect(page.getByText(/Đã hoàn tất thao tác/)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sửa ngân sách', exact: true })).toBeDisabled();
  review = true;
  await page.getByRole('button', { name: 'Kiểm tra lại kết quả' }).click();
  await expect(page.getByText(/Thao tác cần đối soát/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gửi lại đúng yêu cầu' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Đã đọc kết quả' })).toHaveCount(0);
  expect(writes).toBe(1);
  await page.setViewportSize({ width: 402, height: 874 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  const narrowHistory = await page.getByRole('region', { name: 'Lịch sử quỹ' }).boundingBox();
  const narrowContext = await page
    .getByRole('complementary', { name: 'Ngữ cảnh thao tác quỹ' })
    .boundingBox();
  expect(narrowHistory).not.toBeNull();
  expect(narrowContext).not.toBeNull();
  expect(narrowContext!.y).toBeGreaterThanOrEqual(narrowHistory!.y + narrowHistory!.height);
  await page.screenshot({ path: test.info().outputPath('fund-review-mobile.png'), fullPage: true });
});

test('HTTP mock: a not-enabled Fund opens a centered setup overlay and retains its draft', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await login(page);
  expect(gateway.authenticated).toBe(true);
  await page.goto(`/trips/${tripId}/fund`);
  const setupHeading = page.getByRole('heading', { name: 'Chuyến đi chưa bật quỹ' });
  const setupButton = page.getByRole('button', { name: 'Bật quỹ TEST', exact: true });
  await expect(setupHeading).toBeVisible();
  await expect(setupButton).toBeEnabled();
  await setupButton.click();
  const dialog = page.getByRole('dialog', { name: 'Thiết lập bật quỹ', exact: true });
  const form = dialog.getByRole('form', { name: 'Bật quỹ TEST', exact: true });
  const heading = dialog.getByRole('heading', { name: 'Bật quỹ TEST', exact: true });
  await expect(dialog).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(form).toBeVisible();
  await expect(dialog.getByLabel('Người giữ quỹ (Holder)')).toBeVisible();
  await expect(dialog.getByLabel('Ngân sách (VND)')).toBeVisible();
  await expect(dialog.getByLabel('Mã ngân hàng TEST')).toBeVisible();
  await expect(dialog.getByLabel('Số tài khoản TEST')).toBeVisible();
  await expect(dialog.getByLabel('Tên người nhận TEST')).toBeVisible();
  const desktopBounds = await dialog.boundingBox();
  expect(desktopBounds).not.toBeNull();
  expect(Math.abs(desktopBounds!.x + desktopBounds!.width / 2 - 720)).toBeLessThanOrEqual(2);
  expect(Math.abs(desktopBounds!.y + desktopBounds!.height / 2 - 480)).toBeLessThanOrEqual(2);
  await expect(page.getByRole('complementary', { name: 'Ngữ cảnh thao tác quỹ' })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('fund-setup-desktop.png'), fullPage: true });

  await page.getByRole('button', { name: 'Đóng biểu mẫu bật quỹ' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(setupButton).toBeFocused();
  await setupButton.click();
  await dialog.getByLabel('Ngân sách (VND)').fill('2500000');
  await dialog.getByLabel('Mã ngân hàng TEST').fill('TESTBANK');
  gateway.failures.set(`GET /api/v1/trips/${tripId}/fund`, 503);
  await page.getByRole('button', { name: 'Tải lại quỹ' }).evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByRole('heading', { name: 'Chưa thể tải nội dung' })).toBeVisible();
  await expect(heading).toBeVisible();
  await expect(dialog.getByLabel('Ngân sách (VND)')).toHaveValue('2500000');
  await expect(dialog.getByLabel('Mã ngân hàng TEST')).toHaveValue('TESTBANK');

  for (const width of [402, 320]) {
    await page.setViewportSize({ width, height: 760 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`fund-setup-${width}.png`), fullPage: true });
  }

  await page.getByRole('button', { name: 'Đóng biểu mẫu bật quỹ' }).click();
  await expect(setupButton).toBeFocused();
});
