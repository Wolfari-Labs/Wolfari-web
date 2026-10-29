import { test, expect, login, avatarPng } from './gateway-fixture';

async function expectOnlySessionBoundary(page: Parameters<typeof login>[0]) {
  const values = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  expect(Object.keys(values.local)).toEqual(['wolfari:session-boundary:v1']);
  expect(values.local['wolfari:session-boundary:v1']).toMatch(/^[0-9a-f-]{36}$/);
  expect(values.session).toEqual({}); // No access token, CSRF, cookie or credential payload.
}

test('login, profile save, private avatar replacement and paginated session revoke', async ({
  page,
  gateway,
}) => {
  await login(page);
  expect(gateway.calls.find((call) => call.path.endsWith('/login'))?.body).toEqual({
    email: 'trang@example.com',
    password: ' password with spaces ',
  });
  await page.getByLabel('Tên hiển thị').fill('Updated Gateway Name');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText('Đã lưu thông tin cá nhân.')).toBeVisible();
  await expect(page.locator('header[data-node-id]:visible')).toContainText('Updated Gateway Name');
  expect(gateway.profile.version).toBe(5);
  const avatar = page.getByLabel('Chọn ảnh đại diện');
  await avatar.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: avatarPng });
  await expect(page.getByText('Đã cập nhật ảnh đại diện.')).toBeVisible();
  await expect(page.locator('img[alt="Updated Gateway Name"]')).toHaveAttribute('src', /^blob:/);
  const oldSrc = await page.locator('img[alt="Updated Gateway Name"]').getAttribute('src');
  await avatar.setInputFiles({ name: 'avatar-2.png', mimeType: 'image/png', buffer: avatarPng });
  await expect(page.locator('img[alt="Updated Gateway Name"]')).not.toHaveAttribute('src', oldSrc!);
  expect(gateway.avatarReads).toBe(2);
  const avatarPatch = gateway.calls.filter((call) => call.method === 'PATCH').at(-1)?.body;
  expect(avatarPatch).toEqual({
    expected_version: 6,
    avatar_object_key: 'users/test/avatars/avatar.png',
  });
  await page.getByText('Phiên đăng nhập', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Thu hồi phiên' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Tải thêm phiên' }).click();
  await expect(page.getByRole('button', { name: 'Thu hồi phiên' })).toHaveCount(2);
  await page.getByRole('button', { name: 'Thu hồi phiên' }).first().click();
  await expect(page.getByRole('button', { name: 'Thu hồi phiên' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Đăng xuất', exact: true })).toBeEnabled();
  await expectOnlySessionBoundary(page);
});

test('profile conflict retains draft and uses refreshed version only on explicit retry', async ({
  page,
  gateway,
}) => {
  await login(page);
  gateway.profile.version = 9;
  await page.getByLabel('Tên hiển thị').fill('My conflict draft');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText(/Hồ sơ đã thay đổi ở nơi khác/)).toBeVisible();
  await expect(page.getByLabel('Tên hiển thị')).toHaveValue('My conflict draft');
  expect(gateway.calls.filter((call) => call.method === 'PATCH')).toHaveLength(1);
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByText('Đã lưu thông tin cá nhân.')).toBeVisible();
  expect(gateway.calls.filter((call) => call.method === 'PATCH')[1]?.body).toMatchObject({
    expected_version: 9,
  });
});

test('avatar attach error remains explicit and preserves the old picture', async ({
  page,
  gateway,
}) => {
  gateway.profile.avatar = '/api/v1/me/avatar';
  await login(page);
  await expect(page.locator('img[alt="Trang Gateway"]')).toHaveAttribute('src', /^blob:/);
  const oldSrc = await page.locator('img[alt="Trang Gateway"]').getAttribute('src');
  gateway.failures.set('PATCH /api/v1/me', 503);
  await page
    .getByLabel('Chọn ảnh đại diện')
    .setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: avatarPng });
  await expect(page.getByText(/Ảnh đã tải lên nhưng chưa được gắn/)).toBeVisible();
  await expect(page.locator('img[alt="Trang Gateway"]')).toHaveAttribute('src', oldSrc!);
  expect(gateway.calls.filter((call) => call.method === 'PATCH')).toHaveLength(1);
});

