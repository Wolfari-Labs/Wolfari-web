import type { ReactNode } from 'react';
import styles from './CapabilityNote.module.css';

export function CapabilityNote({
  children,
  id,
  tone = 'info',
}: {
  children: ReactNode;
  id?: string;
  tone?: 'info' | 'warning';
}) {
  return (
    <p id={id} className={`${styles.note} ${styles[tone]}`} role="note">
      {children}
    </p>
  );
}
