import { useEffect, useMemo, useState } from 'react';
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
import { TripHero } from '../trips/components/TripHero';
import { MapViewport } from './MapViewport';
import { PlaceDetail } from './PlaceDetail';
import { mapLocationPresentations, normalizedPlaceText, placeStatus, sortPlacePresentations, type LocationScheduleFilter } from './trip-map';
import { hideSavedLocation, mergePlaceSelections, removePlaceSelection, savePlaceSelection, usePlaceSelection, type LocalPlaceSelection } from './place-selection-store';
import { searchGooglePlaces } from './google-places';
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
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [mutationId, setMutationId] = useState<string | null>(null);
  const snapshot = useTripPlanSnapshot(tripId, scenario);
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  const userId = data?.trip.currentMembership.userId ?? '';
  const localSelection = usePlaceSelection(userId, tripId);
  const days = data ? planDays(data.trip.startAt, data.trip.endAt, data.trip.timezone) : [];

  const allItems = useMemo(() => {
    if (!data) return [];
    const selectedLocations = mergePlaceSelections(data.plan.selectedLocations, data.plan.activities, localSelection);
    const selectedItems = mapLocationPresentations(selectedLocations, data.plan.activities, true);
    const selectedKeys = new Set(selectedLocations.map((location) => `${location.provider ?? ''}:${location.providerPlaceId ?? location.id}`));
    const candidates = providerPlaces.filter((place) => !selectedKeys.has(`google:${place.providerPlaceId}`)).map((place) => ({ ...mapLocationPresentations([place], data.plan.activities, false)[0]!, markerNumber: 0 }));
    return sortPlacePresentations([...selectedItems, ...candidates]);
  }, [data, localSelection, providerPlaces]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2 || !data) { setProviderPlaces([]); setProviderState('idle'); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setProviderState('loading');
      void searchGooglePlaces(text, tripId, controller.signal).then((result) => {
        setProviderPlaces(result.places);
        setProviderState(result.unavailable ? 'unavailable' : 'ready');
      }).catch(() => { if (!controller.signal.aborted) setProviderState('error'); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [data, query, tripId]);

  const visibleItems = useMemo(() => {
    if (!data) return [];
    const normalizedQuery = normalizedPlaceText(query.trim());
    return allItems.filter((item) => {
      const status = placeStatus(item);
      if (filter === 'SELECTED' && !item.selected) return false;
      if (filter === 'SCHEDULED' && status !== 'IN_SCHEDULE') return false;
      if (filter === 'UNSCHEDULED' && status !== 'SELECTED_UNSCHEDULED') return false;
      if (day !== null && status === 'IN_SCHEDULE' && !item.activities.some((activity) => activity.startsAt && new Date(activity.startsAt).toLocaleDateString('en-CA', { timeZone: data.trip.timezone }) === day)) return false;
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
      if (item.location.provider === 'google' && item.location.providerPlaceId) removePlaceSelection(userId, tripId, item.location.providerPlaceId);
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
          <div className={styles.breadcrumb}><Link to={paths.trips}>Chuyáº¿n Ä‘i cá»§a tÃ´i</Link><span aria-hidden="true">â€º</span><Link to={paths.trip(tripId)}>{data.trip.name}</Link><span aria-hidden="true">â€º</span><h1>Báº£n Ä‘á»“ &amp; Ä‘á»‹a Ä‘iá»ƒm</h1></div>
          <div className={styles.hero}><TripHero trip={data.trip} compact variant="landscape" /></div>
          <div className={styles.workspace}>
            <section className={styles.placePanel} aria-label="Địa điểm đã lưu">
              <header className={styles.panelHeader}><h2>TÃ¬m kiáº¿m &amp; chá»n Ä‘á»‹a Ä‘iá»ƒm</h2><p>TÃ¬m kiáº¿m má»i Ä‘á»‹a Ä‘iá»ƒm. Äá»‹a Ä‘iá»ƒm Ä‘Ã£ chá»n sáº½ Ä‘Æ°á»£c ghim trÃªn báº£n Ä‘á»“.</p></header>
              <div className={styles.localNotice} role="status">Lá»±a chá»n chá»‰ Ä‘Æ°á»£c lÆ°u trÃªn thiáº¿t bá»‹ nÃ y, chÆ°a Ä‘á»“ng bá»™ vá»›i thÃ nh viÃªn khÃ¡c.</div>
              <label className={styles.searchBox}><span className={styles.visuallyHidden}>TÃ¬m Ä‘á»‹a Ä‘iá»ƒm</span><img src={searchIcon} width="18" height="18" alt="" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="TÃ¬m Ä‘á»‹a Ä‘iá»ƒm, quÃ¡n Äƒn, Ä‘iá»ƒm tham quan..." /><img src={pinIcon} width="16" height="16" alt="" /></label>
              <div className={styles.desktopFilters} role="group" aria-label="Lá»c Ä‘á»‹a Ä‘iá»ƒm"><button type="button" aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')}>Táº¥t cáº£</button><button type="button" aria-pressed={filter === 'SELECTED'} onClick={() => setFilter('SELECTED')}>ÄÃ£ chá»n ({selectedCount})</button><button type="button" aria-pressed={filter === 'SCHEDULED'} onClick={() => setFilter('SCHEDULED')}>Trong lá»‹ch ({scheduledCount})</button><button type="button" aria-pressed={filter === 'UNSCHEDULED'} onClick={() => setFilter('UNSCHEDULED')}>ChÆ°a xáº¿p ({unscheduledCount})</button></div>
              <div className={styles.mobileFilters}><button type="button" aria-pressed={filter === 'SELECTED'} onClick={() => setFilter(filter === 'SELECTED' ? 'ALL' : 'SELECTED')}>ÄÃ£ chá»n Â· {selectedCount}</button><button type="button" aria-pressed={filter === 'SCHEDULED'} onClick={() => setFilter(filter === 'SCHEDULED' ? 'ALL' : 'SCHEDULED')}>Trong lá»‹ch Â· {scheduledCount}</button><label><span className={styles.visuallyHidden}>Sáº¯p xáº¿p lá»‹ch</span><select aria-label="Sáº¯p xáº¿p lá»‹ch" value={filter} onChange={(event) => setFilter(event.target.value as LocationScheduleFilter)}><option value="ALL">Bá»™ lá»c</option><option value="SELECTED">ÄÃ£ chá»n</option><option value="SCHEDULED">Trong lá»‹ch trÃ¬nh</option><option value="UNSCHEDULED">ChÆ°a xáº¿p lá»‹ch</option></select></label></div>
              {providerState === 'loading' && <div className={styles.searchState} role="status">Äang tÃ¬m Ä‘á»‹a Ä‘iá»ƒm...</div>}
              {providerState === 'unavailable' && query.trim().length >= 2 && <div className={styles.searchState} role="status">Google Places chÆ°a kháº£ dá»¥ng. CÃ¡c Ä‘á»‹a Ä‘iá»ƒm Ä‘Ã£ lÆ°u váº«n hiá»ƒn thá»‹.</div>}
              {visibleItems.length ? <ul className={styles.placeList}>{visibleItems.map((item) => { const focused = item.location.id === effectiveSelectedId; const status = placeStatus(item); const locked = status === 'IN_SCHEDULE' || !data.plan.permissions.canEdit; return <li key={item.location.id}><div className={`${styles.placeRow} ${focused ? styles.placeRowActive : ''}`}><button type="button" className={styles.placeMainButton} aria-pressed={focused} onClick={() => chooseLocation(item.location.id, true)}>{item.selected ? <span className={`${styles.pinBadge} ${status === 'IN_SCHEDULE' ? styles.pinScheduled : styles.pinUnscheduled}`}>{item.markerNumber}</span> : <span className={styles.unselectedDot} aria-hidden="true" />}<span className={styles.placeCopy}><strong>{item.location.name}</strong><small>{item.activities[0]?.activityType === 'MEAL' ? 'áº¨m thá»±c' : 'Tham quan'} Â· {item.location.address ?? 'ChÆ°a cÃ³ Ä‘á»‹a chá»‰'}</small></span><span className={`${styles.statusChip} ${status === 'IN_SCHEDULE' ? styles.statusScheduled : status === 'SELECTED_UNSCHEDULED' ? styles.statusUnscheduled : styles.statusUnselected}`}>{status === 'IN_SCHEDULE' ? 'Trong lá»‹ch' : status === 'SELECTED_UNSCHEDULED' ? 'ÄÃ£ chá»n Â· ChÆ°a xáº¿p' : 'ChÆ°a chá»n'}</span><img className={styles.rowChevron} src={chevronIcon} width="22" height="22" alt="" /></button><input className={styles.placeCheckbox} type="checkbox" checked={item.selected} disabled={locked || mutationId === item.location.id} onChange={() => togglePlace(item)} aria-label={`${item.selected ? 'Bá» chá»n' : 'Chá»n'} ${item.location.name}`} /></div></li>; })}</ul> : <div className={styles.empty} role="status"><strong>KhÃ´ng cÃ³ Ä‘á»‹a Ä‘iá»ƒm phÃ¹ há»£p</strong><p>Thá»­ tá»« khÃ³a, ngÃ y hoáº·c bá»™ lá»c khÃ¡c.</p></div>}
            </section>
            <section className={styles.mapPanel} aria-labelledby="map-panel-title"><div className={styles.mapToolbar}><label className={styles.routeSelector}><span id="map-panel-title" className={styles.visuallyHidden}>Báº£n Ä‘á»“ hÃ nh trÃ¬nh</span><select aria-label="NgÃ y" value={day ?? 'ALL'} onChange={(event) => setDay(event.target.value === 'ALL' ? null : event.target.value)}><option value="ALL">Hiá»ƒn thá»‹ lá»‹ch trÃ¬nh</option>{days.map((value, index) => <option key={value} value={value}>NgÃ y {index + 1}</option>)}</select></label><div className={styles.mapType} role="group" aria-label="Kiá»ƒu báº£n Ä‘á»“"><button type="button" aria-pressed={mapType === 'roadmap'} onClick={() => setMapType('roadmap')}>Báº£n Ä‘á»“</button><button type="button" aria-pressed={mapType === 'satellite'} onClick={() => setMapType('satellite')}>Vá»‡ tinh</button></div></div><MapViewport items={mapItems} selectedLocationId={effectiveSelectedId} timezone={data.trip.timezone} previewEnabled={previewEnabled} mapType={mapType} onSelect={(locationId) => chooseLocation(locationId)} onOpenDetail={() => setDetailOpen(true)} /></section>
          </div>
          <CapabilityNote id="map-provider-note"><strong>Báº£n Ä‘á»“ ná»n chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh</strong>. Báº£n Ä‘á»“ Ä‘ang lÃ  minh há»a Figma trong preview; Google Maps sáº½ Ä‘Æ°á»£c dÃ¹ng khi cÃ³ browser key.</CapabilityNote>
        </div>
        <PlaceDetail item={selectedItem} tripId={tripId} timezone={data.trip.timezone} open={detailOpen} onClose={() => setDetailOpen(false)} />
      </>}
    </TripPlanBoundary>
    {previewEnabled && <details className="preview"><summary>Trip Map preview Â· Dá»¯ liá»‡u minh há»a</summary><Select label="Tráº¡ng thÃ¡i dá»¯ liá»‡u" value={scenario} onChange={(event) => setScenario(event.target.value as PlanScenario)}>{planScenarios.map((value) => <option key={value}>{value}</option>)}</Select></details>}
  </section>;
}
