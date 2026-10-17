import { FormEvent, useMemo, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { RouteContext } from '../../app/route-context';
import { paths } from '../../app/route-paths';
import { useTripRepository } from '../trips/repositories/repository-context';
import { TripHero } from '../trips/components/TripHero';
import { usePriceWatchRepository } from './repositories/price-watch-context';
import {
  isMoneyVnd,
  isValidDate,
  priceWatchScenarios,
  type CabinClass,
  type JourneyType,
  type PriceObservation,
  type PriceWatchItem,
  type PriceWatchScenario,
  type PriceWatchViewModel,
} from './model/price-watch';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Select } from '../../shared/components/Select';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import type { DomainError } from '../../shared/types/result';
import styles from './PriceWatchPage.module.css';

const money = (value: string | null) => {
  if (value === null || !/^\d+$/.test(value.trim())) return 'Chưa có giá';
  const whole = value.trim().replace(/^0+(?=\d)/, '');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
};

const date = (value: string | null) =>
  value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : '—';

const time = (value: string | null) =>
  value ? `${date(value)} · ${value.slice(11, 16)}` : 'Chưa cập nhật';

const journeyLabel = (value: JourneyType) => (value === 'ROUND_TRIP' ? 'Khứ hồi' : 'Một chiều');

const cabinLabel = (value: CabinClass) =>
  value === 'BUSINESS' ? 'Thương gia' : value === 'PREMIUM_ECONOMY' ? 'Phổ thông đặc biệt' : 'Phổ thông';

const statusLabel = {
  ACTIVE: 'Đang theo dõi',
  PAUSED: 'Đã tạm dừng',
  STALE: 'Dữ liệu cũ',
  PROVIDER_ERROR: 'Nguồn đang lỗi',
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
  environment,
  canCreate,
  onSelect,
  onCreate,
}: {
  watches: readonly PriceWatchItem[];
  selectedId: string;
  environment: PriceWatchViewModel['providerEnvironment'];
  canCreate: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <section className={styles.listPanel} aria-labelledby="price-watch-list-title">
      <div className={`${styles.panelHeading} ${styles.listHeading}`}>
        <div className={styles.titleRow}>
          <h2 id="price-watch-list-title">Theo dõi của chuyến đi</h2>
          <span className={styles.environmentBadge}>{environment}</span>
        </div>
        <Button onClick={onCreate} disabled={!canCreate}>Tạo theo dõi</Button>
      </div>
      <div className={styles.watchList}>
        {watches.map((watch) => (
          <button
            className={`${styles.watchCard} ${watch.id === selectedId ? styles.selected : ''}`}
            key={watch.id}
            type="button"
            aria-pressed={watch.id === selectedId}
            onClick={() => onSelect(watch.id)}
          >
            <span className={styles.route}>✈ {watch.origin.split(' (')[0]} → {watch.destination.split(' (')[0]}</span>
            <span className={styles.watchMeta}>
              {journeyLabel(watch.journeyType)} · {date(watch.departureDate)}
              {watch.returnDate ? ` – ${date(watch.returnDate)}` : ''}
            </span>
            <span className={styles.watchOwner}>
              {watch.passengers} hành khách · {cabinLabel(watch.cabin)} · {watch.selfOwned ? 'Bạn tạo' : `Tạo bởi ${watch.owner.displayName ?? 'thành viên'}`}
            </span>
            <span className={styles.watchBottom}>
              <span><small>Giá quan sát</small><strong data-price-state={reachedThreshold(watch) ? 'reached' : 'above'}>{money(watch.latestPriceVnd)}</strong></span>
              <span><small>Ngưỡng</small><strong>{money(watch.thresholdVnd)}</strong></span>
              <em data-status={watch.status}>{watch.status === 'ACTIVE' ? (reachedThreshold(watch) ? 'Đạt ngưỡng' : 'Chưa đạt') : statusLabel[watch.status]}</em>
            </span>
            <small className={styles.providerMeta}>Nguồn: {watch.provider} · {time(watch.observedAt)}<br />Giá quan sát gần nhất; chưa bao gồm thay đổi mới.</small>
          </button>
        ))}
      </div>
      <p className={styles.listNote}><span aria-hidden="true">ⓘ</span> Chỉ xem giá tham khảo từ provider. Wolfari không đặt vé và không khẳng định đây là giá rẻ nhất thị trường.</p>
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
  const path = chartPoints.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  return (
    <section className={styles.chartPanel} aria-labelledby="price-history-title">
      <div className={styles.panelHeading}>
        <h2 id="price-history-title">Lịch sử giá vé</h2>
        <span className={styles.rangePill}>{observationRange(points)}</span>
      </div>
      <div className={styles.chartRoute}>
        <span>{watch.origin.split(' (')[0]} → {watch.destination.split(' (')[0]}</span>
        <small>Triệu VND</small>
      </div>
      {points.length ? (
        <div className={styles.chartWrap}>
          <svg viewBox="0 0 520 190" role="img" aria-label={`Biểu đồ giá ${watch.origin} đến ${watch.destination}`}>
            <desc>Giá quan sát theo thời gian, đơn vị triệu VND. Đường nét đứt là ngưỡng {money(watch.thresholdVnd)}.</desc>
            {ticks.map(({ value, y }) => (
              <g key={y}>
                <text x="45" y={y + 3} textAnchor="end">{compactMillions(value)}</text>
                <line x1="54" x2="496" y1={y} y2={y} className={styles.gridLine} />
              </g>
            ))}
            <line x1="54" x2="496" y1={thresholdY} y2={thresholdY} className={styles.thresholdLine} />
            <path d={path} className={styles.priceLine} />
            {chartPoints.map(({ item, x, y }) => (
              <circle key={item.id} cx={x} cy={y} r="5" className={styles.pricePoint}>
                <title>{`${time(item.observedAt)} · ${money(item.priceVnd)}`}</title>
              </circle>
            ))}
            <text x="54" y="180">{date(points[0]?.item.observedAt ?? null)}</text>
            <text x="260" y="180" textAnchor="middle">{date(points[Math.floor(points.length / 2)]?.item.observedAt ?? null)}</text>
            <text x="496" y="180" textAnchor="end">{date(points.at(-1)?.item.observedAt ?? null)}</text>
          </svg>
          <div className={styles.chartLegend}><span className={styles.legendPrice}>Giá quan sát</span><span className={styles.legendThreshold}>Ngưỡng: {money(watch.thresholdVnd)}</span></div>
        </div>
      ) : (
        <ContentState state="empty" headingLevel={2} />
      )}
      <details className={styles.historyDetails}>
        <summary>Xem dữ liệu lịch sử ({watch.observations.length})</summary>
        <table className={styles.historyTable}>
          <caption>Lịch sử quan sát giá</caption>
          <thead><tr><th>Thời điểm</th><th>Giá</th><th>Nguồn</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
          <tbody>
            {watch.observations.map((item) => <ObservationRow key={item.id} item={item} />)}
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
      <td>{item.provider}</td>
      <td>{item.status === 'OBSERVED' ? 'Đã quan sát' : item.status === 'STALE' ? 'Dữ liệu cũ' : 'Nguồn lỗi'}</td>
      <td>{item.note ?? '—'}</td>
    </tr>
  );
}

