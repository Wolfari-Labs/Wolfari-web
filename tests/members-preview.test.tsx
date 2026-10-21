import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { App } from '../src/app/App';
import { Providers } from '../src/app/providers';
import { MembersPage } from '../src/features/members/MembersPage';
import {
  membershipScenarios,
  invitationScenarios,
  invitationEmailError,
  type MembershipRepository,
} from '../src/features/members/model/members';
import { createFixtureMembershipRepository } from '../src/infrastructure/fixtures/membership.fixture-repository';
import { createFixtureInvitationRepository } from '../src/infrastructure/fixtures/invitation.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { createGatewayMembershipRepository } from '../src/infrastructure/repositories/membership.gateway-repository';
import { createGatewayInvitationRepository } from '../src/infrastructure/repositories/invitation.gateway-repository';
import { selectMembersRepositories } from '../src/infrastructure/repositories/select-members-repositories';
import { previewTripId, fixtureTripCatalog } from '../src/infrastructure/fixtures/trip-catalog';
const req = (
  scenario: (typeof membershipScenarios)[number] = 'success',
  tripId = previewTripId,
) => ({ tripId, scenario, signal: new AbortController().signal });
describe('Members/Invitation read boundary', () => {
  it('keeps IDs, roles and nullable identity without inventing display name, avatar or Fund Holder', async () => {
    const repo = createFixtureMembershipRepository();
    expect(Object.keys(repo)).toEqual(['listMembers']);
    for (const trip of fixtureTripCatalog.filter((t) => t.permissions.canRead)) {
      const result = await repo.listMembers(req('success', trip.id));
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') throw Error('Missing members');
      expect(result.data.items).toHaveLength(trip.presentation.memberCount!);
      expect(result.data.items.filter((m) => m.role === 'OWNER')).toHaveLength(1);
      expect(result.data.items[0]).toMatchObject({
        ...trip.currentMembership,
        presentation: { displayName: null, avatar: null },
      });
      for (const member of result.data.items) {
        expect(member.presentation).toEqual({ displayName: null, avatar: null });
        expect(member.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
      }
    }
  });
  it.each(membershipScenarios.filter((s) => s !== 'loading'))(
    'keeps membership %s through Gateway interface',
    async (scenario) => {
      const fixture = createFixtureMembershipRepository();
      expect(
        await createGatewayMembershipRepository(fixture.listMembers).listMembers(req(scenario)),
      ).toEqual(await fixture.listMembers(req(scenario)));
    },
  );
  it.each(invitationScenarios.filter((s) => s !== 'loading'))(
    'keeps invitation %s, version and terminal read states',
    async (scenario) => {
      const fixture = createFixtureInvitationRepository(),
        request = { ...req(), scenario };
      const result = await fixture.listInvitations(request);
      expect(
        await createGatewayInvitationRepository(fixture.listInvitations).listInvitations(request),
      ).toEqual(result);
      if (['success', 'expired', 'revoked', 'used'].includes(scenario)) {
        expect(result).toMatchObject({
          status: 'ready',
          data: {
            items: [
              {
                status:
                  scenario === 'expired'
                    ? 'EXPIRED'
                    : scenario === 'revoked'
                      ? 'REVOKED'
                      : scenario === 'used'
                        ? 'ACCEPTED'
                        : 'PENDING',
                version: scenario === 'success' ? 1 : 2,
              },
            ],
          },
        });
        if (result.status === 'ready')
          for (const field of ['token', 'link', 'url'])
            expect(result.data.items[0]).not.toHaveProperty(field);
      }
    },
  );
  it('scopes invitation reads to active Owner and does not treat system role as membership', async () => {
    const repo = createFixtureInvitationRepository();
    expect(Object.keys(repo)).toEqual(['listInvitations']);
    expect(
      await repo.listInvitations(req('success', '33333333-3333-4333-8333-333333333333')),
    ).toMatchObject({ status: 'error', error: { code: 'PERMISSION_DENIED' } });
    expect(
      await createFixtureMembershipRepository({ viewerId: 'unrelated' }).listMembers(req()),
    ).toMatchObject({ status: 'error', error: { code: 'RESOURCE_NOT_FOUND' } });
    expect(await repo.listInvitations(req('success', 'unknown'))).toMatchObject({
      status: 'error',
      error: { code: 'RESOURCE_NOT_FOUND' },
    });
  });
  it('clones membership data, cancels loading, guards production factories and sends no HTTP', async () => {
    const fixture = createFixtureMembershipRepository(),
      first = await fixture.listMembers(req());
    if (first.status !== 'ready') throw Error('Missing members');
    const original = structuredClone(first);
    Object.assign(first.data.items[0]!, { role: 'MEMBER' });
    expect(await fixture.listMembers(req())).toEqual(original);
    for (const read of [fixture.listMembers, createFixtureInvitationRepository().listInvitations]) {
      const c = new AbortController(),
        pending = read({ ...req('loading'), signal: c.signal });
      c.abort();
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    }
    const factory = vi.fn(() => ({
      membership: fixture,
      invitation: createFixtureInvitationRepository(),
    }));
    expect(() => selectMembersRepositories('fixture', false, factory)).toThrow();
    expect(factory).not.toHaveBeenCalled();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    try {
      const repositories = selectMembersRepositories('gateway', false);
      expect(await repositories.membership.listMembers(req())).toMatchObject({
        status: 'error',
        error: { retryable: false },
      });
      expect(await repositories.invitation.listInvitations(req())).toMatchObject({
        status: 'error',
        error: { retryable: false },
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
  it('validates email only for a local preview', () => {
    expect(invitationEmailError('linh@example.com')).toBeUndefined();
    expect(invitationEmailError('wrong')).toBeDefined();
    expect(invitationEmailError('x'.repeat(256) + '@example.com')).toBeDefined();
  });
});
function mount({
  guest = false,
  tripId = previewTripId,
  membership = createFixtureMembershipRepository(),
  trip = createFixtureTripRepository(),
}: {
  guest?: boolean;
  tripId?: string;
  membership?: MembershipRepository;
  trip?: ReturnType<typeof createFixtureTripRepository>;
} = {}) {
  const shell = createFixtureShellRepository(),
    invitation = createFixtureInvitationRepository(),
    listMembers = vi.fn(membership.listMembers),
    listInvitations = vi.fn(invitation.listInvitations),
    getTrip = vi.fn(trip.getTrip);
  const router = createMemoryRouter(
    [
      {
        element: <App previewTripPath={'/trips/' + previewTripId} />,
        children: [
          {
            path: '/trips/:tripId/members',
            element: <MembersPage />,
            handle: { requiresViewer: true, contentTitle: true },
          },
        ],
      },
    ],
    { initialEntries: [`/trips/${tripId}/members`] },
  );
  render(
    <Providers
      repository={{
        read: (r) => shell.read({ ...r, ...(guest ? { scenario: 'guest' as const } : {}) }),
      }}
      tripRepository={{ ...trip, getTrip }}
      membersRepositories={{ membership: { listMembers }, invitation: { listInvitations } }}
    >
      <RouterProvider router={router} />
    </Providers>,
  );
  return { getTrip, listMembers, listInvitations };
}
it('renders nullable identity and keeps invitation draft through errors without write success', async () => {
  const { listInvitations } = mount();
  const region = await screen.findByRole('region', { name: 'Danh sách thành viên' });
  await within(region).findByText('Thành viên 1');
  expect(
    within(region).queryByText(/Trang Nguyễn|Hà Nguyễn|Quyên Trần|Tân Lê/),
  ).not.toBeInTheDocument();
  expect(listInvitations).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Lời mời · Xem trước' }));
  await screen.findByText('linh@example.com');
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra lời mời' }));
  expect(screen.getByLabelText('Email người nhận')).toHaveFocus();
  await userEvent.type(screen.getByLabelText('Email người nhận'), 'draft@example.com');
  await userEvent.click(screen.getByText('Members preview · Dữ liệu minh họa'));
  await userEvent.selectOptions(screen.getByLabelText('Trạng thái lời mời'), 'error');
  await screen.findByText('Chưa thể tải nội dung');
  expect(screen.getByLabelText('Email người nhận')).toHaveValue('draft@example.com');
  await userEvent.selectOptions(screen.getByLabelText('Trạng thái lời mời'), 'success');
  await screen.findByText('linh@example.com');
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra lời mời' }));
  await screen.findByText(/Chưa gửi lời mời, tạo link hoặc thay đổi thành viên/);
  expect(screen.getByText(/Membership revision 1/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Gửi lại' })).toBeDisabled();
  await userEvent.selectOptions(screen.getByLabelText('Trạng thái thao tác preview'), 'unknown');
  expect(screen.getByText(/Chưa xác nhận gửi lời mời/)).toBeInTheDocument();
});
it('Member cannot read Owner invitation projection and Guest performs no private reads', async () => {
  const { listInvitations } = mount({ tripId: '33333333-3333-4333-8333-333333333333' });
  await screen.findByText('Thành viên 1');
  expect(screen.getByRole('button', { name: 'Lời mời · Xem trước' })).toBeDisabled();
  expect(listInvitations).not.toHaveBeenCalled();
});
it('Guest performs no private reads', async () => {
  const calls = mount({ guest: true });
  await screen.findByText('Bạn không có quyền truy cập');
  expect(calls.getTrip).not.toHaveBeenCalled();
  expect(calls.listMembers).not.toHaveBeenCalled();
  expect(calls.listInvitations).not.toHaveBeenCalled();
});
it('blocks member queries when detail permission denies access', async () => {
  const fixture = createFixtureTripRepository();
  const calls = mount({
    trip: {
      ...fixture,
      getTrip: async (request) => {
        const result = await fixture.getTrip(request);
        return result.status === 'ready'
          ? {
              ...result,
              data: { ...result.data, permissions: { ...result.data.permissions, canRead: false } },
            }
          : result;
      },
    },
  });
  await screen.findByText('Bạn không có quyền truy cập');
  expect(calls.listMembers).not.toHaveBeenCalled();
  expect(calls.listInvitations).not.toHaveBeenCalled();
});
it('filters out members from another Trip instead of displaying a foreign projection', async () => {
  const repo = createFixtureMembershipRepository();
  mount({
    membership: {
      listMembers: async (request) => {
        const result = await repo.listMembers(request);
        return result.status === 'ready'
          ? {
              ...result,
              data: {
                ...result.data,
                items: result.data.items.map((m) => ({ ...m, tripId: 'foreign' })),
              },
            }
          : result;
      },
    },
  });
  await screen.findByText('Chưa có nội dung');
  expect(screen.queryByText('Thành viên 1')).not.toBeInTheDocument();
});
