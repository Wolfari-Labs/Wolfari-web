import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { useRuntimeServices } from '../../app/gateway-context';
import { useTripRepository } from '../trips/repositories/repository-context';
import { TripHero } from '../trips/components/TripHero';
import {
  restoreCreateIntent,
  type RuntimeWatch,
  type WatchIntent,
} from './model/runtime-price-watch';
import { useWriteScope } from '../../shared/lib/use-write-scope';
import { commandFailure } from '../../shared/lib/command-failure';
import { errorReasonMessage } from '../../shared/components/OperationStatus';
import { Button } from '../../shared/components/Button';
import { Drawer } from '../../shared/components/Drawer';
import { PriceWatchForm } from './PriceWatchForm';
import { PriceWatchOverlay } from './PriceWatchOverlay';
import { SuccessToast } from '../../shared/components/SuccessToast';
import { Icon } from '../../shared/components/Icon';
import { Alert } from '../../shared/components/Alert';
import { ActionMenu, Badge, ConfirmDialog } from '../../shared/components/Ui';
import { PriceHistoryChart } from './PriceHistoryChart';
import mascot from '../../shared/assets/v2/mascot-reading-map.png';
import { ContentState } from '../../shared/components/ContentState';
import styles from '../../shared/styles/DemoWorkspace.module.css';
import priceStyles from './RuntimePriceWatchPage.module.css';
import tripWorkspaceStyles from '../trips/components/TripWorkspace.module.css';
const labels = {
  ACTIVE: 'Đang theo dõi',
  PAUSED: 'Tạm dừng',
  EXPIRED: 'Hết hạn',
  STOPPED: 'Đã dừng',
};
const cabinLabels = {
  ECONOMY: 'Phổ thông',
  PREMIUM_ECONOMY: 'Phổ thông đặc biệt',
  BUSINESS: 'Thương gia',
  FIRST: 'Hạng nhất',
} as const;
const money = (s: string) => new Intl.NumberFormat('vi-VN').format(BigInt(s)) + ' ₫';
/** Provider codes stay in data; the UI names the source in plain Vietnamese. */
const providerLabel = (provider: string) =>
  provider === 'TRAVELPAYOUTS_CACHE'
    ? 'bộ nhớ đệm Travelpayouts'
    : provider === 'MOCK_FLIGHT'
      ? 'giá mô phỏng'
      : provider;
