import type { WeatherRepository } from '../../features/weather/weather';
import { validCalendarDate } from '../../shared/lib/calendar';
import { ApiError } from '../http/api-error';
import type { GatewayHttpClient } from '../http/http-client';

function invalid(): never {
  throw new ApiError('Invalid weather response', 'invalid-response', 200, null, null, false);
}

function nullableNumber(value: unknown, minimum: number, maximum: number): number | null {
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : invalid();
}

export function createWeatherRepository(client: GatewayHttpClient): WeatherRepository {
  return {
    async forecast({ latitude, longitude, date, signal }) {
      const query = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        date,
      });
      const result = await client.read(`/api/v1/travel/weather?${query}`, {
        signal,
        includeCredentials: true,
      });
      const source = result.metadata?.travelSource;
      if (!source) invalid();
      if (source.status === 'NO_RESULT') {
        if (result.data !== null) invalid();
        return { data: null, source };
      }
      if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data)) invalid();
      const row = result.data as Record<string, unknown>;
      if (row.date !== date || !validCalendarDate(String(row.date))) invalid();
      const temperatureMaxC = nullableNumber(row.temperature_max_c, -100, 100);
      const temperatureMinC = nullableNumber(row.temperature_min_c, -100, 100);
      if (temperatureMaxC !== null && temperatureMinC !== null && temperatureMinC > temperatureMaxC)
        invalid();
      return {
        source,
        data: {
          date,
          temperatureMaxC,
          temperatureMinC,
          rainProbability: nullableNumber(row.rain_probability, 0, 1),
          uvIndex: nullableNumber(row.uv_index, 0, 100),
        },
      };
    },
  };
}
