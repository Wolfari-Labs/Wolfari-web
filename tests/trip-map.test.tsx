import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { App } from '../src/app/App';
import { Providers } from '../src/app/providers';
import { TripMapPage } from '../src/features/map/TripMapPage';
import {
  activityDurationLabel,
  activityScheduleLabel,
  placeDiscoveryCenter,
  selectMapLocations,
  validCoordinates,
} from '../src/features/map/trip-map';
import type {
  ActivityViewModel,
  SelectedLocationViewModel,
} from '../src/features/plan/model/plan';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { createFixtureShellRepository } from '../src/infrastructure/fixtures/shell.fixture-repository';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

afterEach(() => window.sessionStorage.clear());

const activity = (
  id: string,
  locationId: string | null,
  startsAt = '2026-09-22T08:00:00+07:00',
): ActivityViewModel => ({
  id,
  tripId: 'trip',
  title: `Activity ${id}`,
  description: null,
  publicDescription: null,
  activityType: 'WALK',
  selectedLocationId: locationId,
  startsAt,
  endsAt: null,
  position: 0,
  status: 'TODO',
  source: 'MANUAL',
  planVersion: 1,
  createdByUserId: 'user',
  completedByUserId: null,
  completedAt: null,
  presentation: { cover: null },
});

const location = (
  id: string,
  latitude: string | null,
  longitude: string | null,
): SelectedLocationViewModel => ({
  id,
  tripId: 'trip',
  name: `Location ${id}`,
  address: null,
  latitude,
  longitude,
  provider: null,
  providerPlaceId: null,
  source: 'MANUAL',
  openingHours: null,
  fetchedAt: null,
  metadata: {},
  planVersion: 1,
});

describe('trip map projection', () => {
  it('derives a nearby-search center from valid saved coordinates', () => {
    expect(
      placeDiscoveryCenter([
        location('first', '16.0000', '108.0000'),
        location('second', '16.2000', '108.4000'),
        location('invalid', '91', '0'),
      ]),
    ).toEqual({ latitude: 16.1, longitude: 108.2 });
    expect(placeDiscoveryCenter([location('invalid', null, null)])).toBeNull();
  });

  it('validates coordinates and filters saved locations without changing Plan data', () => {
    const locations = [
      { ...location('beach', '16.05', '108.24'), name: 'Bãi biển Mỹ Khê', address: 'Võ Nguyên Giáp, Sơn Trà' },
      { ...location('mountain', '16.0', '108.25'), name: 'Ngũ Hành Sơn' },
      location('invalid', '91', '0'),
    ];
    const scheduled = {
      ...activity('beach-activity', 'beach'),
      startsAt: '2026-09-22T14:00:00+07:00',
      endsAt: '2026-09-22T16:30:00+07:00',
    };

    expect(validCoordinates(locations[0]!)).toEqual({ latitude: 16.05, longitude: 108.24 });
    expect(validCoordinates(locations[2]!)).toBeNull();
    expect(
      selectMapLocations({
        locations,
        activities: [scheduled],
        filter: 'ALL',
        day: null,
        timezone: 'Asia/Ho_Chi_Minh',
        query: 'võ nguyên giáp',
      }).map((item) => item.id),
    ).toEqual(['beach']);
    expect(activityScheduleLabel(scheduled, 'Asia/Ho_Chi_Minh')).toBe(
      '2026-09-22 · 14:00–16:30',
    );
    expect(activityDurationLabel(scheduled)).toBe('2 giờ 30 phút');
  });

  it('keeps the saved-location list usable without an external map provider', async () => {
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

    expect(
      await screen.findByText('Bản đồ nền chưa được cấu hình', { selector: 'strong' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Tìm kiếm & chọn địa điểm' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Lựa chọn chỉ được lưu trên thiết bị này, chưa đồng bộ với thành viên khác.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: 'Tìm địa điểm' }),
    ).toHaveAttribute('placeholder', 'Tìm địa điểm, quán ăn, điểm tham quan...');
    expect(screen.getByRole('group', { name: 'Lọc địa điểm' })).toHaveTextContent('Tất cả');
    expect(screen.queryByText(/(?:Ã|Â|Ä‘|áº)/)).not.toBeInTheDocument();
    const list = screen.getByRole('region', { name: /^Địa điểm/ });
    await userEvent.click(within(list).getByRole('button', { name: /Ngũ Hành Sơn/ }));
    expect(screen.getByRole('complementary', { name: 'Chi tiết địa điểm' })).toHaveTextContent(
      'Chưa có tọa độ hợp lệ',
    );
    router.dispose();
  });
});
