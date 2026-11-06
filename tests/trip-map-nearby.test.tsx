import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    let rejectProvider!: (reason: Error) => void;
    searchGooglePlacesMock.mockImplementation(
      () =>
        new Promise<never>((_resolve, reject) => {
          rejectProvider = reject;
        }),
    );
    const router = mountMap();
    try {
      const list = await screen.findByRole('list');
      expect(
        within(list).getAllByRole('img', { name: /Đã thêm vào lịch trình|Đã chọn, chưa xếp lịch/ }),
      ).toHaveLength(6);
      // Cancel the initial discovery and explicitly trigger the same empty-query
      // search under a controlled debounce clock. Provider-error semantics must
      // not depend on the host delivering a 300ms timer within waitFor's window.
      const search = screen.getByRole('searchbox', { name: 'Tìm địa điểm' });
      fireEvent.change(search, { target: { value: 'x' } });
      searchGooglePlacesMock.mockClear();
      vi.useFakeTimers();
      fireEvent.change(search, { target: { value: '' } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });
      expect(searchGooglePlacesMock).toHaveBeenCalledOnce();
      await act(async () => {
        rejectProvider(new Error('Provider down'));
      });
      expect(
        screen.getByText(
          'Không thể tải thêm địa điểm từ Google Places. Các địa điểm đã lưu vẫn hiển thị.',
        ),
      ).toBeInTheDocument();
      expect(
        within(list).getAllByRole('img', { name: /Đã thêm vào lịch trình|Đã chọn, chưa xếp lịch/ }),
      ).toHaveLength(6);
      expect(screen.queryByText('Chợ Hàn')).not.toBeInTheDocument();
      expect(window.localStorage.length).toBe(0);
    } finally {
      router.dispose();
      vi.useRealTimers();
    }
  });

  it('hides an unscheduled backend Google place instead of trying to remove a local record', async () => {
    searchGooglePlacesMock.mockResolvedValue({ places: [], unavailable: true, hasMore: false });
    const repository = createFixturePlanRepository();
    const getPlan = repository.getPlan;
    vi.spyOn(repository, 'getPlan').mockImplementation(async (request) => {
      const result = await getPlan(request);
      return result.status === 'ready'
        ? {
            ...result,
            data: {
              ...result.data,
              selectedLocations: result.data.selectedLocations.map((place) =>
                place.name === 'Chùa Linh Ứng'
                  ? { ...place, provider: 'google', providerPlaceId: 'backend-google' }
                  : place,
              ),
            },
          }
        : result;
    });
    const router = mountMap(repository);
    const list = await screen.findByRole('list');
    const row = within(list).getByText('Chùa Linh Ứng').closest('li')!;
    await userEvent.click(
      within(row).getByRole('button', { name: 'Xóa Chùa Linh Ứng khỏi danh sách đã chọn' }),
    );
    expect(within(list).queryByText('Chùa Linh Ứng')).not.toBeInTheDocument();
    const stored = readPlaceSelection(fixtureViewerId, previewTripId);
    expect(stored.hiddenLocationIds).toContain('a0000000-0000-4000-8000-000000000005');
    expect(stored.places).toHaveLength(0);
    expect(within(list).getByRole('img', { name: /Bán đảo Sơn Trà/ })).toBeInTheDocument();
    router.dispose();
  });

  it('keeps only saved places when Google Places is unavailable, without fabricated provider results', async () => {
    searchGooglePlacesMock.mockResolvedValue({ places: [], unavailable: true, hasMore: false });

    const router = mountMap();
    const list = await screen.findByRole('list');
    await screen.findByText('Google Places chưa khả dụng. Các địa điểm đã lưu vẫn hiển thị.');

    const states = within(list).getAllByRole('img', {
      name: /Đã thêm vào lịch trình|Đã chọn, chưa xếp lịch/,
    });
    expect(states).toHaveLength(6);
    expect(screen.queryByText('Chợ Hàn')).not.toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
    router.dispose();
  });

  it('adds nearby results through + and keeps both selected states non-interactive', async () => {
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

    expect(within(list).getAllByRole('button', { name: /^Chọn Gợi ý địa điểm/ })).toHaveLength(30);
    expect(screen.getByRole('button', { name: /Đã chọn \(6\)/ })).toBeInTheDocument();

    fireEvent.scroll(list, { target: { scrollTop: 1000 } });
    await waitFor(() => expect(loadMore).toHaveBeenCalledOnce());
    expect(await within(list).findByText('Gợi ý địa điểm 31')).toBeInTheDocument();

    await userEvent.click(within(list).getByRole('button', { name: 'Chọn Gợi ý địa điểm 01' }));
    const selectedState = await within(list).findByRole('img', {
      name: 'Đã chọn, chưa xếp lịch: Gợi ý địa điểm 01',
    });
    expect(selectedState).toBeInTheDocument();
    await userEvent.click(selectedState);
    expect(
      within(list).getByRole('img', { name: 'Đã chọn, chưa xếp lịch: Gợi ý địa điểm 01' }),
    ).toBeInTheDocument();
    expect(
      within(list).getByRole('button', { name: 'Xóa Gợi ý địa điểm 01 khỏi danh sách đã chọn' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đã chọn \(7\)/ })).toBeInTheDocument();
    router.dispose();
  });

  it('blocks deleting a yellow place while any real Plan activity still references it', async () => {
    searchGooglePlacesMock.mockResolvedValue({ places: [], unavailable: true, hasMore: false });
    const repository = createFixturePlanRepository();
    const getPlan = repository.getPlan;
    vi.spyOn(repository, 'getPlan').mockImplementation(async (request) => {
      const result = await getPlan(request);
      if (result.status !== 'ready') return result;
      const location = result.data.selectedLocations.find(
        (place) => place.name === 'Chùa Linh Ứng',
      )!;
      const linked = {
        ...result.data.activities[0]!,
        id: 'b0000000-0000-4000-8000-000000000099',
        title: 'Hoạt động ở Chùa Linh Ứng chưa xếp lịch',
        selectedLocationId: location.id,
        startsAt: null,
        endsAt: null,
        scheduledDate: null,
        position: 20,
      };
      return {
        ...result,
        data: { ...result.data, activities: [...result.data.activities, linked] },
      };
    });
    const router = mountMap(repository);
    try {
      const list = await screen.findByRole('list');
      const row = within(list).getByText('Chùa Linh Ứng').closest('li')!;
      await userEvent.click(
        within(row).getByRole('button', { name: 'Xóa Chùa Linh Ứng khỏi danh sách đã chọn' }),
      );
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Không thể xóa “Chùa Linh Ứng”');
      expect(alert).toHaveTextContent('Hoạt động ở Chùa Linh Ứng chưa xếp lịch');
      expect(within(alert).getByRole('link', { name: 'Mở Lịch trình' })).toHaveAttribute(
        'href',
        `/trips/${previewTripId}/plan`,
      );
      expect(within(list).getByText('Chùa Linh Ứng')).toBeInTheDocument();
      expect(readPlaceSelection(fixtureViewerId, previewTripId).hiddenLocationIds).not.toContain(
        'a0000000-0000-4000-8000-000000000005',
      );
    } finally {
      router.dispose();
    }
  });

  it('enforces the 50-place limit before writing a new local selection', async () => {
    searchGooglePlacesMock.mockResolvedValue({
      places: [providerPlace(1)],
      unavailable: false,
      hasMore: false,
    });
    const repository = createFixturePlanRepository();
    const getPlan = repository.getPlan;
    vi.spyOn(repository, 'getPlan').mockImplementation(async (request) => {
      const result = await getPlan(request);
      if (result.status !== 'ready') return result;
      const filler = Array.from({ length: 44 }, (_, index) => ({
        ...result.data.selectedLocations[index % result.data.selectedLocations.length]!,
        id: `capacity-location-${index}`,
        name: `Địa điểm hiện có ${index + 1}`,
        provider: null,
        providerPlaceId: null,
      }));
      return {
        ...result,
        data: { ...result.data, selectedLocations: [...result.data.selectedLocations, ...filler] },
      };
    });
    const router = mountMap(repository);
    try {
      const list = await screen.findByRole('list');
      const add = await within(list).findByRole('button', {
        name: 'Chọn Gợi ý địa điểm 01',
      });
      await userEvent.click(add);
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Tối đa 50 địa điểm trong một chuyến đi.',
      );
      expect(readPlaceSelection(fixtureViewerId, previewTripId).places).toHaveLength(0);
      expect(window.localStorage.length).toBe(0);
    } finally {
      router.dispose();
    }
  });
});
