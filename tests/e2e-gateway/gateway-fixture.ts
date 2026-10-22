import { test as base, expect, type Page, type Route } from '@playwright/test';

export const avatarPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=',
  'base64',
);
export const initialProfile = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  full_name: 'Trang Gateway',
  email: 'trang@example.com',
  avatar: null as string | null,
  version: 4,
  system_role: 'USER',
  status: 'ACTIVE',
  email_verified_at: '2026-10-01T00:00:00Z',
};
const sessionIds = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
export interface GatewayModel {
  authenticated: boolean;
  profile: typeof initialProfile;
  sessions: string[];
  calls: { method: string; path: string; body: unknown }[];
  failures: Map<string, number>;
  csrfGate?: Promise<void>;
  writeGate?: Promise<void>;
  avatarReads: number;
}

export const test = base.extend<{ gateway: GatewayModel }>({
  gateway: async ({ page }, use) => {
    const model: GatewayModel = {
      authenticated: false,
      profile: { ...initialProfile },
      sessions: [...sessionIds],
      calls: [],
      failures: new Map(),
      avatarReads: 0,
    };
    const unexpected: string[] = [],
      pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const json = (route: Route, data: unknown, status = 200) =>
      route.fulfill({ status, json: { data, meta: { correlation_id: 'gateway-e2e' } } });
    const error = (route: Route, status: number) =>
      route.fulfill({
        status,
        json: {
          error: {
            code:
              (
                {
                  400: 'VALIDATION_FAILED',
                  401: 'UNAUTHENTICATED',
                  409: 'VERSION_CONFLICT',
                  429: 'RESOURCE_EXHAUSTED',
                  503: 'SERVICE_UNAVAILABLE',
                } as Record<number, string>
              )[status] ?? 'SERVICE_UNAVAILABLE',
            message: 'Test error',
            retryable: status === 503,
            details: status === 409 ? { current_version: model.profile.version } : null,
          },
          meta: { correlation_id: 'gateway-e2e' },
        },
      });
    // All API traffic is fulfilled or rejected; nothing falls through to the real Gateway.
    await page.route('**/api/**', async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        method = request.method(),
        path = url.pathname;
      const isMultipart = request.headers()['content-type']?.startsWith('multipart/form-data');
      const body: unknown = request.postData()
        ? isMultipart
          ? request.postData()
          : request.postDataJSON()
        : null;
      model.calls.push({ method, path, body });
      expect(request.headers()['x-client-type']).toBe('web');
      if (path === '/api/v1/auth/csrf' && method === 'GET') {
        await model.csrfGate;
        return model.authenticated
          ? json(route, { csrf_token: 'e2e-csrf-token-long-enough' })
          : error(route, 401);
      }
      const failure = model.failures.get(method + ' ' + path);
      if (failure) return error(route, failure);
      if (path === '/api/v1/auth/refresh') {
        expect(request.headers()['x-csrf-token']).toBe('e2e-csrf-token-long-enough');
        return model.authenticated
          ? json(route, { access_token: 'e2e-memory-token' })
          : error(route, 401);
      }
      if (method !== 'GET') await model.writeGate;
      if (path === '/api/v1/auth/login') {
        model.authenticated = true;
        return json(route, { access_token: 'e2e-memory-token', profile: model.profile });
      }
      if (path === '/api/v1/auth/register' || path === '/api/v1/auth/password-reset-requests')
        return json(route, { message_code: 'REQUEST_ACCEPTED' }, 202);
      if (path === '/api/v1/auth/email-verifications/confirm')
        return json(route, { message_code: 'REQUEST_ACCEPTED' });
      if (path === '/api/v1/auth/password-resets') {
        model.authenticated = false;
        return json(route, { message_code: 'REQUEST_ACCEPTED' });
      }
      if (path.startsWith('/api/v1/me') || path === '/api/v1/auth/email-verifications') {
        if (!model.authenticated) return error(route, 401);
        expect(request.headers().authorization).toBe('Bearer e2e-memory-token');
        if (path === '/api/v1/auth/email-verifications')
          return json(route, { message_code: 'REQUEST_ACCEPTED' }, 202);
        if (path === '/api/v1/me' && method === 'GET') return json(route, model.profile);
        if (path === '/api/v1/me' && method === 'PATCH') {
          const data = body as {
            expected_version: number;
            full_name?: string;
            avatar_object_key?: string;
          };
          if (data.expected_version !== model.profile.version) return error(route, 409);
          model.profile = {
            ...model.profile,
            full_name: data.full_name ?? model.profile.full_name,
            avatar: data.avatar_object_key ? '/api/v1/me/avatar' : model.profile.avatar,
            version: model.profile.version + 1,
          };
          return json(route, model.profile);
        }
        if (path === '/api/v1/me/avatar' && method === 'POST') {
          expect(isMultipart).toBe(true);
          expect(String(body)).toContain('name="file"');
          return json(
            route,
            {
              object_key: 'users/test/avatars/avatar.png',
              mime_type: 'image/png',
              size_bytes: avatarPng.length,
            },
            201,
          );
        }
        if (path === '/api/v1/me/avatar' && method === 'GET') {
          model.avatarReads++;
          return route.fulfill({ contentType: 'image/png', body: avatarPng });
        }
        if (path === '/api/v1/me/sessions' && method === 'GET') {
          const cursor = url.searchParams.get('cursor');
          expect(url.searchParams.get('limit')).toBe('20');
          const ids = cursor ? model.sessions.slice(1) : model.sessions.slice(0, 1);
          return json(route, {
            items: ids.map((id) => ({
              id,
              created_at: '2026-10-01T00:00:00Z',
              last_used_at: null,
              expires_at: '2026-11-01T00:00:00Z',
              revoked_at: null,
            })),
            next_cursor: !cursor && model.sessions.length > 1 ? 'page-two' : null,
          });
        }
        if (path.startsWith('/api/v1/me/sessions/') && method === 'DELETE') {
          model.sessions = model.sessions.filter((id) => id !== path.split('/').at(-1));
          return route.fulfill({ status: 204, headers: { 'X-Correlation-Id': 'revoked' } });
        }
        if (path === '/api/v1/me/password-change') {
          model.authenticated = false;
          return json(route, { message_code: 'REQUEST_ACCEPTED' });
        }
      }
      unexpected.push(method + ' ' + path);
      return route.fulfill({ status: 501, body: 'Unmocked API request' });
    });
    await use(model);
    expect(unexpected, 'All API requests must be explicitly mocked').toEqual([]);
    expect(pageErrors, 'No uncaught browser errors').toEqual([]);
  },
});
export { expect };

export async function login(page: Page) {
  await page.goto('/login?returnTo=%2Fprofile');
  await page.getByLabel('Email', { exact: true }).fill('trang@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(' password with spaces ');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByLabel('Tên hiển thị')).toBeVisible();
}
