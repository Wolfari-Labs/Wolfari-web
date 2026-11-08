import type { ReactNode } from 'react';
import styles from './TimelineCard.module.css';

/** Presentation only: Preview drafts and Gateway commands remain separate. */
export function TimelineCard({
  title,
  time,
  description,
  completed,
  location,
  actions,
  handle,
  cover,
  typeIcon,
  compact = false,
}: {
  title: string;
  time: string;
  description?: string | null;
  completed?: boolean;
  location?: string | null;
  actions?: ReactNode;
  handle?: ReactNode;
  cover?: { src: string; alt: string } | null;
  typeIcon?: string | null;
  compact?: boolean;
}) {
  const subtitle = location || description;
  return (
    <div
      className={styles.card}
      data-timeline-card
      data-completed={completed || undefined}
      data-compact={compact || undefined}
    >
      <div className={styles.handle}>{handle}</div>
      <div className={styles.schedule}>{time}</div>
      <div className={styles.body}>
        {typeIcon && (
          <span className={styles.typeIcon} aria-hidden="true">
            <img src={typeIcon} alt="" />
          </span>
        )}
        <div className={styles.copy}>
          <h3 title={title}>{title}</h3>
          {subtitle && <p title={subtitle}>{subtitle}</p>}
          <span className={styles.srOnly}>{completed ? 'Đã hoàn tất' : 'Chưa hoàn tất'}</span>
        </div>
      </div>
      <div className={styles.media}>
        {cover && <img src={cover.src} alt={cover.alt} loading="lazy" />}
      </div>
      <div className={styles.actions}>{actions}</div>
    </div>
  );
}
