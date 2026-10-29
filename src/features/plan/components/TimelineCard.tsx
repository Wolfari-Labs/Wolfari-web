import type { ReactNode } from 'react';
import { m } from 'motion/react';
import { Badge } from '../../../shared/components/Ui';
import { Icon } from '../../../shared/components/Icon';
import styles from './TimelineCard.module.css';
export function TimelineCard({
  title,
  time,
  description,
  completed,
  location,
  actions,
  handle,
  cover,
}: {
  title: string;
  time: string;
  description?: string | null;
  completed?: boolean;
  location?: string | null;
  actions?: ReactNode;
  handle?: ReactNode;
  cover?: { src: string; alt: string } | null;
}) {
  return (
    <m.div
      className={styles.card}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className={styles.schedule}>
        <Icon name="plan" size={18} />
        <span>{time}</span>
        {handle}
      </div>
      <div className={styles.body}>
        <div className={styles.copy}>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
          {location && (
            <span className={styles.location}>
              <Icon name="map" size={16} />
              {location}
            </span>
          )}
        </div>
        {cover && <img src={cover.src} alt={cover.alt} loading="lazy" width="120" height="80" />}
      </div>
      <div className={styles.footer}>
        <Badge tone={completed ? 'success' : 'neutral'}>
          {completed ? 'Đã hoàn tất' : 'Chưa hoàn tất'}
        </Badge>
        <div className={styles.actions}>{actions}</div>
      </div>
    </m.div>
  );
}
