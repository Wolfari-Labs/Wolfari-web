import { test, expect, type Page } from '@playwright/test';

/**
 * UI declutter plan C7: insurance against layout drift. Every trip-workspace route shares one
 * content frame (D1), one header position (D2, D8) and one hero geometry (D3); the overview rows
 * share one line grid (D7). Tolerance is 1px everywhere.
 */
const tripId = '11111111-1111-4111-8111-111111111111';
const routes = [
  { name: 'overview', path: '' },
  { name: 'plan', path: '/plan' },
  { name: 'map', path: '/map' },
  { name: 'dress-code', path: '/dress-code' },
  { name: 'packing', path: '/packing' },
  { name: 'members', path: '/members' },
  { name: 'fund', path: '/fund' },
  { name: 'price-watch', path: '/price-watch' },
  { name: 'settings', path: '/settings' },
] as const;
const viewports = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

const hero = (page: Page) => page.locator('section[aria-label="Thông tin chuyến đi"]');
const breadcrumb = (page: Page) => page.getByRole('navigation', { name: 'Đường dẫn' });

function near(actual: number, expected: number, label: string) {
  expect(Math.abs(actual - expected), label).toBeLessThanOrEqual(1);
}

for (const viewport of viewports) {
  test(`workspace routes share one frame, header and hero at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    // 220px sidebar; the content frame is at most 1220px and centred (D1).
    const area = viewport.width - 220;
    const frame = Math.min(area, 1220);
    const frameLeft = 220 + (area - frame) / 2;
    const expected = { x: frameLeft + 18, y: 76 + 44, width: frame - 40, height: 150 };

    for (const route of routes) {
      await page.goto(`/trips/${tripId}${route.path}`);
      const label = `${route.name} @${viewport.width}`;
      const box = (await hero(page).boundingBox())!;
      expect(box, `${label} hero`).not.toBeNull();
      near(box.x, expected.x, `${label} hero x`);
      near(box.y, expected.y, `${label} hero y`);
      near(box.width, expected.width, `${label} hero width`);
      near(box.height, expected.height, `${label} hero height`);

      const crumb = (await breadcrumb(page).boundingBox())!;
      near(crumb.y, 76 + 8, `${label} breadcrumb y`);
      near(crumb.x, expected.x, `${label} breadcrumb x`);

      const headings = page.getByRole('heading', { level: 1 });
      await expect(headings, `${label} exactly one visible h1`).toHaveCount(1);
      await expect(headings).toBeVisible();
      await expect(headings).toHaveAttribute('aria-current', 'page');
    }
  });
}

for (const viewport of [...viewports, { width: 1366, height: 768 }, { width: 1200, height: 800 }]) {
  test(`overview KPI and workspace rows share column edges at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(`/trips/${tripId}`);
    await expect(page.locator('[data-region="trip-overview-workspace"]')).toBeVisible();
    const edges = async (selector: string) =>
      page.locator(selector).evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right };
        }),
      );
    const kpi = await edges('[data-region="trip-overview-summaries"] > *');
    const lower = await edges('[data-region="trip-overview-workspace"] > *');
    expect(kpi).toHaveLength(4);
    expect(lower).toHaveLength(3);
    // Itinerary spans KPI columns 1-2, the map is column 3, the aside is column 4.
    near(lower[0]!.left, kpi[0]!.left, 'itinerary left = KPI 1 left');
    near(lower[0]!.right, kpi[1]!.right, 'itinerary right = KPI 2 right');
    near(lower[1]!.left, kpi[2]!.left, 'map left = KPI 3 left');
    near(lower[1]!.right, kpi[2]!.right, 'map right = KPI 3 right');
    near(lower[2]!.left, kpi[3]!.left, 'aside left = KPI 4 left');
    near(lower[2]!.right, kpi[3]!.right, 'aside right = KPI 4 right');
  });
}
