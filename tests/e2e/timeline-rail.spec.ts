import { expect, test } from '@playwright/test';
import { expectTimelineRails } from '../helpers/timeline-geometry';

const tripId = '11111111-1111-4111-8111-111111111111';
const draftKey = `wolfari:plan-draft:v1:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${tripId}`;

for (const width of [1440, 402]) {
  test(`Fixture: timeline rail stops at the last card with 0, 1 and multiple activities at ${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 960 });
    const requests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url());
    });
    await page.goto(`/trips/${tripId}/plan`);
    const list = page.locator('[data-draft-list="DAY"]:visible');
    await expectTimelineRails(list.locator(':scope > [data-draft-activity]'), 4);
    // Persist a real preview edit first, then vary only the dates in this isolated fixture draft.
    await page.getByLabel('Xem hoạt động Bán đảo Sơn Trà').click();
    await page.getByRole('button', { name: 'Chỉnh sửa hoạt động', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    for (const count of [0, 1, 2, 1]) {
      await page.evaluate(
        ({ key, count }) => {
          const draft = JSON.parse(localStorage.getItem(key)!);
          let index = 0;
          for (const activity of draft.activities) {
            if (activity.origin !== 'PLAN') continue;
            activity.scheduledDate = index++ < count ? '2026-09-22' : '2026-09-23';
            activity.startsAt = null;
            activity.endsAt = null;
          }
          localStorage.setItem(key, JSON.stringify(draft));
        },
        { key: draftKey, count },
      );
      await page.reload();
      await expect(list).toBeVisible();
      await expectTimelineRails(list.locator(':scope > [data-draft-activity]'), count);
      if (count === 0)
        await expect(page.getByRole('heading', { name: 'Chưa có nội dung' })).toBeVisible();
      await page.screenshot({ path: info.outputPath(`rail-${count}.png`), fullPage: true });
      if (count === 1) {
        await page.getByLabel('Xem hoạt động Bán đảo Sơn Trà').click();
        // The rail also follows a card that grows when its details are opened.
        await expectTimelineRails(list.locator(':scope > [data-draft-activity]'), 1);
      }
    }
    expect(requests).toEqual([]);
  });
}
