import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { paths } from '../../../app/route-paths';
import { Icon } from '../../../shared/components/Icon';
import styles from './TripListHero.module.css';

/** Web v2 W02 header (Figma 932:6959): greeting, search pill and the create button. */
export function TripListHero({
  viewerName,
  search,
}: {
  viewerName?: string | null | undefined;
  search?: ReactNode;
}) {
  const firstName = viewerName?.trim().split(/\s+/)[0];
  return (
    <header className={styles.hero} data-node-id="932:6959">
      <div className={styles.copy}>
        {firstName && <p className={styles.greeting}>Chào {firstName},</p>}
        <h1>
          <span className={styles.srOnly}>Chuyến đi của tôi · </span>
          Đi đâu tiếp nhỉ?
        </h1>
      </div>
      <div className={styles.actions}>
        {search}
        <Link className={styles.create} to={paths.newTrip}>
          <Icon name="plus" size={20} strokeWidth={2.4} />
          Tạo chuyến đi
        </Link>
      </div>
    </header>
  );
}