function WatchActions({ watch, view }: { watch: PriceWatchItem; view: PriceWatchViewModel }) {
  const [commandMessage, setCommandMessage] = useState('');
  const previewCommand = (label: string) => {
    setCommandMessage(`${label} chỉ là xem trước quyền · Chưa gửi yêu cầu và chưa thay đổi theo dõi.`);
  };
  return (
    <div className={styles.actionStrip} aria-label="Thao tác theo dõi">
      <span className={styles.actionOwner}>{watch.selfOwned ? 'Theo dõi của bạn' : `Theo dõi của ${watch.owner.displayName ?? 'thành viên'}`}</span>
      {watch.selfOwned ? (
        <>
          <Button variant="outline" disabled={!view.permissions.canEditOwn} onClick={() => previewCommand('Chỉnh sửa')}>Chỉnh sửa</Button>
          <Button variant="outline" disabled={!view.permissions.canPauseOwn || watch.status === 'PAUSED'} onClick={() => previewCommand('Tạm dừng')}>Tạm dừng</Button>
          <Button variant="outline" disabled={!view.permissions.canResumeOwn || watch.status !== 'PAUSED'} onClick={() => previewCommand('Tiếp tục')}>Tiếp tục</Button>
          <Button variant="plain" disabled={!view.permissions.canDeleteOwn} onClick={() => previewCommand('Xóa')}>Xóa</Button>
        </>
      ) : (
        <Button variant="outline" disabled={!view.permissions.canDeleteAny} onClick={() => previewCommand('Xóa theo dõi của thành viên')}>Xóa theo dõi này</Button>
      )}
      <p className={styles.mutationNote}>Capability preview · API chỉnh sửa chưa khả dụng; thao tác không gửi request.</p>
      {commandMessage && <Alert live>{commandMessage}</Alert>}
    </div>
  );
}

