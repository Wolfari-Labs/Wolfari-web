import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import { CapabilityNote } from '../../shared/components/CapabilityNote';
import { Select } from '../../shared/components/Select';
import searchIcon from '../../shared/assets/figma/ce7fc.svg';
import pinIcon from '../../shared/assets/figma/8efc8.svg';
import chevronIcon from '../../shared/assets/figma/ad884.svg';
import { TripPlanBoundary } from '../plan/components/TripPlanBoundary';
import { useTripPlanSnapshot } from '../plan/hooks/use-trip-plan-snapshot';
import { planScenarios, type PlanScenario } from '../plan/model/plan';
import { planDays } from '../plan/model/plan-presentation';
import { usePlanDraft } from '../plan/hooks/use-plan-draft';
import { TripHero } from '../trips/components/TripHero';
import { MapViewport } from './MapViewport';
import { PlaceDetail } from './PlaceDetail';
import { mapLocationPresentations, normalizedPlaceText, placeDiscoveryCenter, placeStatus, sortPlacePresentations, type LocationScheduleFilter } from './trip-map';
import { hideSavedLocation, mergePlaceSelections, removePlaceSelection, savePlaceSelection, usePlaceSelection, usePlaceSelectionStorageStatus, type LocalPlaceSelection } from './place-selection-store';
import { searchGooglePlaces, type PlaceSearchResult } from './google-places';
import styles from './TripMapPage.module.css';

