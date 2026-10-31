import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { GatewayCreateTripPage } from '../src/features/trips/create/GatewayCreateTripPage';
import { TripRepositoryProvider } from '../src/features/trips/repositories/repository-context';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import type { TripRepository } from '../src/features/trips/repositories/trip.repository';

beforeEach(() => sessionStorage.clear());
function setup(actor = 'actor-A') {
  const createTrip = vi
    .fn<TripRepository['createTrip']>()
    .mockResolvedValue({ status: 'unknown', correlationId: null, retryable: true });
  const repo = { ...createFixtureTripRepository(), createTrip };
  const view = (id: string) => (
    <MemoryRouter>
      <TripRepositoryProvider repository={repo}>
        <GatewayCreateTripPage key={id} actorId={id} />
      </TripRepositoryProvider>
    </MemoryRouter>
  );
  return { ...render(view(actor)), view, createTrip, user: userEvent.setup() };
}
async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Tên chuyến đi'), 'Demo riêng');
  fireEvent.change(screen.getByLabelText('Ngày đi'), { target: { value: '2026-11-01' } });
  fireEvent.change(screen.getByLabelText('Ngày về'), { target: { value: '2026-11-03' } });
}
describe('Gateway Create Trip', () => {
  it('focuses invalid fields before making a request and accepts a corrected timezone', async () => {
    const { user, createTrip } = setup();
    expect(screen.getByRole('form', { name: 'Thông tin cơ bản' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Bản đồ điểm đến' })).toHaveTextContent(
      'Chưa hỗ trợ chọn điểm đến khi tạo chuyến đi',
    );
    expect(screen.queryByRole('textbox', { name: 'Điểm đến chính' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tạo chuyến đi' }));
    expect(screen.getByLabelText('Tên chuyến đi')).toHaveFocus();
    expect(screen.getByText('Vui lòng nhập tên chuyến đi.')).toBeInTheDocument();
    expect(createTrip).not.toHaveBeenCalled();

    await fill(user);
    const timezone = screen.getByLabelText('Múi giờ');
    await user.clear(timezone);
    await user.type(timezone, 'Not/A_Timezone');
    await user.click(screen.getByRole('button', { name: 'Tạo chuyến đi' }));
    expect(timezone).toHaveFocus();
    expect(screen.getByText('Vui lòng nhập múi giờ IANA hợp lệ.')).toBeInTheDocument();
    expect(createTrip).not.toHaveBeenCalled();

    await user.clear(timezone);
    await user.type(timezone, 'Asia/Ho_Chi_Minh');
    await user.click(screen.getByRole('button', { name: 'Tạo chuyến đi' }));
    await waitFor(() => expect(createTrip).toHaveBeenCalledOnce());
    expect(createTrip.mock.calls[0]![0].intent.timezone).toBe('Asia/Ho_Chi_Minh');
  });

  it('shows server field errors without discarding the editable draft', async () => {
    const { user, createTrip } = setup();
    createTrip.mockResolvedValueOnce({
      status: 'validation-error',
      fieldErrors: { name: 'Tên đã được sử dụng.', endAt: 'Ngày về chưa hợp lệ.' },
      correlationId: 'trip-create-validation',
    });
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Tạo chuyến đi' }));
    expect(await screen.findByText('Tên đã được sử dụng.')).toBeInTheDocument();
    expect(screen.getByText('Ngày về chưa hợp lệ.')).toBeInTheDocument();
    expect(screen.getByLabelText('Tên chuyến đi')).toHaveFocus();
    expect(screen.getByLabelText('Tên chuyến đi')).toHaveValue('Demo riêng');
    expect(screen.getByLabelText('Tên chuyến đi')).not.toBeDisabled();
    await user.type(screen.getByLabelText('Tên chuyến đi'), ' khác');
    expect(screen.queryByText('Tên đã được sử dụng.')).not.toBeInTheDocument();
  });

  it('isolates drafts between actors in one tab and never imports ownerless legacy drafts', async () => {
    sessionStorage.setItem('wolfari:create-trip:v2', JSON.stringify({ name: 'Private legacy' }));
    const { user, rerender, view } = setup();
    expect(screen.getByLabelText('Tên chuyến đi')).toHaveValue('');
    await fill(user);
    rerender(view('actor-B'));
    expect(screen.getByLabelText('Tên chuyến đi')).toHaveValue('');
    rerender(view('actor-A'));
    expect(screen.getByLabelText('Tên chuyến đi')).toHaveValue('Demo riêng');
    expect(sessionStorage.getItem('wolfari:create-trip:v2')).toBeNull();
  });
  it('freezes and restores the exact uncertain intent across reload', async () => {
    const { user, createTrip, unmount } = setup();
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Tạo chuyến đi' }));
    await waitFor(() => expect(createTrip).toHaveBeenCalledTimes(1));
    const intent = createTrip.mock.calls[0]![0].intent;
    expect(screen.getByLabelText('Tên chuyến đi')).toBeDisabled();
    expect(intent).toMatchObject({
      startAt: '2026-10-31T17:00:00.000Z',
      endAt: '2026-11-03T17:00:00.000Z',
    });
    expect(intent).not.toHaveProperty('destination');
    unmount();
    const next = setup();
    await next.user.click(screen.getByRole('button', { name: 'Thử lại đúng yêu cầu cũ' }));
    expect(next.createTrip.mock.calls[0]![0].intent).toEqual(intent);
  });
  it('closes a confirmed success with a blank form and no duplicate create request', async () => {
    const { user, createTrip } = setup();
    createTrip.mockResolvedValueOnce({
      status: 'created',
      tripId: 'new-trip',
      correlationId: null,
    });
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Tạo chuyến đi' }));
    const dialog = await screen.findByRole('dialog', { name: 'Chuyến đi đã sẵn sàng' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mở chuyến đi/ })).toHaveFocus();
    expect(screen.getByRole('link', { name: /Mở chuyến đi/ })).toHaveAttribute(
      'href',
      '/trips/new-trip',
    );
    await user.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tên chuyến đi')).toHaveValue('');
    expect(screen.getByLabelText('Ngày đi')).toHaveValue('');
    expect(screen.getByLabelText('Ngày về')).toHaveValue('');
    expect(createTrip).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Tạo chuyến đi' }));
    expect(createTrip).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Tên chuyến đi')).toHaveFocus();
  });
  it('closes the success dialog with Escape and returns focus to the create action', async () => {
    const { user, createTrip } = setup();
    createTrip.mockResolvedValueOnce({
      status: 'created',
      tripId: 'new-trip',
      correlationId: null,
    });
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Tạo chuyến đi' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Tạo chuyến đi' })).toHaveFocus();
    expect(screen.getByLabelText('Tên chuyến đi')).toHaveValue('');
  });
});
