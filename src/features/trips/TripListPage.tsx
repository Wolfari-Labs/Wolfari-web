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
import { Icon } from '../../shared/components/Icon';
import { ContentState } from '../../shared/components/ContentState';
import { Alert } from '../../shared/components/Alert';
import { uiAssets } from '../../shared/assets/asset-map';
import roleIcon from '../../shared/assets/figma/2fa29.svg';
import timeIcon from '../../shared/assets/figma/40d4c.svg';
import filterIcon from '../../shared/assets/figma/40418.svg';
import styles from './TripListPage.module.css';
import { Link } from 'react-router';
import { paths } from '../../app/route-paths';
import type { DomainError } from '../../shared/types/result';

const statuses: readonly { value: TripStatusFilter; label: string; mobileLabel: string }[] = [
  { value: 'ALL', label: 'Tất cả', mobileLabel: 'Tất cả' },
  { value: 'UPCOMING', label: 'Sắp tới', mobileLabel: 'Sắp tới' },
  { value: 'ONGOING', label: 'Đang diễn ra', mobileLabel: 'Đang đi' },
  { value: 'COMPLETED', label: 'Đã kết thúc', mobileLabel: 'Đã đi' },
  { value: 'ARCHIVED', label: 'Đã lưu trữ', mobileLabel: 'Lưu trữ' },
];

function queryError(value: unknown): DomainError {
  if (
    value &&
    typeof value === 'object' &&
    'code' in value &&
    'retryable' in value &&
    'correlationId' in value
  ) {
    return value as DomainError;
  }
  return { code: 'SERVICE_UNAVAILABLE', correlationId: null, retryable: true };
}

export function TripListPage({ previewEnabled = false }: { previewEnabled?: boolean }) {
  const [scenario, setScenario] = useState<TripListScenario>('success');
  const [filter, setFilter] = useState<TripListFilter>(initialTripFilter);
  const [controlsOpen, setControlsOpen] = useState(false);
  const query = useTripList(scenario);
  const pages = query.data?.pages ?? [];
  const items = Array.from(
    new Map(pages.flatMap((page) => page.items).map((item) => [item.id, item])).values(),
  );
  const { visible, counts } = selectTrips(items, filter);
  const retry = () => {
    void query.refetch();
  };
  const readError = query.isError && !query.data ? queryError(query.error) : null;
  const nextPageError = query.isFetchNextPageError ? queryError(query.error) : null;
  const refreshError = query.isRefetchError && query.data ? queryError(query.error) : null;
  const readSucceeded = !!query.data;
  const morePages = !!query.hasNextPage;
  return (
    <section className={styles.page} aria-label="Danh sách chuyến đi">
      <div className={styles.pageArt} aria-hidden="true">
        <span className={styles.sideClouds} />
        <span className={styles.watercolorClouds} />
        <span className={styles.cloudPuffs} />
        <span className={styles.foliage}>
          <span />
          <span />
        </span>
        <span className={styles.lowerClouds} />
      </div>
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
          {previewEnabled && (
            <div className={styles.unavailableFilters}>
              <button
                disabled
                title="Lọc theo vai trò chưa khả dụng"
                aria-describedby="trip-filter-capability-note"
              >
                <img src={roleIcon} alt="" />
                Vai trò: Tất cả
                <Icon name="chevron" size={16} />
              </button>
              <button
                disabled
                title="Lọc theo thời gian chưa khả dụng"
                aria-describedby="trip-filter-capability-note"
              >
                <img src={timeIcon} alt="" />
                Thời gian
                <Icon name="chevron" size={16} />
              </button>
              <button
                disabled
                title="Bộ lọc nâng cao chưa khả dụng"
                aria-describedby="trip-filter-capability-note"
              >
                <img src={filterIcon} alt="" />
                Bộ lọc
              </button>
              <span id="trip-filter-capability-note" className={styles.srOnly}>
                Các bộ lọc này hiện chưa khả dụng.
              </span>
            </div>
          )}
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
        {readSucceeded && morePages && (
          <p className={styles.loadedNotice} role="status">
            Đã tải {counts.ALL} chuyến đi có thể xem. Tìm kiếm, trạng thái và sắp xếp chỉ áp dụng
            cho các chuyến đi đã tải; có thể còn chuyến đi khác.
          </p>
        )}
        {refreshError && (
          <div className={styles.refreshError}>
            <Alert tone="error">
              Không thể làm mới danh sách. Các chuyến đi bên dưới là dữ liệu đã tải trước đó.
              {refreshError.correlationId && ` Mã đối chiếu: ${refreshError.correlationId}.`}
            </Alert>
            {refreshError.retryable && (
              <Button variant="outline" onClick={retry}>
                Tải lại danh sách
              </Button>
            )}
          </div>
        )}
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
            <h2>
              {counts.ALL === 0
                ? morePages
                  ? 'Chưa có chuyến đi trong phần đã tải'
                  : 'Chưa có chuyến đi'
                : morePages
                  ? 'Không có chuyến đi phù hợp trong phần đã tải'
                  : 'Không có chuyến đi phù hợp'}
            </h2>
            <p>
              {morePages
                ? 'Tải thêm chuyến đi để kiểm tra các trang còn lại hoặc thay đổi bộ lọc.'
                : counts.ALL === 0
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
        {query.hasNextPage && !nextPageError && (
          <div className={styles.pagination}>
            <Button
              variant="outline"
              loading={query.isFetchingNextPage}
              disabled={query.isFetching}
              onClick={() => void query.fetchNextPage()}
            >
              Tải thêm chuyến đi
            </Button>
          </div>
        )}
        {nextPageError && (
          <ContentState
            state="error"
            error={nextPageError}
            headingLevel={2}
            onRetry={() => void query.fetchNextPage()}
          />
        )}
        <Link className={styles.mobileCreate} to={paths.newTrip}>
          + Tạo một hành trình mới
        </Link>
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
