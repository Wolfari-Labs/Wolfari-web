import { useState } from 'react';
import { useTripList } from './hooks/use-trip-list';
import { tripListScenarios, type TripListScenario } from './model/trip-list';
import {
  initialTripFilter,
  selectTrips,
  type TripListFilter,
  type TripStatusFilter,
} from './model/trip-list-query';
import { TripListHero } from './components/TripListHero';
import { TripCard } from './components/TripCard';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Button } from '../../shared/components/Button';
import { ContentState } from '../../shared/components/ContentState';
import { uiAssets } from '../../shared/assets/asset-map';
import roleIcon from '../../shared/assets/figma/2fa29.svg';
import timeIcon from '../../shared/assets/figma/40d4c.svg';
import filterIcon from '../../shared/assets/figma/40418.svg';
import styles from './TripListPage.module.css';

const statuses: readonly { value: TripStatusFilter; label: string; mobileLabel: string }[] = [
  { value: 'ALL', label: 'Tất cả', mobileLabel: 'Tất cả' },
  { value: 'UPCOMING', label: 'Sắp tới', mobileLabel: 'Sắp tới' },
  { value: 'ONGOING', label: 'Đang diễn ra', mobileLabel: 'Đang đi' },
  { value: 'COMPLETED', label: 'Đã kết thúc', mobileLabel: 'Đã đi' },
  { value: 'ARCHIVED', label: 'Đã lưu trữ', mobileLabel: 'Lưu trữ' },
];

export function TripListPage({ previewEnabled = false }: { previewEnabled?: boolean }) {
  const [scenario, setScenario] = useState<TripListScenario>('success');
  const [filter, setFilter] = useState<TripListFilter>(initialTripFilter);
  const [controlsOpen, setControlsOpen] = useState(false);
  const query = useTripList(scenario);
  const result = query.data;
  const model = result?.status === 'ready' ? result.data : null;
  const { visible, counts } = selectTrips(model?.items ?? [], filter);
  const retry = () => {
    void query.refetch();
  };
  const readError = query.isError
    ? { code: 'SERVICE_UNAVAILABLE' as const, correlationId: null, retryable: true }
    : result?.status === 'error'
      ? result.error
      : null;
  const readSucceeded = result?.status === 'ready' || result?.status === 'empty';
  return (
    <section className={styles.page} aria-label="Danh sách chuyến đi">
      <TripListHero />
      <div className={styles.content}>
        <button
          className={styles.mobileControlsToggle}
          aria-expanded={controlsOpen}
          aria-controls="trip-list-search trip-list-sort"
          onClick={() => setControlsOpen((open) => !open)}
        >
          <img src={uiAssets.search} alt="" />
          Tìm kiếm và sắp xếp <span aria-hidden="true">{controlsOpen ? '−' : '+'}</span>
        </button>
        <div
          id="trip-list-search"
          className={`${styles.searchControls} ${controlsOpen ? styles.controlsOpen : ''}`}
        >
          <div className={styles.search}>
            <Input
              label="Tìm chuyến đi theo tên"
              type="search"
              placeholder="Tìm theo tên chuyến đi"
              value={filter.name}
              onChange={(event) => setFilter({ ...filter, name: event.target.value })}
              leadingIcon={<img src={uiAssets.search} alt="" />}
            />
          </div>
          <div className={styles.unavailableFilters}>
            <button disabled title="Lọc vai trò chưa có interaction contract">
              <img src={roleIcon} alt="" />
              Vai trò: Tất cả<span aria-hidden="true">⌄</span>
            </button>
            <button disabled title="Lọc thời gian chưa có interaction contract">
              <img src={timeIcon} alt="" />
              Thời gian<span aria-hidden="true">⌄</span>
            </button>
            <button disabled title="Bộ lọc nâng cao chưa có interaction contract">
              <img src={filterIcon} alt="" />
              Bộ lọc
            </button>
          </div>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.statuses} role="group" aria-label="Trạng thái chuyến đi">
            {statuses.map((status) => (
              <button
                key={status.value}
                aria-pressed={filter.status === status.value}
                aria-label={`${status.label}${readSucceeded ? ` · ${counts[status.value]}` : ''}${status.mobileLabel !== status.label ? ` (${status.mobileLabel})` : ''}`}
                onClick={() => setFilter({ ...filter, status: status.value })}
              >
                <span className={styles.desktopLabel}>{status.label}</span>
                <span className={styles.mobileLabel}>{status.mobileLabel}</span>
                {readSucceeded && <span className={styles.count}>{counts[status.value]}</span>}
              </button>
            ))}
          </div>
          <div
            id="trip-list-sort"
            className={`${styles.sort} ${controlsOpen ? styles.controlsOpen : ''}`}
          >
            <Select
              label="Sắp xếp chuyến đi"
              value={filter.sort}
              onChange={(event) => {
                const sort = event.target.value;
                if (sort === 'listed' || sort === 'start-asc' || sort === 'start-desc')
                  setFilter({ ...filter, sort });
              }}
            >
              <option value="listed">Sắp xếp: Mặc định</option>
              <option value="start-asc">Ngày khởi hành: Tăng dần</option>
              <option value="start-desc">Ngày khởi hành: Giảm dần</option>
            </Select>
          </div>
        </div>
        {query.isPending ? (
          <ContentState state="loading" headingLevel={2} />
        ) : readError ? (
          <ContentState
            state={
              readError.code === 'SERVICE_UNAVAILABLE' && !readError.retryable
                ? 'unavailable'
                : 'error'
            }
            error={readError}
            onRetry={retry}
            headingLevel={2}
          />
        ) : visible.length === 0 ? (
          <section className={styles.empty} role="status">
            <h2>{counts.ALL === 0 ? 'Chưa có chuyến đi' : 'Không có chuyến đi phù hợp'}</h2>
            <p>
              {counts.ALL === 0
                ? 'Những hành trình bạn có quyền xem sẽ xuất hiện tại đây.'
                : 'Thử một tên hoặc trạng thái khác để tìm hành trình của bạn.'}
            </p>
            {(filter.name !== '' || filter.status !== 'ALL' || filter.sort !== 'listed') && (
              <Button variant="outline" onClick={() => setFilter(initialTripFilter)}>
                Xóa bộ lọc
              </Button>
            )}
          </section>
        ) : (
          <>
            <p className={styles.srOnly} role="status">
              {visible.length} chuyến đi đang hiển thị
            </p>
            <div className={styles.grid}>
              {visible.map((trip, index) => (
                <TripCard key={trip.id} trip={trip} featured={index === 0} />
              ))}
            </div>
          </>
        )}
        {model?.nextCursor && (
          <p role="status">Danh sách còn dữ liệu chưa tải. Phân trang chưa khả dụng.</p>
        )}
        <button
          className={styles.mobileCreate}
          disabled
          title="Tạo chuyến đi chưa được triển khai trong flow này"
        >
          + Tạo một hành trình mới
        </button>
        {previewEnabled && (
          <details className={`${styles.preview} preview`} data-preview="trip-list">
            <summary>Trip List preview · Dữ liệu minh họa</summary>
            <Select
              label="Trạng thái danh sách"
              value={scenario}
              onChange={(event) => {
                const next = tripListScenarios.find((item) => item === event.target.value);
                if (next) setScenario(next);
              }}
            >
              {tripListScenarios.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </details>
        )}
      </div>
    </section>
  );
}
