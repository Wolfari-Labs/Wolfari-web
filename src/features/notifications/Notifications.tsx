import { lazy, Suspense, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router';
import { useRuntimeServices } from '../../app/gateway-context';
import { Drawer } from '../../shared/components/Drawer';
import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';
import { ContentState } from '../../shared/components/ContentState';
import styles from './Notifications.module.css';
const Inbox = lazy(() => import('./NotificationInbox'));
export function Notifications({ actor }: { actor: string }) {
  const repository = useRuntimeServices()?.notifications,
    { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  const dot = useQuery({
    queryKey: ['notifications', actor, 'unread-indicator'],
    queryFn: ({ signal }) => repository!.list(true, null, signal),
    enabled: !!repository,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={styles.bell}
        aria-label={dot.data?.items.length ? 'Thông báo · Có tin chưa đọc' : 'Thông báo'}
        onClick={() => setOpen(true)}
      >
        <Icon name="bell" />
        {!!dot.data?.items.length && <span className={styles.dot} />}
      </Button>
      <Drawer open={open} label="Thông báo" side="right" onDismiss={() => setOpen(false)}>
        {open && (
          <Suspense fallback={<ContentState state="loading" />}>
            <Inbox actor={actor} onNavigate={() => setOpen(false)} />
          </Suspense>
        )}
      </Drawer>
    </>
  );
}
