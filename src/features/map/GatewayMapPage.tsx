import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { paths } from '../../app/route-paths';
import { useRuntimeServices } from '../../app/gateway-context';
import { Button } from '../../shared/components/Button';
import { CapabilityNote } from '../../shared/components/CapabilityNote';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Drawer } from '../../shared/components/Drawer';
import { PageBreadcrumb } from '../../shared/components/PageBreadcrumb';
import { ActionMenu } from '../../shared/components/Ui';
import searchIcon from '../../shared/assets/figma/ce7fc.svg';
import pinIcon from '../../shared/assets/figma/8efc8.svg';
import chevronIcon from '../../shared/assets/figma/ad884.svg';
import { MapViewport } from './MapViewport';
import { PlaceDetail } from './PlaceDetail';
import { useWriteScope } from '../../shared/lib/use-write-scope';
import { commandFailure } from '../../shared/lib/command-failure';
import { TripPlanBoundary } from '../plan/components/TripPlanBoundary';
import { useTripPlanSnapshot } from '../plan/hooks/use-trip-plan-snapshot';
import { activityPlanDay, planDays } from '../plan/model/plan-presentation';
import { globalPositionFor } from '../plan/model/plan-placement';
import { TripHero } from '../trips/components/TripHero';
import { GeoapifyMap, type MapCenter, type MapViewportChange } from './GeoapifyMap';
import {
  mapLocationPresentations,
  normalizedPlaceText,
  validCoordinates,
  placeStatus,
  type LocationScheduleFilter,
} from './trip-map';
import { PreparationActions, PreparationStatus } from '../plan/components/PreparationActions';
import { TravelTools } from './TravelTools';
import { RecommendationPanel } from '../plan/components/RecommendationPanel';
import type { RouteResult } from '../plan/model/travel';
import {
  activityTypeLabel,
  centerProvinceCode,
  EXPLORE_LIMIT,
  otherProvinceName,
  EXPLORE_MIN_ZOOM,
  exploreCacheKey,
  LruCache,
  parsePlaceGroup,
  placeDataCredit,
  placeDataset,
  placeActivityType,
  placeSearchParams,
  placeSourceLabel,
  PLACE_GROUPS,
  resultProvenance,
  savedPlaceActivityType,
  savedProvenance,
  validPlaceIntent,
  type DiscoveredPlace,
  type PlaceGroup,
  type PlaceIntent,
  type PlacesFound,
} from './places';
import { PlaceProvenanceLine, PlaceSourceBadges } from './PlaceSourceBadges';
import type { MapLocationPresentation } from './trip-map';
import styles from './TripMapPage.module.css';

const groupEmpty = 'Không có địa điểm thuộc nhóm này trong khu vực';
const groupEmptyHint = 'Phóng nhỏ bản đồ hoặc chọn nhóm khác.';
const zoomInNotice = 'Phóng to để xem địa điểm';

function sourceSummary(found: PlacesFound) {
  const provider =
    found.source.provider === 'WOLFARI+GEOAPIFY'
      ? 'Wolfari + Geoapify'
      : placeSourceLabel(found.source.provider);
  const attribution = [...new Set(found.items.map((p) => p.attribution).filter(Boolean))];
  return `${found.source.stale ? 'Cache cũ · ' : ''}${provider} · ${found.source.fetchedAt ? new Date(found.source.fetchedAt).toLocaleString('vi-VN') : ''}${attribution.length ? ` · ${attribution.join(' · ')}` : ''}`;
}
/** Explore (bbox) state shown under the group chips. */
type ExploreStatus = 'idle' | 'zoom' | 'ready' | 'truncated' | 'error' | 'unsupported';

