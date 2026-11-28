import { test, expect } from '@playwright/test';

const route = '/trips/11111111-1111-4111-8111-111111111111/price-watch';

for (const size of [
  { width: 1440, height: 800 },
  { width: 1366, height: 600 },
  { width: 1366, height: 480 },
  { width: 1024, height: 600 },
  { width: 820, height: 600 },
  { width: 768, height: 600 },
  { width: 402, height: 874 },
  { width: 320, height: 600 },
]) {
  test(`Price Watch preview ${size.width}x${size.height}`, async ({ page }, info) => {
    await page.setViewportSize(size);
    const api: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url());
    });
    await page.goto(route);
    await expect(page.locator('[data-region="trip-hero"]')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Đường dẫn' })).toHaveCount(0);
    await expect(page.getByText('2.350.000đ', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Giá mô phỏng, không phải giá thị trường/)).toBeVisible();
    // The source is stated once in plain words; provider codes are not shown.
    await expect(page.getByText(/MOCK_FLIGHT/)).toHaveCount(0);
    const listHeading = page.getByRole('heading', { name: 'Danh sách theo dõi giá vé' });
    const list = page.locator('[data-region="price-watch-list-scroll"]');
    const chart = page.getByRole('region', { name: 'Lịch sử giá vé', exact: true });
    await expect(listHeading).toBeVisible();
    await expect(list).toHaveAttribute('tabindex', '0');
    await expect(chart).toBeVisible();
    const hideChart = page.getByRole('button', { name: 'Ẩn biểu đồ', exact: true });
    await expect(hideChart).toHaveAttribute('aria-expanded', 'true');
    await hideChart.click();
    await expect(chart).toBeHidden();
    await expect(page.getByRole('button', { name: 'Hiện biểu đồ', exact: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      size.width,
    );
    const second = page.getByRole('button', { name: /Minh Anh/ });
    await second.click();
    await expect(second).toHaveAttribute('aria-pressed', 'true');
    await expect(chart).toBeVisible();
    await expect(chart.getByText('Hà Nội → Đà Nẵng', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ẩn biểu đồ', exact: true }).click();
    await page.getByRole('button', { name: 'Hiện biểu đồ', exact: true }).click();
    await expect(chart).toBeVisible();
    await expect(second).toHaveAttribute('aria-pressed', 'true');
    if (size.width >= 1024) {
      const listBounds = (await page
        .locator('[data-region="price-watch-list-heading"]')
        .locator('..')
        .boundingBox())!;
      const chartBounds = (await chart.boundingBox())!;
      expect(chartBounds.x).toBeGreaterThanOrEqual(listBounds.x + listBounds.width - 1);
      expect(Math.abs(chartBounds.y - listBounds.y)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
        size.height + 1,
      );
      await expect(list).toHaveCSS('overflow-y', 'auto');
      if (size.height === 480) {
        const headingY = (await listHeading.boundingBox())!.y;
        await expect
          .poll(() => list.evaluate((element) => element.scrollHeight > element.clientHeight))
          .toBe(true);
        await list.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        expect((await listHeading.boundingBox())!.y).toBeCloseTo(headingY, 1);
      }
    }
    // Another member's watch: only stopping is allowed, from the card's overflow menu.
    await expect(page.getByText('Chỉ người tạo mới chỉnh sửa hoặc tạm dừng được')).toBeVisible();
    await page.getByRole('button', { name: 'Thêm thao tác cho Hà Nội đến Đà Nẵng' }).click();
    await expect(page.getByRole('menuitem', { name: 'Dừng theo dõi' })).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('price-watch.png'), fullPage: true });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Lịch sử giá vé' })).toHaveCSS(
      'border-radius',
      '28px',
    );
    const create = page.getByRole('button', { name: 'Tạo theo dõi', exact: true });
    await create.click();
    const modal = page.getByRole('dialog', { name: 'Tạo theo dõi giá vé' });
    await expect(modal.locator('h2[tabindex="-1"]')).toBeFocused();
    await modal.getByLabel('Sân bay đi (IATA)').fill('DAD');
    await expect.poll(() => modal.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('price-create-overlay.png') });
    await page.keyboard.press('Escape');
    await expect(create).toBeFocused();
    expect(api).toEqual([]);
  });
}

test('Price Watch preserves an old price when provider fails and keeps commands truthful', async ({
  page,
}) => {
  await page.goto(route);
  await page.locator('[data-preview="price-watch"] summary').click();
  const scenario = page.locator('[data-preview="price-watch"] select');
  await scenario.selectOption('provider-error');
  await expect(page.getByText(/giữ lại giá gần nhất/i)).toBeVisible();
  await expect(page.getByText('2.350.000đ', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạm dừng', exact: true })).toBeEnabled();
  // Pause and resume are one toggle: only the valid action is shown.
  await expect(page.getByRole('button', { name: 'Tiếp tục', exact: true })).toHaveCount(0);
  await page.getByText(/Xem dữ liệu lịch sử/).click();
  await expect(page.getByRole('cell', { name: 'Chưa có giá' })).toBeVisible();
  for (const [value, heading] of [
    ['empty', 'Chưa có theo dõi giá nào'],
    ['error', 'Chưa thể tải nội dung'],
    ['forbidden', 'Bạn không có quyền truy cập'],
    ['not-found', 'Không tìm thấy nội dung'],
    ['conflict', 'Dữ liệu đã thay đổi'],
    ['unavailable', 'Chức năng chưa khả dụng'],
  ] as const) {
    await scenario.selectOption(value);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
});

test('Price Watch capability controls explain that preview actions do not mutate data', async ({
  page,
}) => {
  await page.goto(route);
  const actions = page.getByLabel('Thao tác theo dõi');
  await expect(actions).toHaveCount(1);
  await actions.getByRole('button', { name: 'Chỉnh sửa' }).click();
  await expect(actions.getByRole('status')).toContainText('Chưa gửi yêu cầu');
  await expect(actions.getByRole('status')).toContainText('chưa thay đổi theo dõi');
  // How-it-works is a collapsed help, not a permanent column.
  const help = page.locator('details', { has: page.getByText('Cách hoạt động', { exact: true }) });
  await expect(help).not.toHaveAttribute('open', '');
  await help.getByText('Cách hoạt động', { exact: true }).click();
  await expect(help.getByText('Bạn tự đặt vé ở dịch vụ bên ngoài.')).toBeVisible();
  // A paused watch offers only "Tiếp tục"; the selected card stays keyboard-selectable.
  await page.locator('[data-preview="price-watch"] summary').click();
  await page.locator('[data-preview="price-watch"] select').selectOption('paused');
  const paused = page.getByLabel('Thao tác theo dõi');
  await expect(paused.getByRole('button', { name: 'Tiếp tục', exact: true })).toBeEnabled();
  await expect(paused.getByRole('button', { name: 'Tạm dừng', exact: true })).toHaveCount(0);
  const second = page.getByRole('button', { name: /Minh Anh/ });
  await second.focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('aria-pressed', 'true');
});

test('Price Watch empty state offers one real next step', async ({ page }) => {
  await page.goto(route);
  await page.locator('[data-preview="price-watch"] summary').click();
  await page.locator('[data-preview="price-watch"] select').selectOption('empty');
  await expect(page.getByRole('heading', { name: 'Chưa có theo dõi giá nào' })).toBeVisible();
  await page.getByRole('button', { name: 'Tạo theo dõi', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Tạo theo dõi giá vé' })).toBeVisible();
});
