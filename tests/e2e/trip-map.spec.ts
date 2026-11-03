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
      expect(Math.abs(placePanel!.width - mapPanel!.width)).toBeLessThanOrEqual(2);
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

  await expect(all).toHaveCSS('background-color', 'rgb(0, 140, 172)');
  await expect(selected).toHaveCSS('background-color', 'rgb(233, 248, 251)');
  await expect(scheduled).toHaveCSS('background-color', 'rgb(234, 249, 244)');
  await expect(unscheduled).toHaveCSS('background-color', 'rgb(255, 247, 222)');
  for (const target of [all, selected, scheduled, unscheduled]) {
    expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }

  const checkbox = page.getByRole('checkbox', { name: /Chọn Gợi ý Đà Nẵng 01/ });
  const targetSize = await checkbox.evaluate((element) => {
    const label = element.closest('label')!;
    const bounds = label.getBoundingClientRect();
    return { width: bounds.width, height: bounds.height };
  });
  expect(targetSize.width).toBeGreaterThanOrEqual(44);
  expect(targetSize.height).toBeGreaterThanOrEqual(44);
});
