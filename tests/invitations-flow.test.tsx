import { StrictMode, useState } from 'react';
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
  captureInvitationToken,
  invitationResponseAttempt,
  invitationToken,
} from '../src/features/members/invitation-token';
import { invitationManagementAttempt } from '../src/features/members/invitation-management-attempt';
import type {
  InvitationRepository,
  InvitationViewModel,
} from '../src/features/members/model/members';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

const token = `inv1_${'a'.repeat(43)}`;
const preview = {
  id: 'invite',
  tripName: 'Đà Nẵng',
  inviterDisplayName: 'Owner',
  status: 'PENDING' as const,
  expiresAt: '2027-01-01T00:00:00Z',
};
const item: InvitationViewModel = {
  id: 'invite',
  tripId: previewTripId,
  invitationType: 'EMAIL',
  email: 'guest@example.com',
  status: 'PENDING',
  version: 3,
  expiresAt: preview.expiresAt,
  resolvedAt: null,
};
const success = <T,>(data: T) => ({ status: 'success' as const, data, correlationId: 'test' });
const unknown = {
  status: 'error' as const,
  error: { code: 'SERVICE_UNAVAILABLE' as const, correlationId: null, retryable: true },
};
function repository(): InvitationRepository {
  return {
    listInvitations: vi.fn(async () => ({
      status: 'ready' as const,
      data: { items: [item], nextCursor: null },
    })),
    previewInvitation: vi.fn(async () => success(preview)),
    declineInvitation: vi.fn(async () => success({ ...preview, status: 'DECLINED' as const })),
    acceptInvitation: vi.fn(async () =>
      success({
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
      }),
    ),
    createInvitation: vi.fn(async () => success({ invitation: item, oneTimeLink: null })),
    resendInvitation: vi.fn(async () => success({ ...item, version: 4 })),
    revokeInvitation: vi.fn(async () =>
      success({ ...item, version: 4, status: 'REVOKED' as const }),
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
function capture(value = token) {
  window.history.replaceState(
    { idx: 5, usr: { safe: true } },
    '',
    `/invitations/local#token=${value}`,
  );
  captureInvitationToken();
}
function mount(repo: InvitationRepository, child = <InvitationPage />, initial = 'authenticated') {
  const manager = session(initial);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = render(
    <StrictMode>
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
      </QueryClientProvider>
    </StrictMode>,
  );
  return { ...wrapper, manager, client };
}
async function ownerTrip() {
  const result = await createFixtureTripRepository().getTrip({
    tripId: previewTripId,
    scenario: 'success',
    signal: new AbortController().signal,
  });
  if (result.status !== 'ready') throw Error('missing trip');
  return result.data;
}
function ActiveManagement({ trip }: { trip: Awaited<ReturnType<typeof ownerTrip>> }) {
  const [active, setActive] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setActive((value) => !value)}>
        {active ? 'Rời tab' : 'Mở tab'}
      </button>
      <InvitationManagement trip={trip} active={active} />
    </>
  );
}
function PermissionManagement({ trip }: { trip: Awaited<ReturnType<typeof ownerTrip>> }) {
  const [owner, setOwner] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOwner(false)}>
        Mất quyền
      </button>
      <InvitationManagement
        trip={
          owner
            ? trip
            : {
                ...trip,
                currentMembership: { ...trip.currentMembership, role: 'MEMBER' },
              }
        }
      />
    </>
  );
}
afterEach(() => {
  invitationToken.clear();
  invitationResponseAttempt.clear();
  invitationManagementAttempt.clear();
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('invitation token and response flow', () => {
  it('scrubs fragment before render, preserves history state, survives StrictMode and never enters Query cache/storage', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    capture();
    expect(window.location.hash).toBe('');
    expect(window.history.state).toEqual({ idx: 5, usr: { safe: true } });
    const { client } = mount(repository());
    await screen.findByRole('button', { name: 'Chấp nhận' });
    expect(invitationToken.read()).toBe(token);
    expect(JSON.stringify(client.getQueryCache().getAll())).not.toContain(token);
    expect(storage).not.toHaveBeenCalled();
  });
  it('Guest performs no preview, login/register links contain only safe returnTo', async () => {
    capture();
    const repo = repository();
    const { manager } = mount(repo, <InvitationPage />, 'unknown');
    expect(repo.previewInvitation).not.toHaveBeenCalled();
    act(() => manager.set('anonymous'));
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute(
      'href',
      '/login?returnTo=%2Finvitations',
    );
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveAttribute(
      'href',
      '/register?returnTo=%2Finvitations',
    );
    expect(repo.previewInvitation).not.toHaveBeenCalled();
    act(() => manager.set('authenticated'));
    await screen.findByRole('button', { name: 'Chấp nhận' });
  });
  it('missing/reloaded/malformed token tells the user to open the original link', () => {
    capture('invalid');
    const repo = repository();
    mount(repo);
    expect(screen.getByText(/Hãy mở lại liên kết gốc/)).toBeVisible();
    expect(repo.previewInvitation).not.toHaveBeenCalled();
  });
  it('rejects fragment metadata in addition to the single token', () => {
    window.history.replaceState(null, '', `/invitations#token=${token}&next=%2Ftrips`);
    captureInvitationToken();
    expect(window.location.hash).toBe('');
    expect(invitationToken.read()).toBeNull();
  });
  it('accept uses receipt trip and does not re-preview a consumed invitation', async () => {
    capture();
    const repo = repository();
    mount(repo);
    await screen.findByRole('button', { name: 'Chấp nhận' });
    const count = vi.mocked(repo.previewInvitation!).mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Chấp nhận' }));
    await waitFor(() =>
      expect(screen.getByLabelText('route')).toHaveTextContent(`/trips/${previewTripId}`),
    );
    expect(repo.previewInvitation).toHaveBeenCalledTimes(count);
    expect(invitationToken.read()).toBeNull();
  });
  it('decline shows final receipt without another preview', async () => {
    capture();
    const repo = repository();
    mount(repo);
    await screen.findByRole('button', { name: 'Từ chối' });
    const count = vi.mocked(repo.previewInvitation!).mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    await screen.findByRole('heading', { name: 'Đã từ chối lời mời' });
    expect(repo.previewInvitation).toHaveBeenCalledTimes(count);
    expect(invitationToken.read()).toBeNull();
  });
  it('unknown accept preserves key/payload and blocks the opposite action', async () => {
    capture();
    const repo = repository();
    vi.mocked(repo.acceptInvitation!).mockResolvedValueOnce(unknown);
    mount(repo);
    await userEvent.click(await screen.findByRole('button', { name: 'Chấp nhận' }));
    await screen.findByText(/Chưa xác định được kết quả/);
    expect(screen.getByRole('button', { name: 'Từ chối' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại chấp nhận' }));
    const calls = vi.mocked(repo.acceptInvitation!).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]![0].idempotencyKey).toBe(calls[1]![0].idempotencyKey);
    expect(calls[0]![0].token).toBe(calls[1]![0].token);
  });
  it('reopening the same token scrubs the URL without remounting or replacing the intent', async () => {
    capture();
    const repo = repository();
    vi.mocked(repo.acceptInvitation!).mockResolvedValueOnce(unknown);
    mount(repo);
    await userEvent.click(await screen.findByRole('button', { name: 'Chấp nhận' }));
    const first = vi.mocked(repo.acceptInvitation!).mock.calls[0]![0];
    const revision = invitationToken.revision();
    act(() => capture());
    expect(window.location.hash).toBe('');
    expect(invitationToken.revision()).toBe(revision);
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại chấp nhận' }));
    const second = vi.mocked(repo.acceptInvitation!).mock.calls[1]![0];
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(second.token).toBe(first.token);
  });
  it('keeps an unknown response intent across route unmount and remount', async () => {
    capture();
    const repo = repository();
    vi.mocked(repo.acceptInvitation!).mockResolvedValueOnce(unknown);
    vi.mocked(repo.previewInvitation!)
      .mockResolvedValueOnce(success(preview))
      .mockResolvedValue({
        status: 'error',
        error: { code: 'STATE_CONFLICT', correlationId: null, retryable: false },
      });
    const firstView = mount(repo);
    await userEvent.click(await screen.findByRole('button', { name: 'Chấp nhận' }));
    await screen.findByRole('button', { name: 'Thử lại chấp nhận' });
    const first = vi.mocked(repo.acceptInvitation!).mock.calls[0]![0];
    firstView.unmount();

    mount(repo);
    await userEvent.click(await screen.findByRole('button', { name: 'Thử lại chấp nhận' }));
    const second = vi.mocked(repo.acceptInvitation!).mock.calls[1]![0];
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(second.token).toBe(first.token);
    expect(repo.previewInvitation).toHaveBeenCalledTimes(1);
  });
  it('hides stale actions after a definitive conflict until preview is authoritative again', async () => {
    capture();
    const repo = repository();
    vi.mocked(repo.acceptInvitation!).mockResolvedValue({
      status: 'error',
      error: { code: 'STATE_CONFLICT', correlationId: null, retryable: false },
    });
    vi.mocked(repo.previewInvitation!)
      .mockResolvedValueOnce(success(preview))
      .mockResolvedValueOnce({
        status: 'error',
        error: { code: 'STATE_CONFLICT', correlationId: null, retryable: false },
      });
    mount(repo);
    await userEvent.click(await screen.findByRole('button', { name: 'Chấp nhận' }));
    await waitFor(() =>
      expect(vi.mocked(repo.previewInvitation!).mock.calls.length).toBeGreaterThanOrEqual(2),
    );
    expect(screen.getByText(/Lời mời không khả dụng hoặc trạng thái đã thay đổi/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Chấp nhận' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Từ chối' })).not.toBeInTheDocument();
  });
  it('does not send simultaneous accept/decline and ignores completion after account switch', async () => {
    capture();
    const repo = repository();
    let finish!: (
      value: Awaited<ReturnType<NonNullable<InvitationRepository['acceptInvitation']>>>,
    ) => void;
    vi.mocked(repo.acceptInvitation!).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { manager } = mount(repo);
    await userEvent.dblClick(await screen.findByRole('button', { name: 'Chấp nhận' }));
    expect(repo.acceptInvitation).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Từ chối' })).toBeDisabled();
    act(() => manager.set('anonymous'));
    await act(async () => finish(unknown));
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
    expect(screen.queryByText(/Chưa xác định được kết quả/)).not.toBeInTheDocument();
    expect(invitationResponseAttempt.read(token)).toBeNull();
  });
  it('new token discards stale preview in the same SPA', async () => {
    capture();
    const repo = repository();
    mount(repo);
    await screen.findByRole('button', { name: 'Chấp nhận' });
    act(() => capture(`inv1_${'b'.repeat(43)}`));
    await waitFor(() =>
      expect(vi.mocked(repo.previewInvitation!).mock.calls.at(-1)?.[0].token).toBe(
        `inv1_${'b'.repeat(43)}`,
      ),
    );
  });
  it('ignores a mutation receipt from the previous token', async () => {
    capture();
    const repo = repository();
    let finish!: (
      value: Awaited<ReturnType<NonNullable<InvitationRepository['acceptInvitation']>>>,
    ) => void;
    vi.mocked(repo.acceptInvitation!).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    mount(repo);
    await userEvent.click(await screen.findByRole('button', { name: 'Chấp nhận' }));
    const nextToken = `inv1_${'b'.repeat(43)}`;
    act(() => capture(nextToken));
    await waitFor(() =>
      expect(vi.mocked(repo.previewInvitation!).mock.calls.at(-1)?.[0].token).toBe(nextToken),
    );
    await act(async () =>
      finish(
        success({
          membership: {
            id: 'old-member',
            tripId: previewTripId,
            userId: 'guest',
            role: 'MEMBER',
            joinedAt: preview.expiresAt,
            leftAt: null,
            presentation: { displayName: null, avatar: null },
          },
          revisions: { planVersion: 1, membershipRevision: 2, exportRevision: 2 },
        }),
      ),
    );
    expect(invitationToken.read()).toBe(nextToken);
    expect(screen.getByLabelText('route')).toHaveTextContent('/invitations');
    expect(await screen.findByRole('button', { name: 'Chấp nhận' })).toBeEnabled();
  });
  it.each(['RESOURCE_NOT_FOUND', 'STATE_CONFLICT'] as const)(
    'does not infer a specific reason from %s',
    async (code) => {
      capture();
      const repo = repository();
      vi.mocked(repo.previewInvitation!).mockResolvedValue({
        status: 'error',
        error: { code, correlationId: null, retryable: false },
      });
      mount(repo);
      await screen.findByText(/Lời mời không khả dụng hoặc trạng thái đã thay đổi/);
      expect(screen.queryByRole('button', { name: 'Chấp nhận' })).not.toBeInTheDocument();
    },
  );
  it('returns to the guest login flow when authenticated preview receives 401', async () => {
    capture();
    const repo = repository();
    vi.mocked(repo.previewInvitation!).mockResolvedValue({
      status: 'error',
      error: { code: 'UNAUTHENTICATED', correlationId: 'expired', retryable: false },
    });
    const { manager } = mount(repo);
    await screen.findByRole('link', { name: 'Đăng nhập' });
    expect(manager.status()).toBe('anonymous');
    expect(invitationToken.read()).toBe(token);
    expect(invitationResponseAttempt.read(token)).toBeNull();
  });
});

describe('Owner invitation management', () => {
  it('normalizes email and sends current membership revision', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    mount(repo, <InvitationManagement trip={trip} />);
    await userEvent.type(screen.getByLabelText('Email người nhận'), ' Guest@Example.COM ');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi lời mời' }));
    await screen.findByText(/Yêu cầu gửi lời mời đã được tiếp nhận/);
    expect(repo.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: expect.objectContaining({
          email: 'guest@example.com',
          expectedMembershipRevision: trip.membershipRevision,
        }),
      }),
    );
  });
  it('LINK is shown once, never cached, and can be closed', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    const link = `http://localhost/invitations/local#token=${token}`;
    vi.mocked(repo.createInvitation!).mockResolvedValue(
      success({ invitation: { ...item, invitationType: 'LINK', email: null }, oneTimeLink: link }),
    );
    const { client } = mount(repo, <InvitationManagement trip={trip} />);
    await userEvent.selectOptions(screen.getByLabelText('Loại lời mời'), 'LINK');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo liên kết' }));
    await screen.findByText(link);
    expect(vi.mocked(repo.createInvitation!).mock.calls[0]![0].intent).not.toHaveProperty('email');
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((query) => query.state.data),
      ),
    ).not.toContain(token);
    expect(screen.getByRole('button', { name: 'Gửi lại' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Thu hồi' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Đóng liên kết' }));
    expect(screen.queryByText(link)).not.toBeInTheDocument();
  });
  it('removes a LINK secret from the DOM as soon as the invitation tab becomes inactive', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    const link = `http://localhost/invitations/local#token=${token}`;
    vi.mocked(repo.createInvitation!).mockResolvedValue(
      success({ invitation: { ...item, invitationType: 'LINK', email: null }, oneTimeLink: link }),
    );
    mount(repo, <ActiveManagement trip={trip} />);
    await userEvent.selectOptions(screen.getByLabelText('Loại lời mời'), 'LINK');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo liên kết' }));
    await screen.findByText(link);
    await userEvent.click(screen.getByRole('button', { name: 'Rời tab' }));
    await waitFor(() => expect(screen.queryByText(link)).not.toBeInTheDocument());
    expect(screen.getByText(/đã bị đóng khi bạn rời tab/)).toBeVisible();
  });
  it('never renders a LINK secret whose response arrives while the tab is inactive', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    const link = `http://localhost/invitations/local#token=${token}`;
    let finish!: (
      value: Awaited<ReturnType<NonNullable<InvitationRepository['createInvitation']>>>,
    ) => void;
    vi.mocked(repo.createInvitation!).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    mount(repo, <ActiveManagement trip={trip} />);
    await userEvent.selectOptions(screen.getByLabelText('Loại lời mời'), 'LINK');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo liên kết' }));
    await userEvent.click(screen.getByRole('button', { name: 'Rời tab' }));
    await act(async () =>
      finish(
        success({
          invitation: { ...item, invitationType: 'LINK', email: null },
          oneTimeLink: link,
        }),
      ),
    );
    expect(screen.queryByText(link)).not.toBeInTheDocument();
    expect(screen.getByText(/đã được tạo khi tab không hoạt động nên đã bị bỏ/)).toBeVisible();
  });
  it('retrying unknown creation retains the exact intent and reports an unrecoverable LINK', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    vi.mocked(repo.createInvitation!)
      .mockResolvedValueOnce(unknown)
      .mockResolvedValueOnce(
        success({
          invitation: { ...item, invitationType: 'LINK', email: null },
          oneTimeLink: null,
        }),
      );
    mount(repo, <InvitationManagement trip={trip} />);
    await userEvent.selectOptions(screen.getByLabelText('Loại lời mời'), 'LINK');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo liên kết' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Thử lại cùng yêu cầu' }));
    await screen.findByText(/Không thể khôi phục liên kết/);
    const calls = vi.mocked(repo.createInvitation!).mock.calls;
    expect(calls[0]![0].intent).toEqual(calls[1]![0].intent);
  });
  it('keeps an unknown create intent and draft across route unmount and remount', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    vi.mocked(repo.createInvitation!).mockResolvedValueOnce(unknown);
    const firstView = mount(repo, <InvitationManagement trip={trip} />);
    await userEvent.type(screen.getByLabelText('Email người nhận'), 'retry@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi lời mời' }));
    await screen.findByRole('button', { name: 'Thử lại cùng yêu cầu' });
    const first = vi.mocked(repo.createInvitation!).mock.calls[0]![0];
    firstView.unmount();

    mount(repo, <InvitationManagement trip={trip} />);
    expect(screen.getByLabelText('Email người nhận')).toHaveValue('retry@example.com');
    await userEvent.click(await screen.findByRole('button', { name: 'Thử lại cùng yêu cầu' }));
    const second = vi.mocked(repo.createInvitation!).mock.calls[1]![0];
    expect(second.intent).toEqual(first.intent);
  });
  it('keeps an unknown intent while switching away from and back to the tab', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    vi.mocked(repo.createInvitation!).mockResolvedValueOnce(unknown);
    mount(repo, <ActiveManagement trip={trip} />);
    await userEvent.type(screen.getByLabelText('Email người nhận'), 'retry@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi lời mời' }));
    await screen.findByRole('button', { name: 'Thử lại cùng yêu cầu' });
    await userEvent.click(screen.getByRole('button', { name: 'Rời tab' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mở tab' }));
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại cùng yêu cầu' }));
    const calls = vi.mocked(repo.createInvitation!).mock.calls;
    expect(calls[1]![0].intent).toEqual(calls[0]![0].intent);
  });
  it('keeps the create draft but requires a new confirmed intent after revision conflict', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    vi.mocked(repo.createInvitation!).mockResolvedValueOnce({
      status: 'error',
      error: { code: 'VERSION_CONFLICT', correlationId: 'conflict', retryable: false },
    });
    mount(repo, <InvitationManagement trip={trip} />);
    await userEvent.type(screen.getByLabelText('Email người nhận'), 'draft@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi lời mời' }));
    await screen.findByText(/Dữ liệu đã thay đổi/);
    expect(screen.getByLabelText('Email người nhận')).toHaveValue('draft@example.com');
    const first = vi.mocked(repo.createInvitation!).mock.calls[0]![0];

    await userEvent.click(screen.getByRole('button', { name: 'Gửi lời mời' }));
    await screen.findByText(/Yêu cầu gửi lời mời đã được tiếp nhận/);
    const second = vi.mocked(repo.createInvitation!).mock.calls[1]![0];
    expect(second.intent).toMatchObject({
      invitationType: 'EMAIL',
      email: 'draft@example.com',
    });
    expect(second.intent.idempotencyKey).not.toBe(first.intent.idempotencyKey);
    expect(vi.mocked(repo.listInvitations).mock.calls.length).toBeGreaterThan(1);
  });
  it('revoke requires confirmation and uses the row version', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    mount(repo, <InvitationManagement trip={trip} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Thu hồi' }));
    expect(repo.revokeInvitation).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận thu hồi' }));
    expect(repo.revokeInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: item.id,
        intent: expect.objectContaining({ expectedVersion: 3 }),
      }),
    );
  });
  it('offers resend only for EMAIL and enables mutations only while PENDING', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    vi.mocked(repo.listInvitations).mockResolvedValue({
      status: 'ready',
      data: {
        items: [
          { ...item, id: 'link', invitationType: 'LINK', email: null },
          {
            ...item,
            id: 'accepted-email',
            status: 'ACCEPTED',
            resolvedAt: '2026-10-23T00:00:00Z',
          },
        ],
        nextCursor: null,
      },
    });
    mount(repo, <InvitationManagement trip={trip} />);
    const resend = await screen.findByRole('button', { name: 'Gửi lại' });
    expect(resend).toBeDisabled();
    const revoke = screen.getAllByRole('button', { name: 'Thu hồi' });
    expect(revoke).toHaveLength(2);
    expect(revoke[0]).toBeEnabled();
    expect(revoke[1]).toBeDisabled();
  });
  it('paginates, deduplicates, and resets cursor when filtering', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    vi.mocked(repo.listInvitations).mockImplementation(async (request) => ({
      status: 'ready',
      data: {
        items: request.cursor
          ? [item, { ...item, id: 'second', email: 'second@example.com' }]
          : [item],
        nextCursor: request.cursor || request.status ? null : 'next/+==',
      },
    }));
    mount(repo, <InvitationManagement trip={trip} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Tải thêm lời mời' }));
    await screen.findByText('second@example.com');
    expect(screen.getAllByText('guest@example.com')).toHaveLength(1);
    await userEvent.selectOptions(screen.getByLabelText('Trạng thái lời mời'), 'REVOKED');
    await waitFor(() =>
      expect(vi.mocked(repo.listInvitations).mock.calls.at(-1)?.[0]).toMatchObject({
        status: 'REVOKED',
      }),
    );
    expect(vi.mocked(repo.listInvitations).mock.calls.at(-1)?.[0]).not.toHaveProperty('cursor');
  });
  it('Member cannot read or write Owner invitations', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    mount(
      repo,
      <InvitationManagement
        trip={{ ...trip, currentMembership: { ...trip.currentMembership, role: 'MEMBER' } }}
      />,
    );
    expect(repo.listInvitations).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Gửi lời mời' })).toBeDisabled();
  });
  it('immediately removes cached invitation rows and pending intent after permission loss', async () => {
    const trip = await ownerTrip();
    const repo = repository();
    vi.mocked(repo.createInvitation!).mockResolvedValueOnce(unknown);
    mount(repo, <PermissionManagement trip={trip} />);
    await screen.findByText('guest@example.com');
    await userEvent.type(screen.getByLabelText('Email người nhận'), 'draft@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi lời mời' }));
    await screen.findByRole('button', { name: 'Thử lại cùng yêu cầu' });

    await userEvent.click(screen.getByRole('button', { name: 'Mất quyền' }));
    expect(screen.queryByText('guest@example.com')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Thử lại cùng yêu cầu' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Bạn không có quyền đọc danh sách lời mời.')).toBeVisible();
    expect(invitationManagementAttempt.read(`${trip.id}:${trip.currentMembership.id}`)).toBeNull();
  });
});
