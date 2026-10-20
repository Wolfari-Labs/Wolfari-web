import type { PlaceSearchCenter } from './google-places';
import type { LocalPlaceSelection } from './place-selection-store';

const DEFAULT_CENTER: PlaceSearchCenter = { latitude: 16.0678, longitude: 108.2208 };

const FALLBACK_PLACES = [
  ['cho-han', 'Chợ Hàn', 'Hải Châu, Đà Nẵng', 'market', -0.006, 0.003],
  ['cho-con', 'Chợ Cồn', 'Hải Châu, Đà Nẵng', 'market', -0.004, -0.004],
  ['bao-tang-cham', 'Bảo tàng Điêu khắc Chăm', 'Bạch Đằng, Đà Nẵng', 'museum', -0.008, 0.001],
  ['cong-vien-apec', 'Công viên APEC', 'Bạch Đằng, Đà Nẵng', 'park', -0.007, 0.000],
  ['cong-vien-bien-dong', 'Công viên Biển Đông', 'Võ Nguyên Giáp, Đà Nẵng', 'park', 0.006, 0.010],
  ['cau-tinh-yeu', 'Cầu Tình Yêu', 'Trần Hưng Đạo, Đà Nẵng', 'tourist_attraction', -0.001, 0.006],
  ['nha-tho-da-nang', 'Nhà thờ Đà Nẵng', 'Trần Phú, Đà Nẵng', 'tourist_attraction', -0.006, -0.002],
  ['helio-center', 'Helio Center', 'Đường 2 Tháng 9, Đà Nẵng', 'shopping_mall', -0.017, 0.006],
  ['sun-wheel', 'Sun Wheel Đà Nẵng', 'Hải Châu, Đà Nẵng', 'tourist_attraction', -0.019, 0.008],
  ['bao-tang-da-nang', 'Bảo tàng Đà Nẵng', 'Trần Phú, Đà Nẵng', 'museum', -0.005, -0.001],
] as const;

/** Deterministic local suggestions used when the Places provider is unavailable. */
export function fallbackPlaceSelections(
  tripId: string,
  center: PlaceSearchCenter | null,
): readonly LocalPlaceSelection[] {
  const origin = center ?? DEFAULT_CENTER;
  const fetchedAt = new Date().toISOString();
  return FALLBACK_PLACES.map(([slug, name, address, category, latitudeOffset, longitudeOffset]) => ({
    id: `fallback:${slug}`,
    tripId,
    name,
    address,
    latitude: String(origin.latitude + latitudeOffset),
    longitude: String(origin.longitude + longitudeOffset),
    provider: 'google' as const,
    providerPlaceId: `fallback-${slug}`,
    source: 'PROVIDER' as const,
    openingHours: null,
    fetchedAt,
    metadata: { types: [category] },
    planVersion: 0,
    category,
    local: true as const,
  }));
}
