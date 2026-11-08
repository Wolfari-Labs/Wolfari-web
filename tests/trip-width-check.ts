import { expect, type Page, type TestInfo } from '@playwright/test';

export const tripWidthCases = [
  { width: 1920, collapsed: false },
  { width: 1920, collapsed: true },
  { width: 1440, collapsed: false },
  { width: 1200, collapsed: false },
  { width: 820, collapsed: false },
  { width: 768, collapsed: false },
  { width: 402, collapsed: false },
  { width: 320, collapsed: false },
] as const;

export async function checkTripWidths(
  page: Page,
  width: number,
  collapsed: boolean,
  info: TestInfo,
) {
  let plan: { x: number; width: number } | undefined;
  for (const route of ['plan', 'fund', 'price-watch']) {
    await page.goto(`/trips/11111111-1111-4111-8111-111111111111/${route}`);
    const hero = page.locator('[data-region="trip-hero"]');
    await expect(hero).toBeVisible();
    if (collapsed) await page.getByRole('button', { name: 'Thu gọn thanh điều hướng' }).click();
    const box = (await hero.boundingBox())!;
    if (route === 'plan') plan = box;
    else {
      expect(Math.abs(box.x - plan!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.width - plan!.width)).toBeLessThanOrEqual(1);
      const content = page.locator(
        route === 'fund' ? '[data-finance-transactions]' : '[data-region="price-watch-workspace"]',
      );
      if (await content.count()) {
        const contentBox = (await content.boundingBox())!;
        expect(Math.abs(contentBox.x - box.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(contentBox.width - box.width)).toBeLessThanOrEqual(1);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    expect(
      await page.getByRole('main').evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(1);
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: info.outputPath(`${route}-${width}-${collapsed ? 'collapsed' : 'expanded'}.png`),
    });
  }
}
