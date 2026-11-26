import { describe, expect, it, vi } from 'vitest';
import { createGatewayHttpClient } from '../src/infrastructure/http/http-client';
import { createGatewayInvitationRepository } from '../src/infrastructure/repositories/invitation.gateway-repository';

const tripId = '11111111-1111-4111-8111-111111111111';
const id = '22222222-2222-4222-8222-222222222222';
const token = `inv1_${'a'.repeat(43)}`;
const operationKey = '33333333-3333-4333-8333-333333333333';
const shareLink = `${window.location.origin}/invitations#code=ABCD-1234`;
const link = {
  id,
  trip_id: tripId,
  invitation_type: 'LINK',
  email: null,
  status: 'PENDING',
  version: 1,
  expires_at: '2026-12-01T00:00:00Z',
  resolved_at: null,
  code_hint: '1234',
  invited_by_user_id: tripId,
  max_uses: 20,
  use_count: 0,
};
const preview = {
  id,
  trip_name: 'Đà Nẵng',
  inviter_display_name: 'Owner',
  status: 'PENDING',
  expires_at: link.expires_at,
  invitation_type: 'EMAIL',
  trip_start_at: '2026-12-12T01:00:00Z',
  trip_end_at: '2026-12-15T01:00:00Z',
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
const body = (transport: ReturnType<typeof setup>['transport'], call = 0) =>
  JSON.parse(transport.mock.calls[call]![1]!.body as string) as Record<string, unknown>;
const groupIntent = {
  invitationType: 'LINK' as const,
  maxUses: 20,
  expectedMembershipRevision: 7,
  expiresAt: null,
  idempotencyKey: operationKey,
};

describe('invitations v2 Gateway contract', () => {
  it('sends exactly one selector: token, normalized code or invitation_id', async () => {
    const { repo, transport } = setup(preview);
    await repo.previewInvitation!({ token, signal: signal() });
    await repo.previewInvitation!({ token: 'abcd-1234', signal: signal() });
    await repo.previewInvitation!({ invitationId: id.toUpperCase(), signal: signal() });
    expect([body(transport, 0), body(transport, 1), body(transport, 2)]).toEqual([
      { token },
      { code: 'ABCD1234' },
      { invitation_id: id },
    ]);
    transport.mockImplementation(async () => response({ ...preview, status: 'DECLINED' }));
    await repo.declineInvitation!({
      invitationId: id,
      idempotencyKey: operationKey,
      signal: signal(),
    });
    expect(body(transport, 3)).toEqual({ invitation_id: id });
    expect(new Headers(transport.mock.calls[3]![1]!.headers).get('Idempotency-Key')).toBe(
      operationKey,
    );
  });
  it('refuses a selector it cannot send without calling the Gateway', async () => {
    const { repo, transport } = setup(preview);
    for (const target of [{ token: 'nope' }, { invitationId: 'nope' }] as const)
      expect(await repo.previewInvitation!({ ...target, signal: signal() })).toMatchObject({
        status: 'error',
        error: { code: 'VALIDATION_FAILED' },
      });
    expect(transport).not.toHaveBeenCalled();
  });
  it('maps invitation type and trip dates, tolerating older previews', async () => {
    const { repo, transport } = setup(preview);
    expect(await repo.previewInvitation!({ token, signal: signal() })).toMatchObject({
      status: 'success',
      data: {
        invitationType: 'EMAIL',
        tripStartAt: preview.trip_start_at,
        tripEndAt: preview.trip_end_at,
      },
    });
    const { invitation_type: _t, trip_start_at: _s, trip_end_at: _e, ...older } = preview;
    void [_t, _s, _e];
    transport.mockImplementation(async () => response(older));
    expect(await repo.previewInvitation!({ token, signal: signal() })).toMatchObject({
      status: 'success',
      data: { invitationType: null, tripStartAt: null, tripEndAt: null },
    });
    for (const change of [
      { invitation_type: 'GROUP' },
      { trip_start_at: 'soon' },
      { trip_start_at: '2026-12-15T01:00:00Z', trip_end_at: '2026-12-12T01:00:00Z' },
    ]) {
      transport.mockImplementation(async () => response({ ...preview, ...change }));
      expect(await repo.previewInvitation!({ token, signal: signal() })).toMatchObject({
        status: 'error',
        error: { retryable: false },
      });
    }
  });
  it('rejects a preview for another invitation than the one answered by ID', async () => {
    const { repo } = setup({ ...preview, id: tripId });
    expect(await repo.previewInvitation!({ invitationId: id, signal: signal() })).toMatchObject({
      status: 'error',
    });
  });
  it('lists my pending EMAIL invitations strictly', async () => {
    const { repo, transport } = setup({ items: [preview] });
    expect(await repo.listMyInvitations!({ signal: signal() })).toMatchObject({
      status: 'ready',
      data: [{ id, tripName: 'Đà Nẵng' }],
    });
    expect(transport.mock.calls[0]![0]).toBe('/api/v1/me/invitations');
    expect(transport.mock.calls[0]![1]!.method ?? 'GET').toBe('GET');
    for (const items of [
      [preview, preview],
      [{ ...preview, status: 'ACCEPTED' }],
      [{ ...preview, invitation_type: 'LINK' }],
      Array.from({ length: 21 }, (_, n) => ({
        ...preview,
        id: `22222222-2222-4222-8222-${String(n).padStart(12, '0')}`,
      })),
    ]) {
      transport.mockImplementation(async () => response({ items }));
      expect(await repo.listMyInvitations!({ signal: signal() })).toMatchObject({
        status: 'error',
      });
    }
  });
  it('creates a group LINK with max_uses and validates code and share link', async () => {
    const { repo, transport } = setup({
      invitation: link,
      join_code: 'ABCD-1234',
      share_link: shareLink,
    });
    expect(
      await repo.createInvitation!({ tripId, signal: signal(), intent: groupIntent }),
    ).toMatchObject({
      status: 'success',
      data: {
        joinCode: 'ABCD-1234',
        shareLink,
        invitation: { maxUses: 20, useCount: 0, codeHint: '1234' },
      },
    });
    expect(body(transport)).toEqual({
      invitation_type: 'LINK',
      max_uses: 20,
      expected_membership_revision: 7,
    });
    // Replay: the secret is not returned again.
    transport.mockImplementation(async () => response({ invitation: link }));
    expect(
      await repo.createInvitation!({ tripId, signal: signal(), intent: groupIntent }),
    ).toMatchObject({ status: 'success', data: { joinCode: null, shareLink: null } });
  });
  it.each([
    { share_link: `https://foreign.example/invitations#code=ABCD-1234` },
    { share_link: `${window.location.origin}/invitations/local#code=ABCD-1234` },
    { share_link: `${window.location.origin}/invitations?x=1#code=ABCD-1234` },
    { share_link: `${window.location.origin}/invitations#code=WXYZ-1234` },
    { share_link: `${window.location.origin}/invitations#code=ABCD-1234&next=x` },
    { join_code: 'ABCD-5678' },
    { join_code: 'ABCD1234' },
    { invitation: { ...link, max_uses: 5 } },
    { invitation: { ...link, use_count: 21 } },
  ])('rejects a create receipt outside the contract %#', async (change) => {
    const { repo } = setup({
      invitation: link,
      join_code: 'ABCD-1234',
      share_link: shareLink,
      ...change,
    });
    expect(
      await repo.createInvitation!({ tripId, signal: signal(), intent: groupIntent }),
    ).toMatchObject({ status: 'error', error: { retryable: false } });
  });
  it('never accepts a join code on an EMAIL invitation', async () => {
    const { repo } = setup({
      invitation: {
        ...link,
        invitation_type: 'EMAIL',
        email: 'guest@example.com',
        code_hint: null,
        max_uses: 1,
      },
      join_code: 'ABCD-1234',
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
    ).toMatchObject({ status: 'error' });
  });
  it('reads use counts on the Owner list and keeps older rows without them', async () => {
    const { repo, transport } = setup({ items: [{ ...link, use_count: 3 }], next_cursor: null });
    expect(
      await repo.listInvitations({ tripId, scenario: 'success', signal: signal() }),
    ).toMatchObject({ status: 'ready', data: { items: [{ maxUses: 20, useCount: 3 }] } });
    const { max_uses: _m, use_count: _u, code_hint: _c, ...older } = link;
    void [_m, _u, _c];
    transport.mockImplementation(async () => response({ items: [older], next_cursor: null }));
    expect(
      await repo.listInvitations({ tripId, scenario: 'success', signal: signal() }),
    ).toMatchObject({
      status: 'ready',
      data: { items: [{ maxUses: null, useCount: null, codeHint: null }] },
    });
  });
});
