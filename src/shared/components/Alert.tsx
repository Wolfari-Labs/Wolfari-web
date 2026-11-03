import type { ReactNode } from 'react';
import styles from './Alert.module.css';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';

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
        {tone === 'info' ? (
          <Info size={18} />
        ) : tone === 'success' ? (
          <CircleCheck size={18} />
        ) : (
          <CircleAlert size={18} />
        )}
      </span>
      <div>{children}</div>
    </div>
  );
}
