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
  const filterNote = page.locator('[data-finance-filter-note]');
  await expect(filterNote).toContainText('Số dư và tổng tiền lấy từ projection Finance.');
  await expect(filterNote).toHaveCount(1);
  const noteBounds = await filterNote.boundingBox();
  const tableBounds = await page.getByRole('table', { name: 'Các giao dịch quỹ nhóm' }).boundingBox();
  expect(tableBounds!.y - (noteBounds!.y + noteBounds!.height)).toBeGreaterThanOrEqual(12);
  await filterNote.scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('fund-filter-note.png') });
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations).toEqual([]);
  await expect(page.getByRole('heading', { name: 'Quỹ nhóm', exact: true })).toHaveCSS(
    'font-size',
    '13px',
  );
  await expect(page.getByRole('region', { name: 'Thao tác chi tiết Finance' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tải thêm giao dịch' }).click();
  await expect(page.getByRole('region', { name: 'Lịch sử quỹ' }).getByRole('row')).toHaveCount(3);
  expect(pages).toContain('page_2');
  await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Cài đặt quỹ nhóm', exact: true });
  await page.setViewportSize({ width: 1440, height: 960 });
  const generalFields = dialog.getByRole('definition');
  await expect(generalFields.filter({ hasText: 'VND' }).first()).toHaveCSS(
    'border-top-width',
    '1px',
  );
  await expect(dialog.getByRole('heading', { name: 'Thông tin chung', exact: true })).toHaveCSS(
    'font-size',
    '24px',
  );
  await page.screenshot({ path: test.info().outputPath('fund-general-boxes-desktop.png') });
  for (const width of [402, 320]) {
    await page.setViewportSize({ width, height: 760 });
    await expect.poll(() => dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`fund-general-boxes-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await dialog.getByRole('button', { name: 'Thông tin nhận tiền', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Đích nhận', exact: true })).toBeVisible();
  const addDestination = dialog.getByRole('button', { name: 'Thêm đích nhận TEST', exact: true });
  const receivingPanel = dialog.getByRole('region', { name: 'Đích nhận', exact: true });
  const addBox = await addDestination.boundingBox();
  const receivingTitleBox = await receivingPanel
    .getByRole('heading', { name: 'Đích nhận TEST' })
    .boundingBox();
  expect(addBox).not.toBeNull();
  expect(addBox!.x).toBeGreaterThan(receivingTitleBox!.x + receivingTitleBox!.width);
  expect(
    Math.abs(
      addBox!.y + addBox!.height / 2 - (receivingTitleBox!.y + receivingTitleBox!.height / 2),
    ),
  ).toBeLessThan(2);
  await expect(receivingPanel.locator('..').locator('..').locator('..')).toHaveCSS(
    'border-top-width',
    '0px',
  );
  await page.screenshot({ path: test.info().outputPath('fund-receiving-spacing.png') });
  await addDestination.click();
  await expect(dialog.getByLabel('Mã ngân hàng TEST')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  for (const width of [402, 320]) {
    await page.setViewportSize({ width, height: 760 });
    await expect.poll(() => dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect
      .poll(() => dialog.getByRole('form').evaluate((el) => el.scrollWidth <= el.clientWidth))
      .toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.keyboard.press('Escape');
  const discardDialog = page.getByRole('alertdialog', { name: 'Thoát và bỏ bản nháp?' });
  await expect(discardDialog).toBeVisible();
  await expect(discardDialog.getByRole('button', { name: 'Tiếp tục chỉnh sửa' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(discardDialog).toHaveCount(0);
  await expect(dialog.getByLabel('Mã ngân hàng TEST')).toBeVisible();
  await dialog.getByRole('button', { name: 'Trở lại', exact: true }).click();
  await discardDialog.getByRole('button', { name: 'Bỏ bản nháp và thoát' }).click();
  await expect(addDestination).toBeFocused();
  await dialog.getByRole('button', { name: 'Đợt đóng góp', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Tạo đợt thu', exact: true })).toBeDisabled();
  await expect(dialog.getByText('Chưa có khoản đóng góp.', { exact: true })).toBeVisible();
  const requestBox = await dialog
    .getByRole('region', { name: 'Đợt thu', exact: true })
    .boundingBox();
  const contributionBox = await dialog
    .getByRole('region', { name: 'Các khoản đóng góp', exact: true })
    .boundingBox();
  expect(contributionBox!.y - (requestBox!.y + requestBox!.height)).toBe(16);
  await page.screenshot({ path: test.info().outputPath('fund-contributions-spacing.png') });
  await dialog.getByRole('button', { name: 'Thành viên & quyền', exact: true }).click();
  await expect(dialog.getByRole('link', { name: 'Quản lý thành viên chuyến đi' })).toHaveAttribute(
    'href',
    `/trips/${tripId}/members`,
  );
  await dialog.getByRole('button', { name: 'Thông tin chung', exact: true }).click();
  const budgetButton = dialog.getByRole('button', { name: 'Sửa ngân sách', exact: true });
  await budgetButton.click();
  await expect(page.getByRole('heading', { name: 'Sửa ngân sách', exact: true })).toBeFocused();
  await page.screenshot({ path: test.info().outputPath('fund-budget-context-desktop.png') });
  await page.getByRole('button', { name: 'Trở lại', exact: true }).click();
  await discardDialog.getByRole('button', { name: 'Bỏ bản nháp và thoát' }).click();
  await expect(budgetButton).toBeFocused();
  await budgetButton.click();
  await dialog.getByRole('button', { name: 'Đóng cài đặt quỹ', exact: true }).click();
  await discardDialog.getByRole('button', { name: 'Bỏ bản nháp và thoát' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cài đặt quỹ', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
  await budgetButton.click();
  await page.getByLabel('Ngân sách (VND)').fill('1000000');
  await dialog.getByRole('button', { name: 'Thông tin nhận tiền', exact: true }).click();
  await expect(discardDialog).toBeVisible();
  for (const width of [402, 320]) {
    await page.setViewportSize({ width, height: 760 });
    await expect
      .poll(() => discardDialog.evaluate((el) => el.scrollWidth <= el.clientWidth))
      .toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  const discardScan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(discardScan.violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('fund-discard-confirmation.png') });
  await discardDialog.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).click();
  await expect(page.getByRole('heading', { name: 'Sửa ngân sách', exact: true })).toBeFocused();
  await expect(page.getByLabel('Ngân sách (VND)')).toHaveValue('1000000');
  await expect(page.getByLabel('Mã ngân hàng TEST')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Thông tin nhận tiền', exact: true }).click();
  await discardDialog.getByRole('button', { name: 'Bỏ bản nháp và thoát' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'Thông tin nhận tiền', exact: true }),
  ).toBeFocused();
  await expect(page.getByRole('form')).toHaveCount(0);
  expect(writes).toBe(0);
  await dialog.getByRole('button', { name: 'Thông tin chung', exact: true }).click();
  await budgetButton.click();
  await expect(page.getByLabel('Ngân sách (VND)')).toHaveValue('');
  await page.getByLabel('Ngân sách (VND)').fill('1000000');
  // A visible form must also retain its draft through read failure and recovery.
  fundReadFails = true;
  await dialog.getByRole('button', { name: 'Tải lại quỹ' }).click();
  await expect(dialog.getByRole('heading', { name: 'Chưa thể tải nội dung' })).toBeVisible();
  await expect(page.getByLabel('Ngân sách (VND)')).toHaveValue('1000000');
  expect(writes).toBe(0);
  fundReadFails = false;
  await dialog.getByRole('button', { name: 'Tải lại quỹ' }).click();
  await expect(dialog).toContainText('Finance OPEN');
  await expect(page.getByRole('heading', { name: 'Chưa thể tải nội dung' })).toHaveCount(0);
  await expect(page.getByLabel('Ngân sách (VND)')).toHaveValue('1000000');
  expect(writes).toBe(0);
  await page.getByRole('button', { name: 'Xác nhận · Sửa ngân sách', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Thông tin chung', exact: true })).toBeFocused();
  await expect(dialog.getByText(/Đang chờ kết nối phục hồi/)).toBeVisible();
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
  await page.getByRole('button', { name: 'Cài đặt quỹ', exact: true }).click();
  for (const width of [1440, 1366, 1024, 820, 768, 402, 320]) {
    await page.setViewportSize({ width, height: 874 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await expect.poll(() => dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('fund-overlay-' + width + '.png') });
  }
  const overlayScan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(overlayScan.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Cài đặt quỹ', exact: true })).toBeFocused();
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
  await page
    .getByRole('button', { name: 'Tải lại quỹ', includeHidden: true })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
  await expect(
    page.getByRole('heading', { name: 'Chưa thể tải nội dung', includeHidden: true }),
  ).toBeVisible();
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
    await page.screenshot({
      path: test.info().outputPath(`fund-setup-${width}.png`),
      fullPage: true,
    });
  }

  await page.getByRole('button', { name: 'Đóng biểu mẫu bật quỹ' }).click();
  // A failed read removed the trigger; focus returns to the recovery control.
  await expect(page.getByRole('button', { name: 'Tải lại quỹ' })).toBeFocused();
});
