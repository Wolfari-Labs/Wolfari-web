import { expect, type Page } from '@playwright/test';

export async function assertOverviewCardLayout(page: Page) {
  const summaries = page.locator('[data-region="trip-overview-summaries"] > section');
  const panels = page.locator(
    '[data-region="trip-overview-itinerary"], [data-region="trip-overview-map"], ' +
      '[data-region="trip-overview-fare"], [data-region="trip-overview-postcard"]',
  );
  // Web v2 W04 (Figma 932:7192): borderless 28px tiles/cards and 26px D/Activity rows.
  for (const card of [...(await summaries.all()), ...(await panels.all())]) {
    await expect(card).toHaveCSS('border-radius', '28px');
    await expect(card).toHaveCSS('border-width', '0px');
  }
  for (const row of await page.locator('[data-region="trip-overview-itinerary"] ol > li').all()) {
    await expect(row).toHaveCSS('border-radius', '26px');
  }
  if (page.viewportSize()!.width <= 1100) return;
  // The stat row and the itinerary / map / side-column row share their outer edges.
  const day = (await page.locator('[data-region="trip-overview-day"]').boundingBox())!;
  const itinerary = (await page.locator('[data-region="trip-overview-itinerary"]').boundingBox())!;
  const weather = (await summaries.last().boundingBox())!;
  const fare = (await page.locator('[data-region="trip-overview-fare"]').boundingBox())!;
  expect(Math.abs(day.x - itinerary.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(weather.x + weather.width - fare.x - fare.width)).toBeLessThanOrEqual(1);
}
