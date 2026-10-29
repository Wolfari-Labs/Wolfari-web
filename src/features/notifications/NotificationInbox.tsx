import { useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useRuntimeServices } from '../../app/gateway-context';
import { paths } from '../../app/route-paths';
import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import { useWriteScope } from '../../shared/lib/use-write-scope';
import type { NotificationItem } from './notification.repository';
import styles from './Notifications.module.css';
function destination(item: NotificationItem) {
  if (!item.tripId) return null;
  if (item.type.includes('PRICE')) return paths.priceWatch(item.tripId);
  if (item.type.includes('PLAN')) return paths.plan(item.tripId);
  if (item.type.includes('PACKING')) return paths.packing(item.tripId);
  if (/CONTRIBUTION|CLOSURE/.test(item.type)) return paths.fund(item.tripId);
  return paths.trip(item.tripId);
}
export default function NotificationInbox({
  actor,
  onNavigate,
}: {
  actor: string;
  onNavigate: () => void;
}) {
  const repository = useRuntimeServices()?.notifications;
  const writeScope = useWriteScope(actor),
    inFlight = useRef(false);
  const cache = useQueryClient(),
    [unread, setUnread] = useState(false),
    [error, setError] = useState(''),
    [marking, setMarking] = useState<string | null>(null);
  const inbox = useInfiniteQuery({
    queryKey: ['notifications', actor, 'inbox', unread],
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) =>
      repository!.list(unread ? true : undefined, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: !!repository,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const items = [
    ...new Map(
      inbox.data?.pages.flatMap((page) => page.items).map((item) => [item.id, item]) ?? [],
    ).values(),
  ];
  const mark = async (id: string) => {
    if (!repository || inFlight.current) return;
    const signal = writeScope();
    if (signal.aborted) return;
    inFlight.current = true;
    setMarking(id);
    setError('');
    try {
      await repository.read(id, signal);
      if (signal.aborted) return;
      await cache.invalidateQueries({ queryKey: ['notifications', actor] });
    } catch {
      if (!signal.aborted) setError('Chưa thể đánh dấu đã đọc. Bạn có thể thử lại.');
    } finally {
      inFlight.current = false;
      if (!signal.aborted) setMarking(null);
    }
  };
  return (
    <>
      {!repository ? (
        <Alert>Hộp thư chỉ khả dụng khi đăng nhập bằng tài khoản thật.</Alert>
      ) : (
        <>
          <div className={styles.filters}>
            <Button
              variant={!unread ? 'secondary' : 'ghost'}
              aria-pressed={!unread}
              onClick={() => setUnread(false)}
            >
              Tất cả
            </Button>
            <Button
              variant={unread ? 'secondary' : 'ghost'}
              aria-pressed={unread}
              onClick={() => setUnread(true)}
            >
              Chưa đọc
            </Button>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          {inbox.isPending && <ContentState state="loading" />}
          {inbox.isError && (
            <Alert tone="error">
              Không tải được thông báo.{' '}
              <Button
                variant="plain"
                onClick={() =>
                  void (inbox.isFetchNextPageError ? inbox.fetchNextPage() : inbox.refetch())
                }
              >
                Thử lại
              </Button>
            </Alert>
          )}
          {!inbox.isPending && !inbox.isError && !items.length && (
            <div className={styles.empty}>
              <Icon name="bell" size={36} />
              <h3>Bạn đã xem hết rồi</h3>
              <p>Thông báo mới sẽ xuất hiện tại đây.</p>
            </div>
          )}
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} data-unread={!item.readAt || undefined}>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString('vi-VN')}
                </time>
                <div className={styles.filters}>
                  {destination(item) && (
                    <Link to={destination(item)!} onClick={onNavigate}>
                      Xem chi tiết
                    </Link>
                  )}
                  {!item.readAt && (
                    <Button
                      variant="plain"
                      loading={marking === item.id}
                      disabled={!!marking}
                      onClick={() => void mark(item.id)}
                    >
                      Đánh dấu đã đọc
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {inbox.hasNextPage && (
            <Button
              variant="outline"
              loading={inbox.isFetchingNextPage}
              onClick={() => void inbox.fetchNextPage()}
            >
              Tải thêm
            </Button>
          )}
        </>
      )}
      <Link
        to={`${paths.profile}#notifications`}
        onClick={onNavigate}
        className={styles.preferencesLink}
      >
        Tùy chọn thông báo
      </Link>
    </>
  );
}
