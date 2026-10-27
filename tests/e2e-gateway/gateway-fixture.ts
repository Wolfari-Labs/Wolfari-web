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
export interface GatewayTrip {
  id: string;
  name: string;
  description: string | null;
  public_description: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  lifecycle: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'ARCHIVED';
  archived_at: string | null;
  plan_edit_policy: 'OWNER_ONLY' | 'SELECTED_MEMBERS' | 'ALL_MEMBERS';
  plan_version: number;
  membership_revision: number;
  export_revision: number;
  current_membership: {
    id: string;
    trip_id: string;
    user_id: string;
    role: 'OWNER' | 'MEMBER';
    joined_at: string;
    left_at: null;
  };
  permissions: { can_read: boolean; can_update: boolean };
}

function trip(id: string, name: string, role: 'OWNER' | 'MEMBER'): GatewayTrip {
  return {
    id,
    name,
    description: `Mô tả ${name}`,
    public_description: null,
    start_at: '2026-11-01T00:00:00+07:00',
    end_at: '2026-11-04T00:00:00+07:00',
    timezone: 'Asia/Ho_Chi_Minh',
    lifecycle: 'UPCOMING',
    archived_at: null,
    plan_edit_policy: 'OWNER_ONLY',
    plan_version: 1,
    membership_revision: 1,
    export_revision: 1,
    current_membership: {
      id: `a${id.slice(1)}`,
      trip_id: id,
      user_id: initialProfile.id,
      role,
      joined_at: '2026-10-01T00:00:00Z',
      left_at: null,
    },
    permissions: { can_read: true, can_update: role === 'OWNER' },
  };
}

export const initialTrips: readonly GatewayTrip[] = [
  trip('11111111-1111-4111-8111-111111111111', 'Đà Nẵng Gateway', 'OWNER'),
  trip('33333333-3333-4333-8333-333333333333', 'Phú Quốc Gateway', 'MEMBER'),
];
export interface GatewayModel {
  authenticated: boolean;
  profile: typeof initialProfile;
  sessions: string[];
  trips: GatewayTrip[];
  calls: {
    method: string;
    path: string;
    query: string;
    body: unknown;
    idempotencyKey: string | null;
  }[];
  failures: Map<string, number>;
  csrfGate?: Promise<void>;
  writeGate?: Promise<void>;
  avatarReads: number;
  tripConflictOnce: boolean;
  planPolicyConflictOnce: boolean;
  planPolicyUnknownOnce: boolean;
  planPolicyReceipts: Map<string, { fingerprint: string; data: unknown }>;
  invitations: Array<{
    id: string;
    trip_id: string;
    invitation_type: 'EMAIL' | 'LINK';
    email: string | null;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED';
    version: number;
    expires_at: string;
    resolved_at: string | null;
  }>;
}

