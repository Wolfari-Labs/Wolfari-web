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
import { commandFailure } from '../../shared/lib/command-failure';
import type { NotificationItem } from './notification.repository';
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Luggage,
  Plane,
  Settings,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import styles from './Notifications.module.css';
/** Presentation only: the badge tone/glyph mirrors the destination mapping below. */
function kind(type: string): { tone: string; Glyph: LucideIcon } {
  if (type.includes('PRICE')) return { tone: 'coral', Glyph: Plane };
  if (type.includes('PLAN')) return { tone: 'blue', Glyph: CalendarDays };
  if (type.includes('PACKING')) return { tone: 'amber', Glyph: Luggage };
  if (/CONTRIBUTION|CLOSURE/.test(type)) return { tone: 'green', Glyph: Wallet };
  if (type.includes('INVITATION')) return { tone: 'violet', Glyph: UserPlus };
  return { tone: 'blue', Glyph: Bell };
}
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
    [readUnknown, setReadUnknown] = useState(false),
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
    if (!repository || inFlight.current || readUnknown) return;
    const signal = writeScope();
    if (signal.aborted) return;
    inFlight.current = true;
    setMarking(id);
    setError('');
    try {
      await repository.read(id, signal);
      if (signal.aborted) return;
      await cache.invalidateQueries({ queryKey: ['notifications', actor] });
    } catch (cause) {
      if (!signal.aborted) {
        const uncertain = commandFailure(cause).uncertain;
        setReadUnknown(uncertain);
        setError(
          uncertain
            ? 'Chưa xác nhận được trạng thái đã đọc. Tải lại danh sách để đối chiếu trước khi thử tiếp.'
            : 'Chưa thể đánh dấu đã đọc. Bạn có thể thử lại.',
        );
      }
    } finally {
      inFlight.current = false;
      if (!signal.aborted) setMarking(null);
    }
  };
  return (
    <>
      {!repository ? (
        <div className={styles.empty}>
          <span className={styles.emptyBadge}>
            <Icon name="bell" size={30} />
          </span>
          <h3>Chưa có thông báo</h3>
          <p>Thông báo mới sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <>
          <div className={styles.chips}>
            <Button
              variant={!unread ? 'secondary' : 'ghost'}
              className={styles.chip}
              aria-pressed={!unread}
              onClick={() => setUnread(false)}
            >
              Tất cả
            </Button>
            <Button
              variant={unread ? 'secondary' : 'ghost'}
              className={styles.chip}
              aria-pressed={unread}
              onClick={() => setUnread(true)}
            >
              Chưa đọc
            </Button>
          </div>
          {error && (
            <Alert tone="error" live>
              {error}
              {readUnknown && (
                <Button
                  variant="plain"
                  onClick={async () => {
                    const result = await inbox.refetch();
                    if (!result.isError) {
                      setReadUnknown(false);
                      setError('');
                    }
                  }}
                >
                  Tải lại danh sách
                </Button>
              )}
            </Alert>
          )}
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
              <span className={styles.emptyBadge}>
                <Icon name="bell" size={30} />
              </span>
              <h3>Bạn đã xem hết rồi</h3>
              <p>Thông báo mới sẽ xuất hiện tại đây.</p>
            </div>
          )}
          <ul className={styles.list}>
            {items.map((item) => {
              const { tone, Glyph } = kind(item.type);
              return (
                <li key={item.id} data-unread={!item.readAt || undefined}>
                  <span className={styles.itemBadge} data-tone={tone} aria-hidden="true">
                    <Glyph size={22} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <div className={styles.itemBody}>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                    <div className={styles.itemMeta}>
                      <time dateTime={item.createdAt}>
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </time>
                      <div className={styles.itemActions}>
                        {destination(item) && (
                          <Link
                            to={destination(item)!}
                            onClick={onNavigate}
                            className={styles.detailLink}
                          >
                            <ChevronRight size={14} strokeWidth={2.6} aria-hidden="true" />
                            Xem chi tiết
                          </Link>
                        )}
                        {!item.readAt && (
                          <Button
                            variant="plain"
                            className={styles.markRead}
                            icon={<Check size={14} strokeWidth={2.6} />}
                            loading={marking === item.id}
                            disabled={!!marking || readUnknown}
                            onClick={() => void mark(item.id)}
                          >
                            Đánh dấu đã đọc
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {!item.readAt && <span className={styles.unreadDot} aria-hidden="true" />}
                </li>
              );
            })}
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
      <div className={styles.preferencesCard}>
        <span className={styles.itemBadge} data-tone="violet" aria-hidden="true">
          <Settings size={22} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <p className={styles.preferencesTitle}>Tùy chọn nhận thông báo</p>
        <p className={styles.preferencesText}>
          Email, push, thiết bị và cảnh báo giá được quản lý ở cấp tài khoản cá nhân.
        </p>
        <Link
          to={`${paths.profile}#notifications`}
          onClick={onNavigate}
          className={styles.preferencesLink}
        >
          <Settings size={18} strokeWidth={2.2} aria-hidden="true" />
          Tùy chọn thông báo
        </Link>
      </div>
    </>
  );
}
