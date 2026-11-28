import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useRuntimeServices } from '../../app/gateway-context';
import { paths } from '../../app/route-paths';
import bellIcon from '../../shared/assets/figma/new-surfaces/0e4d8.svg';
import styles from './Notifications.module.css';
export function Notifications({ actor }: { actor: string }) {
  const repository = useRuntimeServices()?.notifications;
  const dot = useQuery({
    queryKey: ['notifications', actor, 'unread-indicator'],
    queryFn: ({ signal }) => repository!.list(true, null, signal),
    enabled: !!repository,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  return (
      <Link
        to={paths.notifications}
        className={styles.bell}
        aria-label={dot.data?.items.length ? 'Thông báo · Có tin chưa đọc' : 'Thông báo'}
      >
        <img src={bellIcon} alt="" />
        {!!dot.data?.items.length && <span className={styles.dot} />}
      </Link>
  );
}
