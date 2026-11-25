import { readFile } from 'node:fs/promises';
import { test, expect } from './gateway-fixture';

const tripId = '11111111-1111-4111-8111-111111111111';

function planPdf() {
  const content = 'BT /F1 18 Tf 40 780 Td (Wolfari trip plan preview) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let document = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = Buffer.byteLength(document);
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xrefOffset = Buffer.byteLength(document);
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  document += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(document);
}

test('HTTP mock: preview the trip plan before downloading the same PDF', async ({
  page,
  gateway,
}) => {
  gateway.authenticated = true;
  const pdf = planPdf();
  let pdfReads = 0;
  await page.route(`**/api/v1/trips/${tripId}/plan.pdf`, async (route) => {
    pdfReads += 1;
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer e2e-memory-token');
    await route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      headers: { 'Cache-Control': 'no-store' },
      body: pdf,
    });
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`/trips/${tripId}/settings`);
  await page.getByRole('button', { name: 'Cài đặt chuyến đi', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Cài đặt chuyến đi', exact: true });
  const navigation = dialog.getByRole('navigation', { name: 'Mục cài đặt chuyến đi' });
  await expect(navigation.getByRole('button')).toHaveText([
    'Chỉnh sửa thông tin',
    'Thông báo',
    'Xuất plan',
    'Lưu trữ chuyến đi',
  ]);
  await navigation.getByRole('button', { name: 'Xuất plan', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Xuất plan', exact: true })).toBeVisible();
  expect(pdfReads).toBe(0);
  const downloadButton = dialog.getByRole('button', { name: 'Tải PDF', exact: true });
  await expect(downloadButton).toBeDisabled();

  await dialog.getByRole('button', { name: 'Xem trước PDF', exact: true }).click();
  const preview = dialog.getByTitle('Xem trước plan chuyến đi', { exact: true });
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute('src', /^blob:/);
  await expect(downloadButton).toBeEnabled();
  expect(pdfReads).toBe(1);
  await page.screenshot({ path: test.info().outputPath('plan-pdf-preview-desktop.png') });

  await page.setViewportSize({ width: 402, height: 874 });
  await expect(preview).toBeVisible();
  const bounds = await preview.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(402);
  await page.screenshot({ path: test.info().outputPath('plan-pdf-preview-mobile.png') });

  const downloaded = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe(`wolfari-plan-${tripId}.pdf`);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  expect(await readFile(downloadPath!)).toEqual(pdf);
  expect(pdfReads).toBe(1);
});
