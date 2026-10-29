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
import { Button } from '../../shared/components/Button';
import { Drawer } from '../../shared/components/Drawer';
import { PriceWatchForm } from './PriceWatchForm';
import { SuccessToast } from '../../shared/components/SuccessToast';
import { Icon } from '../../shared/components/Icon';
import { Alert } from '../../shared/components/Alert';
import { Badge, ConfirmDialog } from '../../shared/components/Ui';
import { ContentState } from '../../shared/components/ContentState';
import styles from '../../shared/styles/DemoWorkspace.module.css';
import priceStyles from './RuntimePriceWatchPage.module.css';
const labels = {
  ACTIVE: 'Đang theo dõi',
  PAUSED: 'Tạm dừng',
  EXPIRED: 'Hết hạn',
  STOPPED: 'Đã dừng',
};
const money = (s: string) => new Intl.NumberFormat('vi-VN').format(BigInt(s)) + ' ₫';
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
  return (
    <>
      <h3>Lịch sử giá quan sát</h3>
      {query.isPending && <ContentState state="loading" />}
      {query.isError && (
        <Alert tone="error">
          Chưa tải được lịch sử.{' '}
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
      {latest ? (
        <p className={styles.money}>
          {money(latest.price)}{' '}
          <Badge
            tone={
              BigInt(latest.price) <= BigInt(watch.fields.threshold_price) ? 'success' : 'neutral'
            }
          >
            Mới nhất trong dữ liệu đã tải
          </Badge>
        </p>
      ) : (
        !query.isPending && !query.isError && <p>Chưa có giá quan sát.</p>
      )}
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.id}>
            <strong>{money(row.price)}</strong>
            <p>
              {new Date(row.observedAt).toLocaleString('vi-VN')} · {row.provider}
            </p>
            <small>Nhận dữ liệu: {new Date(row.fetchedAt).toLocaleString('vi-VN')}</small>
          </li>
        ))}
      </ul>
      {query.hasNextPage && (
        <Button
          variant="outline"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Tải thêm lịch sử
        </Button>
      )}
    </>
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
    alive = useRef(true);
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
        commandFailure(error).conflict
          ? 'Dữ liệu đã thay đổi. Bản nhập được giữ; đối chiếu lại trước khi tạo yêu cầu mới.'
          : uncertain
            ? 'Chưa xác nhận kết quả. Không tạo lại yêu cầu mới.'
            : 'Yêu cầu bị từ chối. Kiểm tra dữ liệu, quyền và tải lại để đối chiếu.',
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
  return (
    <section className={styles.page}>
      <SuccessToast message={success} onDismiss={() => setSuccess('')} />
      <TripHero trip={trip} compact variant="landscape" />
      <div className={priceStyles.heading}>
        <div>
          <p className={styles.metadata}>CHỦ ĐỘNG CHO CHUYẾN ĐI</p>
          <h1>Theo dõi giá vé</h1>
        </div>
        <Badge tone="warning">MOCK_FLIGHT · Mô phỏng</Badge>
      </div>
      <p>Theo dõi ngưỡng giá và lịch sử quan sát. Không đặt vé, không thu tiền.</p>
      {recovery}
      <div className={styles.actions}>
        <Button
          icon={<Icon name="plus" />}
          disabled={!writable || busy || blocked}
          onClick={() => setEditing({ item: null })}
        >
          Tạo theo dõi
        </Button>
        <Button variant="outline" onClick={() => void query.refetch()} disabled={busy}>
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
          <Icon name="price" size={40} />
          <h2>Chờ một mức giá hợp lý</h2>
          <p>Tạo theo dõi đầu tiên bằng mã sân bay, ngày đi và ngân sách của bạn.</p>
        </div>
      )}
      <div className={priceStyles.grid}>
        {items.map((item) => {
          const own = item.ownerId === trip.currentMembership.userId,
            active = item.status === 'ACTIVE' || item.status === 'PAUSED';
          return (
            <article key={item.id} className={priceStyles.card}>
              <div className={priceStyles.heading}>
                <Icon name="price" />
                <Badge tone={item.status === 'ACTIVE' ? 'success' : 'neutral'}>
                  {labels[item.status]}
                </Badge>
              </div>
              <h2>
                {item.fields.origin} <span aria-label="đến">→</span> {item.fields.destination}
              </h2>
              <p>
                {item.fields.departure_date} ·{' '}
                {item.fields.journey_type === 'ROUND_TRIP' ? 'Khứ hồi' : 'Một chiều'}
              </p>
              <p className={styles.metadata}>Ngưỡng cảnh báo</p>
              <strong className={styles.money}>{money(item.fields.threshold_price)}</strong>
              <div className={styles.actions}>
                <Button variant="outline" onClick={() => setSelected(item.id)}>
                  Lịch sử giá
                </Button>
                {own && active && writable && (
                  <>
                    <Button
                      variant="ghost"
                      disabled={busy || blocked}
                      onClick={() => setEditing({ item })}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy || blocked}
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
                {active && writable && (own || trip.currentMembership.role === 'OWNER') && (
                  <Button variant="ghost" disabled={busy || blocked} onClick={() => setStop(item)}>
                    Dừng
                  </Button>
                )}
              </div>
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
      <Drawer
        open={!!editing}
        label={editing?.item ? 'Sửa theo dõi giá' : 'Tạo theo dõi giá'}
        side="right"
        onDismiss={() => {
          if (!busy) setEditing(null);
        }}
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
      </Drawer>
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
