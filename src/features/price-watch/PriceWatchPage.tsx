import { useMemo, useState } from 'react';
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
import { ActionMenu } from '../../shared/components/Ui';
import { PriceWatchForm } from './PriceWatchForm';
import { PriceWatchOverlay } from './PriceWatchOverlay';
import { PriceHistoryChart, PriceSparkline } from './PriceHistoryChart';
import { Select } from '../../shared/components/Select';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import { PageBreadcrumb } from '../../shared/components/PageBreadcrumb';
import type { DomainError } from '../../shared/types/result';
import mascot from '../../shared/assets/v2/mascot-reading-map.png';
import styles from './PriceWatchPage.module.css';
import { RuntimePriceWatchPage } from './RuntimePriceWatchPage';

const money = (value: string | null) => {
  if (value === null || !/^\d+$/.test(value.trim())) return 'Chưa có giá';
  const whole = value.trim().replace(/^0+(?=\d)/, '');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
};

const date = (value: string | null) =>
  value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : '—';

const shortDate = (value: string | null) =>
  value ? `${value.slice(8, 10)}/${value.slice(5, 7)}` : '—';

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

const place = (value: string) => value.split(' (')[0];
const routeLabel = (watch: PriceWatchItem) =>
  `${place(watch.origin)} → ${place(watch.destination)}`;

const reachedThreshold = (watch: PriceWatchItem) =>
  watch.latestPriceVnd !== null &&
  isMoneyVnd(watch.latestPriceVnd) &&
  isMoneyVnd(watch.thresholdVnd) &&
  BigInt(watch.latestPriceVnd) <= BigInt(watch.thresholdVnd);

/** Latest price minus threshold, or null when there is no comparable price. */
const thresholdDelta = (watch: PriceWatchItem) =>
  watch.latestPriceVnd !== null &&
  isMoneyVnd(watch.latestPriceVnd) &&
  isMoneyVnd(watch.thresholdVnd)
    ? BigInt(watch.latestPriceVnd) - BigInt(watch.thresholdVnd)
    : null;

const deltaText = (delta: bigint | null) =>
  delta === null
    ? 'Chưa có giá để so sánh với ngưỡng'
    : delta < 0n
      ? `Thấp hơn ngưỡng ${money((-delta).toString())}`
      : delta > 0n
        ? `Cao hơn ngưỡng ${money(delta.toString())}`
        : 'Bằng đúng ngưỡng';

/** Marker position on a meter centred on the threshold; ±25% of the threshold fills a side. */
const meterPosition = (delta: bigint, threshold: string) => {
  const base = isMoneyVnd(threshold) ? BigInt(threshold) : 0n;
  if (base === 0n) return delta < 0n ? 0 : delta > 0n ? 100 : 50;
  const basisPoints = (delta * 10_000n) / base;
  const clamped = basisPoints < -2_500n ? -2_500n : basisPoints > 2_500n ? 2_500n : basisPoints;
  return 50 + Number(clamped) / 50;
};

type Tone = 'good' | 'neutral' | 'paused' | 'warning';

const watchBadge = (watch: PriceWatchItem): { text: string; tone: Tone } => {
  if (watch.status !== 'ACTIVE')
    return {
      text: statusLabel[watch.status],
      tone: watch.status === 'PAUSED' ? 'paused' : 'neutral',
    };
  if (watch.dataQuality === 'PROVIDER_ERROR') return { text: 'Lỗi nguồn giá', tone: 'warning' };
  if (watch.dataQuality === 'STALE') return { text: 'Giá cũ', tone: 'warning' };
  return reachedThreshold(watch)
    ? { text: 'Đạt ngưỡng', tone: 'good' }
    : { text: 'Chưa đạt ngưỡng', tone: 'neutral' };
};

const pricedObservations = (watch: PriceWatchItem) =>
  watch.observations.flatMap((item) =>
    item.priceVnd !== null && isMoneyVnd(item.priceVnd)
      ? [{ item, amount: BigInt(item.priceVnd) }]
      : [],
  );

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

