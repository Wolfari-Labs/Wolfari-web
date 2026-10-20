import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { App } from '../src/app/App';
import { Providers } from '../src/app/providers';
import { TripMapPage } from '../src/features/map/TripMapPage';
import type { LocalPlaceSelection } from '../src/features/map/place-selection-store';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

const { searchGooglePlacesMock } = vi.hoisted(() => ({
  searchGooglePlacesMock: vi.fn(),
}));

vi.mock('../src/features/map/google-places', () => ({
  loadGoogleMapsSdk: vi.fn().mockResolvedValue(false),
  searchGooglePlaces: searchGooglePlacesMock,
}));

const providerPlace = (index: number): LocalPlaceSelection => ({
  id: `provider-${index}`,
  tripId: previewTripId,
  name: `Gợi ý địa điểm ${String(index).padStart(2, '0')}`,
  address: `Đà Nẵng ${index}`,
  latitude: String(16.02 + index / 10_000),
  longitude: String(108.21 + index / 10_000),
  provider: 'google',
  providerPlaceId: `google-place-${index}`,
  source: 'PROVIDER',
  openingHours: null,
  fetchedAt: new Date().toISOString(),
  metadata: { types: ['tourist_attraction'] },
  planVersion: 0,
  category: 'tourist_attraction',
  local: true,
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  searchGooglePlacesMock.mockReset();
});

function mountMap() {
  const router = createMemoryRouter(
    [
      {
        element: <App previewTripPath={`/trips/${previewTripId}`} />,
        children: [
          {
            path: '/trips/:tripId/map',
            element: <TripMapPage />,
            handle: { requiresViewer: true, contentTitle: true, fullBleed: true },
          },
        ],
      },
    ],
    { initialEntries: [`/trips/${previewTripId}/map`] },
  );
  render(
    <Providers
      repository={createFixtureShellRepository()}
      tripRepository={createFixtureTripRepository()}
      planRepository={createFixturePlanRepository()}
    >
      <RouterProvider router={router} />
    </Providers>,
  );
  return router;
}

describe('trip map nearby suggestions', () => {
  it('shows ten deterministic fallback destinations when Google Places is unavailable', async () => {
    searchGooglePlacesMock.mockResolvedValue({ places: [], unavailable: true, hasMore: false });

    const router = mountMap();
    const list = await screen.findByRole('list');
    await waitFor(() => expect(within(list).getByText('Chợ Hàn')).toBeInTheDocument());

    const checkboxes = within(list).getAllByRole('checkbox');
    expect(checkboxes.filter((checkbox) => !(checkbox as HTMLInputElement).checked)).toHaveLength(10);
    await userEvent.click(within(list).getByRole('checkbox', { name: /Chợ Hàn/ }));
    await waitFor(() => expect(within(list).getByRole('checkbox', { name: /Chợ Hàn/ })).toBeChecked());
    expect(screen.getAllByRole('button').some((button) => button.textContent?.includes('(7)'))).toBe(true);
    expect(Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.getItem(window.localStorage.key(index)!)).some((value) => value?.includes('fallback-cho-han'))).toBe(true);
    router.dispose();
  });

  it('shows unselected nearby results in All, loads more rows, and moves a checked place into selected-unscheduled', async () => {
    const places = Array.from({ length: 30 }, (_, index) => providerPlace(index + 1));
    const loadMore = vi.fn().mockResolvedValue({
      places: [providerPlace(31)],
      unavailable: false,
      hasMore: false,
    });
    searchGooglePlacesMock.mockResolvedValue({
      places,
      unavailable: false,
      hasMore: true,
      loadMore,
    });

    const router = mountMap();
    const list = await screen.findByRole('list');
    await waitFor(() => expect(within(list).getByText('Gợi ý địa điểm 01')).toBeInTheDocument());

    expect(within(list).getAllByText('Chưa chọn')).toHaveLength(30);
    expect(screen.getByRole('button', { name: /Đã chọn \(6\)/ })).toBeInTheDocument();

    fireEvent.scroll(list, { target: { scrollTop: 1000 } });
    await waitFor(() => expect(loadMore).toHaveBeenCalledOnce());
    expect(await within(list).findByText('Gợi ý địa điểm 31')).toBeInTheDocument();

    await userEvent.click(within(list).getByRole('checkbox', { name: 'Chọn Gợi ý địa điểm 01' }));
    expect(await within(list).findByRole('checkbox', { name: 'Bỏ chọn Gợi ý địa điểm 01' })).toBeChecked();
    expect(within(list).getAllByText('Đã chọn · Chưa xếp').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Đã chọn \(7\)/ })).toBeInTheDocument();
    router.dispose();
  });
});