export const test = base.extend<{ gateway: GatewayModel }>({
  gateway: async ({ page }, use) => {
    const model: GatewayModel = {
      authenticated: false,
      profile: { ...initialProfile },
      sessions: [...sessionIds],
      trips: structuredClone([...initialTrips]),
      calls: [],
      failures: new Map(),
      avatarReads: 0,
      tripConflictOnce: false,
      planPolicyConflictOnce: false,
      planPolicyUnknownOnce: false,
      planPolicyReceipts: new Map(),
      invitations: [
        {
          id: '77777777-7777-4777-8777-777777777777',
          trip_id: initialTrips[0]!.id,
          invitation_type: 'EMAIL',
          email: 'guest@example.com',
          status: 'PENDING',
          version: 1,
          expires_at: '2026-12-01T00:00:00Z',
          resolved_at: null,
        },
      ],
    };
    const unexpected: string[] = [],
      pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const json = (route: Route, data: unknown, status = 200) =>
      route.fulfill({ status, json: { data, meta: { correlation_id: 'gateway-e2e' } } });
    const error = (
      route: Route,
      status: number,
      codeOverride?: string,
      detailsOverride?: unknown,
    ) =>
      route.fulfill({
        status,
        json: {
          error: {
            code:
              codeOverride ??
              (
                {
                  400: 'VALIDATION_FAILED',
                  401: 'UNAUTHENTICATED',
                  409: 'VERSION_CONFLICT',
                  429: 'RESOURCE_EXHAUSTED',
                  503: 'SERVICE_UNAVAILABLE',
                } as Record<number, string>
              )[status] ??
              'SERVICE_UNAVAILABLE',
            message: 'Test error',
            retryable: status === 503,
            details:
              detailsOverride ??
              (status === 409 ? { current_version: model.profile.version } : null),
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
      model.calls.push({
        method,
        path,
        query: url.search,
        body,
        idempotencyKey: request.headers()['idempotency-key'] ?? null,
      });
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
            ? json(route, { access_token: 'e2e-memory-token', session_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })
          : error(route, 401);
      }
      if (method !== 'GET') await model.writeGate;
      if (path === '/api/v1/auth/login') {
        model.authenticated = true;
          return json(route, { access_token: 'e2e-memory-token', session_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', profile: model.profile });
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
      const tokenAction = /^\/api\/v1\/invitations\/(preview|accept|decline)$/.exec(path);
      if (tokenAction && method === 'POST') {
        if (!model.authenticated) return error(route, 401);
        expect(request.headers().authorization).toBe('Bearer e2e-memory-token');
        const data = body as { token: string };
        expect(data.token).toMatch(/^inv1_[A-Za-z0-9_-]{43}$/);
        const invitation = model.invitations.find((item) => item.status === 'PENDING');
        if (!invitation) return error(route, 409, 'STATE_CONFLICT');
        const response = {
          id: invitation.id,
          trip_name: model.trips.find((trip) => trip.id === invitation.trip_id)!.name,
          inviter_display_name: 'Owner Gateway',
          status: invitation.status,
          expires_at: invitation.expires_at,
        };
        if (tokenAction[1] === 'preview') {
          expect(request.headers()['idempotency-key']).toBeUndefined();
          return json(route, response);
        }
        expect(request.headers()['idempotency-key']).toBeTruthy();
        invitation.status = tokenAction[1] === 'accept' ? 'ACCEPTED' : 'DECLINED';
        invitation.version += 1;
        invitation.resolved_at = '2026-10-23T00:00:00Z';
        if (tokenAction[1] === 'decline') return json(route, { ...response, status: 'DECLINED' });
        const current = model.trips.find((trip) => trip.id === invitation.trip_id)!;
        current.membership_revision += 1;
        return json(route, {
          membership: {
            id: '88888888-8888-4888-8888-888888888888',
            trip_id: current.id,
            user_id: model.profile.id,
            role: 'MEMBER',
            joined_at: '2026-10-23T00:00:00Z',
            left_at: null,
          },
          revisions: {
            plan_version: current.plan_version,
            membership_revision: current.membership_revision,
            export_revision: current.export_revision,
          },
        });
      }
      if (path === '/api/v1/trips' || path.startsWith('/api/v1/trips/')) {
        if (!model.authenticated) return error(route, 401);
        expect(request.headers().authorization).toBe('Bearer e2e-memory-token');
        if (path === '/api/v1/trips' && method === 'GET') {
          expect(url.searchParams.get('limit')).toBe('20');
          const cursor = url.searchParams.get('cursor');
          if (cursor === null) {
            return json(route, {
              items: model.trips.slice(0, 1),
              next_cursor: model.trips.length > 1 ? 'trip-page-two/+==' : null,
            });
          }
          expect(cursor).toBe('trip-page-two/+==');
          return json(route, { items: model.trips.slice(1), next_cursor: null });
        }
        if (path === '/api/v1/trips' && method === 'POST') {
          const data = body as {
            name: string;
            description?: string;
            start_at: string;
            end_at: string;
            timezone: string;
            client_request_id: string;
          };
          expect(request.headers()['idempotency-key']).toBe(data.client_request_id);
          expect(Object.keys(data).sort()).toEqual(
            [
              'client_request_id',
              ...(data.description === undefined ? [] : ['description']),
              'end_at',
              'name',
              'start_at',
              'timezone',
            ].sort(),
          );
          const created = trip('99999999-9999-4999-8999-999999999999', data.name, 'OWNER');
          created.description = data.description ?? null;
          created.start_at = data.start_at;
          created.end_at = data.end_at;
          created.timezone = data.timezone;
          model.trips.push(created);
          return json(route, created, 201);
        }
        const invitationsMatch =
          /^\/api\/v1\/trips\/([^/]+)\/invitations(?:\/([^/]+)\/(revoke|resend))?$/.exec(path);
        if (invitationsMatch) {
          const tripId = decodeURIComponent(invitationsMatch[1]!);
          const current = model.trips.find((item) => item.id === tripId);
          if (!current) return error(route, 404, 'RESOURCE_NOT_FOUND');
          if (current.current_membership.role !== 'OWNER')
            return error(route, 403, 'PERMISSION_DENIED');
          if (method === 'GET' && !invitationsMatch[2]) {
            expect(url.searchParams.get('limit')).toBe('20');
            const status = url.searchParams.get('status');
            const items = model.invitations.filter(
              (item) => item.trip_id === tripId && (!status || item.status === status),
            );
            return json(route, { items, next_cursor: null });
          }
          expect(method).toBe('POST');
          expect(request.headers()['idempotency-key']).toBeTruthy();
          if (!invitationsMatch[2]) {
            const data = body as {
              invitation_type: 'EMAIL' | 'LINK';
              email?: string;
              expected_membership_revision: number;
            };
            if (data.expected_membership_revision !== current.membership_revision)
              return error(route, 409, 'STATE_CONFLICT');
            const created = {
              id: `99999999-9999-4999-8999-${String(model.invitations.length + 1).padStart(12, '0')}`,
              trip_id: tripId,
              invitation_type: data.invitation_type,
              email: data.invitation_type === 'EMAIL' ? data.email! : null,
              status: 'PENDING' as const,
              version: 1,
              expires_at: '2026-12-15T00:00:00Z',
              resolved_at: null,
            };
            model.invitations.push(created);
            return json(route, {
              invitation: created,
              one_time_link: `http://127.0.0.1:5174/invitations/local#token=inv1_${'z'.repeat(43)}`,
            });
          }
          const invitation = model.invitations.find(
            (item) => item.trip_id === tripId && item.id === invitationsMatch[2],
          );
          if (!invitation) return error(route, 404, 'RESOURCE_NOT_FOUND');
          const data = body as { expected_version: number };
          if (data.expected_version !== invitation.version)
            return error(route, 409, 'VERSION_CONFLICT', {
              invitation_version: invitation.version,
            });
          invitation.version += 1;
          if (invitationsMatch[3] === 'revoke') {
            invitation.status = 'REVOKED';
            invitation.resolved_at = '2026-10-23T00:00:00Z';
          }
          return json(route, { invitation });
        }
        const membersMatch = /^\/api\/v1\/trips\/([^/]+)\/members$/.exec(path);
        if (membersMatch && method === 'GET') {
          const tripId = decodeURIComponent(membersMatch[1]!);
          const current = model.trips.find((item) => item.id === tripId);
          if (!current) return error(route, 404, 'RESOURCE_NOT_FOUND');
          expect(url.searchParams.get('limit')).toBe('100');
          const includeLeft = url.searchParams.get('include_left');
          expect(includeLeft).toMatch(/^(true|false)$/);
          const owner = {
            id: current.current_membership.id,
            trip_id: tripId,
            user_id: current.current_membership.user_id,
            role: current.current_membership.role,
            joined_at: current.current_membership.joined_at,
            left_at: null,
          };
          const member = {
            id: `membership-member-${tripId.slice(0, 8)}`,
            trip_id: tripId,
            user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            role: current.current_membership.role === 'OWNER' ? 'MEMBER' : 'OWNER',
            joined_at: '2026-10-02T00:00:00Z',
            left_at: null,
          };
          const departed = {
            id: `membership-left-${tripId.slice(0, 8)}`,
            trip_id: tripId,
            user_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            role: 'MEMBER',
            joined_at: '2026-10-03T00:00:00Z',
            left_at: '2026-10-10T00:00:00Z',
          };
          const cursor = url.searchParams.get('cursor');
          if (cursor === null) {
            return json(route, { items: [owner, member], next_cursor: 'member-page/+==' });
          }
          expect(cursor).toBe('member-page/+==');
          return json(route, {
            items: [member, ...(includeLeft === 'true' ? [departed] : [])],
            next_cursor: null,
          });
        }
        const policyMatch = /^\/api\/v1\/trips\/([^/]+)\/plan-policy$/.exec(path);
        if (policyMatch && method === 'PUT') {
          const tripId = decodeURIComponent(policyMatch[1]!);
          const current = model.trips.find((item) => item.id === tripId);
          if (!current) return error(route, 404, 'RESOURCE_NOT_FOUND');
          const data = body as {
            policy: 'OWNER_ONLY' | 'ALL_MEMBERS' | 'SELECTED_MEMBERS';
            editor_member_ids: string[];
            expected_membership_revision: number;
          };
          const key = request.headers()['idempotency-key'];
          expect(key).toBeTruthy();
          expect(data.policy).toMatch(/^(OWNER_ONLY|ALL_MEMBERS)$/);
          expect(data.editor_member_ids).toEqual([]);
          const fingerprint = JSON.stringify(data);
          const receipt = model.planPolicyReceipts.get(key!);
          if (receipt) {
            if (receipt.fingerprint !== fingerprint)
              return error(route, 409, 'IDEMPOTENCY_CONFLICT');
            return json(route, receipt.data);
          }
          if (model.planPolicyConflictOnce) {
            model.planPolicyConflictOnce = false;
            current.membership_revision += 1;
            return error(route, 409, 'STATE_CONFLICT', {
              current_membership_revision: current.membership_revision,
            });
          }
          if (data.expected_membership_revision !== current.membership_revision) {
            return error(route, 409, 'STATE_CONFLICT', {
              current_membership_revision: current.membership_revision,
            });
          }
          current.plan_edit_policy = data.policy;
          current.membership_revision += 1;
          const projection = {
            policy: current.plan_edit_policy,
            editor_member_ids: [],
            membership_revision: current.membership_revision,
          };
          model.planPolicyReceipts.set(key!, { fingerprint, data: projection });
          if (model.planPolicyUnknownOnce) {
            model.planPolicyUnknownOnce = false;
            return error(route, 503, 'SERVICE_UNAVAILABLE');
          }
          return json(route, projection);
        }
        const planMatch = /^\/api\/v1\/trips\/([^/]+)\/plan$/.exec(path);
        if (planMatch && method === 'GET') {
          const tripId = decodeURIComponent(planMatch[1]!);
          const current = model.trips.find((item) => item.id === tripId);
          if (!current) return error(route, 404, 'RESOURCE_NOT_FOUND');
          return json(route, {
            trip_id: current.id,
            plan_version: current.plan_version,
            export_revision: current.export_revision,
            activities: [],
            selected_locations: [],
            dress_codes: [],
            packing_items: [],
            permissions: { can_read: true, can_edit: true, can_complete: true },
          });
        }
        const detailMatch = /^\/api\/v1\/trips\/([^/]+)$/.exec(path);
        if (detailMatch) {
          const tripId = decodeURIComponent(detailMatch[1]!);
          const current = model.trips.find((item) => item.id === tripId);
          if (!current) return error(route, 404, 'RESOURCE_NOT_FOUND');
          if (method === 'GET') return json(route, current);
          if (method === 'PATCH') {
            const data = body as {
              name?: string;
              description?: string | null;
              public_description?: string | null;
              expected_plan_version: number;
              expected_export_revision: number;
            };
            expect(request.headers()['idempotency-key']).toBeTruthy();
            const allowed = new Set([
              'name',
              'description',
              'public_description',
              'expected_plan_version',
              'expected_export_revision',
            ]);
            expect(Object.keys(data).every((key) => allowed.has(key))).toBe(true);
            if (model.tripConflictOnce) {
              model.tripConflictOnce = false;
              current.export_revision += 1;
              return error(route, 409, 'VERSION_CONFLICT', {
                current_plan_version: current.plan_version,
                current_export_revision: current.export_revision,
              });
            }
            if (
              data.expected_plan_version !== current.plan_version ||
              data.expected_export_revision !== current.export_revision
            ) {
              return error(route, 409, 'VERSION_CONFLICT', {
                current_plan_version: current.plan_version,
                current_export_revision: current.export_revision,
              });
            }
            if (Object.hasOwn(data, 'name')) current.name = data.name!;
            if (Object.hasOwn(data, 'description')) current.description = data.description ?? null;
            if (Object.hasOwn(data, 'public_description')) {
              current.public_description = data.public_description ?? null;
            }
            current.export_revision += 1;
            return json(route, current);
          }
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
