import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import { expect, login, test } from './gateway-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';
const before = process.env.CP08_PHASE === 'before';
const viewports = before
  ? [{ width: 1440, height: 960 }]
  : [
      { width: 1440, height: 960 },
      { width: 820, height: 900 },
      { width: 768, height: 1024 },
      { width: 402, height: 874 },
      { width: 320, height: 600 },
      { width: 1366, height: 520 },
    ];

for (const view of ['members', 'invitations', 'policy', 'recipient'] as const) {
  for (const viewport of viewports) {
    test(`CP08 HTTP mock ${before ? 'before' : 'composition'}: ${view} ${viewport.width}x${viewport.height}`, async ({
      page,
      gateway,
    }, info) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({
        reducedMotion: viewport.width === 402 ? 'no-preference' : 'reduce',
      });
      await login(page);
      if (view === 'recipient') {
        // Synthetic HTTP-mock token only. It must be scrubbed before any screenshot.
        await page.goto(`/invitations#token=inv1_${'a'.repeat(43)}`);
        await expect(page).toHaveURL(/\/invitations$/);
        await expect(page.getByRole('button', { name: 'Chấp nhận', exact: true })).toBeVisible();
      } else {
        await page.goto(`/trips/${tripId}/members`);
        await expect(page.getByRole('region', { name: 'Danh sách thành viên' })).toBeVisible();
        if (view !== 'members') {
          await page
            .getByRole('button', {
              name: view === 'policy' ? 'Quyền sửa lịch trình' : 'Lời mời',
              exact: true,
            })
            .click();
          await expect(
            page.getByRole('heading', {
              name: view === 'policy' ? 'Quyền sửa lịch trình' : 'Mời thành viên',
              exact: true,
            }),
          ).toBeVisible();
        }
      }
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      await page.screenshot({ path: info.outputPath(`${view}-full.png`), fullPage: true });
      if (!before) {
        const root = page.locator(
          view === 'recipient'
            ? '[data-flow="invitation-response"]'
            : '[data-flow="gateway-members"]',
        );
        await expect(root).toBeVisible();
        if (view === 'members' || view === 'policy' || view === 'invitations') {
          const primary = root.locator('[data-cp08-primary]');
          const secondary = root.locator('[data-cp08-secondary]');
          const a = (await primary.boundingBox())!;
          const b = (await secondary.boundingBox())!;
          if (viewport.width <= 1100) expect(b.y).toBeGreaterThanOrEqual(a.y + a.height - 1);
          else expect(b.x).toBeGreaterThanOrEqual(a.x + a.width - 1);
        }
        if (viewport.width === 1440 || viewport.width === 402) {
          const scan = await new AxeBuilder({ page })
            .include(
              view === 'recipient'
                ? '[data-flow="invitation-response"]'
                : '[data-flow="gateway-members"]',
            )
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze();
          await writeFile(
            info.outputPath('axe-route.json'),
            JSON.stringify(scan.violations, null, 2),
          );
          expect(scan.violations).toEqual([]);
        }
      }
      expect(
        gateway.calls.filter(
          (call) => call.path.startsWith(`/api/v1/trips/${tripId}/`) && call.method !== 'GET',
        ),
      ).toEqual([]);
    });
  }
}
