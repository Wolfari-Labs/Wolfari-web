import { useRef, useState, type ReactNode } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useOutletContext } from 'react-router';
import type { RouteContext } from '../../app/route-context';
import { useRuntimeServices } from '../../app/gateway-context';
import { paths } from '../../app/route-paths';
import { Button } from '../../shared/components/Button';
import { Alert } from '../../shared/components/Alert';
import { ContentState } from '../../shared/components/ContentState';
import { useWriteScope } from '../../shared/lib/use-write-scope';
import { commandFailure } from '../../shared/lib/command-failure';
import type { NotificationItem } from './notification.repository';
import mascot from '../../shared/assets/figma/new-surfaces/4ff86.png';
import invitationIcon from '../../shared/assets/figma/new-surfaces/34c4c.svg';
import planIcon from '../../shared/assets/figma/new-surfaces/e2b00.svg';
import packingIcon from '../../shared/assets/figma/new-surfaces/7df3f.svg';
import financeIcon from '../../shared/assets/figma/new-surfaces/6f9e5.svg';
import priceIcon from '../../shared/assets/figma/new-surfaces/b1e0c.svg';
import settingsBadge from '../../shared/assets/figma/new-surfaces/e3d23.svg';
import settingsIcon from '../../shared/assets/figma/new-surfaces/acc14.svg';
import checkIcon from '../../shared/assets/figma/new-surfaces/d5ffd.svg';
import chevronIcon from '../../shared/assets/figma/new-surfaces/1e787.svg';
import styles from './NotificationCenter.module.css';

export type NotificationCategory = 'all' | 'invitation' | 'plan' | 'packing' | 'finance' | 'price';
export interface NotificationViewItem {
  id: string;
  category: Exclude<NotificationCategory, 'all'>;
  title: string;
  body: string;
  time: string;
  createdAt: string;
  read: boolean;
  destination?: string;
}
export interface NotificationCenterModel {
  items: readonly NotificationViewItem[];
  unread: number | null;
  today: number | null;
  week: number | null;
  partial?: boolean;
}
const categories = [
  ['all', 'Tất cả'], ['invitation', 'Lời mời'], ['plan', 'Lịch trình'],
  ['packing', 'Packing'], ['finance', 'Finance'], ['price', 'Giá vé'],
] as const;
const badges = {
  invitation: ['violet', invitationIcon], plan: ['blue', planIcon],
  packing: ['amber', packingIcon], finance: ['green', financeIcon], price: ['coral', priceIcon],
} as const;

/** W19/W19.1 presentation. Live data and design fixtures are supplied by separate callers. */
export function NotificationCenterView({ model, category, onCategoryChange, onMarkAll, onRead,
  marking, readBlocked = false, children, toast,
}: {
  model: NotificationCenterModel;
  category: NotificationCategory;
  onCategoryChange: (category: NotificationCategory) => void;
  onMarkAll: () => void;
  onRead?: (id: string) => void;
  marking?: string | null;
  readBlocked?: boolean;
  children?: ReactNode;
  toast?: ReactNode;
}) {
  const visible = model.items.filter(item => category === 'all' || item.category === category);
  return <section className={styles.page} data-node-id="944:16780">
    <header className={styles.heading}>
      <h1>Thông báo</h1>
      <p>Theo dõi lời mời, thay đổi lịch trình, Packing, Finance và Price Watch.</p>
    </header>
    <div className={styles.columns}>
      <section className={styles.inbox} aria-label="Danh sách thông báo">
        <div className={styles.toolbar}>
          <div className={styles.filters} aria-label="Loại thông báo">
            {categories.map(([id, label]) => <Button key={id} variant="ghost" className={styles.filter}
              aria-pressed={category === id} onClick={() => onCategoryChange(id)}>{label}</Button>)}
          </div>
          <Button variant="ghost" className={styles.markAll} onClick={onMarkAll}
            icon={<img src={checkIcon} alt="" />}>Đánh dấu đã đọc</Button>
        </div>
        {children}
        <ul className={styles.rows}>
          {visible.map(item => <li key={item.id} className={styles.row} data-unread={!item.read || undefined}>
            <span className={styles.badge} data-tone={badges[item.category][0]} aria-hidden="true">
              <img src={badges[item.category][1]} alt="" />
            </span>
            <div className={styles.copy}><strong>{item.title}</strong><p>{item.body}</p></div>
            {item.destination && <Link className={item.category === 'invitation' ? styles.invite : styles.detail}
              to={item.destination} aria-label={item.category === 'invitation' ? 'Xem lời mời' : `Xem chi tiết: ${item.title}`}>
              <img src={chevronIcon} alt="" />{item.category === 'invitation' ? 'Xem lời mời' : <span className="sr-only">Xem chi tiết</span>}
            </Link>}
            <time dateTime={item.createdAt}>{item.time}</time>
            {!item.read && <button type="button" className={styles.unread}
              aria-label={`Đánh dấu đã đọc: ${item.title}`} title="Đánh dấu đã đọc"
              disabled={readBlocked || !!marking || !onRead} aria-busy={marking === item.id || undefined}
              onClick={() => onRead?.(item.id)}><span /></button>}
          </li>)}
        </ul>
        {toast}
      </section>
      <aside className={styles.preferences}>
        <span className={styles.badge} data-tone="violet" aria-hidden="true"><img src={settingsBadge} alt="" /></span>
        <h2>Tùy chọn nhận thông báo</h2>
        <p>Email, push, thiết bị và cảnh báo giá được quản lý ở cấp tài khoản cá nhân.</p>
        <Link className={styles.preferencesLink} to={`${paths.profile}#notifications`}><img src={settingsIcon} alt="" />Mở tùy chọn thông báo</Link>
        <dl className={styles.counts}>
          {(['Chưa đọc', 'Hôm nay', 'Tuần này'] as const).map((label, index) => <div key={label}>
            <dt>{label}{model.partial ? ' (đã tải)' : ''}</dt><dd>{[model.unread, model.today, model.week][index] ?? '—'}</dd>
          </div>)}
        </dl>
        <img className={styles.mascot} src={mascot} alt="" width="160" height="160" />
      </aside>
    </div>
  </section>;
}

