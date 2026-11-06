import { expect, login, test } from './gateway-fixture';
import { mockPlan } from './plan-fixture';
import { expectTimelineRails } from '../helpers/timeline-geometry';

const tripId = '11111111-1111-4111-8111-111111111111';

for (const width of [1440, 402]) {
  for (const readOnly of [false, true]) {
    test(`HTTP mock: timeline rails follow visible activities at ${width}, readOnly=${readOnly}`, async ({
      page,
      gateway,
    }, info) => {
      await page.setViewportSize({ width, height: 960 });
      const mock = await mockPlan(page, gateway);
      mock.controls.forbidden = readOnly;
      const activities = mock.activities.map((activity) => ({
        ...activity,
        scheduled_date: '2026-11-01',
      }));
      await login(page);
      for (const count of [0, 1, 2, 1]) {
        mock.activities.splice(0, mock.activities.length, ...activities.slice(0, count));
        await page.goto(`/trips/${tripId}/plan`);
        const list = page.locator('[data-gateway-list="2026-11-01"]');
        await expect(list).toBeVisible();
        await expectTimelineRails(list.locator(':scope > [data-plan-activity]'), count);
        if (count === 0)
          await expect(
            list.getByText('Ngày chưa có hoạt động. Kéo hoạt động vào đây.'),
          ).toBeVisible();
        await page.screenshot({ path: info.outputPath(`rail-${count}.png`), fullPage: true });

        // Each ALL group owns its final rail, not the following group or end-drop row.
        await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
        await expectTimelineRails(list.locator(':scope > [data-plan-activity]'), count);
        await expectTimelineRails(
          page.locator('[data-gateway-list="2026-11-02"] > [data-plan-activity]'),
          0,
        );
      }
      expect(mock.writes).toEqual([]);
    });
  }
}
