import { test } from '@playwright/test';
import { checkTripWidths, tripWidthCases } from '../trip-width-check';

for (const { width, collapsed } of tripWidthCases) {
  test(`Preview Fund and Fare match Plan width at ${width}, collapsed=${collapsed}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 960 });
    await checkTripWidths(page, width, collapsed, info);
  });
}
