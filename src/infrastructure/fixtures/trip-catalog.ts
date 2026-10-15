import type { TripLifecycle, TripListItem } from '../../features/trips/model/trip-list';
import daNangCover from '../../shared/assets/figma/3a3f8.png';
import phuQuocCover from '../../shared/assets/figma/a84f7.png';
import daLatCover from '../../shared/assets/figma/6059f.png';
import vungTauCover from '../../shared/assets/figma/42524.png';
import hueCover from '../../shared/assets/figma/1dc61.png';
import ninhBinhCover from '../../shared/assets/figma/916ba.png';
import daNangMobileCover from '../../shared/assets/figma/8bc2c.svg';
import daLatMobileCover from '../../shared/assets/figma/9478a.svg';

export const previewTripId = '11111111-1111-4111-8111-111111111111';
export const fixtureViewerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
// Source lifecycle labels describe this fixed preview date, never the viewer's wall clock.
export const fixtureLifecycleAsOf = '2026-09-23';

function trip({
  id,
  name,
  start,
  end,
  lifecycle,
  role,
  memberCount,
  src,
  mobileSrc = null,
  canRead = true,
}: {
  id: string;
  name: string;
  start: string;
  end: string;
  lifecycle: TripLifecycle;
  role: TripListItem['currentMembership']['role'];
  memberCount: number;
  src: string;
  mobileSrc?: string | null;
  canRead?: boolean;
}): TripListItem {
  return Object.freeze({
    id,
    name,
    startAt: `${start}T00:00:00+07:00`,
    endAt: `${end}T23:59:59+07:00`,
    timezone: 'Asia/Ho_Chi_Minh',
    lifecycle,
    planVersion: 1,
    membershipRevision: 1,
    exportRevision: 1,
    currentMembership: Object.freeze({
      id: 'a' + id.slice(1),
      tripId: id,
      userId: fixtureViewerId,
      role,
      joinedAt: '2026-06-01T00:00:00+07:00',
      leftAt: null,
    }),
    permissions: Object.freeze({ canRead, canUpdate: false }),
    presentation: Object.freeze({
      memberCount,
      cover: Object.freeze({ src, mobileSrc, alt: '' }),
    }),
  });
}

// Six source cards are shared across breakpoints. The denied sentinel must never reach the UI.
export const fixtureTripCatalog: readonly TripListItem[] = Object.freeze([
  trip({
    id: previewTripId,
    name: 'Đà Nẵng – Hội An',
    start: '2026-09-22',
    end: '2026-09-25',
    lifecycle: 'ONGOING',
    role: 'OWNER',
    memberCount: 4,
    src: daNangCover,
    mobileSrc: daNangMobileCover,
  }),
  trip({
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Phú Quốc – Hẹn với biển',
    start: '2026-10-02',
    end: '2026-10-04',
    lifecycle: 'UPCOMING',
    role: 'MEMBER',
    memberCount: 6,
    src: phuQuocCover,
  }),
  trip({
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Đà Lạt – Một chút bình yên',
    start: '2026-10-16',
    end: '2026-10-18',
    lifecycle: 'UPCOMING',
    role: 'OWNER',
    memberCount: 3,
    src: daLatCover,
    mobileSrc: daLatMobileCover,
  }),
  trip({
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Sài Gòn – Vũng Tàu',
    start: '2026-11-06',
    end: '2026-11-08',
    lifecycle: 'UPCOMING',
    role: 'MEMBER',
    memberCount: 5,
    src: vungTauCover,
  }),
  trip({
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Huế – Chậm một nhịp',
    start: '2026-08-12',
    end: '2026-08-14',
    lifecycle: 'COMPLETED',
    role: 'OWNER',
    memberCount: 2,
    src: hueCover,
  }),
  trip({
    id: '77777777-7777-4777-8777-777777777777',
    name: 'Ninh Bình – Giữa núi xanh',
    start: '2026-07-10',
    end: '2026-07-12',
    lifecycle: 'COMPLETED',
    role: 'MEMBER',
    memberCount: 4,
    src: ninhBinhCover,
  }),
  trip({
    id: '88888888-8888-4888-8888-888888888888',
    name: 'Chuyến đi riêng tư – không được hiển thị',
    start: '2026-12-01',
    end: '2026-12-02',
    lifecycle: 'UPCOMING',
    role: 'MEMBER',
    memberCount: 99,
    src: daNangCover,
    canRead: false,
  }),
]);

export function readableFixtureTrips(
  viewerId = fixtureViewerId,
  records: readonly TripListItem[] = fixtureTripCatalog,
): readonly TripListItem[] {
  return records.filter(
    (item) =>
      item.permissions.canRead &&
      item.currentMembership.userId === viewerId &&
      item.currentMembership.tripId === item.id &&
      item.currentMembership.leftAt === null,
  );
}
