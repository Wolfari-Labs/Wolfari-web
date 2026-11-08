import { test, login } from './gateway-fixture';
import { checkTripWidths, tripWidthCases } from '../trip-width-check';

for (const { width, collapsed } of tripWidthCases) {
  test(`HTTP mock Fund and Fare match Plan width at ${width}, collapsed=${collapsed}`, async ({
    page,
    gateway,
  }, info) => {
    void gateway;
    await page.setViewportSize({ width, height: 960 });
    await login(page);
    await checkTripWidths(page, width, collapsed, info);
  });
}
