import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App';
import { Providers } from '../src/app/providers';
import { TripSettingsPage } from '../src/features/trips/settings/TripSettingsPage';
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
  it('shows view first, opens a prefilled muted edit form and returns to view after save', async () => {
    const user = userEvent.setup();
    const { router, updateTrip } = mount();
    expect(await screen.findByRole('heading', { name: 'Thông tin chuyến đi' })).toBeInTheDocument();
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
    expect(name).toHaveValue('Đà Nẵng – Hội An');
    expect(description).toHaveValue(
      'Khám phá Đà Nẵng – thành phố biển xinh đẹp với những người bạn đồng hành.',
    );
    expect(name.className).toContain('currentValue');
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
    await user.clear(name);
    await user.type(name, 'Đà Nẵng cuối tuần');
    expect(name.className).not.toContain('currentValue');
    await user.clear(description);
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByText('Đã lưu thông tin chuyến đi.')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    expect(updateTrip).toHaveBeenCalledTimes(1);
    expect(updateTrip.mock.calls[0]?.[0].intent).toMatchObject({
      name: 'Đà Nẵng cuối tuần',
      description: null,
      expectedPlanVersion: 1,
      expectedExportRevision: 1,
    });
    expect(updateTrip.mock.calls[0]?.[0].intent.idempotencyKey).toMatch(/.+/);
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
    expect(await screen.findByRole('button', { name: 'Chỉnh sửa thông tin' })).toHaveFocus();
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
});