test('password change rejects bad credentials, then clears the session on success', async ({
  page,
  gateway,
}) => {
  await login(page);
  const form = page.getByRole('form', { name: 'Đổi mật khẩu' });
  await form.getByRole('button', { name: 'Đổi mật khẩu' }).click();
  await expect(form.getByLabel('Mật khẩu hiện tại', { exact: true })).toBeFocused();
  await form.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(' old password ');
  await form.getByLabel('Mật khẩu mới', { exact: true }).fill(' new password long ');
  await form.getByLabel('Nhập lại mật khẩu mới', { exact: true }).fill(' new password long ');
  gateway.failures.set('POST /api/v1/me/password-change', 401);
  await form.getByRole('button', { name: 'Đổi mật khẩu' }).click();
  await expect(form.getByText(/Thông tin xác thực không hợp lệ/)).toBeVisible();
  await expect(page).toHaveURL(/\/profile$/);
  gateway.failures.clear();
  await form.getByRole('button', { name: 'Đổi mật khẩu' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/Mật khẩu đã được đặt lại/)).toBeVisible();
  expect(
    gateway.calls.filter((call) => call.path.endsWith('/password-change')).at(-1)?.body,
  ).toEqual({ current_password: ' old password ', new_password: ' new password long ' });
  await expect(page.locator('header[data-node-id]:visible')).not.toContainText('Trang Gateway');
  await expectOnlySessionBoundary(page);
  // Stay in the same SPA instance: a reload would hide leaked in-memory caches.
  gateway.profile = {
    ...gateway.profile,
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    full_name: 'Second Account',
    email: 'second@example.com',
    version: 1,
  };
  await page.getByLabel('Email', { exact: true }).fill('second@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(' second password long ');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.getByRole('link', { name: 'Hồ sơ cá nhân · Second Account' }).click();
  await expect(page.getByLabel('Tên hiển thị')).toHaveValue('Second Account');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('second@example.com');
  await expect(page.locator('header[data-node-id]:visible')).not.toContainText('Trang Gateway');
});

test('later session page failure preserves loaded items and retry can recover', async ({
  page,
  gateway,
}) => {
  await login(page);
  await page.getByText('Phiên đăng nhập', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Thu hồi phiên' })).toHaveCount(1);
  gateway.failures.set('GET /api/v1/me/sessions', 503);
  await page.getByRole('button', { name: 'Tải thêm phiên' }).click();
  await expect(page.getByRole('alert')).toContainText('Chưa thể tải nội dung');
  await expect(page.getByRole('button', { name: 'Thu hồi phiên' })).toHaveCount(1);
  gateway.failures.clear();
  await page.getByRole('button', { name: 'Tải lại', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Thu hồi phiên' })).toHaveCount(2);
});

test('expiry during a private read clears profile and redirects without reloading', async ({
  page,
  gateway,
}) => {
  await login(page);
  gateway.authenticated = false;
  await page.getByText('Phiên đăng nhập', { exact: true }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fprofile$/);
  await expect(page.getByLabel('Tên hiển thị')).toHaveCount(0);
  await expect(page.locator('header[data-node-id]:visible')).not.toContainText('Trang Gateway');
});

test('reset rejects a missing token locally and an expired token without clearing the active session', async ({
  page,
  gateway,
}) => {
  gateway.authenticated = true;
  await page.goto('/reset-password');
  await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
  await expect(page.getByRole('alert')).toContainText('không có mã token');
  expect(gateway.calls.filter((call) => call.path.endsWith('/password-resets'))).toHaveLength(0);
  gateway.failures.set('POST /api/v1/auth/password-resets', 400);
  await page.goto('/reset-password?token=expired-reset');
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill(' new password long ');
  await page.getByLabel('Nhập lại mật khẩu', { exact: true }).fill(' new password long ');
  await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
  await expect(page.getByRole('alert')).toContainText('Liên kết không còn hiệu lực');
  expect(gateway.authenticated).toBe(true);
  expect(gateway.calls.filter((call) => call.path.endsWith('/password-resets'))).toHaveLength(1);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test('private queries wait for bootstrap and anonymous redirect preserves returnTo', async ({
  page,
  gateway,
}) => {
  let release!: () => void;
  gateway.csrfGate = new Promise((resolve) => {
    release = resolve;
  });
  await page.goto('/profile?tab=sessions');
  await expect(page.getByText('Đang tải…')).toBeVisible();
  await expect(page.getByLabel('Tên hiển thị')).toHaveCount(0);
  expect(gateway.calls.filter((call) => call.path.startsWith('/api/v1/me'))).toHaveLength(0);
  release();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fprofile%3Ftab%3Dsessions$/);
  expect(gateway.calls.filter((call) => call.path.startsWith('/api/v1/me'))).toHaveLength(0);
});

test('expired session redirects without showing private profile data', async ({
  page,
  gateway,
}) => {
  await login(page);
  gateway.authenticated = false;
  await page.reload();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fprofile$/);
  await expect(page.getByLabel('Tên hiển thị')).toHaveCount(0);
  await expect(page.locator('header[data-node-id]:visible')).not.toContainText('Trang Gateway');
});

test('verification scrubs token, prevents repeat submission, then notifies login', async ({
  page,
  gateway,
}) => {
  await page.goto('/verify-email?token=e2e-one-time-token');
  await expect(page).toHaveURL(/\/verify-email$/);
  await page.getByRole('button', { name: 'Xác minh email' }).dblclick();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByText('Đăng ký thành công. Email đã được xác minh, bạn có thể đăng nhập.'),
  ).toBeVisible();
  expect(gateway.calls.filter((call) => call.path.endsWith('/confirm'))).toHaveLength(1);
  expect(gateway.calls.find((call) => call.path.endsWith('/confirm'))?.body).toEqual({
    token: 'e2e-one-time-token',
  });
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test('password recovery uses a generic notice, reset token is scrubbed and login follows success', async ({
  page,
  gateway,
}) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('unknown@example.com');
  await page.getByRole('button', { name: 'Gửi hướng dẫn' }).click();
  await expect(page.getByText(/Nếu email tồn tại/)).toBeVisible();
  await page.goto('/reset-password?token=e2e-reset-token');
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill(' new password long ');
  await page.getByLabel('Nhập lại mật khẩu', { exact: true }).fill(' new password long ');
  await page.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(gateway.calls.find((call) => call.path.endsWith('/password-resets'))?.body).toEqual({
    token: 'e2e-reset-token',
    new_password: ' new password long ',
  });
  await expectOnlySessionBoundary(page);
});

for (const status of [400, 429, 503]) {
  test(
    'verification failure ' + status + ' stays on page with a safe message',
    async ({ page, gateway }) => {
      gateway.failures.set('POST /api/v1/auth/email-verifications/confirm', status);
      await page.goto('/verify-email?token=expired-or-used');
      await expect(page).toHaveURL(/\/verify-email$/);
      await page.getByRole('button', { name: 'Xác minh email' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      expect(gateway.calls.filter((call) => call.path.endsWith('/confirm'))).toHaveLength(1);
      await expect(page).toHaveURL(/\/verify-email$/);
    },
  );
}

test('registration accepted does not authenticate and runtime pending is truthful', async ({
  page,
  gateway,
}) => {
  let release!: () => void;
  gateway.writeGate = new Promise((resolve) => {
    release = resolve;
  });
  await page.goto('/register');
  await page.getByLabel('Họ và tên').fill('New User');
  await page.getByLabel('Email', { exact: true }).fill('new@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(' new password long ');
  await page.getByLabel('Nhập lại mật khẩu', { exact: true }).fill(' new password long ');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.getByText('Đang xử lý…')).toBeVisible();
  await expect(page.getByText(/Không có request đang gửi/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tạo tài khoản' })).toBeDisabled();
  release();
  await expect(page.getByText(/Yêu cầu đăng ký đã được tiếp nhận/)).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);
  expect(gateway.authenticated).toBe(false);
  expect(gateway.calls.filter((call) => call.path === '/api/v1/me')).toHaveLength(0);
});

for (const width of [1440, 768, 402, 320]) {
  test(
    'Gateway profile responsive and keyboard controls at ' + width,
    async ({ page, gateway }, info) => {
      gateway.authenticated = true;
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/profile');
      await expect(page.getByLabel('Tên hiển thị')).toHaveValue('Trang Gateway');
      await page.getByLabel('Tên hiển thị').fill('');
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
      await expect(page.getByLabel('Tên hiển thị')).toBeFocused();
      await expect(page.getByRole('alert')).toContainText('Tên hiển thị');
      await page.getByLabel('Tên hiển thị').fill('Trang Gateway');
      const field = page.getByLabel('Mật khẩu hiện tại', { exact: true });
      await field.fill('keep value ');
      await field.press('Tab');
      await expect(page.getByRole('button', { name: 'Hiện mật khẩu hiện tại' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(field).toHaveAttribute('type', 'text');
      await expect(field).toHaveValue('keep value ');
      await page.keyboard.press('Enter');
      await expect(field).toHaveAttribute('type', 'password');
      expect(
        gateway.calls.filter(
          (call) => call.method !== 'GET' && call.path !== '/api/v1/auth/refresh',
        ),
      ).toHaveLength(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      await field.fill('');
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, 0));
      const image = await page.screenshot({
        path: info.outputPath('profile-' + width + '.png'),
        fullPage: true,
      });
      await info.attach('profile-' + width, { body: image, contentType: 'image/png' });
    },
  );
}
