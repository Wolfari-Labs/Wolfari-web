import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App';
import { Providers } from '../src/app/providers';
import { TripSettingsPage } from '../src/features/trips/settings/TripSettingsPage';
import { updateTripInListPages } from '../src/features/trips/model/trip-list-cache';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { fixtureTripCatalog, previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

function mount(
  tripId = previewTripId,
  entry = `/trips/${tripId}/settings`,
  repository = createFixtureTripRepository(),
) {
  const updateTrip = vi.fn(repository.updateTrip);
  const router = createMemoryRouter(
    [
      {
        element: <App previewTripPath={null} />,
        children: [
          {
            path: '/trips/:tripId/settings',
            element: <TripSettingsPage />,
            handle: {
              section: 'settings',
              contentTitle: true,
              fullBleed: true,
              requiresViewer: true,
            },
          },
        ],
      },
    ],
    { initialEntries: [entry] },
  );
  render(
    <Providers
      repository={createFixtureShellRepository()}
      tripRepository={{ ...repository, updateTrip }}
    >
      <RouterProvider router={router} />
    </Providers>,
  );
  return { router, updateTrip };
}

describe('Trip Settings', () => {
  it('updates a matching item in a later cached page without losing list presentation', () => {
    const first = fixtureTripCatalog[0]!;
    const target = fixtureTripCatalog[1]!;
    const cache = {
      pages: [
        { items: [first], nextCursor: 'page-two' },
        { items: [target], nextCursor: null },
      ],
      pageParams: [null, 'page-two'],
    };
    const updated = updateTripInListPages(cache, {
      ...target,
      name: 'Tên từ PATCH',
      description: 'Mô tả mới',
      publicDescription: 'Mô tả công khai mới',
      archivedAt: null,
      planEditPolicy: 'OWNER_ONLY',
      presentation: { memberCount: null, cover: null },
    });
    expect(updated?.pages[0]).toBe(cache.pages[0]);
    expect(updated?.pages[1]?.items[0]).toMatchObject({
      name: 'Tên từ PATCH',
      presentation: target.presentation,
    });
    expect(updated?.pageParams).toBe(cache.pageParams);
  });

  it('shows view first, opens a prefilled muted edit form and returns to view after save', async () => {
    const user = userEvent.setup();
    const { router, updateTrip } = mount();
    expect(await screen.findByRole('heading', { name: 'Thông tin chuyến đi' })).toBeInTheDocument();
    expect(screen.getByText('Chưa có mô tả công khai.')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Chỉnh sửa thông tin chuyến đi' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quản lý thành viên' })).toHaveAttribute(
      'href',
      `/trips/${previewTripId}/members`,
    );
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa thông tin' }));
    expect(router.state.location.search).toBe('?mode=edit');
    const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
    const description = screen.getByRole('textbox', { name: 'Mô tả chuyến đi' });
    const publicDescription = screen.getByRole('textbox', { name: 'Mô tả công khai' });
    expect(name).toHaveValue('Đà Nẵng – Hội An');
    expect(description).toHaveValue(
      'Khám phá Đà Nẵng – thành phố biển xinh đẹp với những người bạn đồng hành.',
    );
    expect(name.className).toContain('currentValue');
    expect(publicDescription).toHaveValue('');
    expect(publicDescription.className).toContain('currentValue');
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
    await user.clear(name);
    await user.type(name, 'Đà Nẵng cuối tuần');
    expect(name.className).not.toContain('currentValue');
    await user.clear(description);
    await user.type(publicDescription, 'Hành trình biển dành cho mọi người.');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Đã lưu thông tin chuyến đi.')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    expect(updateTrip).toHaveBeenCalledTimes(1);
    expect(updateTrip.mock.calls[0]?.[0].intent).toMatchObject({
      name: 'Đà Nẵng cuối tuần',
      description: null,
      publicDescription: 'Hành trình biển dành cho mọi người.',
      expectedPlanVersion: 1,
      expectedExportRevision: 1,
    });
    expect(updateTrip.mock.calls[0]?.[0].intent.idempotencyKey).toMatch(/.+/);
    expect(screen.getByText('Hành trình biển dành cho mọi người.')).toBeInTheDocument();
  });

  it('validates the 1–200 character name and Cancel restores view focus', async () => {
    const user = userEvent.setup();
    const { router, updateTrip } = mount();
    await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' }));
    const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
    await user.clear(name);
    expect(screen.getByText('Tên chuyến đi không được để trống.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '← Hủy' }));
    expect(router.state.location.search).toBe('');
    const editButton = await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' });
    await waitFor(() => {
      expect(editButton).toHaveFocus();
    });
    expect(updateTrip).not.toHaveBeenCalled();
  });

  it('does not expose edit controls to a Member opening ?mode=edit directly', async () => {
    const member = fixtureTripCatalog.find((item) => item.currentMembership.role === 'MEMBER')!;
    mount(member.id, `/trips/${member.id}/settings?mode=edit`);
    expect(
      await screen.findByText('Chuyến đi này chỉ có thể xem. Bạn không có quyền chỉnh sửa.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Chỉnh sửa thông tin chuyến đi' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).not.toBeInTheDocument();
  });

  it('keeps an archived Owner read-only on a direct edit URL', async () => {
    const archived = {
      ...fixtureTripCatalog[0]!,
      lifecycle: 'ARCHIVED' as const,
      permissions: { canRead: true, canUpdate: false },
    };
    mount(
      archived.id,
      `/trips/${archived.id}/settings?mode=edit`,
      createFixtureTripRepository({ records: [archived] }),
    );
    expect(
      await screen.findByText('Chuyến đi này chỉ có thể xem. Bạn không có quyền chỉnh sửa.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa thông tin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).not.toBeInTheDocument();
  });

  it('keeps the draft and reuses the idempotency key when the outcome is unknown', async () => {
    const user = userEvent.setup();
    const { updateTrip } = mount();
    updateTrip.mockResolvedValueOnce({
      status: 'unknown',
      correlationId: null,
      retryable: true,
    });
    await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' }));
    const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
    await user.clear(name);
    await user.type(name, 'Bản nháp an toàn');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText(/Chưa xác định được kết quả lưu/)).toBeInTheDocument();
    expect(name).toHaveValue('Bản nháp an toàn');
    const firstKey = updateTrip.mock.calls[0]![0].intent.idempotencyKey;
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Đã lưu thông tin chuyến đi.')).toBeInTheDocument();
    expect(updateTrip.mock.calls[1]![0].intent.idempotencyKey).toBe(firstKey);
  });

  it('keeps all draft fields on conflict and requires refreshed revisions with a new key', async () => {
    const user = userEvent.setup();
    const repository = createFixtureTripRepository();
    const initial = await repository.getTrip({
      tripId: previewTripId,
      scenario: 'success',
      signal: new AbortController().signal,
    });
    if (initial.status !== 'ready') throw new Error('Expected fixture trip detail');
    const refreshed = { ...initial.data, exportRevision: 2 };
    const updated = {
      ...refreshed,
      publicDescription: 'Bản nháp công khai sau xung đột',
      exportRevision: 3,
    };
    const getTrip = vi
      .spyOn(repository, 'getTrip')
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce({ status: 'ready', data: refreshed })
      .mockResolvedValue({ status: 'ready', data: updated });
    const { updateTrip } = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
    updateTrip
      .mockResolvedValueOnce({
        status: 'conflict',
        correlationId: 'trip-conflict',
        retryable: false,
      })
      .mockResolvedValueOnce({
        status: 'updated',
        trip: updated,
        correlationId: 'trip-update',
      });

    await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' }));
    const publicDescription = screen.getByRole('textbox', { name: 'Mô tả công khai' });
    await user.type(publicDescription, 'Bản nháp công khai sau xung đột');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText(/Thông tin chuyến đi đã thay đổi/)).toBeInTheDocument();
    expect(publicDescription).toHaveValue('Bản nháp công khai sau xung đột');
    await waitFor(() => expect(getTrip).toHaveBeenCalledTimes(2));
    const firstKey = updateTrip.mock.calls[0]![0].intent.idempotencyKey;

    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Đã lưu thông tin chuyến đi.')).toBeInTheDocument();
    expect(updateTrip.mock.calls[1]![0].intent).toMatchObject({
      publicDescription: 'Bản nháp công khai sau xung đột',
      expectedPlanVersion: 1,
      expectedExportRevision: 2,
    });
    expect(updateTrip.mock.calls[1]![0].intent.idempotencyKey).not.toBe(firstKey);
    expect(getTrip.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
