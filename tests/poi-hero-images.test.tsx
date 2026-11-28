import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import {
  decodePlace,
  decodePlaceImage,
} from '../src/infrastructure/repositories/places.gateway-repository';
import { PlaceDetail } from '../src/features/map/PlaceDetail';
import { MapViewport } from '../src/features/map/MapViewport';
import { mapLocationPresentations } from '../src/features/map/trip-map';
import type { PlaceImage } from '../src/features/map/places';

const sha = 'a'.repeat(64);
const route = (width: number, hash = sha) => `/api/v1/travel/poi-images/${hash}/${width}.webp`;
const wire = {
  url: route(1280),
  thumbnail_url: route(640),
  small_url: route(320),
  width: 1280,
  height: 853,
  author: 'An',
  license: 'CC-BY-SA-4.0',
  license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  source_url: 'https://commons.wikimedia.org/wiki/File:Chua_Cau.jpg',
  attribution: 'Ảnh: An · CC BY-SA 4.0 · Wikimedia Commons',
  source: 'wikidata',
  is_placeholder: false,
};
const photo: PlaceImage = {
  url: route(1280),
  thumbnailUrl: route(640),
  smallUrl: route(320),
  width: 1280,
  height: 853,
  author: 'An',
  license: 'CC-BY-SA-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Chua_Cau.jpg',
  attribution: 'Ảnh: An · CC BY-SA 4.0 · Wikimedia Commons',
};
const place = {
  id: 'qn-chua-cau',
  name: 'Chùa Cầu',
  address: 'Hội An',
  coordinates: { latitude: 15.877, longitude: 108.326 },
  selection_token: 'signed',
  attribution: 'Wolfari',
  provider: 'WOLFARI',
};
const [item] = mapLocationPresentations(
  [
    {
      id: 'result:qn-chua-cau',
      tripId: '11111111-1111-4111-8111-111111111111',
      name: 'Chùa Cầu',
      address: 'Hội An',
      latitude: '15.877',
      longitude: '108.326',
      provider: 'WOLFARI',
      providerPlaceId: 'qn-chua-cau',
      source: 'PROVIDER' as const,
      openingHours: null,
      fetchedAt: null,
      metadata: {},
      planVersion: 1,
    },
  ],
  [],
  false,
);

describe('POI hero image decoding', () => {
  it('keeps the Gateway image route and the credit', () => {
    expect(decodePlace({ ...place, hero_image: wire }).heroImage).toEqual(photo);
    expect(decodePlaceImage({ ...wire, url: `${window.location.origin}${route(1280)}` })?.url).toBe(
      route(1280),
    );
    expect(decodePlace(place).heroImage).toBeNull();
    expect(decodePlace({ ...place, hero_image: null }).heroImage).toBeNull();
  });
  it.each([
    { url: `https://evil.example${route(1280)}` },
    { url: `//evil.example${route(1280)}` },
    { url: route(640) },
    { thumbnail_url: route(640, 'b'.repeat(64)) },
    { small_url: route(320) + '?x=1' },
    { url: '/api/v1/travel/poi-images/../../me' },
    { url: 'javascript:alert(1)' },
    { url: `data:image/webp;base64,AAAA` },
    { source_url: 'http://commons.wikimedia.org/wiki/File:x.jpg' },
    { source_url: 'javascript:alert(1)' },
    { attribution: '' },
    { license: undefined },
    { is_placeholder: true },
  ])('shows no photo for an image outside the contract %#', (change) => {
    expect(decodePlaceImage({ ...wire, ...change })).toBeNull();
    // A bad photo never drops the place itself.
    expect(decodePlace({ ...place, hero_image: { ...wire, ...change } })).toMatchObject({
      name: 'Chùa Cầu',
      heroImage: null,
    });
  });
});

describe('POI hero image presentation', () => {
  const detail = (image: PlaceImage | null) =>
    render(
      <MemoryRouter>
        <PlaceDetail
          item={item!}
          tripId="11111111-1111-4111-8111-111111111111"
          timezone="Asia/Ho_Chi_Minh"
          open
          onClose={() => {}}
          runtime
          photo={image}
        />
      </MemoryRouter>,
    );
  it('shows the photo lazily with the place name and a credit linking to the source', () => {
    detail(photo);
    const image = screen.getByRole('img', { name: 'Chùa Cầu' });
    expect(image).toHaveAttribute('src', route(640));
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image.getAttribute('srcset')).toContain(`${route(1280)} 1280w`);
    const credit = screen.getByRole('link', { name: photo.attribution });
    expect(credit).toHaveAttribute('href', photo.sourceUrl);
    expect(credit).toHaveAttribute('rel', 'noopener noreferrer');
    expect(credit).toHaveAttribute('target', '_blank');
    expect(screen.queryByAltText(/Ảnh minh họa giao diện/)).not.toBeInTheDocument();
  });
  it('falls back to the template artwork when the photo is absent or fails to load', () => {
    const { unmount } = detail(null);
    expect(screen.getByAltText(/Ảnh minh họa giao diện/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: photo.attribution })).not.toBeInTheDocument();
    unmount();
    detail(photo);
    fireEvent.error(screen.getByRole('img', { name: 'Chùa Cầu' }));
    expect(screen.getByAltText(/Ảnh minh họa giao diện/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: photo.attribution })).not.toBeInTheDocument();
  });
  it('shows the photo and credit in the selected-place card on the map', () => {
    render(
      <MapViewport
        items={[item!]}
        selectedLocationId={item!.location.id}
        timezone="Asia/Ho_Chi_Minh"
        previewEnabled={false}
        onSelect={() => {}}
        onOpenDetail={() => {}}
        runtimeMap={<div />}
        selectedPhoto={photo}
      />,
    );
    const card = screen.getAllByRole('article', { name: 'Đang chọn Chùa Cầu' })[0]!;
    const image = card.querySelector('img')!;
    expect(image).toHaveAttribute('alt', 'Chùa Cầu');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(card.querySelector('a')).toHaveAttribute('href', photo.sourceUrl);
    expect(card.querySelector('a')).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
