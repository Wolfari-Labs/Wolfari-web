export const runtimeStatuses = ['ACTIVE', 'PAUSED', 'EXPIRED', 'STOPPED'] as const;
export const priceProviders = [
  'MOCK_FLIGHT',
  'TRAVELPAYOUTS_CACHE',
  'SEARCHAPI_GOOGLE_FLIGHTS',
] as const;
export type PriceProvider = (typeof priceProviders)[number];
export const journeyTypes = ['ONE_WAY', 'ROUND_TRIP'] as const;
export const cabinClasses = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] as const;
/** Real fare sources publish one-way economy fares for one adult (Backend capabilities table). */
export const referenceProvider = (provider: PriceProvider) => provider !== 'MOCK_FLIGHT';
/**
 * `GET /price-watch-capabilities`: the source new watches use and what it can compare (FR-AU03).
 * `available: false` means creating a watch now fails (provider not configured).
 */
export interface PriceWatchCapabilities {
  provider: PriceProvider;
  available: boolean;
  journeyTypes: readonly (typeof journeyTypes)[number][];
  cabinClasses: readonly (typeof cabinClasses)[number][];
  maxAdults: number;
  maxChildren: number;
  maxInfants: number;
  maxPassengers: number;
  currencies: readonly 'VND'[];
}
export const providerLabels: Record<PriceProvider, string> = {
  MOCK_FLIGHT: 'Giá mô phỏng (MOCK_FLIGHT)',
  TRAVELPAYOUTS_CACHE: 'Travelpayouts (giá cache)',
  SEARCHAPI_GOOGLE_FLIGHTS: 'Google Flights (SearchApi)',
};
const cabinNames: Record<(typeof cabinClasses)[number], string> = {
  ECONOMY: 'hạng phổ thông',
  PREMIUM_ECONOMY: 'hạng phổ thông đặc biệt',
  BUSINESS: 'hạng thương gia',
  FIRST: 'hạng nhất',
};
/** One line describing what the configured source compares, e.g. for the form header. */
export function capabilitiesLine(c: PriceWatchCapabilities): string {
  const journeys =
    c.journeyTypes.length === 1
      ? c.journeyTypes[0] === 'ONE_WAY'
        ? 'vé một chiều'
        : 'vé khứ hồi'
      : 'vé một chiều hoặc khứ hồi';
  const cabins =
    c.cabinClasses.length === 1
      ? cabinNames[c.cabinClasses[0]!]
      : c.cabinClasses.length === cabinClasses.length
        ? 'mọi hạng ghế'
        : c.cabinClasses.map((cabin) => cabinNames[cabin]).join(', ');
  const people =
    c.maxPassengers <= 1 || (c.maxChildren === 0 && c.maxInfants === 0 && c.maxAdults === 1)
      ? '1 người lớn'
      : `tối đa ${c.maxPassengers} hành khách`;
  return `${providerLabels[c.provider]} so sánh ${journeys}, ${cabins}, ${people}.`;
}
/** Field errors for a query the source cannot compare; empty when it is supported. */
export function capabilityErrors(
  f: Pick<WatchFields, 'journey_type' | 'cabin_class' | 'passengers' | 'currency'>,
  c: PriceWatchCapabilities,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const p = f.passengers;
  if (!c.journeyTypes.includes(f.journey_type))
    errors.journey_type = 'Nguồn giá hiện tại không hỗ trợ hành trình này.';
  if (f.cabin_class !== null && !c.cabinClasses.includes(f.cabin_class))
    errors.cabin_class = 'Nguồn giá hiện tại không hỗ trợ hạng ghế này.';
  if (p.adults > c.maxAdults) errors.adults = `Nguồn giá hỗ trợ tối đa ${c.maxAdults} người lớn.`;
  if (p.children > c.maxChildren)
    errors.children = `Nguồn giá hỗ trợ tối đa ${c.maxChildren} trẻ em.`;
  if (p.infants > c.maxInfants) errors.infants = `Nguồn giá hỗ trợ tối đa ${c.maxInfants} em bé.`;
  if (!errors.adults && p.adults + p.children + p.infants > c.maxPassengers)
    errors.adults = `Nguồn giá hỗ trợ tối đa ${c.maxPassengers} hành khách.`;
  if (!c.currencies.includes(f.currency)) errors.threshold_price = 'Nguồn giá không hỗ trợ VND.';
  return errors;
}
export interface WatchFields {
  provider: PriceProvider;
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
  fields: WatchFields;
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
    !(priceProviders as readonly string[]).includes(f.provider) ||
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
    referenceProvider(f.provider) &&
    (f.journey_type !== 'ONE_WAY' ||
      f.cabin_class !== 'ECONOMY' ||
      p?.adults !== 1 ||
      p?.children !== 0 ||
      p?.infants !== 0)
  )
    throw Error('Unsupported cache query');
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