function ThresholdMeter({ watch }: { watch: PriceWatchItem }) {
  const delta = thresholdDelta(watch);
  const tone =
    watch.status !== 'ACTIVE' ? 'neutral' : delta !== null && delta <= 0n ? 'good' : 'above';
  const position = delta === null ? 50 : meterPosition(delta, watch.thresholdVnd);
  const start = Math.min(position, 50);
  const width = delta === null || delta === 0n ? 0 : Math.max(Math.abs(position - 50), 2);
  return (
    <span className={styles.meterRow} data-tone={tone}>
      <span className={styles.delta}>{deltaText(delta)}</span>
      {delta !== null && (
        <span className={styles.meter} aria-hidden="true">
          <span className={styles.meterFill} style={{ left: `${start}%`, width: `${width}%` }} />
          <span className={styles.meterMark} />
          <span className={styles.meterDot} style={{ left: `${position}%` }} />
        </span>
      )}
    </span>
  );
}

function WatchCard({
  watch,
  selected,
  view,
  onSelect,
}: {
  watch: PriceWatchItem;
  selected: boolean;
  view: PriceWatchViewModel;
  onSelect: (id: string) => void;
}) {
  const badge = watchBadge(watch);
  const passengers = watch.passengers.adults + watch.passengers.children + watch.passengers.infants;
  const issue =
    watch.dataQuality === 'PROVIDER_ERROR'
      ? `Nguồn giá đang lỗi · giữ lại giá gần nhất ${money(watch.latestPriceVnd)}.`
      : watch.dataQuality === 'STALE'
        ? `Giá gần nhất ${money(watch.latestPriceVnd)} đã quá thời gian cập nhật dự kiến.`
        : null;
  return (
    <li className={styles.watchItem} data-selected={selected || undefined}>
      <button
        className={styles.watchSelect}
        type="button"
        aria-pressed={selected}
        data-watch-id={watch.id}
        onClick={() => onSelect(watch.id)}
      >
        <span className={styles.cardTop}>
          <span className={styles.route}>{routeLabel(watch)}</span>
          <span className={styles.badge} data-tone={badge.tone}>
            {badge.tone === 'good' && <Icon name="check" size={14} strokeWidth={2.4} />}
            {badge.tone === 'warning' && <Icon name="alert" size={14} strokeWidth={2.2} />}
            {badge.tone === 'paused' && <Icon name="pause" size={14} strokeWidth={2.2} />}
            {badge.text}
          </span>
        </span>
        <span className={styles.watchMeta}>
          {journeyLabel(watch.journeyType)} · {date(watch.departureDate)}
          {watch.returnDate ? ` – ${date(watch.returnDate)}` : ''} · {passengers} khách ·{' '}
          {cabinLabel(watch.cabin)}
        </span>
        <span className={styles.priceBlock}>
          <span className={styles.priceFigures}>
            <span className={styles.priceMain}>
              <small>Giá quan sát gần nhất</small>
              <strong>{money(watch.latestPriceVnd)}</strong>
            </span>
            <span className={styles.priceThreshold}>
              <small>Ngưỡng</small>
              <strong>{money(watch.thresholdVnd)}</strong>
            </span>
            <PriceSparkline amounts={pricedObservations(watch).map(({ amount }) => amount)} />
          </span>
          <ThresholdMeter watch={watch} />
        </span>
        <span className={styles.cardFoot}>
          <span>
            <Icon name="user" size={14} />
            {watch.selfOwned ? 'Bạn tạo' : `${watch.owner.displayName ?? 'Thành viên'} tạo`}
          </span>
          <span>
            {watch.observedAt ? `Cập nhật ${time(watch.observedAt)}` : 'Chưa có lần cập nhật giá'}
          </span>
        </span>
      </button>
      {issue && (
        <p className={styles.issue}>
          <Icon name="alert" size={16} />
          {issue}
        </p>
      )}
      {selected && <WatchActions watch={watch} view={view} />}
    </li>
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
      <div className={styles.panelHeading}>
        <div className={styles.headingText}>
          <h2 id="price-watch-list-title">Theo dõi của chuyến đi</h2>
          <p>Chọn một theo dõi để xem lịch sử giá.</p>
        </div>
        <Button
          onClick={onCreate}
          disabled={!view.permissions.canCreate}
          title={view.permissions.canCreate ? undefined : 'Bạn chưa có quyền tạo theo dõi'}
          icon={<Icon name="plus" size={17} />}
        >
          Tạo theo dõi
        </Button>
      </div>
      <ul className={styles.watchList}>
        {watches.map((watch) => (
          <WatchCard
            key={watch.id}
            watch={watch}
            selected={watch.id === selectedId}
            view={view}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </section>
  );
}

const observationRange = (points: readonly { item: PriceObservation }[]) => {
  const count = `${points.length} lần quan sát`;
  if (points.length < 2) return count;
  const first = Date.parse(points[0]?.item.observedAt ?? '');
  const last = Date.parse(points.at(-1)?.item.observedAt ?? '');
  if (!Number.isFinite(first) || !Number.isFinite(last)) return count;
  return `${count} · ${Math.max(1, Math.ceil(Math.abs(last - first) / 86_400_000))} ngày`;
};

function TrendChart({ watch }: { watch: PriceWatchItem }) {
  const points = pricedObservations(watch);
  return (
    <section className={styles.chartPanel} aria-labelledby="price-history-title">
      <div className={styles.panelHeading}>
        <div className={styles.headingText}>
          <h2 id="price-history-title">Lịch sử giá vé</h2>
          <p className={styles.chartRoute}>
            <span>{routeLabel(watch)}</span>
          </p>
        </div>
        {points.length > 0 && <span className={styles.rangeNote}>{observationRange(points)}</span>}
      </div>
      {points.length ? (
        <div className={styles.chartWrap}>
          <PriceHistoryChart
            points={points.map(({ item, amount }) => ({
              id: item.id,
              amount,
              axisLabel: shortDate(item.observedAt),
              title: `${time(item.observedAt)} · ${money(item.priceVnd)}`,
            }))}
            threshold={isMoneyVnd(watch.thresholdVnd) ? BigInt(watch.thresholdVnd) : 0n}
            label={`Biểu đồ giá ${watch.origin} đến ${watch.destination}`}
            description={`Giá quan sát theo thời gian. Đường nét đứt là ngưỡng ${money(watch.thresholdVnd)}.`}
          />
        </div>
      ) : (
        <div className={styles.chartEmpty}>
          <Icon name="history" size={28} />
          <strong>Chưa có giá quan sát</strong>
          <span>Biểu đồ sẽ hiện khi có lần kiểm tra giá đầu tiên.</span>
        </div>
      )}
      <p className={styles.sourceNote}>
        <Icon name="info" size={16} /> Giá mô phỏng, không phải giá thị trường. Wolfari không đặt
        vé.
      </p>
      <details className={styles.historyDetails}>
        <summary>Xem dữ liệu lịch sử ({watch.observations.length})</summary>
        <div className={styles.tableScroll}>
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
        </div>
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

function HowItWorks() {
  return (
    <details className={styles.help}>
      <summary>
        <Icon name="info" size={16} />
        Cách hoạt động
      </summary>
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
  );
}

/**
 * Commands for the selected watch, inside its card. Only actions the viewer may run are shown;
 * pause/resume is one toggle and stopping lives in the overflow menu. Preview never mutates.
 */
function WatchActions({ watch, view }: { watch: PriceWatchItem; view: PriceWatchViewModel }) {
  const [commandMessage, setCommandMessage] = useState('');
  const previewCommand = (label: string) => {
    setCommandMessage(
      `${label} chỉ là xem trước quyền · Chưa gửi yêu cầu và chưa thay đổi theo dõi.`,
    );
  };
  const { permissions } = view;
  const paused = watch.status === 'PAUSED';
  const canToggle = paused ? permissions.canResumeOwn : permissions.canPauseOwn;
  const route = routeLabel(watch).replace(' → ', ' đến ');
  const ownActions = permissions.canEditOwn || canToggle || permissions.canStopOwn;
  return (
    <div className={styles.cardActions} role="group" aria-label="Thao tác theo dõi">
      {watch.selfOwned ? (
        <>
          {permissions.canEditOwn && (
            <Button
              variant="outline"
              size="compact"
              icon={<Icon name="edit" size={16} />}
              onClick={() => previewCommand('Chỉnh sửa')}
            >
              Chỉnh sửa
            </Button>
          )}
          {canToggle && (
            <Button
              variant="outline"
              size="compact"
              icon={<Icon name={paused ? 'play' : 'pause'} size={16} />}
              onClick={() => previewCommand(paused ? 'Tiếp tục' : 'Tạm dừng')}
            >
              {paused ? 'Tiếp tục' : 'Tạm dừng'}
            </Button>
          )}
          {!ownActions && <p className={styles.actionReason}>Bạn chỉ có quyền xem theo dõi này.</p>}
          {permissions.canStopOwn && (
            <span className={styles.more}>
              <ActionMenu
                label={`Thêm thao tác cho ${route}`}
                items={[
                  { label: 'Dừng theo dõi', danger: true, action: () => previewCommand('Dừng') },
                ]}
              />
            </span>
          )}
        </>
      ) : (
        <>
          <p className={styles.actionReason}>
            Chỉ người tạo mới chỉnh sửa hoặc tạm dừng được theo dõi này.
          </p>
          {permissions.canStopAny && (
            <span className={styles.more}>
              <ActionMenu
                label={`Thêm thao tác cho ${route}`}
                items={[
                  {
                    label: 'Dừng theo dõi',
                    danger: true,
                    action: () => previewCommand('Dừng theo dõi của thành viên'),
                  },
                ]}
              />
            </span>
          )}
        </>
      )}
      {commandMessage && <Alert live>{commandMessage}</Alert>}
    </div>
  );
}

function WatchForm({ canCreate, timezone }: { canCreate: boolean; timezone: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <section id="new-watch-form" aria-label="Bản nháp theo dõi giá" tabIndex={-1}>
      <PriceWatchForm
        initial={null}
        timezone={timezone}
        disabled={!canCreate}
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

function CreateOverlay({
  open,
  canCreate,
  timezone,
  onDismiss,
}: {
  open: boolean;
  canCreate: boolean;
  timezone: string;
  onDismiss: () => void;
}) {
  return (
    <PriceWatchOverlay open={open} title="Tạo theo dõi giá vé" onDismiss={onDismiss}>
      {open && <WatchForm canCreate={canCreate} timezone={timezone} />}
    </PriceWatchOverlay>
  );
}

/** Friendly first-run state: one sentence and the one real next step. */
function EmptyWorkspace({ canCreate, timezone }: { canCreate: boolean; timezone: string }) {
  const [creating, setCreating] = useState(false);
  return (
    <div className={styles.workspace} data-region="price-watch-workspace">
      <section className={styles.empty} aria-labelledby="price-watch-empty-title">
        <img className={styles.emptyArt} src={mascot} alt="" />
        <div className={styles.emptyCopy}>
          <h2 id="price-watch-empty-title">Chưa có theo dõi giá nào</h2>
          <p>
            Đặt mức giá mong muốn cho một chặng bay, Wolfari sẽ ghi lại giá và so với ngưỡng giúp
            bạn.
          </p>
          {canCreate && (
            <Button icon={<Icon name="plus" size={17} />} onClick={() => setCreating(true)}>
              Tạo theo dõi
            </Button>
          )}
        </div>
      </section>
      <HowItWorks />
      <CreateOverlay
        open={creating}
        canCreate={canCreate}
        timezone={timezone}
        onDismiss={() => setCreating(false)}
      />
    </div>
  );
}

function PriceWatchWorkspace({ data, timezone }: { data: PriceWatchViewModel; timezone: string }) {
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState(data.watches[0]?.id ?? '');
  const selected = useMemo(
    () => data.watches.find((item) => item.id === selectedId) ?? data.watches[0],
    [data.watches, selectedId],
  );
  if (!selected)
    return <EmptyWorkspace canCreate={data.permissions.canCreate} timezone={timezone} />;
  return (
    <div className={styles.workspace} data-region="price-watch-workspace">
      <WatchList
        watches={data.watches}
        selectedId={selected.id}
        view={data}
        onSelect={setSelectedId}
        onCreate={() => setCreating(true)}
      />
      <TrendChart watch={selected} />
      <HowItWorks />
      <CreateOverlay
        open={creating}
        canCreate={data.permissions.canCreate}
        timezone={timezone}
        onDismiss={() => setCreating(false)}
      />
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
      ) : trip && result?.status === 'empty' ? (
        // An empty read carries no Price Watch capabilities; the preview form never sends data,
        // so the call to action follows the viewer's trip edit right.
        <EmptyWorkspace canCreate={trip.permissions.canUpdate} timezone={trip.timezone} />
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
