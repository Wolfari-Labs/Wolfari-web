import type { InfiniteData } from '@tanstack/react-query';
import type { TripDetailViewModel } from './trip-detail';
import type { TripListViewModel } from './trip-list';

export function updateTripInListPages(
  current: InfiniteData<TripListViewModel> | undefined,
  trip: TripDetailViewModel,
): InfiniteData<TripListViewModel> | undefined {
  if (!current) return current;
  let changed = false;
  const pages = current.pages.map((page) => {
    let pageChanged = false;
    const items = page.items.map((item) => {
      if (item.id !== trip.id) return item;
      changed = true;
      pageChanged = true;
      return { ...trip, presentation: item.presentation };
    });
    return pageChanged ? { ...page, items } : page;
  });
  return changed ? { ...current, pages } : current;
}