export function TripMapPage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const [scenario, setScenario] = useState<PlanScenario>('success');
  const [filter, setFilter] = useState<LocationScheduleFilter>('ALL');
  const [day, setDay] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [providerPlaces, setProviderPlaces] = useState<readonly LocalPlaceSelection[]>([]);
  const [providerState, setProviderState] = useState<'idle' | 'loading' | 'ready' | 'unavailable' | 'error'>('idle');
  const [providerLoadingMore, setProviderLoadingMore] = useState(false);
  const [providerHasMore, setProviderHasMore] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [mutationId, setMutationId] = useState<string | null>(null);
  const providerSessionRef = useRef<NonNullable<PlaceSearchResult['loadMore']> | null>(null);
  const providerRequestRef = useRef(0);
  const placeListRef = useRef<HTMLUListElement>(null);
  const snapshot = useTripPlanSnapshot(tripId, scenario);
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  const dataReady = snapshot.state.status === 'ready';
  const sourcePlan = data?.plan ?? null;
  const userId = data?.trip.currentMembership.userId ?? '';
  const localSelection = usePlaceSelection(userId, tripId);
  const storageStatus = usePlaceSelectionStorageStatus(userId, tripId);
  const days = data ? planDays(data.trip.startAt, data.trip.endAt, data.trip.timezone) : [];
  const selectedLocations = useMemo(
    () => sourcePlan ? mergePlaceSelections(sourcePlan.selectedLocations, sourcePlan.activities, localSelection) : [],
    [sourcePlan, localSelection],
  );
  const planDraft = usePlanDraft({
    userId,
    tripId,
    plan: sourcePlan,
    locations: selectedLocations,
    timezone: data?.trip.timezone ?? 'UTC',
  });
  const effectiveActivities = data ? planDraft.activities : [];
  const discoveryLocations = data?.plan.selectedLocations ?? selectedLocations;
  const discoveryCenter = useMemo(
    () => placeDiscoveryCenter(discoveryLocations),
    [discoveryLocations],
  );
  const discoveryCenterKey = discoveryCenter
    ? `${discoveryCenter.latitude.toFixed(5)}:${discoveryCenter.longitude.toFixed(5)}`
    : 'none';

  const allItems = useMemo(() => {
    if (!data) return [];
    const selectedItems = mapLocationPresentations(selectedLocations, effectiveActivities, true);
    const selectedKeys = new Set(selectedLocations.map((location) => `${location.provider ?? ''}:${location.providerPlaceId ?? location.id}`));
    const candidates = providerPlaces.filter((place) => !selectedKeys.has(`google:${place.providerPlaceId}`)).map((place) => ({ ...mapLocationPresentations([place], effectiveActivities, false)[0]!, markerNumber: 0 }));
    return sortPlacePresentations([...selectedItems, ...candidates]);
  }, [data, effectiveActivities, providerPlaces, selectedLocations]);

  useEffect(() => {
    if (!data) {
      setProviderPlaces([]);
      setProviderState('idle');
      setProviderHasMore(false);
      setProviderLoadingMore(false);
      providerSessionRef.current = null;
      return;
    }
    const text = query.trim();
    if (text.length === 1) {
      providerRequestRef.current += 1;
      setProviderPlaces([]);
      setProviderState('idle');
      setProviderHasMore(false);
      setProviderLoadingMore(false);
      providerSessionRef.current = null;
      return;
    }
    const controller = new AbortController();
    const requestId = providerRequestRef.current + 1;
    providerRequestRef.current = requestId;
    setProviderPlaces([]);
    setProviderState('loading');
    setProviderHasMore(false);
    setProviderLoadingMore(false);
    providerSessionRef.current = null;
    const timer = window.setTimeout(() => {
      void searchGooglePlaces(text, tripId, controller.signal, discoveryCenter).then((result) => {
        if (requestId !== providerRequestRef.current) return;
        setProviderPlaces(result.unavailable ? [] : result.places);
        providerSessionRef.current = result.loadMore ?? null;
        setProviderHasMore(result.hasMore);
        setProviderState(result.unavailable ? 'unavailable' : 'ready');
      }).catch(() => {
        if (!controller.signal.aborted && requestId === providerRequestRef.current) {
          setProviderPlaces([]);
          providerSessionRef.current = null;
          setProviderHasMore(false);
          setProviderState('error');
        }
      });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [dataReady, discoveryCenterKey, query, tripId]);

  const loadMoreProviderPlaces = () => {
    const loadMore = providerSessionRef.current;
    if (!loadMore || providerLoadingMore || !providerHasMore) return;
    const requestId = providerRequestRef.current;
    setProviderLoadingMore(true);
    void loadMore().then((result) => {
      if (requestId !== providerRequestRef.current) return;
      setProviderPlaces((current) => {
        const seen = new Set(current.map((place) => place.providerPlaceId));
        return [...current, ...result.places.filter((place) => !seen.has(place.providerPlaceId))];
      });
      providerSessionRef.current = result.loadMore ?? null;
      setProviderHasMore(result.hasMore);
    }).catch(() => {
      if (requestId === providerRequestRef.current) setProviderState('error');
    }).finally(() => {
      if (requestId === providerRequestRef.current) setProviderLoadingMore(false);
    });
  };

  const visibleItems = useMemo(() => {
    if (!data) return [];
    const normalizedQuery = normalizedPlaceText(query.trim());
    return allItems.filter((item) => {
      const status = placeStatus(item);
      if (filter === 'SELECTED' && !item.selected) return false;
      if (filter === 'SCHEDULED' && status !== 'IN_SCHEDULE') return false;
      if (filter === 'UNSCHEDULED' && status !== 'SELECTED_UNSCHEDULED') return false;
      if (day !== null && status === 'IN_SCHEDULE' && !item.activities.some((activity) => {
        const scheduledDate = 'scheduledDate' in activity ? activity.scheduledDate : null;
        return scheduledDate === day || Boolean(activity.startsAt && new Date(activity.startsAt).toLocaleDateString('en-CA', { timeZone: data.trip.timezone }) === day);
      })) return false;
      return !normalizedQuery || normalizedPlaceText(`${item.location.name} ${item.location.address ?? ''}`).includes(normalizedQuery);
    });
  }, [allItems, data, day, filter, query]);

  const mapItems = visibleItems.filter((item) => item.selected);
  const defaultLocationId = mapItems[2]?.location.id ?? mapItems[0]?.location.id ?? null;
  const effectiveSelectedId = selectedLocationId ?? defaultLocationId;
  const selectedItem = visibleItems.find((item) => item.location.id === effectiveSelectedId) ?? null;
  const scheduledCount = allItems.filter((item) => placeStatus(item) === 'IN_SCHEDULE').length;
  const unscheduledCount = allItems.filter((item) => placeStatus(item) === 'SELECTED_UNSCHEDULED').length;
  const selectedCount = allItems.filter((item) => item.selected).length;

  useEffect(() => {
    if (selectedLocationId && !visibleItems.some((item) => item.location.id === selectedLocationId)) { setSelectedLocationId(null); setDetailOpen(false); }
  }, [selectedLocationId, visibleItems]);

  const chooseLocation = (locationId: string, openDetail = false) => { setSelectedLocationId(locationId); if (openDetail) setDetailOpen(true); };
  const togglePlace = (item: (typeof allItems)[number]) => {
    if (!data || !data.plan.permissions.canEdit || mutationId || item.scheduled) return;
    setMutationId(item.location.id);
    if (item.selected) {
      if ('local' in item.location && item.location.local === true && item.location.providerPlaceId) removePlaceSelection(userId, tripId, item.location.providerPlaceId);
      else hideSavedLocation(userId, tripId, item.location.id);
    } else {
      const place = providerPlaces.find((candidate) => candidate.providerPlaceId === item.location.providerPlaceId);
      if (place) savePlaceSelection(userId, tripId, place);
    }
    window.setTimeout(() => setMutationId(null), 120);
  };

  return <section className={styles.page} data-flow="trip-map-read" data-detail-open={detailOpen || undefined} data-node-id="20:386">
    <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
      {data && <>
        <div className={styles.mapContent}>
          <div className={styles.breadcrumb}>
            <Link to={paths.trips}>Chuyến đi của tôi</Link>
            <span aria-hidden="true">›</span>
            <Link to={paths.trip(tripId)}>{data.trip.name}</Link>
            <span aria-hidden="true">›</span>
            <h1>Bản đồ &amp; địa điểm</h1>
          </div>
          <div className={styles.hero}><TripHero trip={data.trip} compact variant="landscape" /></div>
          <div className={styles.workspace} data-region="map-workspace">
            <section className={styles.placePanel} aria-label="Địa điểm đã lưu" data-region="place-panel">
              <header className={styles.panelHeader}>
                <h2>Tìm kiếm &amp; chọn địa điểm</h2>
                <p>Tìm kiếm mọi địa điểm. Địa điểm đã chọn sẽ được ghim trên bản đồ.</p>
              </header>
              <div className={styles.localNotice} role="status">
                {storageStatus === 'memory'
                  ? 'Không thể lưu vào trình duyệt. Lựa chọn chỉ được giữ trong bộ nhớ của tab này và sẽ mất khi tải lại hoặc đóng tab.'
                  : 'Lựa chọn chỉ được lưu trên thiết bị này, chưa đồng bộ với thành viên khác.'}
              </div>
              <label className={styles.searchBox}>
                <span className={styles.visuallyHidden}>Tìm địa điểm</span>
                <img src={searchIcon} width="18" height="18" alt="" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm địa điểm, quán ăn, điểm tham quan..."
                />
                <img src={pinIcon} width="16" height="16" alt="" />
              </label>
              <div className={styles.desktopFilters} role="group" aria-label="Lọc địa điểm">
                <button className={styles.filterAll} type="button" aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')}>
                  Tất cả
                </button>
                <button className={styles.filterSelected} type="button" aria-pressed={filter === 'SELECTED'} onClick={() => setFilter('SELECTED')}>
                  Đã chọn ({selectedCount})
                </button>
                <button className={styles.filterScheduled} type="button" aria-pressed={filter === 'SCHEDULED'} onClick={() => setFilter('SCHEDULED')}>
                  Trong lịch ({scheduledCount})
                </button>
                <button className={styles.filterUnscheduled} type="button" aria-pressed={filter === 'UNSCHEDULED'} onClick={() => setFilter('UNSCHEDULED')}>
                  Chưa xếp ({unscheduledCount})
                </button>
              </div>
              <div className={styles.mobileFilters}>
                <button className={styles.filterSelected} type="button" aria-pressed={filter === 'SELECTED'} onClick={() => setFilter(filter === 'SELECTED' ? 'ALL' : 'SELECTED')}>
                  Đã chọn · {selectedCount}
                </button>
                <button className={styles.filterScheduled} type="button" aria-pressed={filter === 'SCHEDULED'} onClick={() => setFilter(filter === 'SCHEDULED' ? 'ALL' : 'SCHEDULED')}>
                  Trong lịch · {scheduledCount}
                </button>
                <label className={styles.filterSelect} data-filter={filter}>
                  <span className={styles.visuallyHidden}>Sắp xếp lịch</span>
                  <select aria-label="Sắp xếp lịch" value={filter} onChange={(event) => setFilter(event.target.value as LocationScheduleFilter)}>
                    <option value="ALL">Bộ lọc</option>
                    <option value="SELECTED">Đã chọn</option>
                    <option value="SCHEDULED">Trong lịch trình</option>
                    <option value="UNSCHEDULED">Chưa xếp lịch</option>
                  </select>
                </label>
              </div>
              {providerState === 'loading' && <div className={styles.searchState} role="status">Đang tìm địa điểm...</div>}
              {providerState === 'unavailable' && (
                <div className={styles.searchState} role="status">
                  Google Places chưa khả dụng. Các địa điểm đã lưu vẫn hiển thị.
                </div>
              )}
              {providerState === 'error' && (
                <div className={styles.searchState} role="status">
                  Không thể tải thêm địa điểm từ Google Places. Các địa điểm đã lưu vẫn hiển thị.
                </div>
              )}
              {visibleItems.length ? (
                <ul
                  ref={placeListRef}
                  className={styles.placeList}
                  data-region="place-list"
                  onScroll={(event) => {
                    const list = event.currentTarget;
                    if (list.scrollHeight - list.scrollTop - list.clientHeight < 160) loadMoreProviderPlaces();
                  }}
                >
                  {visibleItems.map((item) => {
                    const focused = item.location.id === effectiveSelectedId;
                    const status = placeStatus(item);
                    const locked = status === 'IN_SCHEDULE' || !data.plan.permissions.canEdit;
                    return (
                      <li key={item.location.id}>
                        <div className={`${styles.placeRow} ${focused ? styles.placeRowActive : ''}`}>
                          <button
                            type="button"
                            className={styles.placeMainButton}
                            aria-pressed={focused}
                            onClick={() => chooseLocation(item.location.id, true)}
                          >
                            {item.selected ? (
                              <span className={`${styles.pinBadge} ${status === 'IN_SCHEDULE' ? styles.pinScheduled : styles.pinUnscheduled}`}>
                                {item.markerNumber}
                              </span>
                            ) : (
                              <span className={styles.unselectedDot} aria-hidden="true" />
                            )}
                            <span className={styles.placeCopy}>
                              <strong>{item.location.name}</strong>
                              <small>
                                {item.activities[0]?.activityType === 'MEAL' ? 'Ẩm thực' : 'Tham quan'} · {item.location.address ?? 'Chưa có địa chỉ'}
                              </small>
                            </span>
                            <span className={`${styles.statusChip} ${status === 'IN_SCHEDULE' ? styles.statusScheduled : status === 'SELECTED_UNSCHEDULED' ? styles.statusUnscheduled : styles.statusUnselected}`}>
                              {status === 'IN_SCHEDULE' ? 'Trong lịch' : status === 'SELECTED_UNSCHEDULED' ? 'Đã chọn · Chưa xếp' : 'Chưa chọn'}
                            </span>
                            <img className={styles.rowChevron} src={chevronIcon} width="22" height="22" alt="" />
                          </button>
                          <label className={styles.checkboxTarget}>
                            <input
                              className={`${styles.placeCheckbox} ${status === 'SELECTED_UNSCHEDULED' ? styles.placeCheckboxUnscheduled : ''}`}
                              type="checkbox"
                              checked={item.selected}
                              disabled={locked || mutationId === item.location.id}
                              onChange={() => togglePlace(item)}
                              aria-label={`${item.selected ? 'Bỏ chọn' : 'Chọn'} ${item.location.name}`}
                            />
                          </label>
                        </div>
                      </li>
                    );
                  })}
                  {providerLoadingMore && <li className={styles.listState} role="status">Đang tải thêm địa điểm...</li>}
                </ul>
              ) : (
                <div className={styles.empty} role="status">
                  <strong>Không có địa điểm phù hợp</strong>
                  <p>Thử từ khóa, ngày hoặc bộ lọc khác.</p>
                </div>
              )}
            </section>
            <section className={styles.mapPanel} aria-labelledby="map-panel-title" data-region="map-panel">
              <div className={styles.mapToolbar}>
                <label className={styles.routeSelector}>
                  <span id="map-panel-title" className={styles.visuallyHidden}>Bản đồ hành trình</span>
                  <select aria-label="Ngày" value={day ?? 'ALL'} onChange={(event) => setDay(event.target.value === 'ALL' ? null : event.target.value)}>
                    <option value="ALL">Hiển thị lịch trình</option>
                    {days.map((value, index) => <option key={value} value={value}>Ngày {index + 1}</option>)}
                  </select>
                </label>
                <div className={styles.mapType} role="group" aria-label="Kiểu bản đồ">
                  <button type="button" aria-pressed={mapType === 'roadmap'} onClick={() => setMapType('roadmap')}>Bản đồ</button>
                  <button type="button" aria-pressed={mapType === 'satellite'} onClick={() => setMapType('satellite')}>Vệ tinh</button>
                </div>
              </div>
              <MapViewport
                items={mapItems}
                selectedLocationId={effectiveSelectedId}
                timezone={data.trip.timezone}
                previewEnabled={previewEnabled}
                mapType={mapType}
                onSelect={(locationId) => chooseLocation(locationId)}
                onOpenDetail={() => setDetailOpen(true)}
              />
            </section>
          </div>
          <CapabilityNote id="map-provider-note">
            <strong>Bản đồ nền chưa được cấu hình</strong>. Bản đồ đang là minh họa Figma trong preview;
            Google Maps sẽ được dùng khi có browser key.
          </CapabilityNote>
        </div>
        <PlaceDetail item={selectedItem} tripId={tripId} timezone={data.trip.timezone} open={detailOpen} onClose={() => setDetailOpen(false)} />
      </>}
    </TripPlanBoundary>
    {previewEnabled && <details className="preview"><summary>Trip Map preview · Dữ liệu minh họa</summary><Select label="Trạng thái dữ liệu" value={scenario} onChange={(event) => setScenario(event.target.value as PlanScenario)}>{planScenarios.map((value) => <option key={value}>{value}</option>)}</Select></details>}
  </section>;
}
