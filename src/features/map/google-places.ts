import type { LocalPlaceSelection } from './place-selection-store';

type GooglePlaceLike = {
  id?: string;
  displayName?: { text?: string } | string;
  formattedAddress?: string;
  location?: { lat?: (() => number) | number; lng?: (() => number) | number };
  types?: string[];
};

type GooglePlaceSearchResponse = { places?: GooglePlaceLike[]; nextPage?: () => Promise<GooglePlaceSearchResponse> };

type GooglePlacesLibrary = {
  Place?: {
    searchByText?: (request: Record<string, unknown>) => Promise<GooglePlaceSearchResponse>;
    searchNearby?: (request: Record<string, unknown>) => Promise<GooglePlaceSearchResponse>;
  };
};

declare global {
  interface Window {
    google?: { maps?: { importLibrary?: (name: string) => Promise<GooglePlacesLibrary> } };
  }
}

let sdkPromise: Promise<boolean> | null = null;

function apiKey() {
  return (import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined)?.trim() ?? '';
}

export function loadGoogleMapsSdk() {
  if (window.google?.maps?.importLibrary) return Promise.resolve(true);
  if (!apiKey()) return Promise.resolve(false);
  if (!sdkPromise) {
    sdkPromise = new Promise<boolean>((resolve) => {
      const script = document.createElement('script');
      const callback = `wolfariGoogleMapsReady_${Date.now()}`;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey())}&libraries=places&loading=async&callback=${callback}`;
      script.async = true;
      script.defer = true;
      (window as unknown as Record<string, unknown>)[callback] = () => {
        delete (window as unknown as Record<string, unknown>)[callback];
        resolve(Boolean(window.google?.maps?.importLibrary));
      };
      script.onerror = () => {
        delete (window as unknown as Record<string, unknown>)[callback];
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
}

function coordinate(value: GooglePlaceLike['location']) {
  if (!value) return { latitude: null, longitude: null };
  const latitude = typeof value.lat === 'function' ? value.lat() : value.lat;
  const longitude = typeof value.lng === 'function' ? value.lng() : value.lng;
  return {
    latitude: Number.isFinite(latitude) ? String(latitude) : null,
    longitude: Number.isFinite(longitude) ? String(longitude) : null,
  };
}

export interface PlaceSearchResult {
  readonly places: readonly LocalPlaceSelection[];
  readonly unavailable: boolean;
  readonly hasMore: boolean;
  readonly loadMore?: () => Promise<PlaceSearchResult>;
}

export interface PlaceSearchCenter {
  readonly latitude: number;
  readonly longitude: number;
}

const SEARCH_RADIUS_METERS = 20_000;
const MAX_PROVIDER_NEXT_PAGES = 5;
const NEARBY_TYPES = [
  'tourist_attraction',
  'restaurant',
  'cafe',
  'museum',
  'shopping_mall',
  'market',
];

function unavailableResult(): PlaceSearchResult {
  return { places: [], unavailable: true, hasMore: false };
}

function mapPlaces(
  rawPlaces: readonly GooglePlaceLike[],
  tripId: string,
  seenProviderIds: Set<string>,
) {
  const fetchedAt = new Date().toISOString();
  return rawPlaces.flatMap((place) => {
    if (!place.id || seenProviderIds.has(place.id)) return [];
    seenProviderIds.add(place.id);
    const name = typeof place.displayName === 'string' ? place.displayName : place.displayName?.text;
    if (!name) return [];
    const coordinates = coordinate(place.location);
    return [{
      id: crypto.randomUUID(),
      tripId,
      name,
      address: place.formattedAddress ?? null,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      provider: 'google' as const,
      providerPlaceId: place.id,
      source: 'PROVIDER' as const,
      openingHours: null,
      fetchedAt,
      metadata: { types: place.types ?? [] },
      planVersion: 0,
      category: place.types?.[0] ?? null,
      local: true as const,
    }];
  });
}

function pageResult(
  response: GooglePlaceSearchResponse,
  tripId: string,
  signal: AbortSignal | undefined,
  seenProviderIds: Set<string>,
  remainingPages = MAX_PROVIDER_NEXT_PAGES,
): PlaceSearchResult {
  const nextPage = response.nextPage;
  const canLoadMore = Boolean(nextPage && remainingPages > 0);
  const baseResult = {
    places: mapPlaces(response.places ?? [], tripId, seenProviderIds),
    unavailable: false,
    hasMore: canLoadMore,
  };
  if (!canLoadMore || !nextPage) return baseResult;
  return {
    ...baseResult,
    loadMore: async () => {
      signal?.throwIfAborted();
      const nextResponse = await nextPage();
      signal?.throwIfAborted();
      return pageResult(nextResponse, tripId, signal, seenProviderIds, remainingPages - 1);
    },
  };
}

export async function searchGooglePlaces(
  query: string,
  tripId: string,
  signal?: AbortSignal,
  center?: PlaceSearchCenter | null,
): Promise<PlaceSearchResult> {
  signal?.throwIfAborted();
  if (!(await loadGoogleMapsSdk())) return unavailableResult();
  signal?.throwIfAborted();
  const library = await window.google!.maps!.importLibrary!('places');
  const seenProviderIds = new Set<string>();
  const fields = ['id', 'displayName', 'formattedAddress', 'location', 'types'];
  const search = query.trim().length >= 2
    ? library.Place?.searchByText
    : library.Place?.searchNearby;
  if (!search || !center) return unavailableResult();

  const location = { lat: center.latitude, lng: center.longitude };
  const request = query.trim().length >= 2
    ? {
        textQuery: query.trim(),
        fields,
        language: 'vi',
        region: 'VN',
        maxResultCount: 20,
        locationBias: { center: location, radius: SEARCH_RADIUS_METERS },
      }
    : {
        fields,
        language: 'vi',
        region: 'VN',
        maxResultCount: 20,
        rankPreference: 'POPULARITY',
        includedPrimaryTypes: NEARBY_TYPES,
        locationRestriction: { center: location, radius: SEARCH_RADIUS_METERS },
      };
  const response = await search(request);
  signal?.throwIfAborted();
  return pageResult(response, tripId, signal, seenProviderIds);
}