function itemView(item: NotificationItem): NotificationViewItem {
  const category = item.type.includes('PRICE') ? 'price' : item.type.includes('PACKING') ? 'packing'
    : /CONTRIBUTION|CLOSURE/.test(item.type) ? 'finance' : item.type.includes('INVITATION') ? 'invitation' : 'plan';
  const destination = item.tripId ? category === 'price' ? paths.priceWatch(item.tripId)
    : category === 'packing' ? paths.packing(item.tripId) : category === 'finance' ? paths.fund(item.tripId)
      : category === 'plan' ? paths.plan(item.tripId) : paths.trip(item.tripId) : undefined;
  return { id: item.id, title: item.title, body: item.body, createdAt: item.createdAt,
    time: new Date(item.createdAt).toLocaleString('vi-VN'), read: !!item.readAt, category,
    ...(destination ? { destination } : {}) };
}

function RuntimeNotificationCenter({ actor }: { actor: string }) {
  const repository = useRuntimeServices()?.notifications;
  const cache = useQueryClient(), writeScope = useWriteScope(actor), inFlight = useRef(false);
  const [category, setCategory] = useState<NotificationCategory>('all');
  const [error, setError] = useState(''), [unknown, setUnknown] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);
  const inbox = useInfiniteQuery({
    queryKey: ['notifications', actor, 'inbox', false],
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) => repository!.list(undefined, pageParam, signal),
    getNextPageParam: page => page.nextCursor ?? undefined, enabled: !!repository,
    staleTime: 0, refetchOnWindowFocus: true, refetchInterval: 30_000,
    refetchIntervalInBackground: false, retry: false,
  });
  const items = [...new Map(inbox.data?.pages.flatMap(page => page.items).map(item => [item.id, item]) ?? []).values()];
  const mark = async (id: string) => {
    if (!repository || inFlight.current || unknown) return;
    const signal = writeScope(); if (signal.aborted) return;
    inFlight.current = true; setMarking(id); setError('');
    try {
      await repository.read(id, signal);
      if (!signal.aborted) await cache.invalidateQueries({ queryKey: ['notifications', actor] });
    } catch (cause) {
      if (!signal.aborted) {
        const uncertain = commandFailure(cause).uncertain; setUnknown(uncertain);
        setError(uncertain ? 'Chưa xác nhận được trạng thái đã đọc. Tải lại danh sách để đối chiếu trước khi thử tiếp.' : 'Chưa thể đánh dấu đã đọc. Bạn có thể thử lại.');
      }
    } finally { inFlight.current = false; if (!signal.aborted) setMarking(null); }
  };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const week = new Date(today); week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
  const available = !!repository && !!inbox.data;
  return <NotificationCenterView category={category} onCategoryChange={setCategory}
    model={{ items: items.map(itemView), unread: available ? items.filter(item => !item.readAt).length : null,
      today: available ? items.filter(item => Date.parse(item.createdAt) >= today.getTime()).length : null,
      week: available ? items.filter(item => Date.parse(item.createdAt) >= week.getTime()).length : null,
      partial: !!inbox.hasNextPage }} marking={marking} readBlocked={unknown} onRead={id => void mark(id)}
    onMarkAll={() => setError('Đánh dấu tất cả chưa khả dụng. Bạn có thể đánh dấu từng thông báo bằng nút chấm tròn bên phải.')}>
    {error && <Alert live>{error}{unknown && <Button variant="plain" onClick={async () => {
      const result = await inbox.refetch(); if (!result.isError) { setUnknown(false); setError(''); }
    }}>Tải lại danh sách</Button>}</Alert>}
    {!repository ? <ContentState state="unavailable" /> : inbox.isPending ? <ContentState state="loading" /> : null}
    {inbox.isError && <Alert tone="error">Không tải được thông báo. <Button variant="plain" onClick={() => void (inbox.isFetchNextPageError ? inbox.fetchNextPage() : inbox.refetch())}>Thử lại</Button></Alert>}
    {available && !items.length && <ContentState state="empty" />}
    {inbox.hasNextPage && <Button variant="outline" loading={inbox.isFetchingNextPage} onClick={() => void inbox.fetchNextPage()}>Tải thêm</Button>}
  </NotificationCenterView>;
}
export function NotificationCenterPage() {
  const { viewer } = useOutletContext<RouteContext>();
  return viewer?.id ? <RuntimeNotificationCenter key={viewer.id} actor={viewer.id} /> : <ContentState state="unavailable" />;
}
