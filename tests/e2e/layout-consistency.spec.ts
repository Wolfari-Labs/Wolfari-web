import { test, expect, type Page } from '@playwright/test';

/**
 * Insurance against layout drift: every trip-workspace route shares the Web v2 content frame,
 * the W/Trip header card (Figma 937:7647) and its embedded breadcrumb. Tolerance is 1px.
 */
const tripId = '11111111-1111-4111-8111-111111111111';
// The overview keeps develop's Figma layout (full-width hero, no breadcrumb), verified by
// trip-overview.spec.ts; the declutter frame D1-D3 is still a pending delta for that route.
const routes = [
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
    // Web v2 (Figma 932:7192/937:7647): 24px gutters, 264px floating sidebar, content origin
    // x=312 y=112; the W/Trip header card is 84px tall and spans to the right gutter.
    const frameLeft = 24 + 264 + 24;
    const expected = {
      x: frameLeft,
      y: 20 + 76 + 16,
      width: viewport.width - frameLeft - 24,
    };
    for (const route of routes) {
      await page.goto(`/trips/${tripId}${route.path}`);
      const label = `${route.name} @${viewport.width}`;
      const box = (await hero(page).boundingBox())!;
      expect(box, `${label} hero`).not.toBeNull();
      near(box.x, expected.x, `${label} hero x`);
      near(box.y, expected.y, `${label} hero y`);
      near(box.width, expected.width, `${label} hero width`);
      near(box.height, 84, `${label} hero height`);

      // The page breadcrumb (with the h1) sits inside the trip header's text column.
      const crumb = (await breadcrumb(page).boundingBox())!;
      near(crumb.y, expected.y + 8, `${label} breadcrumb y`);
      near(crumb.x, expected.x + 88, `${label} breadcrumb x`);

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
    // Web v2 W04: four stat tiles over itinerary, map and the fare/weather column.
    near(lower[0]!.left, kpi[0]!.left, 'itinerary left = KPI 1 left');
    near(lower[2]!.right, kpi[3]!.right, 'fare/weather right = KPI 4 right');
  });
}
