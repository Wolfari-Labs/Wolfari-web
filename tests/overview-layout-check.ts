import { expect, type Page } from '@playwright/test';

export async function assertOverviewCardLayout(page: Page) {
  const summaries = page.locator('[data-region="trip-overview-summaries"] > section');
  const panels = page.locator(
    '[data-region="trip-overview-itinerary"], [data-region="trip-overview-map"]',
  );
  // Web v2: borderless 28px tiles and panels, with separate activity rows.
  for (const card of [...(await summaries.all()), ...(await panels.all())]) {
    await expect(card).toHaveCSS('border-radius', '28px');
    await expect(card).toHaveCSS('border-width', '0px');
  }
  for (const row of await page.locator('[data-region="trip-overview-itinerary"] ol > li').all()) {
    await expect(row).toHaveCSS('border-radius', '26px');
  }
  if (page.viewportSize()!.width <= 1100) return;
  // The stat row (day … fare) and the itinerary / map row share their outer edges.
  const day = (await page.locator('[data-region="trip-overview-day"]').boundingBox())!;
  const itinerary = (await page.locator('[data-region="trip-overview-itinerary"]').boundingBox())!;
  const fare = (await summaries.last().boundingBox())!;
  const side = (await page
    .locator('[data-region="trip-overview-workspace"] > aside')
    .boundingBox())!;
  await expect(summaries.last()).toHaveAttribute('data-region', 'trip-overview-fare');
  expect(Math.abs(day.x - itinerary.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(fare.x + fare.width - side.x - side.width)).toBeLessThanOrEqual(1);
}
