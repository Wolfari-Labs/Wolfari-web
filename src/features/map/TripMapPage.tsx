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
import {
  mapLocationPresentations,
  selectMapLocations,
  type LocationScheduleFilter,
} from './trip-map';
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
  const snapshot = useTripPlanSnapshot(tripId, scenario);
  const data = snapshot.state.status === 'ready' ? snapshot.state : null;
  const days = data
    ? planDays(data.trip.startAt, data.trip.endAt, data.trip.timezone)
    : [];
  const allItems = useMemo(
    () =>
      data
        ? mapLocationPresentations(data.plan.selectedLocations, data.plan.activities)
        : [],
    [data],
  );
  const visibleItems = useMemo(() => {
    if (!data) return [];
    const visibleLocationIds = new Set(
      selectMapLocations({
        locations: data.plan.selectedLocations,
        activities: data.plan.activities,
        filter,
        day,
        timezone: data.trip.timezone,
        query,
      }).map((location) => location.id),
    );
    return allItems.filter((item) => visibleLocationIds.has(item.location.id));
  }, [allItems, data, day, filter, query]);
  const defaultLocationId = visibleItems[2]?.location.id ?? visibleItems[0]?.location.id ?? null;
  const effectiveSelectedId = selectedLocationId ?? defaultLocationId;
  const selectedItem =
    visibleItems.find((item) => item.location.id === effectiveSelectedId) ?? null;
  const scheduledCount = allItems.filter((item) => item.scheduled).length;
  const unscheduledCount = allItems.length - scheduledCount;

  useEffect(() => {
    if (
      selectedLocationId &&
      !visibleItems.some((item) => item.location.id === selectedLocationId)
    ) {
      setSelectedLocationId(null);
      setDetailOpen(false);
    }
  }, [selectedLocationId, visibleItems]);

  const chooseLocation = (locationId: string, openDetail = false) => {
    setSelectedLocationId(locationId);
    if (openDetail) setDetailOpen(true);
  };

  return (
    <section
      className={styles.page}
      data-flow="trip-map-read"
      data-detail-open={detailOpen || undefined}
      data-node-id="20:386"
    >
      <TripPlanBoundary state={snapshot.state} onRetry={snapshot.retry}>
        {data && (
          <>
            <div className={styles.mapContent}>
              <div className={styles.breadcrumb}>
                <Link to={paths.trips}>Chuyến đi của tôi</Link>
                <span aria-hidden="true">›</span>
                <Link to={paths.trip(tripId)}>{data.trip.name}</Link>
                <span aria-hidden="true">›</span>
                <h1>Bản đồ &amp; địa điểm</h1>
              </div>

              <div className={styles.hero}>
                <TripHero trip={data.trip} compact variant="landscape" />
              </div>

              <div className={styles.workspace}>
                <section className={styles.placePanel} aria-label="Địa điểm đã lưu">
                  <header className={styles.panelHeader}>
                    <h2>Tìm kiếm &amp; chọn địa điểm</h2>
                    <p>
                      Tìm trong địa điểm đã lưu. Địa điểm có tọa độ sẽ được ghim trên bản đồ.
                    </p>
                  </header>

                  <label className={styles.searchBox}>
                    <span className={styles.visuallyHidden}>Tìm địa điểm</span>
                    <img src={searchIcon} width="18.3333" height="18.3333" alt="" />
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Tìm địa điểm, quán ăn, điểm tham quan..."
                    />
                    <img src={pinIcon} width="16.5" height="16.5" alt="" />
                  </label>

                  <div className={styles.desktopFilters} role="group" aria-label="Lọc địa điểm">
                    <button
                      type="button"
                      aria-pressed={filter === 'ALL'}
                      onClick={() => setFilter('ALL')}
                    >
                      Tất cả
                    </button>
                    <span>Đã chọn ({allItems.length})</span>
                    <button
                      type="button"
                      aria-pressed={filter === 'SCHEDULED'}
                      onClick={() => setFilter('SCHEDULED')}
                    >
                      Trong lịch ({scheduledCount})
                    </button>
                    <button
                      type="button"
                      aria-pressed={filter === 'UNSCHEDULED'}
                      onClick={() => setFilter('UNSCHEDULED')}
                    >
                      Chưa xếp ({unscheduledCount})
                    </button>
                  </div>

                  <div className={styles.mobileFilters}>
                    <span>Đã chọn · {allItems.length}</span>
                    <button
                      type="button"
                      aria-pressed={filter === 'SCHEDULED'}
                      onClick={() =>
                        setFilter((current) => current === 'SCHEDULED' ? 'ALL' : 'SCHEDULED')
                      }
                    >
                      Trong lịch · {scheduledCount}
                    </button>
                    <label>
                      <span className={styles.visuallyHidden}>Sắp xếp lịch</span>
                      <select
                        aria-label="Sắp xếp lịch"
                        value={filter}
                        onChange={(event) =>
                          setFilter(event.target.value as LocationScheduleFilter)
                        }
                      >
                        <option value="ALL">Bộ lọc</option>
                        <option value="SCHEDULED">Trong lịch trình</option>
                        <option value="UNSCHEDULED">Chưa xếp lịch</option>
                      </select>
                    </label>
                  </div>

                  {visibleItems.length ? (
                    <ul className={styles.placeList}>
                      {visibleItems.map((item) => {
                        const selected = item.location.id === effectiveSelectedId;
                        return (
                          <li key={item.location.id}>
                            <button
                              type="button"
                              className={styles.placeRow}
                              aria-pressed={selected}
                              onClick={() => chooseLocation(item.location.id, true)}
                            >
                              <span
                                className={`${styles.pinBadge} ${
                                  item.scheduled ? styles.pinScheduled : styles.pinUnscheduled
                                }`}
                              >
                                {item.markerNumber}
                              </span>
                              <span className={styles.placeCopy}>
                                <strong>{item.location.name}</strong>
                                <small>
                                  {item.activities[0]?.activityType === 'MEAL'
                                    ? 'Ẩm thực'
                                    : 'Tham quan'} · {item.location.address ?? 'Chưa có địa chỉ'}
                                </small>
                              </span>
                              <span
                                className={`${styles.statusChip} ${
                                  item.scheduled ? styles.statusScheduled : styles.statusUnscheduled
                                }`}
                              >
                                {item.scheduled ? 'Trong lịch' : 'Đã chọn · Chưa xếp'}
                              </span>
                              <img
                                className={styles.rowChevron}
                                src={chevronIcon}
                                width="22"
                                height="22"
                                alt=""
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className={styles.empty} role="status">
                      <strong>Không có địa điểm phù hợp</strong>
                      <p>Thử từ khóa, ngày hoặc bộ lọc khác.</p>
                    </div>
                  )}
                </section>

                <section className={styles.mapPanel} aria-labelledby="map-panel-title">
                  <div className={styles.mapToolbar}>
                    <label className={styles.routeSelector}>
                      <span id="map-panel-title" className={styles.visuallyHidden}>Bản đồ hành trình</span>
                      <select
                        aria-label="Ngày"
                        value={day ?? 'ALL'}
                        onChange={(event) =>
                          setDay(event.target.value === 'ALL' ? null : event.target.value)
                        }
                      >
                        <option value="ALL">Hiển thị lịch trình</option>
                        {days.map((value, index) => (
                          <option key={value} value={value}>Ngày {index + 1}</option>
                        ))}
                      </select>
                    </label>
                    <div className={styles.mapType} role="group" aria-label="Kiểu bản đồ">
                      <button type="button" aria-pressed="true">Bản đồ</button>
                      <button type="button" disabled title="Vệ tinh chưa khả dụng">Vệ tinh</button>
                    </div>
                  </div>
                  <MapViewport
                    items={visibleItems}
                    selectedLocationId={effectiveSelectedId}
                    timezone={data.trip.timezone}
                    previewEnabled={previewEnabled}
                    onSelect={(locationId) => chooseLocation(locationId)}
                    onOpenDetail={() => setDetailOpen(true)}
                  />
                </section>
              </div>

              <CapabilityNote id="map-provider-note">
                <strong>Bản đồ nền chưa được cấu hình</strong>. Bản đồ đang là minh họa Figma
                trong preview; tìm kiếm nhà cung cấp, lưu/xóa và tính tuyến đường chưa khả dụng.
              </CapabilityNote>
            </div>

            <PlaceDetail
              item={selectedItem}
              tripId={tripId}
              timezone={data.trip.timezone}
              open={detailOpen}
              onClose={() => setDetailOpen(false)}
            />
          </>
        )}
      </TripPlanBoundary>

      {previewEnabled && (
        <details className="preview">
          <summary>Trip Map preview · Dữ liệu minh họa</summary>
          <Select
            label="Trạng thái dữ liệu"
            value={scenario}
            onChange={(event) => setScenario(event.target.value as PlanScenario)}
          >
            {planScenarios.map((value) => <option key={value}>{value}</option>)}
          </Select>
        </details>
      )}
    </section>
  );
}
