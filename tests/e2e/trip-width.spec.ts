import { test } from '@playwright/test';
import { checkTripWidths, tripWidthCases } from '../trip-width-check';

test.use({ baseURL: process.env.PLAYWRIGHT_OVERVIEW_URL ?? 'http://127.0.0.1:5173' });
for (const { width, collapsed } of tripWidthCases) {
  test(`Preview Fund and Fare match Plan width at ${width}, collapsed=${collapsed}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 960 });
    await checkTripWidths(page, width, collapsed, info);
  });
}
