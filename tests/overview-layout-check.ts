import { expect, type Page } from '@playwright/test';

export async function assertOverviewCardLayout(page: Page) {
  const summaries = page.locator('[data-region="trip-overview-summaries"] > section');
  const panels = page.locator(
    '[data-region="trip-overview-itinerary"], [data-region="trip-overview-map"]',
  );
  // Refined Web v2 (V2-D15): borderless 16px (--v2-radius-tile) tiles, cards and activity rows.
  for (const card of [...(await summaries.all()), ...(await panels.all())]) {
    await expect(card).toHaveCSS('border-radius', '16px');
    await expect(card).toHaveCSS('border-width', '0px');
  }
  for (const row of await page.locator('[data-region="trip-overview-itinerary"] ol > li').all()) {
    await expect(row).toHaveCSS('border-radius', '16px');
  }
  if (page.viewportSize()!.width <= 1100) return;
  // The stat row (day … fare) and the itinerary / map row share their outer edges.
  const day = (await page.locator('[data-region="trip-overview-day"]').boundingBox())!;
  const itinerary = (await page.locator('[data-region="trip-overview-itinerary"]').boundingBox())!;
  const fare = (await summaries.last().boundingBox())!;
  const map = (await page.locator('[data-region="trip-overview-map"]').boundingBox())!;
  await expect(summaries.last()).toHaveAttribute('data-region', 'trip-overview-fare');
  expect(Math.abs(day.x - itinerary.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(fare.x + fare.width - map.x - map.width)).toBeLessThanOrEqual(1);
}