function PriceInfo({ watch, view }: { watch: PriceWatchItem; view: PriceWatchViewModel }) {
  const providerIssue = watch.status === 'STALE' || watch.status === 'PROVIDER_ERROR';
  return (
    <section className={styles.infoPanel} aria-labelledby="price-info-title">
      <h2 id="price-info-title">Cách theo dõi hoạt động</h2>
      <div className={styles.steps}>
        {[
          ['1', 'Theo dõi', 'Lưu giá, nguồn và thời điểm quan sát.'],
          ['2', 'So sánh', 'So sánh giá mới với ngưỡng VND.'],
          ['3', 'Thông báo', 'Chỉ người tạo nhận cảnh báo.'],
          ['4', 'Bạn quyết định', 'Bạn tự đặt vé ở dịch vụ bên ngoài.'],
        ].map(([number, title, description], index) => (
          <div className={index === 3 ? styles.stepCream : styles.step} key={number}>
            <span className={styles.stepNumber}>{number}</span><strong>{title}</strong><p>{description}</p>
          </div>
        ))}
      </div>
      {providerIssue && <Alert live>{watch.status === 'PROVIDER_ERROR' ? `Nguồn giá đang lỗi · giữ lại giá gần nhất ${money(watch.latestPriceVnd)}. Không hiển thị giá 0.` : `Giá gần nhất ${money(watch.latestPriceVnd)} đã quá thời gian cập nhật dự kiến.`}</Alert>}
      <WatchActions watch={watch} view={view} />
    </section>
  );
}

function WatchForm({ permissions }: { permissions: PriceWatchViewModel['permissions'] }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [journeyType, setJourneyType] = useState<JourneyType>('ROUND_TRIP');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [cabin, setCabin] = useState<CabinClass>('ECONOMY');
  const [threshold, setThreshold] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const clearFeedback = () => setFeedback(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedThreshold = threshold.replace(/[.\s]/g, '');
    const passengerCount = Number(passengers);
    if (!origin.trim() || !destination.trim() || !isValidDate(departureDate) || !isMoneyVnd(normalizedThreshold) || normalizedThreshold === '0') {
      setFeedback({ tone: 'error', message: 'Nhập điểm đi, điểm đến, ngày khởi hành và ngưỡng VND hợp lệ để xem trước.' });
      return;
    }
    if (origin.trim().toLocaleLowerCase('vi') === destination.trim().toLocaleLowerCase('vi')) {
      setFeedback({ tone: 'error', message: 'Điểm đi và điểm đến phải khác nhau.' });
      return;
    }
    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 9) {
      setFeedback({ tone: 'error', message: 'Số hành khách phải là số nguyên từ 1 đến 9.' });
      return;
    }
    if (journeyType === 'ROUND_TRIP' && !isValidDate(returnDate)) {
      setFeedback({ tone: 'error', message: 'Khứ hồi cần ngày về hợp lệ.' });
      return;
    }
    if (journeyType === 'ROUND_TRIP' && returnDate < departureDate) {
      setFeedback({ tone: 'error', message: 'Ngày về phải bằng hoặc sau ngày khởi hành.' });
      return;
    }
    setFeedback({
      tone: 'success',
      message: `Bản xem trước hợp lệ · ${passengerCount} hành khách, hạng ${cabinLabel(cabin).toLocaleLowerCase('vi')} · Chưa tạo theo dõi và chưa gửi request.`,
    });
  };
  const disabled = !permissions.canCreate;
  return (
    <section className={styles.formPanel} id="new-watch-form" aria-labelledby="new-watch-title" tabIndex={-1}>
      <div className={styles.panelHeading}><h2 id="new-watch-title">Tạo theo dõi giá vé</h2></div>
      <form onSubmit={submit}>
        <Select label="Hành trình" value={journeyType} onChange={(event) => { const next = event.target.value as JourneyType; setJourneyType(next); if (next === 'ONE_WAY') setReturnDate(''); clearFeedback(); }} disabled={disabled}><option value="ONE_WAY">Một chiều</option><option value="ROUND_TRIP">Khứ hồi</option></Select>
        <Input label="Điểm đi" placeholder="Hà Nội (HAN)" value={origin} onChange={(event) => { setOrigin(event.target.value); clearFeedback(); }} disabled={disabled} />
        <Input label="Điểm đến" placeholder="Đà Nẵng (DAD)" value={destination} onChange={(event) => { setDestination(event.target.value); clearFeedback(); }} disabled={disabled} />
        <div className={styles.twoFields}><Input label="Ngày đi" type="date" value={departureDate} onChange={(event) => { setDepartureDate(event.target.value); clearFeedback(); }} disabled={disabled} /><Input label="Ngày về" type="date" value={returnDate} onChange={(event) => { setReturnDate(event.target.value); clearFeedback(); }} disabled={disabled || journeyType === 'ONE_WAY'} /></div>
        <div className={styles.twoFields}><Input label="Hành khách" type="number" min="1" max="9" value={passengers} onChange={(event) => { setPassengers(event.target.value); clearFeedback(); }} disabled={disabled} /><Select label="Hạng ghế" value={cabin} onChange={(event) => { setCabin(event.target.value as CabinClass); clearFeedback(); }} disabled={disabled}><option value="ECONOMY">Phổ thông</option><option value="PREMIUM_ECONOMY">Phổ thông đặc biệt</option><option value="BUSINESS">Thương gia</option></Select></div>
        <Input label="Ngưỡng giá (VND)" inputMode="numeric" placeholder="1.400.000" value={threshold} onChange={(event) => { setThreshold(event.target.value); clearFeedback(); }} disabled={disabled} hint="Có thể nhập 1400000 hoặc 1.400.000." />
        <p className={styles.previewNote}>Bản xem trước · Chưa lưu máy chủ.<br />Cảnh báo dành cho người tạo theo dõi.</p>
        {feedback && <Alert live tone={feedback.tone}>{feedback.message}</Alert>}
        <Button type="submit" disabled={disabled}>Kiểm tra bản nháp</Button>
      </form>
      {!permissions.canCreate && <p className={styles.unavailableNote}>Bạn chỉ có quyền xem dữ liệu theo dõi trong trạng thái này.</p>}
    </section>
  );
}