/** Short dd/MM axis label in the device timezone, like the other history timestamps. */
const dayMonth = (value: string) => {
  const at = new Date(value);
  return `${String(at.getDate()).padStart(2, '0')}/${String(at.getMonth() + 1).padStart(2, '0')}`;
};
/** yyyy-MM-dd → dd/MM/yyyy without timezone conversion. */
const isoDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}/.test(value)
    ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`
    : value;
const providerErrors = new Map([
  ['PROVIDER_AUTH_FAILED', 'Token nguồn giá bị từ chối.'],
  ['PROVIDER_RATE_LIMITED', 'Đang chờ hạn mức nguồn giá.'],
  ['PROVIDER_NOT_CONFIGURED', 'Nguồn giá chưa vượt qua bước xác minh VND và cấu hình.'],
  ['PROVIDER_TIMEOUT', 'Nguồn giá phản hồi quá thời gian chờ.'],
  ['PROVIDER_RESPONSE_INVALID', 'Dữ liệu nguồn trả về không hợp lệ.'],
  ['PROVIDER_NOT_SUPPORTED', 'Nguồn giá chưa được hỗ trợ.'],
  ['PROVIDER_UNAVAILABLE', 'Hiện không thể kết nối với nguồn giá.'],
  ['LEASE_EXHAUSTED', 'Lượt lấy giá đã hết số lần thử.'],
]);
function Observations({
  watch,
  repository,
}: {
  watch: RuntimeWatch;
  repository: import('../../shared/types/runtime-services').RuntimeServices['priceWatch'];
}) {
  const query = useInfiniteQuery({
    queryKey: ['price-observations', watch.tripId, watch.id, watch.version],
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) => repository.observations(watch.id, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  });
  const rows = [
    ...new Map(query.data?.pages.flatMap((p) => p.items).map((i) => [i.id, i]) ?? []).values(),
  ];
  const latest = rows.reduce<(typeof rows)[number] | null>(
    (best, row) => (!best || Date.parse(row.observedAt) > Date.parse(best.observedAt) ? row : best),
    null,
  );
  const source = query.data?.pages.at(-1)?.source;
  const cached = watch.fields.provider === 'TRAVELPAYOUTS_CACHE';
  const found = latest?.providerFoundAt ? Date.parse(latest.providerFoundAt) : NaN;
  const freshReference =
    !cached ||
    (latest?.dataKind === 'CACHED_REFERENCE' &&
      Number.isFinite(found) &&
      found <= Date.now() &&
      Date.now() - found <= 48 * 3600000 &&
      (!latest?.providerExpiresAt || Date.parse(latest.providerExpiresAt) > Date.now()));
  const chartRows = [...rows].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  return (
    // Focusable so keyboard users can scroll the drawer when the chart makes it overflow.
    <div className={priceStyles.history} role="region" aria-label="Lịch sử giá" tabIndex={0}>
      <div className={priceStyles.historyHead}>
        <h3>Lịch sử giá quan sát</h3>
        <p>
          {watch.fields.origin} → {watch.fields.destination} ·{' '}
          {watch.fields.journey_type === 'ROUND_TRIP' ? 'Khứ hồi' : 'Một chiều'} ·{' '}
          {isoDate(watch.fields.departure_date)}
        </p>
      </div>
      {latest ? (
        <p className={priceStyles.latest}>
          <strong>{money(latest.price)}</strong>{' '}
          <Badge
            tone={
              !source?.stale &&
              freshReference &&
              BigInt(latest.price) < BigInt(watch.fields.threshold_price)
                ? 'success'
                : 'neutral'
            }
          >
            {source?.stale
              ? 'Giá lịch sử trước lần lỗi nguồn'
              : !freshReference
                ? 'Giá cũ / chưa rõ tuổi nguồn'
                : 'Quan sát gần nhất đã tải'}
          </Badge>
        </p>
      ) : (
        !query.isPending &&
        !query.isError && (
          <p className={priceStyles.noPrice}>
            <Icon name="history" size={22} />
            Chưa có giá quan sát.
          </p>
        )
      )}
      {chartRows.length > 1 && (
        <PriceHistoryChart
          points={chartRows.map((row) => ({
            id: row.id,
            amount: BigInt(row.price),
            axisLabel: dayMonth(row.observedAt),
            title: `${new Date(row.observedAt).toLocaleString('vi-VN')} · ${money(row.price)}`,
          }))}
          threshold={BigInt(watch.fields.threshold_price)}
          label={`Biểu đồ các giá đã tải ${watch.fields.origin} đến ${watch.fields.destination}`}
          description="Giá quan sát đã tải theo thời gian. Đường nét đứt là ngưỡng cảnh báo."
        />
      )}
      <p className={priceStyles.sourceNote}>
        <Icon name="info" size={16} />
        <span>
          Nguồn: {providerLabel(watch.fields.provider)}. Kiểm tra gần nhất:{' '}
          {source?.lastCheckedAt
            ? new Date(source.lastCheckedAt).toLocaleString('vi-VN')
            : 'Chưa kiểm tra'}
          . Kiểm tra tiếp theo:{' '}
          {source?.nextCheckAt
            ? new Date(source.nextCheckAt).toLocaleString('vi-VN')
            : 'Chưa lên lịch'}
          .
        </span>
      </p>
      {cached && (
        <p className={priceStyles.sourceNote}>
          <Icon name="info" size={16} />
          <span>
            Giá tham khảo từ bộ nhớ đệm · 1 người lớn, một chiều, phổ thông. Không phải giá đặt vé
            trực tiếp. Kiểm tra mỗi 6 giờ; lịch sử trống có thể do không có giá đúng tuyến/ngày.
          </span>
        </p>
      )}
      {source?.lastCheckStatus === 'NO_RESULT' && (
        <Alert tone="info">
          Lần kiểm tra gần nhất không có giá đúng tuyến/ngày; không phải giá 0.
        </Alert>
      )}
      {source?.lastError && (
        <Alert tone="warning">
          {source.stale ? 'Giá cũ. ' : ''}Chưa lấy được giá mới từ nguồn theo dõi.{' '}
          {providerErrors.has(source.lastError) && (
            <span>
              {providerErrors.get(source.lastError)} ({source.lastError}){' '}
            </span>
          )}
          <Button variant="plain" disabled={query.isFetching} onClick={() => void query.refetch()}>
            Tải lại lịch sử
          </Button>
        </Alert>
      )}
      {query.isPending && <ContentState state="loading" />}
      {query.isError && (
        <Alert tone="error">
          {query.isFetchNextPageError
            ? 'Không tải được trang lịch sử tiếp theo. Các quan sát đã tải vẫn được giữ.'
            : 'Chưa tải được lịch sử quan sát.'}{' '}
          <Button
            variant="plain"
            onClick={() =>
              void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())
            }
          >
            Thử lại
          </Button>
        </Alert>
      )}
      {!!rows.length && (
        <p className={priceStyles.caveat}>
          Lịch sử chỉ gồm các quan sát đã tải; thời điểm quan sát và nhận dữ liệu ở từng dòng. Thời
          gian hiển thị theo múi giờ thiết bị. Không xác nhận giá hiện tại hoặc giá thấp nhất của
          toàn bộ lịch sử.
        </p>
      )}
      <ul className={priceStyles.observations}>
        {rows.map((row) => (
          <li key={row.id}>
            <strong>{money(row.price)}</strong>
            <p>
              Quan sát: {new Date(row.observedAt).toLocaleString('vi-VN')} · Nguồn:{' '}
              {providerLabel(row.provider)}
            </p>
            <small>Nhận dữ liệu: {new Date(row.fetchedAt).toLocaleString('vi-VN')}</small>
            {row.provider === 'TRAVELPAYOUTS_CACHE' && (
              <small>
                {' '}
                · Nguồn tìm thấy:{' '}
                {row.providerFoundAt
                  ? new Date(row.providerFoundAt).toLocaleString('vi-VN')
                  : 'Không rõ'}{' '}
                · Giá tham khảo
              </small>
            )}
          </li>
        ))}
      </ul>
      {query.hasNextPage && !query.isFetchNextPageError && (
        <Button
          variant="outline"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Tải thêm lịch sử
        </Button>
      )}
    </div>
  );
}
export function RuntimePriceWatchPage() {
  const { tripId = '' } = useParams(),
    services = useRuntimeServices(),
    tripRepository = useTripRepository();
  const tripQuery = useQuery({
    queryKey: ['trip', 'detail', tripId, 'success'],
    queryFn: ({ signal }) => tripRepository.getTrip({ tripId, signal, scenario: 'success' }),
  });
  const trip = tripQuery.data?.status === 'ready' ? tripQuery.data.data : null;
  const repository = services?.priceWatch;
  if (!trip || !repository || !trip.permissions.canRead || trip.currentMembership.leftAt)
    return <ContentState state={tripQuery.isPending ? 'loading' : 'error'} />;
  return (
    <WatchWorkspace
      key={`${tripId}:${trip.currentMembership.userId}`}
      trip={trip}
      repository={repository}
    />
  );
}
function WatchWorkspace({
  trip,
  repository,
}: {
  trip: import('../trips/model/trip-detail').TripDetailViewModel;
  repository: import('../../shared/types/runtime-services').RuntimeServices['priceWatch'];
}) {
  const query = useInfiniteQuery({
    queryKey: ['price-watches', trip.currentMembership.userId, trip.id],
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) => repository.list(trip.id, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    retry: false,
  });
  const [editing, setEditing] = useState<{ item: RuntimeWatch | null } | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [stop, setStop] = useState<RuntimeWatch | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [blocked, setBlocked] = useState(false);
  const writeScope = useWriteScope(trip.currentMembership.userId);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [success, setSuccess] = useState('');
  const intent = useRef<WatchIntent | null>(null),
    inFlight = useRef(false),
    alive = useRef(true),
    formHeadingRef = useRef<HTMLHeadingElement>(null),
    formTriggerRef = useRef<HTMLElement | null>(null),
    formContextRef = useRef<HTMLHeadingElement>(null);
  const journalKey = `wolfari:price-watch:${trip.currentMembership.userId}:${trip.id}`;
  useEffect(() => {
    alive.current = true;
    try {
      const raw = window.sessionStorage.getItem(journalKey);
      if (raw) {
        const parsed = restoreCreateIntent(raw, trip.id);
        intent.current = parsed;
        setBlocked(true);
        setNotice('Có yêu cầu tạo chưa xác nhận. Hãy gửi lại đúng yêu cầu cũ để đối chiếu.');
      }
    } catch {
      setStorageBlocked(true);
      setBlocked(true);
      setNotice('Không đọc được nhật ký phục hồi. Không gửi thêm để tránh tạo trùng.');
    }
    return () => {
      alive.current = false;
    };
  }, [journalKey, trip.id]);
  const items = [
    ...new Map(query.data?.pages.flatMap((p) => p.items).map((i) => [i.id, i]) ?? []).values(),
  ];
  const current = items.find((i) => i.id === selected) ?? null;
  const writable =
    trip.archivedAt === null &&
    trip.lifecycle !== 'ARCHIVED' &&
    trip.currentMembership.leftAt === null;
  const openForm = (item: RuntimeWatch | null) => {
    if (editing) {
      formHeadingRef.current?.focus({ preventScroll: true });
      formHeadingRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return;
    }
    formTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditing({ item });
  };
  const closeForm = () => {
    if (busy) return;
    const trigger = formTriggerRef.current;
    formTriggerRef.current = null;
    setEditing(null);
    window.requestAnimationFrame(() => {
      if (trigger?.isConnected && !trigger.hasAttribute('disabled')) trigger.focus();
      else formContextRef.current?.focus();
    });
  };
  useEffect(() => {
    if (!editing) return;
    const frame = window.requestAnimationFrame(() => {
      formHeadingRef.current?.focus({ preventScroll: true });
      formHeadingRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editing]);
  const send = async (next: WatchIntent, retry = false) => {
    if (inFlight.current || storageBlocked || !writable || (blocked && !retry)) return;
    const signal = writeScope();
    if (signal.aborted) return;
    if (next.key) {
      try {
        window.sessionStorage.setItem(journalKey, JSON.stringify(next));
      } catch {
        setStorageBlocked(true);
        setBlocked(true);
        setNotice(
          'Không lưu được nhật ký phục hồi. Yêu cầu chưa được gửi; kiểm tra quyền lưu trữ trước khi thử lại.',
        );
        return;
      }
    }
    inFlight.current = true;
    setBusy(true);
    setNotice('');
    intent.current = structuredClone(next);
    try {
      await repository.command(trip.id, next, signal);
      if (signal.aborted) return;
      if (next.key) {
        try {
          window.sessionStorage.removeItem(journalKey);
        } catch {
          setStorageBlocked(true);
          setBlocked(true);
          setStop(null);
          setNotice(
            'Thay đổi đã được xác nhận, nhưng chưa thể cập nhật dữ liệu phục hồi trên thiết bị. Tạm khóa thao tác mới; liên hệ hỗ trợ.',
          );
          await query.refetch();
          return;
        }
      }
      intent.current = null;
      if (!alive.current || signal.aborted) return;
      setBlocked(false);
      setEditing(null);
      if (editing) {
        const trigger = formTriggerRef.current;
        formTriggerRef.current = null;
        window.requestAnimationFrame(() => {
          if (trigger?.isConnected && !trigger.hasAttribute('disabled')) trigger.focus();
          else formContextRef.current?.focus();
        });
      }
      setStop(null);
      setNotice('');
      setSuccess('Đã lưu thay đổi.');
      await query.refetch();
    } catch (error) {
      if (!alive.current || signal.aborted) return;
      const uncertain = commandFailure(error).uncertain;
      setBlocked(true);
      setStop(null);
      if (!uncertain && next.key) {
        try {
          window.sessionStorage.removeItem(journalKey);
          intent.current = null;
        } catch {
          setStorageBlocked(true);
        }
      }
      setNotice(
        errorReasonMessage(commandFailure(error).details) ??
          (commandFailure(error).conflict
            ? 'Dữ liệu đã thay đổi. Bản nhập được giữ; đối chiếu lại trước khi tạo yêu cầu mới.'
            : uncertain
              ? 'Chưa xác nhận kết quả. Không tạo lại yêu cầu mới.'
              : 'Yêu cầu bị từ chối. Kiểm tra dữ liệu, quyền và tải lại để đối chiếu.'),
      );
    } finally {
      inFlight.current = false;
      if (alive.current && !signal.aborted) setBusy(false);
    }
  };
  const recovery = (
    <>
      {notice && (
        <Alert live tone={blocked ? 'warning' : 'success'}>
          {notice}
        </Alert>
      )}
      {blocked && !storageBlocked && (
        <div className={styles.actions}>
          {intent.current?.key ? (
            <Button
              disabled={busy}
              onClick={() => {
                if (intent.current) void send(intent.current, true);
              }}
            >
              Gửi lại đúng yêu cầu cũ
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                const signal = writeScope();
                if (signal.aborted) return;
                const result = await query.refetch();
                if (!signal.aborted && !result.isError) {
                  setBlocked(false);
                  setStop(null);
                  setNotice('Đã tải lại. Kiểm tra thông tin trước khi gửi tiếp.');
                }
              }}
            >
              Tải lại để đối chiếu
            </Button>
          )}
        </div>
      )}
    </>
  );
  const providerNote =
    import.meta.env.VITE_PRICE_WATCH_PROVIDER === 'TRAVELPAYOUTS_CACHE'
      ? 'Nguồn: bộ nhớ đệm Travelpayouts · giá tham khảo'
      : 'Nguồn: giá mô phỏng';
  return (
    <section
      className={`${styles.page} ${priceStyles.page} ${tripWorkspaceStyles.fullWidth}`}
      data-flow="price-watch-server"
    >
      <SuccessToast message={success} onDismiss={() => setSuccess('')} />
      <TripHero trip={trip} compact variant="landscape" />
      <div className={priceStyles.heading}>
        <div className={priceStyles.headingText}>
          <h1 ref={formContextRef} tabIndex={-1}>
            Theo dõi giá vé
          </h1>
          <p>Theo dõi ngưỡng giá và lịch sử quan sát. Không đặt vé, không thu tiền.</p>
        </div>
        <Button
          icon={<Icon name="plus" />}
          disabled={!writable || busy || blocked}
          onClick={() => openForm(null)}
        >
          Tạo theo dõi
        </Button>
      </div>
      {!editing && recovery}
      <div className={priceStyles.workspace} data-region="price-watch-workspace">
        <section className={priceStyles.workspaceMain} aria-label="Danh sách theo dõi giá">
          <div className={priceStyles.toolbar}>
            <p className={priceStyles.sourceNote}>
              <Icon name="info" size={16} />
              <span>{providerNote}</span>
            </p>
            <Button
              variant="plain"
              size="compact"
              icon={<Icon name="refresh" size={16} />}
              onClick={() => void query.refetch()}
              disabled={busy}
            >
              Làm mới
            </Button>
          </div>
          {query.isPending && <ContentState state="loading" />}
          {query.isError && (
            <Alert tone="error">
              Không tải được danh sách.{' '}
              <Button
                variant="plain"
                onClick={() =>
                  void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())
                }
              >
                Thử lại
              </Button>
            </Alert>
          )}
          {!query.isPending && !query.isError && !items.length && (
            <div className={priceStyles.empty}>
              <img className={priceStyles.emptyArt} src={mascot} alt="" />
              <div>
                <h2>Chưa có theo dõi giá nào</h2>
                <p>Tạo theo dõi đầu tiên bằng mã sân bay, ngày đi và mức giá mong muốn của bạn.</p>
              </div>
            </div>
          )}
          <div className={priceStyles.grid}>
            {items.map((item) => {
              const own = item.ownerId === trip.currentMembership.userId,
                active = item.status === 'ACTIVE' || item.status === 'PAUSED';
              const canStop =
                active && writable && (own || trip.currentMembership.role === 'OWNER');
              const passengers = Object.values(item.fields.passengers).reduce((a, b) => a + b, 0);
              return (
                <article key={item.id} className={priceStyles.card} data-status={item.status}>
                  <div className={priceStyles.cardTop}>
                    <h2>
                      {item.fields.origin} <span aria-label="đến">→</span> {item.fields.destination}
                    </h2>
                    <span className={priceStyles.status} data-status={item.status}>
                      {item.status === 'PAUSED' && <Icon name="pause" size={14} />}
                      {labels[item.status]}
                    </span>
                  </div>
                  <p className={priceStyles.meta}>
                    {item.fields.journey_type === 'ROUND_TRIP' ? 'Khứ hồi' : 'Một chiều'} ·{' '}
                    {isoDate(item.fields.departure_date)}
                    {item.fields.return_date ? ` – ${isoDate(item.fields.return_date)}` : ''} ·{' '}
                    {passengers} khách
                    {item.fields.cabin_class
                      ? ` · ${cabinLabels[item.fields.cabin_class]}`
                      : ''} · {own ? 'Bạn tạo' : 'Thành viên khác tạo'}
                  </p>
                  <div className={priceStyles.threshold}>
                    <span>
                      <small>Ngưỡng cảnh báo</small>
                      <strong>{money(item.fields.threshold_price)}</strong>
                    </span>
                    <Button
                      variant="outline"
                      size="compact"
                      icon={<Icon name="history" size={16} />}
                      onClick={() => setSelected(item.id)}
                    >
                      Lịch sử giá
                    </Button>
                  </div>
                  {active && writable && (
                    <div className={priceStyles.cardActions}>
                      {own && (
                        <>
                          <Button
                            variant="outline"
                            size="compact"
                            icon={<Icon name="edit" size={16} />}
                            disabled={busy || blocked}
                            onClick={() => openForm(item)}
                          >
                            Chỉnh sửa
                          </Button>
                          <Button
                            variant="outline"
                            size="compact"
                            icon={
                              <Icon name={item.status === 'ACTIVE' ? 'pause' : 'play'} size={16} />
                            }
                            disabled={busy || blocked || !!editing}
                            onClick={() =>
                              void send({
                                method: 'POST',
                                path: `/api/v1/price-watches/${item.id}/${item.status === 'ACTIVE' ? 'pause' : 'resume'}`,
                                body: { expected_version: item.version },
                              })
                            }
                          >
                            {item.status === 'ACTIVE' ? 'Tạm dừng' : 'Tiếp tục'}
                          </Button>
                        </>
                      )}
                      {!own && (
                        <p className={priceStyles.reason}>Chỉ người tạo mới chỉnh sửa được.</p>
                      )}
                      {canStop && (
                        <span className={priceStyles.more}>
                          <ActionMenu
                            label={`Thêm thao tác cho ${item.fields.origin} đến ${item.fields.destination}`}
                            disabled={busy || blocked || !!editing}
                            items={[
                              { label: 'Dừng theo dõi', danger: true, action: () => setStop(item) },
                            ]}
                          />
                        </span>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {query.hasNextPage && (
            <Button
              variant="outline"
              loading={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              Tải thêm theo dõi
            </Button>
          )}
        </section>
        <PriceWatchOverlay
          open={!!editing}
          title={editing?.item ? 'Sửa theo dõi giá' : 'Tạo theo dõi giá'}
          busy={busy}
          onDismiss={closeForm}
          headingRef={formHeadingRef}
          returnFocusRef={formTriggerRef}
        >
          {editing && (
            <>
              {recovery}
              <PriceWatchForm
                key={editing.item?.id ?? 'new'}
                initial={editing.item}
                timezone={trip.timezone}
                busy={busy}
                disabled={busy || blocked || !writable}
                onSave={(fields) => {
                  const latest = editing.item ? items.find((i) => i.id === editing.item!.id) : null;
                  if (editing.item && latest?.version !== editing.item.version) {
                    setNotice(
                      'Phiên bản đã thay đổi. Đóng form và mở lại sau khi đối chiếu; không ghi đè.',
                    );
                    setBlocked(true);
                    return;
                  }
                  void send(
                    editing.item
                      ? {
                          method: 'PATCH',
                          path: `/api/v1/price-watches/${editing.item.id}`,
                          body: { ...fields, expected_version: editing.item.version },
                        }
                      : {
                          method: 'POST',
                          path: `/api/v1/trips/${trip.id}/price-watches`,
                          body: fields,
                          key: crypto.randomUUID(),
                        },
                  );
                }}
              />
            </>
          )}
        </PriceWatchOverlay>
      </div>
      <Drawer
        open={!!current}
        label="Chi tiết theo dõi giá"
        side="right"
        onDismiss={() => setSelected(null)}
      >
        {current && <Observations key={current.id} watch={current} repository={repository} />}
      </Drawer>
      <ConfirmDialog
        open={!!stop}
        title="Dừng theo dõi giá?"
        description="Theo dõi đã dừng không thể tiếp tục; lịch sử vẫn được giữ."
        busy={busy}
        disabled={blocked || !writable}
        onCancel={() => setStop(null)}
        onConfirm={() => {
          if (stop)
            void send({
              method: 'POST',
              path: `/api/v1/price-watches/${stop.id}/stop`,
              body: { expected_version: stop.version },
            });
        }}
      />
    </section>
  );
}
