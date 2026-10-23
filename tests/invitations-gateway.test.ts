import { describe, expect, it, vi } from 'vitest';
import { createGatewayHttpClient } from '../src/infrastructure/http/http-client';
import { createGatewayInvitationRepository } from '../src/infrastructure/repositories/invitation.gateway-repository';

const tripId = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const token = `inv1_${'a'.repeat(43)}`;
const operationKey = '33333333-3333-4333-8333-333333333333';
const oneTimeLink = `${window.location.origin}/invitations/local#token=${token}`;
const previousCursor = '55555555-5555-4555-8555-555555555555';
const nextCursor = '66666666-6666-4666-8666-666666666666';
const row = {
  id,
  trip_id: tripId,
  invitation_type: 'EMAIL',
  email: 'guest@example.com',
  status: 'PENDING',
  version: 2,
  expires_at: '2026-12-01T00:00:00Z',
  resolved_at: null,
};
const preview = {
  id,
  trip_name: 'Đà Nẵng',
  inviter_display_name: 'Owner',
  status: 'PENDING',
  expires_at: row.expires_at,
};
const signal = () => new AbortController().signal;
const response = (data: unknown) =>
  new Response(JSON.stringify({ data, meta: { correlation_id: 'invitation-test' } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
function setup(data: unknown) {
  const transport = vi.fn<typeof fetch>().mockImplementation(async () => response(data));
  const repo = createGatewayInvitationRepository(undefined, createGatewayHttpClient({ transport }));
  return { transport, repo };
}
describe('invitation Gateway contract', () => {
  it('lists opaque cursors and statuses without returning secrets', async () => {
    const { repo, transport } = setup({
      items: [{ ...row, token, one_time_link: token }],
      next_cursor: nextCursor,
    });
    const result = await repo.listInvitations({
      tripId,
      scenario: 'success',
      signal: signal(),
      limit: 20,
      cursor: previousCursor,
      status: 'PENDING',
    });
    expect(transport.mock.calls[0]![0]).toBe(
      `/api/v1/trips/${tripId}/invitations?limit=20&cursor=${previousCursor}&status=PENDING`,
    );
    expect(result).toMatchObject({ status: 'ready', data: { nextCursor } });
    expect(JSON.stringify(result)).not.toContain(token);
  });
  it.each([
    { ...row, id: undefined },
    { ...row, status: 'ALIEN' },
    { ...row, version: '2' },
    { ...row, version: 0 },
    { ...row, invitation_type: 'OTHER' },
    { ...row, trip_id: 'foreign' },
    { ...row, expires_at: 'invalid' },
    { ...row, resolved_at: undefined },
    { ...row, resolved_at: '2026-10-23T00:00:00Z' },
    { ...row, status: 'REVOKED', resolved_at: null },
  ])('rejects malformed invitation projection %#', async (item) => {
    const { repo } = setup({ items: [item], next_cursor: null });
    expect(
      await repo.listInvitations({ tripId, scenario: 'success', signal: signal() }),
    ).toMatchObject({
      status: 'error',
      error: { retryable: false, correlationId: 'invitation-test' },
    });
  });
  it('rejects a malformed invitation cursor', async () => {
    const { repo } = setup({ items: [row], next_cursor: 'not-a-uuid' });
    expect(
      await repo.listInvitations({ tripId, scenario: 'success', signal: signal() }),
    ).toMatchObject({ status: 'error', error: { retryable: false } });
  });
  it('creates EMAIL with revision and exact intent key', async () => {
    const { repo, transport } = setup({
      invitation: { ...row, version: 1 },
      one_time_link: oneTimeLink,
    });
    expect(
      await repo.createInvitation!({
        tripId,
        signal: signal(),
        intent: {
          invitationType: 'EMAIL',
          email: 'guest@example.com',
          expectedMembershipRevision: 7,
          expiresAt: null,
          idempotencyKey: operationKey,
        },
      }),
    ).toMatchObject({ status: 'success', data: { oneTimeLink } });
    const [path, init] = transport.mock.calls[0]!;
    expect(path).toBe(`/api/v1/trips/${tripId}/invitations`);
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe(operationKey);
    expect(JSON.parse(init!.body as string)).toEqual({
      invitation_type: 'EMAIL',
      email: 'guest@example.com',
      expected_membership_revision: 7,
    });
  });
  it('LINK has no email; replay can omit the one-time link', async () => {
    const link = oneTimeLink;
    const { repo, transport } = setup({
      invitation: { ...row, invitation_type: 'LINK', email: null, version: 1 },
      one_time_link: link,
    });
    const request = {
      tripId,
      signal: signal(),
      intent: {
        invitationType: 'LINK' as const,
        expectedMembershipRevision: 7,
        expiresAt: null,
        idempotencyKey: operationKey,
      },
    };
    expect(await repo.createInvitation!(request)).toMatchObject({
      status: 'success',
      data: { oneTimeLink: link },
    });
    expect(JSON.parse(transport.mock.calls[0]![1]!.body as string)).not.toHaveProperty('email');
    transport.mockImplementation(async () =>
      response({ invitation: { ...row, invitation_type: 'LINK', email: null, version: 1 } }),
    );
    expect(await repo.createInvitation!(request)).toMatchObject({
      status: 'success',
      data: { oneTimeLink: null },
    });
  });
  it.each([
    `https://foreign.example/invitations/local#token=${token}`,
    `${window.location.origin}/invitations/local?source=email#token=${token}`,
    `${window.location.origin}/invitations/local#token=${token}&next=trips`,
    `${window.location.origin}/invitations/local#token=${token}&token=${token}`,
  ])('rejects a one-time link outside the exact Web route contract: %s', async (link) => {
    const { repo } = setup({
      invitation: { ...row, invitation_type: 'LINK', email: null, version: 1 },
      one_time_link: link,
    });
    expect(
      await repo.createInvitation!({
        tripId,
        signal: signal(),
        intent: {
          invitationType: 'LINK',
          expectedMembershipRevision: 7,
          expiresAt: null,
          idempotencyKey: operationKey,
        },
      }),
    ).toMatchObject({ status: 'error', error: { retryable: false } });
  });
  it.each(['revoke', 'resend'] as const)(
    '%s sends only expected version and a stable key',
    async (action) => {
      const { repo, transport } = setup({
        invitation: {
          ...row,
          version: 3,
          ...(action === 'revoke'
            ? { status: 'REVOKED', resolved_at: '2026-10-23T00:00:00Z' }
            : {}),
        },
      });
      const command = action === 'resend' ? repo.resendInvitation! : repo.revokeInvitation!;
      await command({
        tripId,
        invitationId: id,
        signal: signal(),
        intent: { expectedVersion: 2, idempotencyKey: operationKey },
      });
      const [path, init] = transport.mock.calls[0]!;
      expect(path).toBe(`/api/v1/trips/${tripId}/invitations/${id}/${action}`);
      expect(JSON.parse(init!.body as string)).toEqual({ expected_version: 2 });
      expect(new Headers(init!.headers).get('Idempotency-Key')).toBe(operationKey);
    },
  );
  it('preview is a POST without key; decline returns the final preview receipt', async () => {
    const { repo, transport } = setup(preview);
    expect(await repo.previewInvitation!({ token, signal: signal() })).toMatchObject({
      status: 'success',
      data: { tripName: 'Đà Nẵng' },
    });
    expect(transport.mock.calls[0]![0]).toBe('/api/v1/invitations/preview');
    expect(new Headers(transport.mock.calls[0]![1]!.headers).has('Idempotency-Key')).toBe(false);
    transport.mockImplementation(async () => response({ ...preview, status: 'DECLINED' }));
    expect(
      await repo.declineInvitation!({ token, signal: signal(), idempotencyKey: operationKey }),
    ).toMatchObject({ status: 'success', data: { status: 'DECLINED' } });
    expect(new Headers(transport.mock.calls[1]![1]!.headers).get('Idempotency-Key')).toBe(
      operationKey,
    );
  });
  it('accept maps authoritative membership and all revisions', async () => {
    const { repo, transport } = setup({
      membership: {
        id,
        trip_id: tripId,
        user_id: '44444444-4444-4444-8444-444444444444',
        role: 'MEMBER',
        joined_at: row.expires_at,
        left_at: null,
      },
      revisions: { plan_version: 2, membership_revision: 3, export_revision: 4 },
    });
    expect(
      await repo.acceptInvitation!({ token, signal: signal(), idempotencyKey: operationKey }),
    ).toMatchObject({
      status: 'success',
      data: {
        membership: { tripId },
        revisions: { planVersion: 2, membershipRevision: 3, exportRevision: 4 },
      },
    });
    expect(transport.mock.calls[0]![0]).toBe('/api/v1/invitations/accept');
  });
  it.each([
    ['create', { invitation: { ...row, version: 2 } }],
    ['preview', { ...preview, status: 'ACCEPTED' }],
    ['decline', preview],
    ['revoke', { invitation: { ...row, version: 3 } }],
    ['resend', { invitation: { ...row, version: 3, invitation_type: 'LINK', email: null } }],
    [
      'accept',
      {
        membership: {
          id,
          trip_id: tripId,
          user_id: '44444444-4444-4444-8444-444444444444',
          role: 'OWNER',
          joined_at: row.expires_at,
          left_at: null,
        },
        revisions: { plan_version: 2, membership_revision: 3, export_revision: 4 },
      },
    ],
  ] as const)('rejects a malformed successful %s receipt', async (action, data) => {
    const { repo } = setup(data);
    const result =
      action === 'create'
        ? await repo.createInvitation!({
            tripId,
            signal: signal(),
            intent: {
              invitationType: 'EMAIL',
              email: 'guest@example.com',
              expectedMembershipRevision: 1,
              expiresAt: null,
              idempotencyKey: operationKey,
            },
          })
        : action === 'preview'
          ? await repo.previewInvitation!({ token, signal: signal() })
          : action === 'decline'
            ? await repo.declineInvitation!({
                token,
                signal: signal(),
                idempotencyKey: operationKey,
              })
            : action === 'accept'
              ? await repo.acceptInvitation!({
                  token,
                  signal: signal(),
                  idempotencyKey: operationKey,
                })
              : await (action === 'revoke' ? repo.revokeInvitation! : repo.resendInvitation!)({
                  tripId,
                  invitationId: id,
                  signal: signal(),
                  intent: { expectedVersion: 2, idempotencyKey: operationKey },
                });
    expect(result).toMatchObject({ status: 'error', error: { retryable: false } });
  });
  it.each([
    [401, 'UNAUTHENTICATED'],
    [403, 'PERMISSION_DENIED'],
    [404, 'RESOURCE_NOT_FOUND'],
    [409, 'VERSION_CONFLICT'],
    [429, 'RESOURCE_EXHAUSTED'],
    [503, 'SERVICE_UNAVAILABLE'],
  ] as const)('preserves %s domain error without retry', async (status, code) => {
    const { repo, transport } = setup(null);
    transport.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code,
              message: 'failed',
              retryable: status === 503,
              details: { invitation_version: 3 },
            },
            meta: { correlation_id: 'error-id' },
          }),
          { status },
        ),
    );
    expect(await repo.previewInvitation!({ token, signal: signal() })).toMatchObject({
      status: 'error',
      error: { code, correlationId: 'error-id', details: { invitation_version: 3 } },
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
