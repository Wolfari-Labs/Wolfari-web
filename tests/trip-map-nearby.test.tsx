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
import { fixtureViewerId, previewTripId } from '../src/infrastructure/fixtures/trip-catalog';
import { readPlaceSelection } from '../src/features/map/place-selection-store';

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
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  searchGooglePlacesMock.mockReset();
});

function mountMap(planRepository = createFixturePlanRepository()) {
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
      planRepository={planRepository}
    >
      <RouterProvider router={router} />
    </Providers>,
  );
  return router;
}

describe('trip map nearby suggestions', () => {
  it('keeps saved data and reports provider errors without generating suggestions', async () => {
    searchGooglePlacesMock.mockRejectedValue(new Error('Provider down'));
    const router = mountMap();
    await screen.findByText('Không thể tải thêm địa điểm từ Google Places. Các địa điểm đã lưu vẫn hiển thị.');
    expect(screen.getAllByRole('checkbox')).toHaveLength(6);
    expect(screen.queryByText('Chợ Hàn')).not.toBeInTheDocument();
    router.dispose();
  });

  it('hides an unscheduled backend Google place instead of trying to remove a local record', async () => {
    searchGooglePlacesMock.mockResolvedValue({ places: [], unavailable: true, hasMore: false });
    const repository = createFixturePlanRepository();
    const getPlan = repository.getPlan;
    vi.spyOn(repository, 'getPlan').mockImplementation(async (request) => {
      const result = await getPlan(request);
      return result.status === 'ready' ? { ...result, data: { ...result.data, selectedLocations: result.data.selectedLocations.map((place) => place.name === 'Chùa Linh Ứng' ? { ...place, provider: 'google', providerPlaceId: 'backend-google' } : place) } } : result;
    });
    const router = mountMap(repository);
    const checkbox = await screen.findByRole('checkbox', { name: 'Bỏ chọn Chùa Linh Ứng' });
    await userEvent.click(checkbox);
    expect(screen.queryByRole('checkbox', { name: 'Bỏ chọn Chùa Linh Ứng' })).not.toBeInTheDocument();
    const stored = readPlaceSelection(fixtureViewerId, previewTripId);
    expect(stored.hiddenLocationIds).toContain('a0000000-0000-4000-8000-000000000005');
    expect(stored.places).toHaveLength(0);
    expect(screen.getByRole('checkbox', { name: /Bán đảo Sơn Trà/ })).toBeDisabled();
    router.dispose();
  });

  it('keeps only saved places when Google Places is unavailable, without fabricated provider results', async () => {
    searchGooglePlacesMock.mockResolvedValue({ places: [], unavailable: true, hasMore: false });

    const router = mountMap();
    const list = await screen.findByRole('list');
    await screen.findByText('Google Places chưa khả dụng. Các địa điểm đã lưu vẫn hiển thị.');

    const checkboxes = within(list).getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(6);
    expect(checkboxes.every((checkbox) => (checkbox as HTMLInputElement).checked)).toBe(true);
    expect(screen.queryByText('Chợ Hàn')).not.toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
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