export function GatewayMapPage() {
  const { tripId = '' } = useParams();
  const snapshot = useTripPlanSnapshot(tripId, 'success');
  if (snapshot.state.status !== 'ready')
    return (
      <section className={styles.page} data-flow="gateway-map-read">
        <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
          {null}
        </TripPlanBoundary>
      </section>
    );
  return (
    <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
      {snapshot.state.status === 'ready' && (
        <MapWorkspace
          key={`${tripId}:${snapshot.state.trip.currentMembership.userId}`}
          snapshot={snapshot}
        />
      )}
    </TripPlanBoundary>
  );
}
function MapWorkspace({ snapshot }: { snapshot: ReturnType<typeof useTripPlanSnapshot> }) {
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  const repo = useRuntimeServices()?.places;
  const tripId = data?.trip.id ?? '';
  const actor = data?.trip.currentMembership.userId ?? '';
  const signal = useWriteScope(`${tripId}:${actor}`);
  const [query, setQuery] = useState('');
  // POI-OVERTURE W11: the group chip lives in the URL so a reload keeps it; no storage.
  const [urlParams, setUrlParams] = useSearchParams();
  const group = parsePlaceGroup(urlParams.get('group'));
  const [searchedGroup, setSearchedGroup] = useState<PlaceGroup | null | undefined>(undefined);
  const [detailOpen, setDetailOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  // W14: start from the Trip's first saved place (in itinerary order); Đà Nẵng otherwise.
  const [center, setCenter] = useState<MapCenter>(() => {
    const plan = data?.plan;
    if (!plan) return { latitude: 16.0544, longitude: 108.2022 };
    const order = [...plan.activities]
      .sort((a, b) => a.position - b.position)
      .map((activity) => activity.selectedLocationId);
    const first = [...plan.selectedLocations]
      .map((location) => ({ location, index: order.indexOf(location.id) }))
      .sort(
        (a, b) =>
          (a.index < 0 ? Number.MAX_SAFE_INTEGER : a.index) -
          (b.index < 0 ? Number.MAX_SAFE_INTEGER : b.index),
      )
      .map(({ location }) => validCoordinates(location))
      .find(Boolean);
    return first ?? { latitude: 16.0544, longitude: 108.2022 };
  });
  const [initialView] = useState(center);
  /** W14: last known province of the map centre (sticky across keyword searches). */
  const [centerProvince, setCenterProvince] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapCenter>();
  const [results, setResults] = useState<DiscoveredPlace[]>([]),
    [selected, setSelected] = useState<string | null>(data?.plan.selectedLocations[0]?.id ?? null);
  const [filter, setFilter] = useState<LocationScheduleFilter>('ALL'),
    [busy, setBusy] = useState(false),
    [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState(''),
    [source, setSource] = useState('');
  const [manual, setManual] = useState({
    name: '',
    address: '',
    latitude: '16.0544',
    longitude: '108.2022',
  });
  const [day, setDay] = useState<string | null>(null);
  // Route drawn from the TravelTools route request (develop: travel route on the map).
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [added, setAdded] = useState<{ day: string; label: string } | null>(null);
  const journalKey = `wolfari:map-command:${actor}:${tripId}`;
  const [journal] = useState(() => {
    try {
      const parsed: unknown = JSON.parse(window.sessionStorage.getItem(journalKey) ?? 'null');
      return {
        pending: validPlaceIntent(parsed, tripId) ? parsed : null,
        blocked: parsed !== null && !validPlaceIntent(parsed, tripId),
      };
    } catch {
      return { pending: null, blocked: true };
    }
  });
  const [pending, setPending] = useState<PlaceIntent | null>(journal.pending);
  const [storageBlocked, setStorageBlocked] = useState(journal.blocked);
  // POI-OVERTURE W12: explore the visible frame when there is no keyword.
  const [viewport, setViewport] = useState<MapViewportChange | null>(null);
  /** Where `results` came from: `query` refits the map once, `chip`/`bbox` keep the frame. */
  const [resultMode, setResultMode] = useState<'none' | 'query' | 'chip' | 'bbox'>('none');
  const [exploreStatus, setExploreStatus] = useState<ExploreStatus>('idle');
  const [dataRelease, setDataRelease] = useState<string | null>(null);
  const exploreCache = useRef(new LruCache<PlacesFound>(30));
  const exploreController = useRef<AbortController | null>(null);
  const exploreUnsupported = useRef(false);
  // `signal` is a new function each render; the effect reads it through a ref.
  const scopeSignal = useRef(signal);
  scopeSignal.current = signal;
  const exploring = !query.trim();
  useEffect(() => {
    if (!repo || !viewport || !exploring || exploreUnsupported.current) return;
    const showFound = (found: PlacesFound) => {
      const middle = {
        latitude: (viewport.bounds.south + viewport.bounds.north) / 2,
        longitude: (viewport.bounds.west + viewport.bounds.east) / 2,
      };
      const province = centerProvinceCode(found.items, middle);
      if (province) setCenterProvince(province);
      setResults(found.items);
      setResultMode('bbox');
      setSearchedGroup(group);
      setDataRelease(found.source.dataRelease ?? null);
      setSource(sourceSummary(found));
      setExploreStatus(found.source.bboxTruncated ? 'truncated' : 'ready');
    };
    const clear = (status: ExploreStatus) => {
      setResults([]);
      setResultMode('bbox');
      setExploreStatus(status);
    };
    const timer = window.setTimeout(() => {
      exploreController.current?.abort();
      if (viewport.zoom < EXPLORE_MIN_ZOOM) return clear('zoom');
      const key = exploreCacheKey(viewport.bounds, group);
      const cached = exploreCache.current.get(key);
      if (cached) return showFound(cached);
      const controller = new AbortController();
      exploreController.current = controller;
      // A newer frame aborts this request; logout/account change aborts the whole scope.
      const current = AbortSignal.any([scopeSignal.current(), controller.signal]);
      repo
        .explore(
          tripId,
          placeSearchParams({
            mode: 'bbox',
            bounds: viewport.bounds,
            group,
            limit: EXPLORE_LIMIT,
          }),
          current,
        )
        .then((outcome) => {
          if (current.aborted) return;
          if (outcome.kind === 'too-large') return clear('zoom');
          if (outcome.kind === 'unsupported') {
            // A backend without bbox support: keep the previous keyword-only behaviour.
            exploreUnsupported.current = true;
            return setExploreStatus('unsupported');
          }
          const found = { items: outcome.items, source: outcome.source };
          exploreCache.current.set(key, found);
          showFound(found);
        })
        .catch(() => {
          if (!current.aborted) setExploreStatus('error');
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [repo, viewport, exploring, group, tripId]);
  useEffect(() => () => exploreController.current?.abort(), []);
  const writing = useRef(false),
    searchSequence = useRef(0);
  const currentPlan = data?.plan;
  const all = useMemo(() => {
    if (!currentPlan) return [];
    const activities = [...currentPlan.activities].sort((a, b) => a.position - b.position);
    const ordered = [
      ...new Set(activities.map((a) => a.selectedLocationId).filter((id): id is string => !!id)),
    ];
    const locations = [...currentPlan.selectedLocations].sort((a, b) => {
      const ai = ordered.indexOf(a.id),
        bi = ordered.indexOf(b.id);
      return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
    });
    return mapLocationPresentations(locations, activities);
  }, [currentPlan]);
  const candidates = results.filter(
    (p) =>
      !all.some(
        (item) =>
          item.location.providerPlaceId === p.id &&
          item.location.provider?.toUpperCase() === p.provider,
      ),
  );
  const resultFor = (item: MapLocationPresentation) =>
    item.selected ? null : (results.find((p) => `result:${p.id}` === item.location.id) ?? null);
  /** Current search result for a row, saved or not (same provider + provider id). */
  const resultOf = (item: MapLocationPresentation) =>
    item.location.source === 'MANUAL'
      ? null
      : (results.find(
          (p) =>
            p.id === item.location.providerPlaceId &&
            p.provider === item.location.provider?.toUpperCase(),
        ) ?? null);
  const provenanceOf = (item: MapLocationPresentation) => {
    const result = resultOf(item);
    return result ? resultProvenance(result) : savedProvenance(item.location);
  };
  const allItems = [
    ...all,
    ...candidates.map((p, index) => ({
      ...mapLocationPresentations(
        [
          {
            id: `result:${p.id}`,
            tripId,
            name: p.name,
            address: p.address,
            latitude: String(p.latitude),
            longitude: String(p.longitude),
            provider: p.provider,
            providerPlaceId: p.id,
            source: 'PROVIDER' as const,
            openingHours: null,
            fetchedAt: null,
            metadata: {},
            planVersion: currentPlan?.planVersion ?? 0,
          },
        ],
        [],
        false,
      )[0]!,
      markerNumber: all.length + index + 1,
    })),
  ];
  const visibleItems = allItems.filter((item) => {
    if (filter === 'SELECTED' && !item.selected) return false;
    if (filter === 'SCHEDULED' && !item.scheduled) return false;
    if (filter === 'UNSCHEDULED' && (!item.selected || item.scheduled)) return false;
    if (
      day &&
      item.scheduled &&
      !item.activities.some(
        (a) =>
          a.scheduledDate === day ||
          (a.startsAt &&
            new Date(a.startsAt).toLocaleDateString('en-CA', {
              timeZone: data?.trip.timezone ?? 'UTC',
            }) === day),
      )
    )
      return false;
    return (
      !item.selected ||
      normalizedPlaceText(`${item.location.name} ${item.location.address ?? ''}`).includes(
        normalizedPlaceText(query),
      )
    );
  });
  // Bbox explore never picks a result for the user; keyword search keeps auto-picking the
  // first result (DoD steps 2-3).
  const autoPickOff = exploring && resultMode === 'bbox';
  const effectiveSelectedId = visibleItems.some((item) => item.location.id === selected)
    ? selected
    : autoPickOff
      ? null
      : (visibleItems[0]?.location.id ?? null);
  const selectedItem =
    visibleItems.find((item) => item.location.id === effectiveSelectedId) ?? null;
  /** The saved Plan location behind the selected row (search results have none). */
  const savedLocation = selectedItem?.selected
    ? (currentPlan?.selectedLocations.find((v) => v.id === selectedItem.location.id) ?? null)
    : null;
  const selectedCount = all.length;
  const scheduledCount = all.filter((item) => item.scheduled).length;
  const unscheduledCount = selectedCount - scheduledCount;
  const points = visibleItems.flatMap((item) => {
    const c = validCoordinates(item.location);
    const result = resultFor(item);
    return c
      ? [
          {
            ...c,
            id: item.location.id,
            name: item.location.name,
            number: item.markerNumber,
            scheduled: item.scheduled,
            // Curated Wolfari pins, saved places and the place the user picked stay single (W12).
            clusterable:
              !!result && placeDataset(result) !== 'golden' && item.location.id !== selected,
            overture: provenanceOf(item).dataset === 'overture',
          },
        ]
      : [];
  });
  const dataCredit = placeDataCredit(results, dataRelease);
  const chooseLocation = (id: string, open = false) => {
    setSelected(id);
    if (open) setDetailOpen(true);
  };
  if (!data) return null;
  const canEdit =
    data.plan.permissions.canEdit &&
    !busy &&
    !pending &&
    !storageBlocked &&
    !snapshot.refreshing &&
    !snapshot.refreshFailed;
  const days = planDays(data.trip.startAt, data.trip.endAt, data.trip.timezone);
  const search = async (
    nearby = false,
    options: { group?: PlaceGroup | null; keepView?: boolean } = {},
  ) => {
    if (!repo) return;
    const category = options.group === undefined ? group : options.group;
    exploreController.current?.abort();
    const current = signal(),
      seq = ++searchSequence.current;
    setSearching(true);
    setNotice('');
    try {
      // No chip = no `category`: the backend serves its default groups (contract §2.1).
      const params = (geocode: boolean) =>
        placeSearchParams({ mode: 'query', query, center, group: category, geocode });
      // Place mode serves the Wolfari catalogue first (geocode mode bypasses it); fall back to
      // Geoapify geocoding only when nothing matched, so address lookups keep working.
      let found = await repo.search(tripId, params(false), current);
      if (!nearby && query.trim() && !found.items.length && !current.aborted)
        found = await repo.search(tripId, params(true), current);
      if (current.aborted || seq !== searchSequence.current) return;
      const province = centerProvinceCode(found.items, center);
      if (province) setCenterProvince(province);
      setResults(found.items);
      setResultMode(options.keepView ? 'chip' : 'query');
      setSearchedGroup(category);
      setDataRelease(found.source.dataRelease ?? null);
      setSelected(found.items[0] ? `result:${found.items[0].id}` : null);
      setSource(sourceSummary(found));
      setNotice(
        found.source.status === 'ERROR'
          ? 'Nguồn địa điểm chưa khả dụng. Kiểm tra cấu hình/quota hoặc thử lại.'
          : found.items.length
            ? 'Đã tải kết quả tìm kiếm.'
            : category
              ? `${groupEmpty}. ${groupEmptyHint}`
              : 'Không có địa điểm phù hợp. Thử từ khóa khác hoặc đặt pin bằng biểu tượng ghim.',
      );
      if (found.items[0] && !nearby && !options.keepView)
        setFocus({ latitude: found.items[0].latitude, longitude: found.items[0].longitude });
    } catch {
      if (!current.aborted) setNotice('Không tải được địa điểm. Danh sách đã lưu vẫn được giữ.');
    } finally {
      if (!current.aborted && seq === searchSequence.current) setSearching(false);
    }
  };
  /** Returns the confirmed receipt, or null when nothing was confirmed. */
  const execute = async (
    intent: PlaceIntent,
    success?: string,
  ): Promise<Record<string, unknown> | null> => {
    if (!repo || writing.current || storageBlocked || !data.plan.permissions.canEdit) return null;
    const current = signal();
    writing.current = true;
    setBusy(true);
    setNotice('');
    setAdded(null);
    try {
      try {
        window.sessionStorage.setItem(journalKey, JSON.stringify(intent));
      } catch {
        setStorageBlocked(true);
        return null;
      }
      setPending(intent);
      const result = await repo.command(intent, current);
      if (current.aborted) return null;
      try {
        window.sessionStorage.removeItem(journalKey);
        setPending(null);
      } catch {
        setStorageBlocked(true);
        return null;
      }
      if (typeof result.location_id === 'string') setSelected(result.location_id);
      setNotice(
        success ??
          (intent.path.includes('/activities')
            ? 'Đã gắn địa điểm vào hoạt động.'
            : intent.method === 'DELETE'
              ? 'Đã bỏ địa điểm đã lưu.'
              : 'Đã lưu địa điểm. Bạn có thể tiếp tục gắn vào hoạt động/ngày.'),
      );
      setManualOpen(false);
      await snapshot.retry();
      return result;
    } catch (error) {
      if (current.aborted) return null;
      const failure = commandFailure(error);
      if (!failure.uncertain) {
        try {
          window.sessionStorage.removeItem(journalKey);
          setPending(null);
        } catch {
          setStorageBlocked(true);
        }
      }
      setNotice(
        failure.uncertain
          ? 'Chưa xác định kết quả. Bấm thử lại cùng thao tác; không tạo thao tác khác.'
          : failure.conflict
            ? 'Dữ liệu đã thay đổi hoặc địa điểm đang được sử dụng. Tải lại, bỏ liên kết trước khi xóa.'
            : 'Không lưu được. Kiểm tra quyền, dữ liệu và cấu hình provider.',
      );
      return null;
    } finally {
      writing.current = false;
      if (!current.aborted) setBusy(false);
    }
  };
  const command = (method: PlaceIntent['method'], suffix: string, body: Record<string, unknown>) =>
    void execute({
      method,
      path: `/api/v1/trips/${tripId}/${suffix}`,
      body: { ...body, expected_plan_version: data.plan.planVersion },
      key: crypto.randomUUID(),
    });
  const chooseGroup = (value: PlaceGroup) => {
    const next = group === value ? null : value;
    setUrlParams(
      (previous) => {
        const params = new URLSearchParams(previous);
        if (next) params.set('group', next);
        else params.delete('group');
        return params;
      },
      { replace: true },
    );
    // Keep the keyword and the map frame; only the category changes.
    if (query.trim()) void search(false, { group: next, keepView: true });
  };
  const togglePlace = (item: (typeof allItems)[number]) => {
    if (!canEdit || item.activities.length) return;
    if (item.selected) command('DELETE', `selected-locations/${item.location.id}`, {});
    else {
      const place = results.find((p) => p.id === item.location.providerPlaceId);
      if (place) command('POST', 'selected-locations', { selection_token: place.token });
    }
  };
  const dayLabel = (value: string) =>
    `Ngày ${days.indexOf(value) + 1} · ${value.slice(8)}/${value.slice(5, 7)}`;
  /**
   * Contract 4.3: save the signed place (skipped when already saved), then create the
   * activity at the end of that day. Each step is one journaled, idempotent command.
   */
  const addToDay = async (item: MapLocationPresentation, target: string) => {
    if (!canEdit || !days.includes(target)) return;
    const label = `Ngày ${days.indexOf(target) + 1}`;
    const place = resultFor(item);
    let locationId = item.selected ? item.location.id : null;
    let version = data.plan.planVersion;
    if (!locationId) {
      if (!place) return;
      const saved = await execute(
        {
          method: 'POST',
          path: `/api/v1/trips/${tripId}/selected-locations`,
          body: { selection_token: place.token, expected_plan_version: version },
          key: crypto.randomUUID(),
        },
        `Đã lưu “${place.name}”. Đang thêm vào ${label}…`,
      );
      if (!saved) return;
      const receipt = saved.version as { plan_version?: unknown } | undefined;
      if (
        typeof saved.location_id !== 'string' ||
        !Number.isInteger(receipt?.plan_version) ||
        Number(receipt?.plan_version) < 1
      ) {
        setNotice(
          `Đã lưu “${place.name}” nhưng chưa xác nhận được phiên bản lịch trình. Chọn địa điểm đã lưu rồi thêm vào ngày lần nữa.`,
        );
        return;
      }
      locationId = saved.location_id;
      version = Number(receipt!.plan_version);
    }
    const ordered = [...data.plan.activities].sort(
      (a, b) => a.position - b.position || a.id.localeCompare(b.id),
    );
    const dayOf = (activity: (typeof ordered)[number]) => {
      const value = activityPlanDay(activity, data.trip.timezone);
      return value === 'POOL' ? null : value;
    };
    const position = globalPositionFor({
      orderedActivities: ordered,
      dayOf,
      targetDay: target,
      targetIndex: ordered.filter((activity) => dayOf(activity) === target).length,
    });
    const created = await execute(
      {
        method: 'POST',
        path: `/api/v1/trips/${tripId}/activities`,
        body: {
          expected_plan_version: version,
          title: item.location.name.slice(0, 255),
          activity_type: place
            ? placeActivityType(place)
            : savedPlaceActivityType(resultOf(item), item.location.metadata),
          selected_location_id: locationId,
          scheduled_date: target,
          position,
        },
        key: crypto.randomUUID(),
      },
      `Đã thêm “${item.location.name}” vào ${label}.`,
    );
    if (created) setAdded({ day: target, label });
  };
  const addToDayMenu = (item: MapLocationPresentation | null) =>
    item && data.plan.permissions.canEdit && (item.selected || resultFor(item)) ? (
      <ActionMenu
        triggerText="Thêm vào ngày…"
        label="Thêm vào ngày…"
        disabled={!canEdit}
        items={days.map((value) => ({
          label: dayLabel(value),
          action: () => void addToDay(item, value),
          disabled: !canEdit,
        }))}
      />
    ) : null;
  return (
    <section
      className={styles.page}
      data-flow="gateway-map-read"
      data-detail-open={detailOpen || undefined}
      data-node-id="20:386"
    >
      <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
        {data && (
          <>
            <div className={styles.mapContent}>
              <PageBreadcrumb
                className={styles.breadcrumb}
                items={[{ label: 'Tổng quan chuyến đi', to: paths.trip(tripId) }]}
                current="Bản đồ địa điểm"
              />
              <div className={styles.hero}>
                <TripHero trip={data.trip} compact variant="landscape" />
              </div>
              <div className={styles.workspace} data-region="map-workspace">
                <section
                  className={styles.placePanel}
                  aria-label="Địa điểm đã lưu"
                  data-region="place-panel"
                >
                  <header className={styles.panelHeader}>
                    <h2>Tìm kiếm &amp; chọn địa điểm</h2>
                  </header>
                  <div className={styles.localNotice} role="status">
                    {storageBlocked
                      ? 'Không thể xác minh nhật ký thao tác. Đã khóa ghi để tránh gửi trùng.'
                      : snapshot.refreshFailed
                        ? 'Chưa tải được bản mới.'
                        : busy
                          ? 'Đang lưu địa điểm…'
                          : notice ||
                            'Địa điểm đã chọn được lưu vào chuyến đi và đồng bộ với thành viên.'}
                    {source && <span> {source}</span>}
                    {added && !busy && (
                      <Link to={`${paths.plan(tripId)}?day=${added.day}`}>
                        Xem lịch trình {added.label}
                      </Link>
                    )}
                    {snapshot.refreshFailed && (
                      <Button onClick={() => void snapshot.retry()}>Tải lại</Button>
                    )}
                    {pending && (
                      <Button
                        disabled={busy || storageBlocked}
                        onClick={() => void execute(pending)}
                      >
                        Thử lại cùng thao tác
                      </Button>
                    )}
                  </div>
                  <PreparationActions
                    module="location"
                    trip={data.trip}
                    plan={data.plan}
                    refresh={snapshot.retry}
                  />
                  <PreparationStatus trip={data.trip} plan={data.plan} refresh={snapshot.retry} />
                  <form
                    className={styles.searchBox}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void search();
                    }}
                  >
                    <span className={styles.visuallyHidden}>Tìm địa điểm</span>
                    <button
                      type="submit"
                      aria-label="Tìm kiếm"
                      disabled={!repo || searching}
                      style={{ border: 0, background: 'none', padding: 0, display: 'flex' }}
                    >
                      <img src={searchIcon} width="18" height="18" alt="" />
                    </button>
                    <input
                      type="search"
                      aria-label="Tìm địa điểm"
                      maxLength={200}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Tìm địa điểm, quán ăn, điểm tham quan..."
                    />
                    <button
                      type="button"
                      aria-label="Đặt pin thủ công"
                      disabled={!canEdit}
                      onClick={() => setManualOpen(true)}
                      style={{ border: 0, background: 'none', padding: 0, display: 'flex' }}
                    >
                      <img src={pinIcon} width="16" height="16" alt="" />
                    </button>
                  </form>
                  <div className={styles.desktopFilters} role="group" aria-label="Lọc địa điểm">
                    <button
                      className={styles.filterAll}
                      type="button"
                      aria-pressed={filter === 'ALL'}
                      onClick={() => setFilter('ALL')}
                    >
                      Tất cả
                    </button>
                    <button
                      className={styles.filterSelected}
                      type="button"
                      aria-pressed={filter === 'SELECTED'}
                      onClick={() => setFilter('SELECTED')}
                    >
                      Đã chọn ({selectedCount})
                    </button>
                    <button
                      className={styles.filterScheduled}
                      type="button"
                      aria-pressed={filter === 'SCHEDULED'}
                      onClick={() => setFilter('SCHEDULED')}
                    >
                      Trong lịch ({scheduledCount})
                    </button>
                    <button
                      className={styles.filterUnscheduled}
                      type="button"
                      aria-pressed={filter === 'UNSCHEDULED'}
                      onClick={() => setFilter('UNSCHEDULED')}
                    >
                      Chưa xếp ({unscheduledCount})
                    </button>
                  </div>
                  <div className={styles.mobileFilters}>
                    <button
                      className={styles.filterSelected}
                      type="button"
                      aria-pressed={filter === 'SELECTED'}
                      onClick={() => setFilter(filter === 'SELECTED' ? 'ALL' : 'SELECTED')}
                    >
                      Đã chọn · {selectedCount}
                    </button>
                    <button
                      className={styles.filterScheduled}
                      type="button"
                      aria-pressed={filter === 'SCHEDULED'}
                      onClick={() => setFilter(filter === 'SCHEDULED' ? 'ALL' : 'SCHEDULED')}
                    >
                      Trong lịch · {scheduledCount}
                    </button>
                    <div className={styles.filterSelect} data-filter={filter}>
                      <Select
                        label="Sắp xếp lịch"
                        labelHidden
                        value={filter}
                        onChange={(event) =>
                          setFilter(event.target.value as LocationScheduleFilter)
                        }
                      >
                        <option value="ALL">Bộ lọc</option>
                        <option value="SELECTED">Đã chọn</option>
                        <option value="SCHEDULED">Trong lịch trình</option>
                        <option value="UNSCHEDULED">Chưa xếp lịch</option>
                      </Select>
                    </div>
                  </div>
                  <div
                    className={`${styles.desktopFilters} ${styles.groupFilters}`}
                    role="group"
                    aria-label="Nhóm địa điểm"
                  >
                    {PLACE_GROUPS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        aria-pressed={group === item.value}
                        onClick={() => chooseGroup(item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  {exploring &&
                    (exploreStatus === 'zoom' ||
                      exploreStatus === 'truncated' ||
                      exploreStatus === 'error') && (
                      <div
                        className={styles.searchState}
                        role="status"
                        data-explore={exploreStatus}
                      >
                        {exploreStatus === 'zoom'
                          ? zoomInNotice
                          : exploreStatus === 'truncated'
                            ? `Đang hiển thị ${EXPLORE_LIMIT} điểm nổi bật, phóng to để xem thêm`
                            : 'Không tải được địa điểm trong khung bản đồ. Danh sách đã lưu vẫn được giữ.'}
                      </div>
                    )}
                  {searching && (
                    <div className={styles.searchState} role="status">
                      Đang tìm địa điểm...
                    </div>
                  )}
                  {visibleItems.length ? (
                    <ul className={styles.placeList} data-region="place-list">
                      {visibleItems.map((item) => {
                        const focused = item.location.id === effectiveSelectedId;
                        const status = placeStatus(item);
                        const locked = item.activities.length > 0 || !canEdit;
                        const provenance = provenanceOf(item);
                        const rowResult = resultOf(item);
                        const otherProvince = rowResult
                          ? otherProvinceName(rowResult, centerProvince)
                          : null;
                        return (
                          <li key={item.location.id}>
                            <div
                              className={`${styles.placeRow} ${focused ? styles.placeRowActive : ''}`}
                            >
                              <button
                                type="button"
                                className={styles.placeMainButton}
                                aria-pressed={focused}
                                onClick={() => chooseLocation(item.location.id, true)}
                              >
                                {item.selected ? (
                                  <span
                                    className={`${styles.pinBadge} ${status === 'IN_SCHEDULE' ? styles.pinScheduled : styles.pinUnscheduled}`}
                                  >
                                    {item.markerNumber}
                                  </span>
                                ) : (
                                  <span className={styles.unselectedDot} aria-hidden="true" />
                                )}
                                <span className={styles.placeCopy}>
                                  <strong>{item.location.name}</strong>
                                  <small>
                                    {item.activities[0]
                                      ? activityTypeLabel(item.activities[0].activityType)
                                      : (provenance.categoryLabel ?? 'Tham quan')}{' '}
                                    · {item.location.address ?? 'Chưa có địa chỉ'}
                                    {otherProvince && (
                                      <span data-province="other"> · {otherProvince}</span>
                                    )}
                                  </small>
                                  {/* Only curated Wolfari pins carry the per-row review flag (W10). */}
                                  <PlaceSourceBadges
                                    dataset={provenance.dataset}
                                    coordVerified={provenance.coordVerified}
                                  />
                                </span>
                                <span
                                  className={`${styles.statusChip} ${status === 'IN_SCHEDULE' ? styles.statusScheduled : status === 'SELECTED_UNSCHEDULED' ? styles.statusUnscheduled : styles.statusUnselected}`}
                                >
                                  {status === 'IN_SCHEDULE'
                                    ? 'Trong lịch'
                                    : status === 'SELECTED_UNSCHEDULED'
                                      ? 'Đã chọn · Chưa xếp'
                                      : 'Chưa chọn'}
                                </span>
                                <img
                                  className={styles.rowChevron}
                                  src={chevronIcon}
                                  width="22"
                                  height="22"
                                  alt=""
                                />
                              </button>
                              <label className={styles.checkboxTarget}>
                                <input
                                  className={`${styles.placeCheckbox} ${status === 'SELECTED_UNSCHEDULED' ? styles.placeCheckboxUnscheduled : ''}`}
                                  type="checkbox"
                                  checked={item.selected}
                                  disabled={locked}
                                  onChange={() => togglePlace(item)}
                                  aria-label={`${item.selected ? 'Bỏ chọn' : 'Chọn'} ${item.location.name}`}
                                />
                              </label>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : exploring && exploreStatus === 'zoom' ? null : (
                    // The "zoom in" status line already explains the empty list.
                    <div className={styles.empty} role="status">
                      {searchedGroup && !results.length ? (
                        <>
                          <strong>{groupEmpty}</strong>
                          <p>{groupEmptyHint}</p>
                        </>
                      ) : (
                        <>
                          <strong>Không có địa điểm phù hợp</strong>
                          <p>Thử từ khóa, ngày hoặc bộ lọc khác.</p>
                        </>
                      )}
                    </div>
                  )}
                  {dataCredit && <p className={styles.dataCredit}>{dataCredit}</p>}
                </section>
                <section
                  className={styles.mapPanel}
                  aria-labelledby="map-panel-title"
                  data-region="map-panel"
                >
                  <div className={styles.mapToolbar}>
                    <div className={styles.routeSelector}>
                      <span id="map-panel-title" className={styles.visuallyHidden}>
                        Bản đồ hành trình
                      </span>
                      <Select
                        label="Ngày"
                        labelHidden
                        value={day ?? 'ALL'}
                        onChange={(event) =>
                          setDay(event.target.value === 'ALL' ? null : event.target.value)
                        }
                      >
                        <option value="ALL">Hiển thị lịch trình</option>
                        {days.map((value, index) => (
                          <option key={value} value={value}>
                            Ngày {index + 1}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className={styles.mapType} role="group" aria-label="Kiểu bản đồ">
                      <button
                        type="button"
                        aria-pressed={true}
                        onClick={() => setNotice('Đang hiển thị bản đồ Geoapify.')}
                      >
                        Bản đồ
                      </button>
                      <button
                        type="button"
                        aria-pressed={false}
                        onClick={() =>
                          setNotice(
                            'Nguồn Geoapify hiện tại chưa cung cấp lớp vệ tinh. Bản đồ đường phố vẫn hoạt động.',
                          )
                        }
                      >
                        Vệ tinh
                      </button>
                    </div>
                  </div>
                  <MapViewport
                    items={visibleItems}
                    selectedLocationId={effectiveSelectedId}
                    timezone={data.trip.timezone}
                    previewEnabled={false}
                    runtimeMap={
                      <GeoapifyMap
                        embedded
                        points={points}
                        selectedId={effectiveSelectedId}
                        onSelect={(id) => chooseLocation(id, true)}
                        onCenter={setCenter}
                        onViewport={setViewport}
                        initialView={initialView}
                        autoFit={resultMode === 'none' || resultMode === 'query'}
                        focus={focus}
                        route={route ? { coordinates: route.geometry, estimated: false } : null}
                        onPin={
                          canEdit
                            ? (p) => {
                                setManual({
                                  ...manual,
                                  latitude: String(p.latitude),
                                  longitude: String(p.longitude),
                                });
                                setManualOpen(true);
                              }
                            : undefined
                        }
                      />
                    }
                    onSearchArea={() =>
                      exploring ? viewport && setViewport({ ...viewport }) : void search(true)
                    }
                    selectedActions={
                      <>
                        {addToDayMenu(selectedItem)}
                        {savedLocation && (
                          <PreparationActions
                            module="location"
                            item={savedLocation}
                            trip={data.trip}
                            plan={data.plan}
                            refresh={snapshot.retry}
                          />
                        )}
                      </>
                    }
                    selectedMeta={
                      selectedItem && (
                        <PlaceProvenanceLine provenance={provenanceOf(selectedItem)} />
                      )
                    }
                    autoSelectFirst={!autoPickOff}
                    selectedPhoto={
                      selectedItem ? (resultOf(selectedItem)?.heroImage ?? null) : null
                    }
                    onSelect={(locationId) => chooseLocation(locationId)}
                    onOpenDetail={() => setDetailOpen(true)}
                  />
                </section>
              </div>
            </div>
            <TravelTools
              trip={data.trip}
              plan={data.plan}
              refresh={snapshot.retry}
              onRoute={setRoute}
            />
            <RecommendationPanel
              type="ROUTE_ORDER"
              trip={data.trip}
              plan={data.plan}
              refresh={snapshot.retry}
            />
            {!data.plan.permissions.canEdit && (
              <CapabilityNote>
                Bạn chỉ có quyền xem địa điểm. Tìm kiếm vẫn dùng được; thêm, bỏ chọn hoặc lưu địa
                điểm chưa khả dụng với tài khoản này.
              </CapabilityNote>
            )}
            <PlaceDetail
              item={selectedItem}
              tripId={tripId}
              timezone={data.trip.timezone}
              open={detailOpen}
              onClose={() => setDetailOpen(false)}
              runtime
              onToggleSelection={() => selectedItem && togglePlace(selectedItem)}
              selectionDisabled={!canEdit || !!selectedItem?.activities.length}
              actions={
                <>
                  {addToDayMenu(selectedItem)}
                  {savedLocation && (
                    <PreparationActions
                      module="location"
                      item={savedLocation}
                      trip={data.trip}
                      plan={data.plan}
                      refresh={snapshot.retry}
                    />
                  )}
                </>
              }
              provenance={selectedItem ? provenanceOf(selectedItem) : null}
              photo={selectedItem ? (resultOf(selectedItem)?.heroImage ?? null) : null}
            />
          </>
        )}
      </TripPlanBoundary>
      <Drawer
        open={manualOpen}
        onDismiss={() => setManualOpen(false)}
        label="Thêm pin thủ công"
        side="right"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canEdit)
              command('POST', 'selected-locations', {
                name: manual.name,
                address: manual.address,
                latitude: Number(manual.latitude),
                longitude: Number(manual.longitude),
              });
          }}
        >
          <h3>Thêm pin thủ công</h3>
          <p>Bấm vào bản đồ hoặc nhập tọa độ. Đây không phải địa điểm được provider xác minh.</p>
          {notice && <p role="status">{notice}</p>}
          {storageBlocked && (
            <p role="alert">Không thể xác minh nhật ký thao tác. Đã khóa ghi để tránh gửi trùng.</p>
          )}
          {pending && (
            <Button disabled={busy || storageBlocked} onClick={() => void execute(pending)}>
              Thử lại cùng thao tác
            </Button>
          )}
          <Input
            label="Tên pin"
            required
            maxLength={255}
            value={manual.name}
            onChange={(e) => setManual({ ...manual, name: e.target.value })}
          />
          <Input
            label="Địa chỉ pin"
            maxLength={1000}
            value={manual.address}
            onChange={(e) => setManual({ ...manual, address: e.target.value })}
          />
          <Input
            label="Vĩ độ"
            type="number"
            required
            min={-90}
            max={90}
            step="any"
            value={manual.latitude}
            onChange={(e) => setManual({ ...manual, latitude: e.target.value })}
          />
          <Input
            label="Kinh độ"
            type="number"
            required
            min={-180}
            max={180}
            step="any"
            value={manual.longitude}
            onChange={(e) => setManual({ ...manual, longitude: e.target.value })}
          />
          <Button type="submit" disabled={!repo || !canEdit}>
            Lưu pin thủ công
          </Button>
        </form>
      </Drawer>
    </section>
  );
}
