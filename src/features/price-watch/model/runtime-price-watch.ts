export const runtimeStatuses = ['ACTIVE', 'PAUSED', 'EXPIRED', 'STOPPED'] as const;
export const flightProviders = [
  'MOCK_FLIGHT',
  'TRAVELPAYOUTS_CACHE',
  'SEARCHAPI_GOOGLE_FLIGHTS',
] as const;
export type FlightProvider = (typeof flightProviders)[number];

export const flightProviderLabels: Record<FlightProvider, string> = {
  MOCK_FLIGHT: 'giá mô phỏng',
  TRAVELPAYOUTS_CACHE: 'bộ nhớ đệm Travelpayouts',
  SEARCHAPI_GOOGLE_FLIGHTS: 'Google Flights qua SearchApi',
};

export function isFlightProvider(value: unknown): value is FlightProvider {
  return flightProviders.some((provider) => provider === value);
}

export interface WatchFields {
  provider?: FlightProvider;
  origin: string;
  destination: string;
  departure_date: string;
  departure_at: string;
  return_date: string | null;
  journey_type: 'ONE_WAY' | 'ROUND_TRIP';
  passengers: { adults: number; children: number; infants: number };
  cabin_class: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST' | null;
  currency: 'VND';
  threshold_price: string;
}
export interface RuntimeWatch {
  id: string;
  tripId: string;
  ownerId: string;
  status: (typeof runtimeStatuses)[number];
  statusReason: string | null;
  version: number;
  expiresAt: string;
  fields: WatchFields & { provider: FlightProvider };
}
export interface RuntimeObservation {
  id: string;
  price: string;
  provider: string;
  observedAt: string;
  fetchedAt: string;
  providerFoundAt?: string | null;
  providerExpiresAt?: string | null;
  dataKind?: string | null;
}
export type WatchIntent = {
  method: 'POST' | 'PATCH';
  path: string;
  body: WatchFields | (Partial<WatchFields> & { expected_version: number });
  key?: string;
};

export function validateWatchFields(value: unknown): asserts value is WatchFields {
  if (!value || typeof value !== 'object') throw Error('Invalid watch fields');
  const f = value as WatchFields;
  const date = (v: unknown) =>
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v;
  if (
    (f.provider !== undefined && !isFlightProvider(f.provider)) ||
    f.currency !== 'VND' ||
    !/^[A-Z]{3}$/.test(f.origin) ||
    !/^[A-Z]{3}$/.test(f.destination) ||
    f.origin === f.destination ||
    !date(f.departure_date) ||
    typeof f.departure_at !== 'string' ||
    !Number.isFinite(Date.parse(f.departure_at))
  )
    throw Error('Invalid flight query');
  if (new Date(f.departure_at).toISOString().slice(0, 10) !== f.departure_date)
    throw Error('Departure date must match UTC instant');
  if (
    !['ONE_WAY', 'ROUND_TRIP'].includes(f.journey_type) ||
    (f.journey_type === 'ROUND_TRIP'
      ? !date(f.return_date) || f.return_date! < f.departure_date
      : f.return_date !== null)
  )
    throw Error('Invalid return date');
  if (
    f.cabin_class !== null &&
    !['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'].includes(f.cabin_class)
  )
    throw Error('Invalid cabin');
  const p = f.passengers;
  if (
    f.provider !== undefined &&
    f.provider !== 'MOCK_FLIGHT' &&
    (f.journey_type !== 'ONE_WAY' ||
      f.cabin_class !== 'ECONOMY' ||
      p?.adults !== 1 ||
      p?.children !== 0 ||
      p?.infants !== 0)
  )
    throw Error('Unsupported provider query');
  if (
    !p ||
    ![p.adults, p.children, p.infants].every((n) => Number.isInteger(n) && n >= 0 && n <= 9) ||
    p.adults < 1 ||
    p.infants > p.adults ||
    p.adults + p.children + p.infants > 9
  )
    throw Error('Invalid passengers');
  if (
    typeof f.threshold_price !== 'string' ||
    !/^[1-9]\d{0,18}$/.test(f.threshold_price) ||
    BigInt(f.threshold_price) > 9223372036854775807n
  )
    throw Error('Invalid threshold');
}

export function restoreCreateIntent(raw: string, tripId: string): WatchIntent {
  const value = JSON.parse(raw) as WatchIntent;
  if (
    value?.method !== 'POST' ||
    value.path !== `/api/v1/trips/${tripId}/price-watches` ||
    typeof value.key !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(value.key)
  )
    throw Error('Invalid journal scope');
  validateWatchFields(value.body);
  return value;
}
