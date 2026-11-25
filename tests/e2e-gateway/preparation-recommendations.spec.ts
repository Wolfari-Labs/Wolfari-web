import { expect, login, test } from './gateway-fixture';
import AxeBuilder from '@axe-core/playwright';

const tripId = '11111111-1111-4111-8111-111111111111';
const recommendationId = '22222222-2222-4222-8222-222222222222';
const itemId = 'a'.repeat(24);
const activityId = '33333333-3333-4333-8333-333333333333';

for (const module of ['packing', 'dress-code'] as const) {
  test(`HTTP mock: ${module} previews server suggestions and applies only selected items`, async ({
    page,
    gateway,
  }, testInfo) => {
    const packing = module === 'packing';
    await page.setViewportSize(
      packing ? { width: 1440, height: 900 } : { width: 402, height: 874 },
    );
    const trip = gateway.trips[0]!;
    let previews = 0;
    const writes: { body: unknown; key: string | undefined }[] = [];
    const proposal = {
      id: recommendationId,
      trip_id: tripId,
      type: packing ? 'PACKING' : 'DRESS_CODE',
      status: 'PREVIEWED',
      rule_version: 'v1',
      base_plan_version: 1,
      applied_plan_version: null,
      expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
      can_apply: true,
      items: [
        {
          id: itemId,
          kind: packing ? 'PACKING' : 'DRESS_CODE',
          ...(packing
            ? { packing_item: { name: 'Áo mưa', quantity: '1', unit: 'cái' } }
            : {
                dress_code: {
                  label: 'Trang phục đi bộ',
                  description: 'Giày thoải mái.',
                  activity_id: activityId,
                },
              }),
          reasons: ['Phù hợp với hoạt động đã lên lịch.'],
          warnings: [],
          rule_ids: ['PK-WALK'],
        },
      ],
      warnings: [],
      sources: [],
    };
    await page.route(`**/api/v1/trips/${tripId}/plan`, async (route) =>
      route.fulfill({
        json: {
          data: {
            trip_id: tripId,
            plan_version: trip.plan_version,
            export_revision: trip.export_revision,
            selected_locations: [],
            dress_codes: [],
            packing_items: [],
            activities: [],
            capabilities: { dress_codes_write: true, packing_write: true },
            permissions: { can_read: true, can_edit: true, can_complete: true },
          },
          meta: {},
        },
      }),
    );
    await page.route(`**/api/v1/trips/${tripId}/recommendations`, async (route) => {
      previews++;
      expect(route.request().postDataJSON()).toEqual({ type: packing ? 'PACKING' : 'DRESS_CODE' });
      return route.fulfill({ status: 201, json: { data: proposal, meta: {} } });
    });
    await page.route(`**/api/v1/recommendations/${recommendationId}/apply`, async (route) => {
      writes.push({
        body: route.request().postDataJSON(),
        key: route.request().headers()['idempotency-key'],
      });
      if (packing && writes.length === 1)
        return route.fulfill({
          status: 503,
          json: {
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Try again', retryable: true },
            meta: {},
          },
        });
      trip.plan_version = 2;
      trip.export_revision = 2;
      return route.fulfill({
        json: {
          data: {
            ...proposal,
            status: 'APPLIED',
            applied_plan_version: 2,
            can_apply: false,
            applied: {
              item_ids: [itemId],
              created: [
                {
                  item_id: itemId,
                  id: activityId,
                  entity_type: packing ? 'PACKING_ITEM' : 'DRESS_CODE',
                },
              ],
              skipped: [],
            },
          },
          meta: {},
        },
      });
    });
    await login(page);
    await page.goto(`/trips/${tripId}/${module}`);
    await page
      .getByRole('button', { name: packing ? 'Gợi ý hành lý' : 'Gợi ý trang phục', exact: true })
      .click();
    const drawer = page.getByRole('dialog', {
      name: packing ? 'Gợi ý hành lý' : 'Gợi ý trang phục',
      exact: true,
    });
    expect(previews).toBe(0);
    await drawer.getByRole('button', { name: 'Tạo gợi ý', exact: true }).click();
    const choice = drawer.getByRole('checkbox', {
      name: packing ? 'Áo mưa' : 'Trang phục đi bộ',
      exact: true,
    });
    await expect(choice).toBeVisible();
    expect(writes).toHaveLength(0);
    await choice.check();
    await drawer.getByRole('button', { name: 'Áp dụng mục đã chọn', exact: true }).click();
    if (packing) {
      await expect(drawer.getByText(/Chưa rõ kết quả lưu/)).toBeVisible();
      await drawer.getByRole('button', { name: 'Đối soát dữ liệu', exact: true }).click();
      await drawer.getByRole('button', { name: 'Kiểm tra lại lệnh cũ', exact: true }).click();
      expect(writes).toHaveLength(2);
      expect(writes[1]).toEqual(writes[0]);
    } else {
      await expect(drawer.getByText(/Đã thêm 1 mục/)).toBeVisible();
      expect(writes).toHaveLength(1);
    }
    expect(writes[0]!.body).toEqual({ item_ids: [itemId], expected_plan_version: 1 });
    expect(writes[0]!.key).toBeTruthy();
    await expect(drawer.getByText(/Đã thêm 1 mục/)).toBeVisible();
    await expect(
      drawer.getByRole('button', { name: 'Áp dụng mục đã chọn', exact: true }),
    ).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    const scan = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(scan.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${module}-suggestions.png`) });
  });
}
