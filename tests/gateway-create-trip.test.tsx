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
});
