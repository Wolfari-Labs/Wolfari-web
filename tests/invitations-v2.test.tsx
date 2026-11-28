import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionManagerProvider } from '../src/app/session-context';
import { MembersRepositoryProvider } from '../src/features/members/repositories/members-context';
import { InvitationPage } from '../src/features/members/InvitationPage';
import { InvitationManagement } from '../src/features/members/InvitationManagement';
import {
  PENDING_INVITATION_TTL_MS,
  captureInvitationToken,
  invitationResponseAttempt,
  invitationToken,
} from '../src/features/members/invitation-token';
import { invitationManagementAttempt } from '../src/features/members/invitation-management-attempt';
import {
  normalizeJoinCode,
  type InvitationPreview,
  type InvitationRepository,
  type InvitationViewModel,
} from '../src/features/members/model/members';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

const token = `inv1_${'a'.repeat(43)}`;
const pendingKey = 'wolfari.invitation.pending.v1';
const mineId = '77777777-7777-4777-8777-777777777777';
const preview: InvitationPreview = {
  id: 'invite',
  tripName: 'Đà Nẵng',
  inviterDisplayName: 'Owner',
  status: 'PENDING',
  expiresAt: '2027-01-01T00:00:00Z',
  invitationType: 'EMAIL',
  tripStartAt: '2026-12-12T01:00:00Z',
  tripEndAt: '2026-12-15T01:00:00Z',
};
const item: InvitationViewModel = {
  id: 'invite',
  tripId: previewTripId,
  invitationType: 'LINK',
  email: null,
  status: 'PENDING',
  version: 1,
  expiresAt: preview.expiresAt,
  resolvedAt: null,
  maxUses: 20,
  useCount: 3,
  codeHint: '1234',
};
const success = <T,>(data: T) => ({ status: 'success' as const, data, correlationId: 'test' });
const accepted = success({
  membership: {
    id: 'member',
    tripId: previewTripId,
    userId: 'guest',
    role: 'MEMBER' as const,
    joinedAt: preview.expiresAt,
    leftAt: null,
    presentation: { displayName: null, avatar: null },
  },
  revisions: { planVersion: 1, membershipRevision: 2, exportRevision: 2 },
});
function repository(): InvitationRepository {
  return {
    listInvitations: vi.fn(async () => ({
      status: 'ready' as const,
      data: { items: [item], nextCursor: null },
    })),
    previewInvitation: vi.fn(async () => success(preview)),
    declineInvitation: vi.fn(async () => success({ ...preview, status: 'DECLINED' as const })),
    acceptInvitation: vi.fn(async () => accepted),
    listMyInvitations: vi.fn(async () => ({
      status: 'ready' as const,
      data: [{ ...preview, id: mineId, tripName: 'Hội An' }],
    })),
    createInvitation: vi.fn(async () =>
      success({
        invitation: item,
        oneTimeLink: null,
        joinCode: 'ABCD-1234',
        shareLink: `${window.location.origin}/invitations#code=ABCD-1234`,
      }),
    ),
  };
}
function session(initial = 'authenticated') {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    status: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (next: string) => {
      state = next;
      listeners.forEach((listener) => listener());
    },
    clear: () => {
      state = 'anonymous';
      listeners.forEach((listener) => listener());
    },
  };
}
function Location() {
  return <output aria-label="route">{useLocation().pathname}</output>;
}
function mount(repo: InvitationRepository, child = <InvitationPage />, initial = 'authenticated') {
  const manager = session(initial);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SessionManagerProvider manager={manager}>
        <MembersRepositoryProvider
          invitation={repo}
          membership={{ listMembers: async () => ({ status: 'empty' }) }}
        >
          <MemoryRouter initialEntries={['/invitations']}>
            <Location />
            {child}
          </MemoryRouter>
        </MembersRepositoryProvider>
      </SessionManagerProvider>
    </QueryClientProvider>,
  );
  return { manager, client };
}
afterEach(() => {
  invitationToken.clear();
  invitationResponseAttempt.clear();
  invitationManagementAttempt.clear();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('join codes', () => {
  it('normalizes like the Backend (case, spaces, dashes, O→0, I/L→1)', () => {
    expect(normalizeJoinCode('abcd-1234')).toBe('ABCD1234');
    expect(normalizeJoinCode(' ab cd 12 34 ')).toBe('ABCD1234');
    expect(normalizeJoinCode('oIlL-0000')).toBe('0111' + '0000');
    for (const bad of ['ABCD-123', 'ABCD-12345', 'ABCU-1234', '', 'A'.repeat(33), 'ABCD_1234'])
      expect(normalizeJoinCode(bad), bad).toBeUndefined();
  });
  it('captures #code= from a share link, scrubs it and previews by code', async () => {
    window.history.replaceState(null, '', '/invitations#code=abcd-1234');
    captureInvitationToken();
    expect(window.location.hash).toBe('');
    expect(invitationToken.read()).toBe('ABCD1234');
    const repo = repository();
    mount(repo);
    await screen.findByRole('button', { name: 'Chấp nhận' });
    expect(vi.mocked(repo.previewInvitation!).mock.calls[0]![0].token).toBe('ABCD1234');
    expect(screen.getByText('ABCD-1234')).toBeVisible();
    expect(screen.getByText('12/12/2026 – 15/12/2026')).toBeVisible();
  });
  it.each(['#code=nope', '#code=ABCD-1234&token=x', '#other=1'])(
    'rejects malformed fragment %s',
    (hash) => {
      window.history.replaceState(null, '', '/invitations' + hash);
      captureInvitationToken();
      expect(window.location.hash).toBe('');
      expect(invitationToken.read()).toBeNull();
    },
  );
  it('opens the preview from a typed code and validates the format first', async () => {
    const repo = repository();
    mount(repo);
    const field = screen.getByLabelText(/Mã mời/);
    await userEvent.type(field, 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Xem lời mời' }));
    expect(await screen.findByText(/Mã mời gồm 8 ký tự/)).toBeVisible();
    expect(repo.previewInvitation).not.toHaveBeenCalled();
    await userEvent.clear(field);
    await userEvent.type(field, 'abcd 1234');
    await userEvent.click(screen.getByRole('button', { name: 'Xem lời mời' }));
    await screen.findByRole('button', { name: 'Chấp nhận' });
    expect(vi.mocked(repo.previewInvitation!).mock.calls[0]![0].token).toBe('ABCD1234');
    await userEvent.click(screen.getByRole('button', { name: 'Chấp nhận' }));
    await waitFor(() =>
      expect(screen.getByLabelText('route')).toHaveTextContent(`/trips/${previewTripId}`),
    );
    expect(vi.mocked(repo.acceptInvitation!).mock.calls[0]![0]).toMatchObject({
      token: 'ABCD1234',
    });
    expect(sessionStorage.getItem(pendingKey)).toBeNull();
  });
  it('explains a wrong code and a wrong account differently on 404', async () => {
    const repo = repository();
    vi.mocked(repo.previewInvitation!).mockResolvedValue({
      status: 'error',
      error: { code: 'RESOURCE_NOT_FOUND', correlationId: null, retryable: false },
    });
    invitationToken.open('ABCD1234');
    mount(repo);
    expect(await screen.findByText(/Không tìm thấy lời mời với mã này/)).toBeVisible();
    act(() => invitationToken.clear());
    window.history.replaceState(null, '', `/invitations#token=${token}`);
    act(() => captureInvitationToken());
    expect(
      await screen.findByText(
        'Không tìm thấy lời mời cho tài khoản này — đăng nhập đúng email đã nhận lời mời và xác minh email.',
      ),
    ).toBeVisible();
  });
});

describe('pending invitation across login and reload', () => {
  it('survives a reload in this tab for a short time and is cleared after use', async () => {
    window.history.replaceState(null, '', `/invitations#token=${token}`);
    captureInvitationToken();
    expect(JSON.parse(sessionStorage.getItem(pendingKey)!)).toMatchObject({ secret: token });
    vi.resetModules();
    const reloaded = await import('../src/features/members/invitation-token');
    expect(reloaded.invitationToken.read()).toBeNull();
    window.history.replaceState(null, '', '/login');
    reloaded.captureInvitationToken();
    expect(reloaded.invitationToken.read()).toBe(token);
    reloaded.invitationToken.clear();
    expect(sessionStorage.getItem(pendingKey)).toBeNull();
  });
  it('drops an expired or tampered pending entry', async () => {
    for (const value of [
      { secret: token, expires_at: Date.now() - 1 },
      { secret: token, expires_at: Date.now() + PENDING_INVITATION_TTL_MS * 10 },
      { secret: 'javascript:alert(1)', expires_at: Date.now() + 1000 },
      'not json',
    ]) {
      sessionStorage.setItem(pendingKey, typeof value === 'string' ? value : JSON.stringify(value));
      vi.resetModules();
      const reloaded = await import('../src/features/members/invitation-token');
      window.history.replaceState(null, '', '/invitations');
      reloaded.captureInvitationToken();
      expect(reloaded.invitationToken.read(), JSON.stringify(value)).toBeNull();
      expect(sessionStorage.getItem(pendingKey)).toBeNull();
    }
  });
  it('a guest keeps the code while going to login/register', async () => {
    const repo = repository();
    const { manager } = mount(repo, <InvitationPage />, 'anonymous');
    await userEvent.type(screen.getByLabelText(/Mã mời/), 'ABCD-1234');
    await userEvent.click(screen.getByRole('button', { name: 'Xem lời mời' }));
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute(
      'href',
      '/register?returnTo=%2Finvitations',
    );
    expect(JSON.parse(sessionStorage.getItem(pendingKey)!)).toMatchObject({ secret: 'ABCD1234' });
    expect(repo.previewInvitation).not.toHaveBeenCalled();
    act(() => manager.set('authenticated'));
    await screen.findByRole('button', { name: 'Chấp nhận' });
  });
});

describe('invitations waiting for my email', () => {
  it('lists them and joins by invitation_id with an Idempotency-Key', async () => {
    const repo = repository();
    mount(repo);
    expect(await screen.findByText('Hội An')).toBeVisible();
    expect(screen.getByText(/Thời gian chuyến đi: 12\/12\/2026 – 15\/12\/2026/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Tham gia' }));
    await waitFor(() =>
      expect(screen.getByLabelText('route')).toHaveTextContent(`/trips/${previewTripId}`),
    );
    const call = vi.mocked(repo.acceptInvitation!).mock.calls[0]![0];
    expect(call.invitationId).toBe(mineId);
    expect(call.token).toBeUndefined();
    expect(call.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('retries an unknown decline with the same key and then confirms it', async () => {
    const repo = repository();
    vi.mocked(repo.declineInvitation!).mockResolvedValueOnce({
      status: 'error',
      error: { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true },
    });
    mount(repo);
    await userEvent.click(await screen.findByRole('button', { name: 'Từ chối' }));
    expect(await screen.findByRole('button', { name: 'Thử lại từ chối' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tham gia' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại từ chối' }));
    expect(await screen.findByText(/Đã từ chối lời mời tham gia “Hội An”/)).toBeVisible();
    const calls = vi.mocked(repo.declineInvitation!).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]![0].idempotencyKey).toBe(calls[1]![0].idempotencyKey);
    expect(calls[1]![0].invitationId).toBe(mineId);
  });
  it('is hidden when an older Gateway has no /me/invitations', async () => {
    const repo = repository();
    vi.mocked(repo.listMyInvitations!).mockResolvedValue({
      status: 'error',
      error: { code: 'RESOURCE_NOT_FOUND', correlationId: null, retryable: false },
    });
    mount(repo);
    await waitFor(() => expect(repo.listMyInvitations).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByText('Đang tải lời mời của bạn…')).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole('region', { name: 'Lời mời đang chờ bạn' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Chưa tải được lời mời/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Mã mời/)).toBeVisible();
  });
  it('is not loaded for a guest', () => {
    const repo = repository();
    mount(repo, <InvitationPage />, 'anonymous');
    expect(repo.listMyInvitations).not.toHaveBeenCalled();
  });
});

describe('Owner group codes', () => {
  async function ownerTrip() {
    const result = await createFixtureTripRepository().getTrip({
      tripId: previewTripId,
      scenario: 'success',
      signal: new AbortController().signal,
    });
    if (result.status !== 'ready') throw Error('missing trip');
    return result.data;
  }
  it('creates a group code (20 people) and shows the code and share link once', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    mount(repo, <InvitationManagement trip={trip} />);
    await userEvent.selectOptions(screen.getByLabelText('Loại lời mời'), 'LINK');
    await userEvent.selectOptions(screen.getByLabelText('Số người dùng được'), '20');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo liên kết' }));
    expect(await screen.findByText('ABCD-1234')).toBeVisible();
    expect(screen.getByText(`${window.location.origin}/invitations#code=ABCD-1234`)).toBeVisible();
    expect(screen.getByText(/tối đa 20 người tham gia/)).toBeVisible();
    expect(vi.mocked(repo.createInvitation!).mock.calls[0]![0].intent).toMatchObject({
      invitationType: 'LINK',
      maxUses: 20,
    });
    expect(screen.getByText(/đã dùng 3\/20/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Đóng mã mời' }));
    expect(screen.queryByText('ABCD-1234')).not.toBeInTheDocument();
  });
  it('keeps the default single-use link without max_uses', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    mount(repo, <InvitationManagement trip={trip} />);
    await userEvent.selectOptions(screen.getByLabelText('Loại lời mời'), 'LINK');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo liên kết' }));
    await screen.findByText('ABCD-1234');
    expect(vi.mocked(repo.createInvitation!).mock.calls[0]![0].intent).not.toHaveProperty(
      'maxUses',
    );
  });
});
