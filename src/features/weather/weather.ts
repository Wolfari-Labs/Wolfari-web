import type { GatewayMetadata } from '../../infrastructure/http/envelope';

export interface DailyWeather {
  date: string;
  temperatureMaxC: number | null;
  temperatureMinC: number | null;
  rainProbability: number | null;
  uvIndex: number | null;
}

export interface WeatherResult {
  data: DailyWeather | null;
  source: NonNullable<GatewayMetadata['travelSource']>;
}

export interface WeatherRepository {
  forecast(request: {
    latitude: number;
    longitude: number;
    date: string;
    signal: AbortSignal;
  }): Promise<WeatherResult>;
}

export function weatherTemperature(data: DailyWeather, compact = false) {
  const format = (value: number) =>
    `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: compact ? 0 : 1 }).format(value)}°`;
  if (data.temperatureMinC !== null && data.temperatureMaxC !== null)
    return `${format(data.temperatureMinC)} – ${format(data.temperatureMaxC)}`;
  const value = data.temperatureMaxC ?? data.temperatureMinC;
  return value === null ? '—' : format(value);
}
