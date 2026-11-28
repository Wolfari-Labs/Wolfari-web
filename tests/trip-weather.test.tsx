import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GatewayContext } from '../src/app/gateway-context';
import type { RuntimeServices } from '../src/shared/types/runtime-services';
import { TripWeatherChip, TripWeatherSummary } from '../src/features/weather/TripWeather';
import { weatherLocation } from '../src/features/weather/use-trip-weather';
import type { WeatherRepository, WeatherResult } from '../src/features/weather/weather';
import { createFixtureTripRepository } from '../src/infrastructure/fixtures/trip.fixture-repository';
import { createFixturePlanRepository } from '../src/infrastructure/fixtures/plan.fixture-repository';
import { previewTripId } from '../src/infrastructure/fixtures/trip-catalog';

async function snapshot() {
  const request = {
    tripId: previewTripId,
    scenario: 'success' as const,
    signal: new AbortController().signal,
  };
  const trip = await createFixtureTripRepository().getTrip(request);
  const plan = await createFixturePlanRepository().getPlan(request);
  if (trip.status !== 'ready' || plan.status !== 'ready') throw Error('Missing test fixture');
  return { trip: trip.data, plan: plan.data, date: '2026-11-01' };
}

const result: WeatherResult = {
  data: {
    date: '2026-11-01',
    temperatureMinC: -2,
    temperatureMaxC: 8,
    rainProbability: 0.4,
    uvIndex: 1,
  },
  source: {
    status: 'SUCCESS',
    provider: 'OPEN_METEO',
    fetchedAt: '2026-11-01T00:00:00Z',
    isMock: true,
    stale: true,
    warnings: [],
    attribution: [{ text: 'Weather data by Open-Meteo.com', url: 'https://open-meteo.com/' }],
  },
};

function wrapper(weather: WeatherRepository) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <GatewayContext.Provider value={{ weather } as RuntimeServices}>
          {children}
        </GatewayContext.Provider>
      </QueryClientProvider>
    );
  };
}

describe('Trip weather', () => {
  it('uses the scheduled activity location before other saved places', async () => {
    const props = await snapshot();
    const first = props.plan.selectedLocations[0]!;
    const second = {
      ...first,
      id: 'different-location',
      name: 'Day destination',
      latitude: '15.9',
    };
    const plan = {
      ...props.plan,
      selectedLocations: [{ ...first, latitude: '16.1', longitude: '108.2' }, second],
      activities: [
        {
          ...props.plan.activities[0]!,
          startsAt: null,
          endsAt: null,
          scheduledDate: props.date,
          selectedLocationId: second.id,
        },
      ],
    };
    expect(weatherLocation(plan, props.date, props.trip.timezone)?.id).toBe(second.id);
    expect(
      weatherLocation(
        { ...plan, permissions: { ...plan.permissions, canRead: false } },
        props.date,
        props.trip.timezone,
      ),
    ).toBeNull();
  });

  it('shows temperatures, mock/stale status and attribution in the compact card', async () => {
    const props = await snapshot();
    const forecast = vi.fn(async () => result);
    render(<TripWeatherSummary {...props} />, { wrapper: wrapper({ forecast }) });
    expect(await screen.findByText('-2° – 8°')).toBeInTheDocument();
    expect(screen.getByText(/Dữ liệu mô phỏng/)).toBeInTheDocument();
    expect(screen.getByText(/Dự báo cũ/)).toBeInTheDocument();
    expect(screen.queryByText(/^Cập nhật /)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Weather data by Open-Meteo.com' })).toHaveAttribute(
      'href',
      'https://open-meteo.com/',
    );
    expect(forecast).toHaveBeenCalledTimes(1);
  });

  it('does not request weather for missing coordinates or a stale plan snapshot', async () => {
    const props = await snapshot();
    const forecast = vi.fn(async () => result);
    const view = render(
      <TripWeatherSummary {...props} plan={{ ...props.plan, selectedLocations: [] }} />,
      { wrapper: wrapper({ forecast }) },
    );
    expect(screen.getByText('Chưa có địa điểm có tọa độ')).toBeInTheDocument();
    view.rerender(
      <TripWeatherChip
        {...props}
        plan={{ ...props.plan, planVersion: props.trip.planVersion + 1 }}
      />,
    );
    expect(forecast).not.toHaveBeenCalled();
  });

  it('explains forecast horizon without making up a zero temperature', async () => {
    const props = await snapshot();
    const forecast = vi.fn(async () => ({
      data: null,
      source: {
        ...result.source,
        status: 'NO_RESULT' as const,
        warnings: ['FORECAST_OUT_OF_RANGE'],
      },
    }));
    render(<TripWeatherSummary {...props} />, { wrapper: wrapper({ forecast }) });
    expect(await screen.findByText(/Chưa có dự báo cho ngày này/)).toBeInTheDocument();
    expect(screen.queryByText('0°')).not.toBeInTheDocument();
  });
});
