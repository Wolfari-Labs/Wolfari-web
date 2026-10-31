import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App';
import { Providers } from '../src/app/providers';
import { TripSettingsPage } from '../src/features/trips/settings/TripSettingsPage';
import { updateTripInListPages } from '../src/features/trips/model/trip-list-cache';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { fixtureTripCatalog, previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

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
  const mounted = render(
    <Providers
      repository={createFixtureShellRepository()}
      tripRepository={{ ...repository, updateTrip }}
    >
      <RouterProvider router={router} />
    </Providers>,
  );
  return { router, updateTrip, unmount: mounted.unmount };
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
    expect(name).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Mô tả chuyến đi' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '← Hủy' })).toBeDisabled();
    const originalIntent = updateTrip.mock.calls[0]![0].intent;
    await user.click(screen.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ' }));
    expect(await screen.findByText('Đã lưu thông tin chuyến đi.')).toBeInTheDocument();
    expect(updateTrip.mock.calls[1]![0].intent).toEqual(originalIntent);
  });

  it('restores the same actor and Trip intent after remount instead of making a new key', async () => {
    const user = userEvent.setup();
    const repository = createFixtureTripRepository();
    const first = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
    first.updateTrip.mockResolvedValueOnce({
      status: 'unknown',
      correlationId: null,
      retryable: true,
    });
    await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' }));
    const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
    await user.clear(name);
    await user.type(name, 'Bản nháp sau tải lại');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('button', { name: 'Thử lại đúng yêu cầu cũ' })).toBeEnabled();
    const originalIntent = first.updateTrip.mock.calls[0]![0].intent;
    first.unmount();

    const second = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
    second.updateTrip.mockResolvedValueOnce({
      status: 'unknown',
      correlationId: null,
      retryable: true,
    });
    await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' }));
    expect(screen.getByRole('textbox', { name: 'Tên chuyến đi' })).toHaveValue(
      'Bản nháp sau tải lại',
    );
    expect(screen.getByRole('textbox', { name: 'Tên chuyến đi' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ' }));
    await waitFor(() => expect(second.updateTrip).toHaveBeenCalledOnce());
    expect(second.updateTrip.mock.calls[0]![0].intent).toEqual(originalIntent);
  });

  it('does not send a new update when the intent journal cannot be written', async () => {
    const user = userEvent.setup();
    const { updateTrip } = mount();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' }));
    await user.type(screen.getByRole('textbox', { name: 'Tên chuyến đi' }), ' mới');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText(/Không thể lưu mã yêu cầu an toàn/)).toBeInTheDocument();
    expect(updateTrip).not.toHaveBeenCalled();
  });

  it('fails closed when the stored journal cannot be read', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    const { updateTrip } = mount();
    await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' }));
    expect(screen.getByRole('textbox', { name: 'Tên chuyến đi' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ' })).toBeDisabled();
    expect(updateTrip).not.toHaveBeenCalled();
  });

  it('unlocks a new intent only after an authoritative refresh, preserving the draft', async () => {
    const user = userEvent.setup();
    const repository = createFixtureTripRepository();
    const initial = await repository.getTrip({
      tripId: previewTripId,
      scenario: 'success',
      signal: new AbortController().signal,
    });
    if (initial.status !== 'ready') throw new Error('Expected fixture trip detail');
    const refreshed = { ...initial.data, exportRevision: 2 };
    vi.spyOn(repository, 'getTrip')
      .mockResolvedValueOnce(initial)
      .mockResolvedValue({ status: 'ready', data: refreshed });
    const { updateTrip } = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
    updateTrip.mockResolvedValueOnce({ status: 'unknown', correlationId: null, retryable: true });
    const saved = { ...refreshed, name: 'Bản nháp sau khi tải lại', exportRevision: 3 };
    updateTrip.mockResolvedValueOnce({ status: 'updated', trip: saved, correlationId: null });
    await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' }));
    const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
    await user.clear(name);
    await user.type(name, 'Bản nháp an toàn');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('button', { name: 'Tải trạng thái hiện tại' })).toBeEnabled();
    expect(name).toBeDisabled();
    const originalIntent = updateTrip.mock.calls[0]![0].intent;
    await user.click(screen.getByRole('button', { name: 'Tải trạng thái hiện tại' }));
    expect(await screen.findByText(/Đã tải trạng thái hiện tại/)).toBeInTheDocument();
    expect(name).toBeEnabled();
    expect(name).toHaveValue('Bản nháp an toàn');
    await user.clear(name);
    await user.type(name, 'Bản nháp sau khi tải lại');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Đã lưu thông tin chuyến đi.')).toBeInTheDocument();
    expect(updateTrip.mock.calls[1]![0].intent).toMatchObject({
      name: 'Bản nháp sau khi tải lại',
      expectedExportRevision: 2,
    });
    expect(updateTrip.mock.calls[1]![0].intent.idempotencyKey).not.toBe(
      originalIntent.idempotencyKey,
    );
  });

  it('keeps the exact retry available if the explicit read after unknown fails', async () => {
    const user = userEvent.setup();
    const repository = createFixtureTripRepository();
    const initial = await repository.getTrip({
      tripId: previewTripId,
      scenario: 'success',
      signal: new AbortController().signal,
    });
    if (initial.status !== 'ready') throw new Error('Expected fixture trip detail');
    vi.spyOn(repository, 'getTrip')
      .mockResolvedValueOnce(initial)
      .mockResolvedValueOnce({
        status: 'error',
        error: { code: 'SERVICE_UNAVAILABLE', correlationId: 'read-failed', retryable: true },
      });
    const { updateTrip } = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
    updateTrip.mockResolvedValueOnce({ status: 'unknown', correlationId: null, retryable: true });
    updateTrip.mockResolvedValueOnce({ status: 'unknown', correlationId: null, retryable: true });
    await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' }));
    const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
    await user.type(name, ' sau lỗi đọc');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('button', { name: 'Tải trạng thái hiện tại' })).toBeEnabled();
    const originalIntent = updateTrip.mock.calls[0]![0].intent;
    await user.click(screen.getByRole('button', { name: 'Tải trạng thái hiện tại' }));
    expect(await screen.findByText(/Chưa tải được trạng thái hiện tại/)).toBeInTheDocument();
    expect(name).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ' }));
    await waitFor(() => expect(updateTrip).toHaveBeenCalledTimes(2));
    expect(updateTrip.mock.calls[1]![0].intent).toEqual(originalIntent);
    expect(name).toBeDisabled();
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

  it.each(['transport failure', 'domain error'] as const)(
    'keeps the edit draft and blocks stale writes when conflict refresh has a %s',
    async (failure) => {
      const user = userEvent.setup();
      const repository = createFixtureTripRepository();
      const initial = await repository.getTrip({
        tripId: previewTripId,
        scenario: 'success',
        signal: new AbortController().signal,
      });
      if (initial.status !== 'ready') throw new Error('Expected fixture trip detail');
      const refreshed = { ...initial.data, exportRevision: 2 };
      const updated = { ...refreshed, name: 'Bản nháp sau lỗi tải lại', exportRevision: 3 };
      const getTrip = vi.spyOn(repository, 'getTrip').mockResolvedValueOnce(initial);
      if (failure === 'transport failure') {
        getTrip.mockRejectedValueOnce(new Error('Temporary read failure'));
      } else {
        getTrip.mockResolvedValueOnce({
          status: 'error',
          error: { code: 'SERVICE_UNAVAILABLE', correlationId: 'refresh-error', retryable: true },
        });
      }
      getTrip
        .mockResolvedValueOnce({ status: 'ready', data: refreshed })
        .mockResolvedValue({ status: 'ready', data: updated });
      const { updateTrip } = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
      updateTrip
        .mockResolvedValueOnce({ status: 'conflict', correlationId: 'conflict', retryable: false })
        .mockResolvedValueOnce({ status: 'updated', trip: updated, correlationId: 'updated' });

      await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' }));
      const name = screen.getByRole('textbox', { name: 'Tên chuyến đi' });
      await user.clear(name);
      await user.type(name, 'Bản nháp sau lỗi tải lại');
      await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
      expect(await screen.findByText(/Chưa tải được thông tin chuyến đi mới/)).toBeInTheDocument();
      expect(name).toHaveValue('Bản nháp sau lỗi tải lại');
      expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
      expect(updateTrip).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('button', { name: 'Tải lại thông tin chuyến đi' }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeEnabled(),
      );
      expect(name).toHaveValue('Bản nháp sau lỗi tải lại');
      await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
      expect(await screen.findByText('Đã lưu thông tin chuyến đi.')).toBeInTheDocument();
      expect(updateTrip.mock.calls[1]?.[0].intent.expectedExportRevision).toBe(2);
      expect(updateTrip.mock.calls[1]?.[0].intent.idempotencyKey).not.toBe(
        updateTrip.mock.calls[0]?.[0].intent.idempotencyKey,
      );
    },
  );

  it.each([
    ['PERMISSION_DENIED', 'Bạn không có quyền truy cập'],
    ['RESOURCE_NOT_FOUND', 'Không tìm thấy nội dung'],
  ] as const)(
    'shows definitive %s after a conflict refresh instead of a stale edit form',
    async (code, heading) => {
      const user = userEvent.setup();
      const repository = createFixtureTripRepository();
      const initial = await repository.getTrip({
        tripId: previewTripId,
        scenario: 'success',
        signal: new AbortController().signal,
      });
      if (initial.status !== 'ready') throw new Error('Expected fixture trip detail');
      vi.spyOn(repository, 'getTrip')
        .mockResolvedValueOnce(initial)
        .mockResolvedValueOnce({
          status: 'error',
          error: { code, correlationId: 'access-change', retryable: false },
        });
      const { updateTrip } = mount(previewTripId, `/trips/${previewTripId}/settings`, repository);
      updateTrip.mockResolvedValueOnce({
        status: 'conflict',
        correlationId: 'conflict',
        retryable: false,
      });

      await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' }));
      await user.type(screen.getByRole('textbox', { name: 'Tên chuyến đi' }), ' thêm');
      await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
      expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).not.toBeInTheDocument();
      expect(screen.queryByText(/Chưa tải được thông tin chuyến đi mới/)).not.toBeInTheDocument();
      expect(updateTrip).toHaveBeenCalledTimes(1);
    },
  );
});
