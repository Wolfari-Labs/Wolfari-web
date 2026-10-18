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
}

export async function searchGooglePlaces(query: string, tripId: string, signal?: AbortSignal): Promise<PlaceSearchResult> {
  signal?.throwIfAborted();
  if (!(await loadGoogleMapsSdk())) return { places: [], unavailable: true };
  signal?.throwIfAborted();
  const library = await window.google!.maps!.importLibrary!('places');
  const search = library.Place?.searchByText;
  if (!search) return { places: [], unavailable: true };
  let response = await search({
    textQuery: query,
    fields: ['id', 'displayName', 'formattedAddress', 'location', 'types'],
    language: 'vi',
    region: 'VN',
    maxResultCount: 20,
  });
  signal?.throwIfAborted();
  const rawPlaces: GooglePlaceLike[] = [...(response.places ?? [])];
  let page = 0;
  while (response.nextPage && page < 5) {
    response = await response.nextPage();
    rawPlaces.push(...(response.places ?? []));
    page += 1;
  }
  const fetchedAt = new Date().toISOString();
  const seenProviderIds = new Set<string>();
  const places = rawPlaces.flatMap((place) => {
    if (!place.id) return [];
    if (seenProviderIds.has(place.id)) return [];
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
  return { places, unavailable: false };
}
