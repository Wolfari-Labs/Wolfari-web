import { test, expect, detail, createTrip, login } from '../fixtures';
test(
  'TRIP-001 Trip một ngày có Owner và tồn tại sau reload',
  detail('TRIP-001', ['FR-TR-01', 'BR-01', 'BR-07', 'DR-02', 'AT-02'], 'QuanLyChuyenDi', true),
  async ({ page }, info) => {
    const trip = await createTrip(page, info);
    await page.reload();
    await expect(page.getByRole('heading', { name: trip.name, exact: true })).toBeVisible();
  },
);
test(
  'DASH-001 Trip mới hiển thị đúng trong danh sách của Owner',
  detail('DASH-001', ['FR-TR-01', 'IR-UI-02'], 'TongQuan'),
  async ({ page }, info) => {
    const trip = await createTrip(page, info);
    await page.goto('/trips');
    await expect(page.getByRole('link').filter({ hasText: trip.name }).first()).toBeVisible();
  },
);
test(
  'TRIP-002 Lưu mô tả Trip và đọc lại',
  detail('TRIP-002', ['FR-TR-01', 'DR-03'], 'QuanLyChuyenDi'),
  async ({ page }, info) => {
    const trip = await createTrip(page, info);
    await page.goto(trip.path + '/settings');
    await page.getByRole('button', { name: 'Cài đặt chuyến đi' }).click();
    await page
      .getByRole('textbox', { name: 'Mô tả công khai' })
      .fill('Mô tả tiếng Việt của chuyến đi TEST');
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await expect(page.getByText('Đã lưu thông tin chuyến đi.')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Mô tả tiếng Việt của chuyến đi TEST')).toBeVisible();
  },
);
test(
  'SEC-001 Người ngoài không đọc được Trip vừa tạo',
  detail('SEC-001', ['NFR-SEC-02', 'AT-17'], 'ChatLuongWeb', true),
  async ({ page, browser }, info) => {
    const trip = await createTrip(page, info);
    const outsiderContext = await browser.newContext({ baseURL: process.env.WOLFARI_QA_WEB_URL! });
    try {
      const outsider = await outsiderContext.newPage();
      // Explicit base URL because this is a separate principal/context.
      await outsider.goto(process.env.WOLFARI_QA_WEB_URL!);
      await login(outsider, info, 'OUTSIDER');
      const denied = outsider.waitForResponse(
        (r) => new URL(r.url()).pathname === `/api/v1/trips/${trip.id}`,
      );
      await outsider.goto(trip.path);
      expect([403, 404]).toContain((await denied).status());
      await expect(outsider.getByRole('heading', { name: trip.name, exact: true })).toHaveCount(0);
    } finally {
      await outsiderContext.close();
    }
  },
);
