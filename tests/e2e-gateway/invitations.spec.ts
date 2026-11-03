import { expect, login, test } from './gateway-fixture';

const ownerTripId = '11111111-1111-4111-8111-111111111111';
const invitationToken = `inv1_${'a'.repeat(43)}`;

test('HTTP mock: Owner creates EMAIL/LINK and explicitly manages pending invitations', async ({
  page,
  gateway,
}) => {
  await login(page);
  await page.goto(`/trips/${ownerTripId}/members`);
  await page.getByRole('button', { name: 'Lời mời', exact: true }).click();
  await expect(page.getByText('guest@example.com')).toBeVisible();

  await page.getByLabel('Email người nhận').fill(' NEW@Example.com ');
  await page.getByRole('button', { name: 'Gửi lời mời', exact: true }).click();
  await expect(page.getByText(/Yêu cầu gửi lời mời đã được tiếp nhận/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Liên kết một lần' })).toHaveCount(0);
  const emailCreate = gateway.calls.find(
    (call) => call.method === 'POST' && call.path === `/api/v1/trips/${ownerTripId}/invitations`,
  )!;
  expect(emailCreate.body).toEqual({
    invitation_type: 'EMAIL',
    email: 'new@example.com',
    expected_membership_revision: 1,
  });
  expect(emailCreate.idempotencyKey).toBeTruthy();

  await page.getByLabel('Loại lời mời').selectOption('LINK');
  await page.getByRole('button', { name: 'Tạo liên kết' }).click();
  await expect(page.getByRole('region', { name: 'Liên kết một lần' })).toBeVisible();
  const linkCreate = gateway.calls
    .filter(
      (call) => call.method === 'POST' && call.path === `/api/v1/trips/${ownerTripId}/invitations`,
    )
    .at(-1)!;
  expect(linkCreate.body).toEqual({
    invitation_type: 'LINK',
    expected_membership_revision: 1,
  });
  await page.getByRole('button', { name: 'Đóng liên kết' }).click();
  await expect(page.getByRole('region', { name: 'Liên kết một lần' })).toHaveCount(0);

  const original = page.getByRole('listitem').filter({ hasText: 'guest@example.com' });
  await original.getByRole('button', { name: 'Gửi lại' }).click();
  await expect(page.getByText(/Yêu cầu gửi lại đã được tiếp nhận/)).toBeVisible();
  await original.getByRole('button', { name: 'Thu hồi', exact: true }).click();
  await expect(original.getByText(/Thu hồi lời mời này/)).toBeVisible();
  await original.getByRole('button', { name: 'Xác nhận thu hồi' }).click();
  await expect(page.getByText('Đã thu hồi lời mời.')).toBeVisible();
  const lifecycle = gateway.calls.filter((call) => /\/(resend|revoke)$/.test(call.path));
  expect(lifecycle).toHaveLength(2);
  expect(lifecycle[0]!.body).toEqual({ expected_version: 1 });
  expect(lifecycle[1]!.body).toEqual({ expected_version: 2 });
  expect(lifecycle.every((call) => Boolean(call.idempotencyKey))).toBe(true);
});

test('HTTP mock: anonymous deep link scrubs token, returns through login, accepts, and opens Trip', async ({
  page,
  gateway,
}) => {
  await page.goto(`/invitations/local#token=${invitationToken}`);
  await expect(page).toHaveURL(/\/invitations\/local$/);
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Đăng nhập', exact: true }),
  ).toHaveAttribute('href', '/login?returnTo=%2Finvitations');
  await page.getByRole('main').getByRole('link', { name: 'Đăng nhập', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill('guest@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('password for gateway');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByText(/Owner Gateway mời bạn tham gia/)).toBeVisible();
  await page.getByRole('button', { name: 'Chấp nhận', exact: true }).click();
  await expect(page).toHaveURL(`/trips/${ownerTripId}`);

  const preview = gateway.calls.find((call) => call.path === '/api/v1/invitations/preview')!;
  const accept = gateway.calls.find((call) => call.path === '/api/v1/invitations/accept')!;
  expect(preview.idempotencyKey).toBeNull();
  expect(accept.idempotencyKey).toBeTruthy();
  expect(gateway.calls.filter((call) => call.path === '/api/v1/invitations/preview')).toHaveLength(
    1,
  );
});

test('HTTP mock: invitation decline has a terminal confirmation on mobile', async ({
  page,
  gateway,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  gateway.authenticated = true;
  await page.goto(`/invitations#token=${invitationToken}`);
  await page.getByRole('button', { name: 'Từ chối', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Đã từ chối lời mời' })).toBeVisible();
  expect(gateway.calls.filter((call) => call.path === '/api/v1/invitations/preview')).toHaveLength(
    1,
  );
  expect(
    gateway.calls.find((call) => call.path === '/api/v1/invitations/decline')?.idempotencyKey,
  ).toBeTruthy();
});

test('HTTP mock: keyboard activation keeps invitation response accessible and terminal', async ({
  page,
  gateway,
}) => {
  gateway.authenticated = true;
  await page.goto(`/invitations#token=${invitationToken}`);
  const decline = page.getByRole('button', { name: 'Từ chối', exact: true });
  await decline.focus();
  await expect(decline).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Đã từ chối lời mời' })).toBeVisible();
  expect(await page.evaluate(() => window.location.hash)).toBe('');
  expect(gateway.calls.filter((call) => call.path === '/api/v1/invitations/preview')).toHaveLength(
    1,
  );
  expect(
    gateway.calls.find((call) => call.path === '/api/v1/invitations/decline')?.idempotencyKey,
  ).toBeTruthy();
});
