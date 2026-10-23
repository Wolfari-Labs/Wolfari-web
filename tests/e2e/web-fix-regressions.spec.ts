import { expect, test, type Page } from '@playwright/test';

const trip = '/trips/11111111-1111-4111-8111-111111111111';

async function openEditor(page: Page, title: string) {
  const summary = page.getByLabel(`Xem hoạt động ${title}`, { exact: true });
  const details = page.locator('details').filter({ has: summary });
  if (!(await details.getAttribute('open'))) {
    // The boolean attribute is an empty string when present.
    if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open)))
      await summary.click();
  }
  await details.getByRole('button', { name: 'Chỉnh sửa hoạt động' }).click();
  return page.getByRole('dialog', { name: 'Chỉnh sửa hoạt động' });
}

test('Settings updates keep cached Trip, Plan and shell projections consistent across navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`${trip}/plan`);
  await expect(page.getByText('Bán đảo Sơn Trà', { exact: true })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Điều hướng chuyến đi' });
  await navigation.locator(`a[href="${trip}/settings"]`).click();
  await page.getByRole('button', { name: 'Chỉnh sửa thông tin' }).click();
  await page.getByLabel('Tên chuyến đi', { exact: true }).fill('Updated shared trip');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText('Đã lưu thông tin chuyến đi.')).toBeVisible();
  for (const [suffix, content] of [
    ['/plan', 'Bán đảo Sơn Trà'],
    ['', 'Updated shared trip'],
    ['/map', 'Chùa Linh Ứng'],
    ['/packing', 'Kem chống nắng'],
    ['/dress-code', 'Thoải mái và gọn nhẹ'],
  ]) {
    await navigation.locator(`a[href="${trip}${suffix}"]`).click();
    await expect(page.getByText(content!, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dữ liệu đã thay đổi' })).toHaveCount(0);
  }
});

test('two tabs preserve edits to different activities and reload the combined draft', async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await Promise.all([page.goto(`${trip}/plan`), other.goto(`${trip}/plan`)]);
  const first = await openEditor(page, 'Bán đảo Sơn Trà');
  const second = await openEditor(other, 'Ăn trưa hải sản');
  await first.getByLabel('Tên hoạt động').fill('Tab A first activity');
  await second.getByLabel('Tên hoạt động').fill('Tab B second activity');
  await Promise.all([
    first.getByRole('button', { name: 'Lưu thay đổi' }).click(),
    second.getByRole('button', { name: 'Lưu thay đổi' }).click(),
  ]);
  await expect(first).toHaveCount(0);
  await expect(second).toHaveCount(0);
  for (const tab of [page, other]) {
    await expect(tab.getByText('Tab A first activity', { exact: true })).toBeVisible();
    await expect(tab.getByText('Tab B second activity', { exact: true })).toBeVisible();
    await tab.reload();
    await expect(tab.getByText('Tab A first activity', { exact: true })).toBeVisible();
    await expect(tab.getByText('Tab B second activity', { exact: true })).toBeVisible();
  }
});

test('same-activity conflict preserves typed input until explicit reload or cancel', async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await Promise.all([page.goto(`${trip}/plan`), other.goto(`${trip}/plan`)]);
  const first = await openEditor(page, 'Bán đảo Sơn Trà');
  const second = await openEditor(other, 'Bán đảo Sơn Trà');
  await second.getByLabel('Tên hoạt động').fill('Keep my unsaved input');
  await first.getByLabel('Tên hoạt động').fill('Remote saved activity');
  await first.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(first).toHaveCount(0);
  await expect(second.getByText(/Hoạt động đã thay đổi ở tab khác/)).toBeVisible();
  await expect(second.getByLabel('Tên hoạt động')).toHaveValue('Keep my unsaved input');
  await expect(second.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
  await second.getByRole('button', { name: 'Nạp bản mới' }).click();
  await expect(second.getByLabel('Tên hoạt động')).toHaveValue('Remote saved activity');
  await expect(second.getByRole('button', { name: 'Lưu thay đổi' })).toBeEnabled();
  await second.getByLabel('Tên hoạt động').fill('Discard this');
  await second.getByRole('button', { name: 'Hủy', exact: true }).click();
  await other.reload();
  await expect(other.getByText('Remote saved activity', { exact: true })).toBeVisible();
});

for (const failure of ['getter', 'quota'] as const) {
  test(`Plan, Map and CreateTrip remain usable with ${failure} storage failure`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((mode) => {
      if (mode === 'getter') {
        for (const kind of ['localStorage', 'sessionStorage'])
          Object.defineProperty(window, kind, {
            configurable: true,
            get() {
              throw new DOMException('Blocked', 'SecurityError');
            },
          });
      } else {
        Storage.prototype.setItem = () => {
          throw new DOMException('Full', 'QuotaExceededError');
        };
      }
    }, failure);
    await page.goto(`${trip}/plan`);
    const editor = await openEditor(page, 'Bán đảo Sơn Trà');
    await editor.getByLabel('Tên hoạt động').fill('Memory only activity');
    await editor.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(editor).toHaveCount(0);
    await expect(page.getByText('Memory only activity', { exact: true })).toBeVisible();
    await expect(page.getByText(/Bản nháp chỉ được giữ trong bộ nhớ của tab này/)).toBeVisible();
    await page.goto(`${trip}/map`);
    await page.getByRole('checkbox', { name: 'Bỏ chọn Chùa Linh Ứng' }).click();
    await expect(page.getByRole('checkbox', { name: 'Bỏ chọn Chùa Linh Ứng' })).toHaveCount(0);
    await expect(page.getByText(/Lựa chọn chỉ được giữ trong bộ nhớ của tab này/)).toBeVisible();
    await page.goto('/trips/new');
    await page.getByLabel('Tên chuyến đi', { exact: true }).fill('Memory only trip');
    await expect(page.getByText(/Bản nháp chỉ được giữ trong bộ nhớ của tab này/)).toBeVisible();
    await expect(page.getByLabel('Tên chuyến đi', { exact: true })).toHaveValue('Memory only trip');
    expect(errors).toEqual([]);
  });
}

test('Fund tabs support arrows, wraparound, Home, End and Tab with synchronized panels', async ({
  page,
}) => {
  await page.goto(`${trip}/fund`);
  const tabs = page.getByRole('tablist', { name: 'Các vùng quỹ' });
  await tabs.getByRole('tab', { name: 'Chi quỹ', exact: true }).focus();
  for (const [key, title] of [
    ['ArrowRight', 'Đóng góp'],
    ['End', 'Lịch sử'],
    ['ArrowRight', 'Chi quỹ'],
    ['ArrowLeft', 'Lịch sử'],
    ['Home', 'Chi quỹ'],
  ]) {
    await page.keyboard.press(key!);
    const active = tabs.getByRole('tab', { name: title!, exact: true });
    await expect(active).toBeFocused();
    await expect(active).toHaveAttribute('aria-selected', 'true');
    await expect(active).toHaveAttribute('tabindex', '0');
    await expect(page.getByRole('tabpanel', { name: title!, exact: true })).toBeVisible();
  }
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tabpanel', { name: 'Chi quỹ', exact: true })).toBeFocused();
});
