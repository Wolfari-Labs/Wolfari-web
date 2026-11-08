import { expect, type Page } from '@playwright/test';

export async function assertOverviewCardLayout(page: Page) {
  const summaries = page.locator('[data-region="trip-overview-summaries"] > section');
  const panels = page.locator(
    '[data-region="trip-overview-itinerary"], [data-region="trip-overview-map"], ' +
      '[data-region="trip-overview-fare"], [data-region="trip-overview-postcard"]',
  );
  for (const card of [...(await summaries.all()), ...(await panels.all())]) {
    await expect(card).toHaveCSS('border-radius', '6px');
    await expect(card).toHaveCSS('border-color', 'rgb(166, 217, 242)');
    await expect(card).toHaveCSS('border-width', '1px');
  }
  for (const row of await page.locator('[data-region="trip-overview-itinerary"] ol > li').all()) {
    await expect(row).toHaveCSS('border-radius', '6px');
  }
  if (page.viewportSize()!.width <= 1100) return;
  for (const [upper, lower] of [
    ['fund', 'map'],
    ['packing', 'fare'],
  ]) {
    const top = (await page.locator(`[data-region="trip-overview-${upper}"]`).boundingBox())!;
    const bottom = (await page.locator(`[data-region="trip-overview-${lower}"]`).boundingBox())!;
    expect(Math.abs(top.x - bottom.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(top.width - bottom.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(top.x + top.width - bottom.x - bottom.width)).toBeLessThanOrEqual(1);
  }
}
