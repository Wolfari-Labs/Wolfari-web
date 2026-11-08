import { expect, test, type Page } from '@playwright/test';

const tripMap = '/trips/11111111-1111-4111-8111-111111111111/map';
const viewports = [
  { width: 1440, height: 900 },
  { width: 1366, height: 800 },
  { width: 1101, height: 800 },
  { width: 1024, height: 900 },
  { width: 820, height: 900 },
  { width: 769, height: 900 },
  { width: 768, height: 900 },
  { width: 402, height: 900 },
  { width: 320, height: 700 },
] as const;

async function installPlacesMock(page: Page) {
  await page.addInitScript(() => {
    const places = Array.from({ length: 35 }, (_, index) => ({
      id: `nearby-${index}`,
      displayName: { text: `Gợi ý Đà Nẵng ${String(index + 1).padStart(2, '0')}` },
      formattedAddress: `Đà Nẵng ${index + 1}`,
      location: { lat: 16.05 + index / 10_000, lng: 108.21 + index / 10_000 },
      types: ['tourist_attraction'],
    }));
    Object.defineProperty(window, 'google', {
      configurable: true,
      value: {
        maps: {
          importLibrary: async () => ({
            Place: {
              searchNearby: async () => ({ places }),
              searchByText: async () => ({ places }),
            },
          }),
        },
      },
    });
  });
}

