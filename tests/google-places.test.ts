import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchGooglePlaces } from '../src/features/map/google-places';

function installGoogleLibrary(library: Record<string, unknown>) {
  Object.defineProperty(window, 'google', {
    configurable: true,
    value: { maps: { importLibrary: vi.fn().mockResolvedValue(library) } },
  });
}

afterEach(() => {
  delete (window as Window & { google?: unknown }).google;
});

describe('Google Places adapter', () => {
  it('uses nearby mode for an empty query and returns a local provider snapshot', async () => {
    const searchNearby = vi.fn().mockResolvedValue({
      places: [{
        id: 'nearby-1',
        displayName: { text: 'Bảo tàng Đà Nẵng' },
        formattedAddress: 'Đà Nẵng',
        location: { lat: 16.06, lng: 108.22 },
        types: ['museum'],
      }],
    });
    installGoogleLibrary({ Place: { searchNearby } });

    const result = await searchGooglePlaces('', 'trip', undefined, {
      latitude: 16.05,
      longitude: 108.21,
    });

    expect(result.places[0]).toMatchObject({
      name: 'Bảo tàng Đà Nẵng',
      provider: 'google',
      providerPlaceId: 'nearby-1',
      local: true,
    });
    expect(searchNearby).toHaveBeenCalledWith(expect.objectContaining({
      maxResultCount: 20,
      locationRestriction: {
        center: { lat: 16.05, lng: 108.21 },
        radius: 20_000,
      },
    }));
    expect(result.hasMore).toBe(false);
  });

  it('paginates text results and deduplicates provider ids across pages', async () => {
    const nextPage = vi.fn().mockResolvedValue({
      places: [
        { id: 'same', displayName: { text: 'Trùng kết quả' } },
        { id: 'second', displayName: { text: 'Kết quả tiếp theo' } },
      ],
    });
    const searchByText = vi.fn().mockResolvedValue({
      places: [{ id: 'same', displayName: { text: 'Trùng kết quả' } }],
      nextPage,
    });
    installGoogleLibrary({ Place: { searchByText } });

    const first = await searchGooglePlaces('bảo tàng', 'trip', undefined, {
      latitude: 16.05,
      longitude: 108.21,
    });
    const second = await first.loadMore?.();

    expect(first.places).toHaveLength(1);
    expect(second?.places).toHaveLength(1);
    expect(second?.places[0]?.providerPlaceId).toBe('second');
    expect(searchByText).toHaveBeenCalledWith(expect.objectContaining({
      textQuery: 'bảo tàng',
      locationBias: { center: { lat: 16.05, lng: 108.21 }, radius: 20_000 },
    }));
  });

  it('rejects an obsolete request after it is aborted', async () => {
    let resolveSearch: ((value: { places: [] }) => void) | undefined;
    const searchByText = vi.fn().mockReturnValue(new Promise<{ places: [] }>((resolve) => {
      resolveSearch = resolve;
    }));
    installGoogleLibrary({ Place: { searchByText } });
    const controller = new AbortController();

    const request = searchGooglePlaces('cầu rồng', 'trip', controller.signal, {
      latitude: 16.05,
      longitude: 108.21,
    });
    controller.abort();
    resolveSearch?.({ places: [] });

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('surfaces provider errors for the page to render its fallback state', async () => {
    installGoogleLibrary({
      Place: { searchNearby: vi.fn().mockRejectedValue(new Error('provider failed')) },
    });
    await expect(searchGooglePlaces('', 'trip', undefined, {
      latitude: 16.05,
      longitude: 108.21,
    })).rejects.toThrow('provider failed');
  });
});