function PriceWatchWorkspace({ data }: { data: PriceWatchViewModel }) {
  const [selectedId, setSelectedId] = useState(data.watches[0]?.id ?? '');
  const selected = useMemo(() => data.watches.find((item) => item.id === selectedId) ?? data.watches[0], [data.watches, selectedId]);
  if (!selected) return <ContentState state="empty" headingLevel={2} />;
  const focusCreateForm = () => {
    const target = document.getElementById('new-watch-form');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target?.focus({ preventScroll: true });
  };
  return (
    <div className={styles.workspace}>
      <WatchList watches={data.watches} selectedId={selected.id} environment={data.providerEnvironment} canCreate={data.permissions.canCreate} onSelect={setSelectedId} onCreate={focusCreateForm} />
      <div className={styles.middleColumn}><TrendChart watch={selected} /><PriceInfo watch={selected} view={data} /></div>
      <WatchForm permissions={data.permissions} />
    </div>
  );
}

export function PriceWatchPage() {
  const { tripId = '' } = useParams();
  const { previewEnabled } = useOutletContext<RouteContext>();
  const tripRepository = useTripRepository();
  const repository = usePriceWatchRepository();
  const [scenario, setScenario] = useState<PriceWatchScenario>('success');
  const tripQuery = useQuery({ queryKey: ['trip', 'detail', tripId, 'success'], queryFn: ({ signal }) => tripRepository.getTrip({ tripId, scenario: 'success', signal }) });
  const trip = tripQuery.data?.status === 'ready' ? tripQuery.data.data : null;
  const allowed = !!trip && trip.id === tripId && trip.permissions.canRead && trip.currentMembership.leftAt === null;
  const query = useQuery({ queryKey: ['price-watch', tripId, scenario], queryFn: ({ signal }) => repository.getPriceWatch({ tripId, scenario, signal }), enabled: allowed });
  const result = query.data;
  const data = result?.status === 'ready' && result.data.permissions.canRead ? result.data : null;
  const error = tripQuery.isError || query.isError
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
      <div className={styles.breadcrumb}><Link to={paths.trip(tripId)}>Tổng quan chuyến đi</Link><span aria-hidden="true">›</span><h1>Theo dõi giá vé</h1></div>
      {trip && <TripHero trip={trip} compact variant="landscape" />}
      {error ? <ErrorState error={error} retry={() => { void tripQuery.refetch(); if (allowed) void query.refetch(); }} /> : tripQuery.isPending || (allowed && query.isPending) ? <ContentState state="loading" headingLevel={2} /> : data ? <PriceWatchWorkspace data={data} /> : <ContentState state="empty" headingLevel={2} />}
      {previewEnabled && <details className="preview" data-preview="price-watch"><summary>Price Watch preview · Dữ liệu minh họa</summary><Select label="Trạng thái theo dõi" value={scenario} onChange={(event) => { const next = priceWatchScenarios.find((item) => item === event.target.value); if (next) setScenario(next); }}>{priceWatchScenarios.map((item) => <option key={item}>{item}</option>)}</Select>{data && <p>Watch version {data.watchVersion} · {data.providerEnvironment} · Chỉ xem, không đặt vé</p>}</details>}
    </section>
  );
}