for (const viewport of viewports) {
  test(`Map layout and place scrolling fit ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installPlacesMock(page);
    await page.goto(tripMap);

    const list = page.locator('[data-region="place-list"]');
    await expect(list.getByText('Gợi ý Đà Nẵng 35')).toHaveCount(1);
    await page.screenshot({ path: test.info().outputPath('map.png'), fullPage: true });
    await page.screenshot({ path: test.info().outputPath('map-viewport.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );

    const listMetrics = await list.evaluate((element) => ({
      overflowY: getComputedStyle(element).overflowY,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
    if (viewport.width > 768) {
      expect(listMetrics.overflowY).toBe('auto');
      expect(listMetrics.scrollHeight).toBeGreaterThan(listMetrics.clientHeight);
    } else {
      expect(listMetrics.overflowY).toBe('visible');
      expect(listMetrics.scrollHeight).toBeLessThanOrEqual(listMetrics.clientHeight + 1);
    }

    if (viewport.width >= 1101) {
      const placePanel = await page.locator('[data-region="place-panel"]').boundingBox();
      const mapPanel = await page.locator('[data-region="map-panel"]').boundingBox();
      expect(placePanel).not.toBeNull();
      expect(mapPanel).not.toBeNull();
      expect(Math.abs(placePanel!.width / mapPanel!.width - 470 / 694)).toBeLessThanOrEqual(0.01);
    }
    if (viewport.width === 1440) {
      const route = page.locator('[data-region="map-panel"]').getByRole('combobox');
      await expect(route).toHaveCSS('color', 'rgb(255, 255, 255)');
      await expect(route).toHaveCSS('background-color', 'rgb(0, 107, 146)');
      await expect(route).toHaveCSS('font-weight', '600');
      const icons = page.getByLabel('Chú thích trạng thái địa điểm').locator('[aria-hidden]');
      await expect(icons).toHaveCount(3);
      for (const icon of await icons.all()) {
        const circle = (await icon.locator('img').nth(0).boundingBox())!;
        const glyph = (await icon.locator('img').nth(1).boundingBox())!;
        expect(Math.abs(circle.x + circle.width / 2 - glyph.x - glyph.width / 2)).toBeLessThan(0.5);
        expect(Math.abs(circle.y + circle.height / 2 - glyph.y - glyph.height / 2)).toBeLessThan(
          0.5,
        );
      }
    }
  });
}

test('Collapsed sidebar icon points toward the content', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(tripMap);
  await page.getByRole('button', { name: 'Thu gọn thanh điều hướng' }).click();
  const icon = page.getByRole('button', { name: 'Mở rộng thanh điều hướng' }).locator('svg');
  await expect(icon).toHaveCSS('transform', 'none');
});

test('Map filters use semantic status colors and accessible targets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await installPlacesMock(page);
  await page.goto(tripMap);
  const filters = page.getByRole('group', { name: 'Lọc địa điểm' });
  const all = filters.getByRole('button', { name: 'Tất cả' });
  const selected = filters.getByRole('button', { name: /Đã chọn/ });
  const scheduled = filters.getByRole('button', { name: /Trong lịch/ });
  const unscheduled = filters.getByRole('button', { name: /Chưa xếp/ });

  await expect(all).toHaveCSS('background-color', 'rgb(0, 127, 153)');
  await expect(selected).toHaveCSS('background-color', 'rgb(233, 248, 251)');
  await expect(scheduled).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(scheduled).toHaveCSS('border-color', 'rgb(205, 231, 242)');
  await expect(unscheduled).toHaveCSS('background-color', 'rgb(255, 247, 222)');
  for (const target of [all, selected, scheduled, unscheduled]) {
    expect((await target.boundingBox())!.height).toBe(26);
  }

  const addButton = page.getByRole('button', { name: 'Chọn Gợi ý Đà Nẵng 01' });
  const targetSize = await addButton.boundingBox();
  expect(targetSize!.width).toBeGreaterThanOrEqual(44);
  expect(targetSize!.height).toBeGreaterThanOrEqual(44);
});

test('Preview map selection uses +, status-only checks, and a separate removable yellow row', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await installPlacesMock(page);
  await page.goto(tripMap);

  const selectedFilter = page.getByRole('button', { name: /Đã chọn/ });
  const list = page.locator('[data-region="place-list"]');
  const add = page.getByRole('button', { name: 'Chọn Gợi ý Đà Nẵng 01' });
  await expect(add).toBeVisible();
  await add.click();
  const state = page.getByRole('img', { name: 'Đã chọn, chưa xếp lịch: Gợi ý Đà Nẵng 01' });
  await expect(state).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Xóa Gợi ý Đà Nẵng 01 khỏi danh sách đã chọn' }),
  ).toBeVisible();
  await state.click();
  await expect(state).toBeVisible();

  const deleteButton = page.getByRole('button', {
    name: 'Xóa Gợi ý Đà Nẵng 01 khỏi danh sách đã chọn',
  });
  // The add operation briefly locks write actions; disabled buttons are skipped by Tab.
  await expect(deleteButton).toBeEnabled();
  const row = list.locator('[data-location-id]').filter({ has: deleteButton });
  await row.locator('[data-place-main]').focus();
  await expect(deleteButton).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(deleteButton).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(row).toHaveAttribute('data-focus-suppressed', 'true');
  await expect(deleteButton).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 88, 0)');

  const main = row.locator('[data-place-main]');
  let mainBox = (await main.boundingBox())!;
  await page.mouse.move(mainBox.x + mainBox.width / 2, mainBox.y + mainBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(mainBox.x + mainBox.width / 2, mainBox.y + mainBox.height / 2 + 12, {
    steps: 2,
  });
  await page.mouse.up();
  await page.waitForTimeout(550);
  await expect(deleteButton).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 88, 0)');

  mainBox = (await main.boundingBox())!;
  await page.mouse.move(mainBox.x + mainBox.width / 2, mainBox.y + mainBox.height / 2);
  await page.mouse.down();
  await main.dispatchEvent('pointercancel', {
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    clientX: mainBox.x + mainBox.width / 2,
    clientY: mainBox.y + mainBox.height / 2,
  });
  await page.mouse.up();
  await page.waitForTimeout(550);
  await expect(deleteButton).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 88, 0)');

  mainBox = (await main.boundingBox())!;
  await page.mouse.move(mainBox.x + mainBox.width / 2, mainBox.y + mainBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(520);
  await expect(deleteButton).toBeVisible();
  await page.mouse.up();
  await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
  await expect(deleteButton).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 88, 0)');

  const box = await row.locator('[data-place-main]').boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 - 96, box!.y + box!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();
  await expect(state).toHaveCount(0);
  await expect(add).toBeVisible();
  await expect(selectedFilter).toContainText('(6)');

  const blueState = page.getByRole('img', { name: /Đã thêm vào lịch trình: Bán đảo Sơn Trà/ });
  await expect(blueState).toBeVisible();
  await expect(page.getByRole('button', { name: /Xóa Bán đảo Sơn Trà/ })).toHaveCount(0);
  await expect(list.getByRole('button', { name: /Chọn Gợi ý Đà Nẵng/ })).toHaveCount(35);
});

test('Preview selected place appears once in the Plan pool and becomes blue after scheduling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await installPlacesMock(page);
  await page.goto(tripMap);
  await page.getByRole('button', { name: 'Chọn Gợi ý Đà Nẵng 01' }).click();
  await page.reload();
  await expect(
    page.getByRole('img', { name: 'Đã chọn, chưa xếp lịch: Gợi ý Đà Nẵng 01' }),
  ).toBeVisible();
  await page.goto(`/trips/11111111-1111-4111-8111-111111111111/plan`);
  await page.getByRole('button', { name: 'Thêm hoạt động', exact: true }).click();
  const localPlaceId = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) =>
      item.startsWith('wolfari:place-selection:v1:'),
    )!;
    const payload = JSON.parse(localStorage.getItem(key)!);
    return payload.places.find(
      (place: { providerPlaceId: string }) => place.providerPlaceId === 'nearby-0',
    ).id as string;
  });
  const pool = page.locator('[data-draft-list="POOL"]:visible');
  const day = page.locator('[data-draft-list="DAY"]:visible');
  const draftId = `draft:${localPlaceId}`;
  const activity = page.locator(`[data-draft-activity="${draftId}"]`);
  const handle = activity.getByRole('button', { name: 'Kéo hoạt động Gợi ý Đà Nẵng 01' });
  await expect(handle).toHaveCount(1);
  await expect(pool.locator(`[data-draft-activity="${draftId}"]`)).toHaveCount(1);
  await handle.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(day).toHaveAttribute('data-insertion-slot', '0');
  await page.keyboard.press('Enter');
  await expect(pool.locator(`[data-draft-activity="${draftId}"]`)).toHaveCount(0);
  await expect(day.locator(`[data-draft-activity="${draftId}"]`)).toHaveCount(1);
  await page.reload();
  await expect(
    page.locator(`[data-draft-list="DAY"]:visible [data-draft-activity="${draftId}"]`),
  ).toHaveCount(1);
  await page.goto(tripMap);
  await expect(
    page.getByRole('img', { name: 'Đã thêm vào lịch trình: Gợi ý Đà Nẵng 01' }),
  ).toBeVisible();
});
