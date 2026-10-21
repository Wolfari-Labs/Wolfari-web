import type { ReactNode } from 'react';
import styles from './Alert.module.css';

export function Alert({
  tone = 'info',
  children,
  live = true,
}: {
  tone?: 'info' | 'success' | 'warning' | 'error';
  children: ReactNode;
  live?: boolean;
}) {
  return (
    <div
      className={`${styles.alert} ${styles[tone]}`}
      {...(live ? { role: tone === 'error' ? 'alert' : 'status' } : {})}
    >
      <span aria-hidden="true" className={styles.marker}>
        {tone === 'info' ? 'i' : tone === 'success' ? '✓' : '!'}
      </span>
      <div>{children}</div>
    </div>
  );
}
