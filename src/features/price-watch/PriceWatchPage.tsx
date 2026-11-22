import { useId, useMemo, useState } from 'react';
import { useOutletContext, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import { useTripRepository } from '../trips/repositories/repository-context';
import { TripHero } from '../trips/components/TripHero';
import { usePriceWatchRepository } from './repositories/price-watch-context';
import {
  isMoneyVnd,
  priceWatchScenarios,
  type CabinClass,
  type JourneyType,
  type PriceObservation,
  type PriceWatchItem,
  type PriceWatchScenario,
  type PriceWatchViewModel,
} from './model/price-watch';
import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';
import { PriceWatchForm } from './PriceWatchForm';
import { PriceWatchOverlay } from './PriceWatchOverlay';
import { Select } from '../../shared/components/Select';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import { PageBreadcrumb } from '../../shared/components/PageBreadcrumb';
import type { DomainError } from '../../shared/types/result';
import styles from './PriceWatchPage.module.css';
import { RuntimePriceWatchPage } from './RuntimePriceWatchPage';

const money = (value: string | null) => {
  if (value === null || !/^\d+$/.test(value.trim())) return 'Chưa có giá';
  const whole = value.trim().replace(/^0+(?=\d)/, '');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
};

const date = (value: string | null) =>
  value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : '—';

const time = (value: string | null) =>
  value ? `${date(value)} · ${value.slice(11, 16)}` : 'Chưa cập nhật';

/** Provider codes stay in data; the UI names the source in plain Vietnamese. */
const providerLabel = (value: string) =>
  value.startsWith('MOCK_FLIGHT')
    ? 'Giá mô phỏng'
    : value.startsWith('TRAVELPAYOUTS_CACHE')
      ? 'Bộ nhớ đệm Travelpayouts'
      : value;

const journeyLabel = (value: JourneyType) => (value === 'ROUND_TRIP' ? 'Khứ hồi' : 'Một chiều');

const cabinLabel = (value: CabinClass) =>
  value === 'FIRST'
    ? 'Hạng nhất'
    : value === 'BUSINESS'
      ? 'Thương gia'
      : value === 'PREMIUM_ECONOMY'
        ? 'Phổ thông đặc biệt'
        : 'Phổ thông';

const statusLabel = {
  ACTIVE: 'Đang theo dõi',
  PAUSED: 'Đã tạm dừng',
  EXPIRED: 'Hết hạn',
  STOPPED: 'Đã dừng',
} as const;

const reachedThreshold = (watch: PriceWatchItem) =>
  watch.latestPriceVnd !== null &&
  isMoneyVnd(watch.latestPriceVnd) &&
  isMoneyVnd(watch.thresholdVnd) &&
  BigInt(watch.latestPriceVnd) <= BigInt(watch.thresholdVnd);

function ErrorState({ error, retry }: { error: DomainError; retry: () => void }) {
  return (
    <ContentState
      state={error.code === 'SERVICE_UNAVAILABLE' && !error.retryable ? 'unavailable' : 'error'}
      error={error}
      headingLevel={2}
      onRetry={retry}
    />
  );
}

function WatchList({
  watches,
  selectedId,
  view,
  onSelect,
  onCreate,
}: {
  watches: readonly PriceWatchItem[];
  selectedId: string;
  view: PriceWatchViewModel;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <section className={styles.listPanel} aria-labelledby="price-watch-list-title">
      <div className={`${styles.panelHeading} ${styles.listHeading}`}>
        <h2 id="price-watch-list-title">Theo dõi của chuyến đi</h2>
        <Button
          onClick={onCreate}
          disabled={!view.permissions.canCreate}
          title={view.permissions.canCreate ? undefined : 'Bạn chưa có quyền tạo theo dõi'}
          icon={<Icon name="plus" size={17} />}
        >
          Tạo theo dõi
        </Button>
      </div>
      <div className={styles.watchList}>
        {watches.map((watch) => (
          <div className={styles.watchItem} key={watch.id}>
            <button
              className={`${styles.watchCard} ${watch.id === selectedId ? styles.selected : ''}`}
              type="button"
              aria-pressed={watch.id === selectedId}
              data-price-state={
                watch.status !== 'ACTIVE'
                  ? 'inactive'
                  : reachedThreshold(watch)
                    ? 'reached'
                    : 'above'
              }
              onClick={() => onSelect(watch.id)}
            >
              <span className={styles.watchIcon} aria-hidden="true">
                <Icon name="price" size={22} />
              </span>
              <span className={styles.watchMain}>
                <span className={styles.route}>
                  {watch.origin.split(' (')[0]} → {watch.destination.split(' (')[0]}
                </span>
                <span className={styles.watchMeta}>
                  {journeyLabel(watch.journeyType)} · {date(watch.departureDate)}
                  {watch.returnDate ? ` – ${date(watch.returnDate)}` : ''}
                </span>
                <span className={styles.watchOwner}>
                  {watch.passengers.adults + watch.passengers.children + watch.passengers.infants}{' '}
                  hành khách · {cabinLabel(watch.cabin)} ·{' '}
                  {watch.selfOwned
                    ? 'Bạn tạo'
                    : `Tạo bởi ${watch.owner.displayName ?? 'thành viên'}`}
                </span>
              </span>
              <span className={styles.watchBottom}>
                <span>
                  <small>Giá quan sát</small>
                  <strong data-price-state={reachedThreshold(watch) ? 'reached' : 'above'}>
                    {money(watch.latestPriceVnd)}
                  </strong>
                </span>
                <span>
                  <small>Ngưỡng</small>
                  <strong>{money(watch.thresholdVnd)}</strong>
                </span>
                <em data-status={watch.status}>
                  {watch.status === 'ACTIVE'
                    ? reachedThreshold(watch)
                      ? 'Đạt ngưỡng'
                      : 'Chưa đạt'
                    : statusLabel[watch.status]}
                </em>
              </span>
              <small className={styles.providerMeta}>
                {watch.observedAt
                  ? `Cập nhật ${time(watch.observedAt)}`
                  : 'Chưa có lần cập nhật giá'}
              </small>
            </button>
            {watch.id === selectedId && <WatchActions watch={watch} view={view} />}
          </div>
        ))}
      </div>
      <p className={styles.listNote}>
        <Icon name="info" size={16} /> Giá mô phỏng, không phải giá thị trường. Wolfari không đặt
        vé.
      </p>
      <details className={styles.help}>
        <summary>Cách hoạt động</summary>
        <ol className={styles.steps}>
          {[
            ['Theo dõi', 'Lưu giá, nguồn và thời điểm quan sát.'],
            ['So sánh', 'So sánh giá mới với ngưỡng VND.'],
            ['Thông báo', 'Chỉ người tạo nhận cảnh báo.'],
            ['Bạn quyết định', 'Bạn tự đặt vé ở dịch vụ bên ngoài.'],
          ].map(([title, description], index) => (
            <li className={styles.step} key={title}>
              <span className={styles.stepNumber} aria-hidden="true">
                {index + 1}
              </span>
              <span className={styles.stepCopy}>
                <strong>{title}</strong>
                <span>{description}</span>
              </span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

const compactMillions = (value: bigint) => {
  const hundredths = (value + 5_000n) / 10_000n;
  const whole = hundredths / 100n;
  const decimal = (hundredths % 100n).toString().padStart(2, '0').replace(/0+$/, '');
  return decimal ? `${whole},${decimal}` : whole.toString();
};

const observationRange = (points: readonly { item: PriceObservation }[]) => {
  if (points.length < 2) return '1 ngày';
  const first = Date.parse(points[0]?.item.observedAt ?? '');
  const last = Date.parse(points.at(-1)?.item.observedAt ?? '');
  if (!Number.isFinite(first) || !Number.isFinite(last)) return `${points.length} lần`;
  return `${Math.max(1, Math.ceil(Math.abs(last - first) / 86_400_000))} ngày`;
};

function TrendChart({ watch }: { watch: PriceWatchItem }) {
  const gradientId = useId();
  const points = watch.observations.flatMap((item) =>
    item.priceVnd !== null && isMoneyVnd(item.priceVnd)
      ? [{ item, amount: BigInt(item.priceVnd) }]
      : [],
  );
  const threshold = BigInt(watch.thresholdVnd);
  const amounts = [...points.map(({ amount }) => amount), threshold];
  const min = amounts.reduce((current, amount) => (amount < current ? amount : current));
  const max = amounts.reduce((current, amount) => (amount > current ? amount : current));
  const range = max - min;
  const ratio = (amount: bigint) =>
    range === 0n ? 0.5 : Number(((amount - min) * 10_000n) / range) / 10_000;
  const chartPoints = points.map(({ item, amount }, index) => ({
    item,
    x: points.length === 1 ? 275 : 54 + (index * 442) / (points.length - 1),
    y: 150 - ratio(amount) * 104,
  }));
  const thresholdY = 150 - ratio(threshold) * 104;
  const ticks = [0n, 1n, 2n, 3n, 4n].map((step) => ({
    value: max - (range * step) / 4n,
    y: 46 + Number(step) * 26,
  }));
  const path = chartPoints
    .map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const area =
    chartPoints.length > 1
      ? `${path} L ${chartPoints.at(-1)!.x.toFixed(1)} 150 L ${chartPoints[0]!.x.toFixed(1)} 150 Z`
      : '';
  return (
    <section className={styles.chartPanel} aria-labelledby="price-history-title">
      <div className={styles.panelHeading}>
        <h2 id="price-history-title">Lịch sử giá vé</h2>
        <span className={styles.rangePill}>{observationRange(points)}</span>
      </div>
      <div className={styles.chartRoute}>
        <span>
          {watch.origin.split(' (')[0]} → {watch.destination.split(' (')[0]}
        </span>
        <small>Triệu VND</small>
      </div>
      {points.length ? (
        <div className={styles.chartWrap}>
          <svg
            viewBox="0 30 520 160"
            role="img"
            aria-label={`Biểu đồ giá ${watch.origin} đến ${watch.destination}`}
          >
            <desc>
              Giá quan sát theo thời gian, đơn vị triệu VND. Đường nét đứt là ngưỡng{' '}
              {money(watch.thresholdVnd)}.
            </desc>
            <defs>
              <linearGradient id={`${gradientId}-area`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#5b8cff" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#3cc9b0" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id={`${gradientId}-line`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#5b8cff" />
                <stop offset="100%" stopColor="#3cc9b0" />
              </linearGradient>
            </defs>
            {ticks.map(({ value, y }) => (
              <g key={y}>
                <text x="45" y={y + 3} textAnchor="end">
                  {compactMillions(value)}
                </text>
                <line x1="54" x2="496" y1={y} y2={y} className={styles.gridLine} />
              </g>
            ))}
            <line
              x1="54"
              x2="496"
              y1={thresholdY}
              y2={thresholdY}
              className={styles.thresholdLine}
            />
            {area && (
              <path d={area} className={styles.priceArea} fill={`url(#${gradientId}-area)`} />
            )}
            <path d={path} className={styles.priceLine} stroke={`url(#${gradientId}-line)`} />
            {chartPoints.map(({ item, x, y }) => (
              <circle key={item.id} cx={x} cy={y} r="5" className={styles.pricePoint}>
                <title>{`${time(item.observedAt)} · ${money(item.priceVnd)}`}</title>
              </circle>
            ))}
            <text x="54" y="180">
              {date(points[0]?.item.observedAt ?? null)}
            </text>
            <text x="260" y="180" textAnchor="middle">
              {date(points[Math.floor(points.length / 2)]?.item.observedAt ?? null)}
            </text>
            <text x="496" y="180" textAnchor="end">
              {date(points.at(-1)?.item.observedAt ?? null)}
            </text>
          </svg>
          <div className={styles.chartLegend}>
            <span className={styles.legendPrice}>Giá quan sát</span>
            <span className={styles.legendThreshold}>Ngưỡng: {money(watch.thresholdVnd)}</span>
          </div>
        </div>
      ) : (
        <ContentState state="empty" headingLevel={2} />
      )}
      <details className={styles.historyDetails}>
        <summary>Xem dữ liệu lịch sử ({watch.observations.length})</summary>
        <table className={styles.historyTable}>
          <caption>Lịch sử quan sát giá</caption>
          <thead>
            <tr>
              <th>Thời điểm</th>
              <th>Giá</th>
              <th>Nguồn</th>
              <th>Trạng thái</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {watch.observations.map((item) => (
              <ObservationRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

function ObservationRow({ item }: { item: PriceObservation }) {
  return (
    <tr>
      <td>{time(item.observedAt)}</td>
      <td>{money(item.priceVnd)}</td>
      <td>{providerLabel(item.provider)}</td>
      <td>
        {item.status === 'OBSERVED'
          ? 'Đã quan sát'
          : item.status === 'STALE'
            ? 'Dữ liệu cũ'
            : 'Nguồn lỗi'}
      </td>
      <td>{item.note ?? '—'}</td>
    </tr>
  );
}

function WatchActions({ watch, view }: { watch: PriceWatchItem; view: PriceWatchViewModel }) {
  const [commandMessage, setCommandMessage] = useState('');
  const providerIssue = watch.dataQuality === 'STALE' || watch.dataQuality === 'PROVIDER_ERROR';
  const noPermission = 'Bạn chưa có quyền với thao tác này';
  const previewCommand = (label: string) => {
    setCommandMessage(
      `${label} chỉ là xem trước quyền · Chưa gửi yêu cầu và chưa thay đổi theo dõi.`,
    );
  };
  return (
    <div className={styles.actionStrip} role="group" aria-label="Thao tác theo dõi">
      {providerIssue && (
        <Alert live>
          {watch.dataQuality === 'PROVIDER_ERROR'
            ? `Nguồn giá đang lỗi · giữ lại giá gần nhất ${money(watch.latestPriceVnd)}.`
            : `Giá gần nhất ${money(watch.latestPriceVnd)} đã quá thời gian cập nhật dự kiến.`}
        </Alert>
      )}
      {watch.selfOwned ? (
        <>
          <Button
            variant="outline"
            disabled={!view.permissions.canEditOwn}
            title={view.permissions.canEditOwn ? undefined : noPermission}
            onClick={() => previewCommand('Chỉnh sửa')}
          >
            Chỉnh sửa
          </Button>
          <Button
            variant="outline"
            disabled={!view.permissions.canPauseOwn || watch.status === 'PAUSED'}
            title={
              !view.permissions.canPauseOwn
                ? noPermission
                : watch.status === 'PAUSED'
                  ? 'Theo dõi đang tạm dừng'
                  : undefined
            }
            onClick={() => previewCommand('Tạm dừng')}
          >
            Tạm dừng
          </Button>
          <Button
            variant="outline"
            disabled={!view.permissions.canResumeOwn || watch.status !== 'PAUSED'}
            title={
              !view.permissions.canResumeOwn
                ? noPermission
                : watch.status !== 'PAUSED'
                  ? 'Chỉ tiếp tục được khi theo dõi đang tạm dừng'
                  : undefined
            }
            onClick={() => previewCommand('Tiếp tục')}
          >
            Tiếp tục
          </Button>
          <Button
            variant="plain"
            disabled={!view.permissions.canStopOwn}
            title={view.permissions.canStopOwn ? undefined : noPermission}
            onClick={() => previewCommand('Dừng')}
          >
            Dừng
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          disabled={!view.permissions.canStopAny}
          title={view.permissions.canStopAny ? undefined : noPermission}
          onClick={() => previewCommand('Dừng theo dõi của thành viên')}
        >
          Dừng theo dõi này
        </Button>
      )}
      {commandMessage && <Alert live>{commandMessage}</Alert>}
    </div>
  );
}

function WatchForm({
  permissions,
  timezone,
}: {
  permissions: PriceWatchViewModel['permissions'];
  timezone: string;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <section id="new-watch-form" aria-label="Bản nháp theo dõi giá" tabIndex={-1}>
      <PriceWatchForm
        initial={null}
        timezone={timezone}
        disabled={!permissions.canCreate}
        busy={false}
        preview
        onSave={() => setChecked(true)}
      />
      {checked && (
        <Alert tone="success" live>
          Bản nhập hợp lệ. Chưa tạo theo dõi hoặc gửi dữ liệu.
        </Alert>
      )}
    </section>
  );
}

function PriceWatchWorkspace({ data, timezone }: { data: PriceWatchViewModel; timezone: string }) {
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState(data.watches[0]?.id ?? '');
  const selected = useMemo(
    () => data.watches.find((item) => item.id === selectedId) ?? data.watches[0],
    [data.watches, selectedId],
  );
  if (!selected) return <ContentState state="empty" headingLevel={2} />;
  const focusCreateForm = () => {
    setCreating(true);
  };
  return (
    <div className={styles.workspace} data-region="price-watch-workspace">
      <WatchList
        watches={data.watches}
        selectedId={selected.id}
        view={data}
        onSelect={setSelectedId}
        onCreate={focusCreateForm}
      />
      <TrendChart watch={selected} />
      <PriceWatchOverlay
        open={creating}
        title="Tạo theo dõi giá vé"
        onDismiss={() => setCreating(false)}
      >
        {creating && <WatchForm permissions={data.permissions} timezone={timezone} />}
      </PriceWatchOverlay>
    </div>
  );
}

export function PriceWatchPage() {
  const { previewEnabled } = useOutletContext<RouteContext>();
  return previewEnabled ? <PreviewPriceWatchPage /> : <RuntimePriceWatchPage />;
}
function PreviewPriceWatchPage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const tripRepository = useTripRepository();
  const repository = usePriceWatchRepository();
  const [scenario, setScenario] = useState<PriceWatchScenario>('success');
  const tripQuery = useQuery({
    queryKey: ['trip', 'detail', tripId, 'success'],
    queryFn: ({ signal }) => tripRepository.getTrip({ tripId, scenario: 'success', signal }),
  });
  const trip = tripQuery.data?.status === 'ready' ? tripQuery.data.data : null;
  const allowed =
    !!trip &&
    trip.id === tripId &&
    trip.permissions.canRead &&
    trip.currentMembership.leftAt === null;
  const query = useQuery({
    queryKey: ['price-watch', tripId, scenario],
    queryFn: ({ signal }) => repository.getPriceWatch({ tripId, scenario, signal }),
    enabled: allowed,
  });
  const result = query.data;
  const data = result?.status === 'ready' && result.data.permissions.canRead ? result.data : null;
  const error =
    tripQuery.isError || query.isError
      ? { code: 'SERVICE_UNAVAILABLE' as const, correlationId: null, retryable: true }
      : tripQuery.data?.status === 'error'
        ? tripQuery.data.error
        : trip && !allowed
          ? { code: 'PERMISSION_DENIED' as const, correlationId: null, retryable: false }
          : result?.status === 'ready' && !result.data.permissions.canRead
            ? { code: 'PERMISSION_DENIED' as const, correlationId: null, retryable: false }
            : result?.status === 'error'
              ? result.error
              : null;
  return (
    <section className={styles.page} data-flow="price-watch-preview" data-node-id="768:7992">
      <PageBreadcrumb
        className={styles.breadcrumb}
        items={[{ label: 'Tổng quan chuyến đi', to: paths.trip(tripId) }]}
        current="Theo dõi giá vé"
      />
      {trip && <TripHero trip={trip} compact variant="landscape" />}
      {error ? (
        <ErrorState
          error={error}
          retry={() => {
            void tripQuery.refetch();
            if (allowed) void query.refetch();
          }}
        />
      ) : tripQuery.isPending || (allowed && query.isPending) ? (
        <ContentState state="loading" headingLevel={2} />
      ) : data ? (
        <PriceWatchWorkspace data={data} timezone={trip!.timezone} />
      ) : (
        <ContentState state="empty" headingLevel={2} />
      )}
      {previewEnabled && (
        <details
          className="preview"
          data-preview="price-watch"
          data-watch-version={data?.watchVersion}
          data-provider-environment={data?.providerEnvironment}
        >
          <summary>Price Watch preview · Dữ liệu minh họa</summary>
          <Select
            label="Trạng thái theo dõi"
            value={scenario}
            onChange={(event) => {
              const next = priceWatchScenarios.find((item) => item === event.target.value);
              if (next) setScenario(next);
            }}
          >
            {priceWatchScenarios.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
        </details>
      )}
    </section>
  );
}
