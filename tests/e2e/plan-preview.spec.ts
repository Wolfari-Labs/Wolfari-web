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
    if (size.width === 1440) {
      const hero = (await page.getByRole('region', { name: 'Thông tin chuyến đi' }).boundingBox())!;
      for (const [key, expected] of Object.entries({ x: 238, y: 116, width: 1180, height: 150 }))
        expect(
          Math.abs(hero[key as keyof typeof hero] - expected),
          `Figma hero ${key}`,
        ).toBeLessThanOrEqual(4);
    }
    const timeline = page.getByRole('list', { name: 'Các hoạt động trong ngày' });
    await timeline.focus();
    if (size.width > 768) {
      const scrollable = await timeline.evaluate((element) => element.scrollHeight > element.clientHeight);
      if (scrollable) {
        await page.keyboard.press('End');
        await expect.poll(() => timeline.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      }
      expect(await page.evaluate(() => scrollY)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(
        size.height,
      );
    } else {
      await page.locator('[data-preview=plan] > summary').scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
    }
    await page.getByRole('button', { name: /Ngày 2/ }).click();
    await expect(page.getByRole('heading', { name: 'Chưa có nội dung' })).toBeVisible();
    await page.getByRole('button', { name: /Ngày 1/ }).click();
    await expect(page.getByRole('heading', { name: 'Hoạt động đã chọn' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Thêm hoạt động' }).click();
    const pool = page.getByRole('region', { name: 'Hoạt động đã chọn' });
    await expect(pool).toBeVisible();
    await expect(pool.getByText('Chỉ lưu trên thiết bị này')).toBeVisible();
    await expect(pool.getByText('Chùa Linh Ứng', { exact: true })).toBeVisible();
    if (size.width <= 1200)
      await expect(page.getByRole('dialog', { name: 'Thêm hoạt động vào lịch trình' })).toBeVisible();
    await pool.getByRole('button', { name: 'Đóng danh sách hoạt động' }).click();
    await expect(pool).toHaveCount(0);
    await page.getByLabel('Xem hoạt động Bán đảo Sơn Trà').click();
    await expect(
      page.locator('details[open] dd').filter({ hasText: /08:00.*10:30/ }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Chỉnh sửa hoạt động' }).first()).toBeEnabled();
    if (size.width === 1440) {
      const editTrigger = page.getByRole('button', { name: 'Chỉnh sửa hoạt động' }).first();
      await editTrigger.click();
      const editor = page.getByRole('dialog', { name: 'Chỉnh sửa hoạt động' });
      await expect(editor.getByLabel('Địa điểm')).toHaveAttribute('readonly', '');
      await editor.getByLabel('Tên hoạt động').fill('Khám phá Sơn Trà');
      await editor.getByRole('button', { name: 'Lưu thay đổi' }).click();
      await expect(editor).toHaveCount(0);
      await expect(page.getByText('Khám phá Sơn Trà', { exact: true })).toBeVisible();
      await expect(editTrigger).toBeFocused();
    }
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

test('keyboard drag moves an activity between the local pool and the selected day', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto(route);
  await expect(page.getByText('Bán đảo Sơn Trà', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Thêm hoạt động' }).click();
  const pool = page.getByRole('region', { name: 'Hoạt động đã chọn' });
  const timeline = page.getByRole('list', { name: 'Các hoạt động trong ngày' });
  const poolHandle = pool.getByRole('button', { name: 'Kéo hoạt động Chùa Linh Ứng' });
  const poolBox = await pool.boundingBox();
  const timelineBox = await timeline.locator('xpath=ancestor::section[1]').boundingBox();
  expect(poolBox).not.toBeNull();
  expect(timelineBox).not.toBeNull();
  expect(Math.abs(poolBox!.height - timelineBox!.height)).toBeLessThanOrEqual(2);
  await poolHandle.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await expect(pool.getByText('Chùa Linh Ứng', { exact: true })).toHaveCount(0);
  await expect(timeline.getByText('Chùa Linh Ứng', { exact: true }).first()).toBeVisible();
  await expect(timeline.locator('time').filter({ hasText: 'Chưa xếp giờ' }).first()).toBeVisible();

  const timelineHandle = timeline.getByRole('button', { name: 'Kéo hoạt động Chùa Linh Ứng' });
  await timelineHandle.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await expect(timeline.getByText('Chùa Linh Ứng', { exact: true })).toHaveCount(0);
  await expect(pool.getByText('Chùa Linh Ứng', { exact: true })).toBeVisible();
});
