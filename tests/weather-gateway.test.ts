import { describe, expect, it, vi } from 'vitest';
import { createGatewayHttpClient } from '../src/infrastructure/http/http-client';
import { createWeatherRepository } from '../src/infrastructure/repositories/weather.gateway-repository';
import { weatherTemperature } from '../src/features/weather/weather';

const data = {
  date: '2026-12-01',
  temperature_max_c: 4.2,
  temperature_min_c: -2.5,
  rain_probability: 0.75,
  uv_index: null,
};
const meta = {
  status: 'SUCCESS',
  provider: 'OPEN_METEO',
  fetched_at: '2026-11-26T04:00:00Z',
  stale: false,
  is_mock: false,
  warnings: [],
  attribution: [{ text: 'Weather data by Open-Meteo.com', url: 'https://open-meteo.com/' }],
};
const request = () => ({
  latitude: 16.05,
  longitude: 108.2,
  date: data.date,
  signal: new AbortController().signal,
});

function setup(value: unknown) {
  const transport = vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }),
  );
  const repository = createWeatherRepository(createGatewayHttpClient({ transport }));
  return { repository, transport };
}

describe('Weather Gateway', () => {
  it('reads the real envelope, negative temperatures and provider credits', async () => {
    const { repository, transport } = setup({ data, meta });
    const result = await repository.forecast(request());
    expect(result).toMatchObject({
      data: { temperatureMinC: -2.5, temperatureMaxC: 4.2, rainProbability: 0.75, uvIndex: null },
      source: {
        provider: 'OPEN_METEO',
        isMock: false,
        stale: false,
        attribution: meta.attribution,
      },
    });
    expect(String(transport.mock.calls[0]?.[0])).toBe(
      '/api/v1/travel/weather?latitude=16.05&longitude=108.2&date=2026-12-01',
    );
    expect(weatherTemperature(result.data!)).toBe('-2,5° – 4,2°');
  });

  it('keeps nullable measurements, mock status and stale flags without inventing values', async () => {
    const { repository } = setup({
      data: { ...data, temperature_max_c: null, rain_probability: null },
      meta: { ...meta, stale: true, is_mock: true },
    });
    const result = await repository.forecast(request());
    expect(result.data?.temperatureMaxC).toBeNull();
    expect(result.data?.rainProbability).toBeNull();
    expect(result.source).toMatchObject({ stale: true, isMock: true });
    expect(weatherTemperature(result.data!)).toBe('-2,5°');
  });

  it('keeps an out-of-range forecast as no result', async () => {
    const { repository } = setup({
      data: null,
      meta: { ...meta, status: 'NO_RESULT', warnings: ['FORECAST_OUT_OF_RANGE'] },
    });
    expect(await repository.forecast(request())).toMatchObject({
      data: null,
      source: { status: 'NO_RESULT', warnings: ['FORECAST_OUT_OF_RANGE'] },
    });
  });

  it.each([
    { data: { ...data, rain_probability: 75 }, meta },
    { data: { ...data, temperature_max_c: -5 }, meta },
    { data: { ...data, date: '2026-12-02' }, meta },
    { data, meta: {} },
    { data, meta: { ...meta, status: 'NO_RESULT' } },
  ])('rejects invalid or mismatched forecasts %j', async (value) => {
    const { repository } = setup(value);
    await expect(repository.forecast(request())).rejects.toThrow();
  });
});
