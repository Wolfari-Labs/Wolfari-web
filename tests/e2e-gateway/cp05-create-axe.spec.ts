import AxeBuilder from '@axe-core/playwright';
import { expect, test, login } from './gateway-fixture';
import { writeFile } from 'node:fs/promises';

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 402, height: 874 },
]) {
  test(`CP05 Gateway Create axe review ${viewport.width}`, async ({ page, gateway }, info) => {
    void gateway;
    await page.setViewportSize(viewport);
    await login(page);
    await page.goto('/trips/new');
    await expect(page.locator('[data-flow="create-trip"]')).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    await writeFile(
      info.outputPath('axe-create.json'),
      JSON.stringify(
        scan.violations.map(({ id, impact, nodes }) => ({
          id,
          impact,
          nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
        })),
        null,
        2,
      ),
    );
    expect(scan.violations, `Gateway Create ${viewport.width}px`).toEqual([]);
  });
}
