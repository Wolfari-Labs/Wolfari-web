import { useRef, type ReactNode, type RefObject } from 'react';
import { Drawer } from '../../shared/components/Drawer';
import { Button } from '../../shared/components/Button';
import styles from './PriceWatchOverlay.module.css';

export function PriceWatchOverlay({
  open,
  title,
  busy = false,
  onDismiss,
  children,
  headingRef,
  returnFocusRef,
}: {
  open: boolean;
  title: string;
  busy?: boolean;
  onDismiss: () => void;
  children: ReactNode;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const ownHeading = useRef<HTMLHeadingElement>(null);
  const focus = headingRef ?? ownHeading;
  return (
    <Drawer
      open={open}
      label={title}
      side="center"
      showHeader={false}
      onDismiss={() => {
        if (!busy) onDismiss();
      }}
      initialFocusRef={focus}
      {...(returnFocusRef ? { returnFocusRef } : {})}
      className={styles.modal ?? ''}
      overlayClassName={styles.backdrop ?? ''}
    >
      <header className={styles.header}>
        <h2 ref={focus} tabIndex={-1}>
          {title}
        </h2>
        <Button variant="outline" disabled={busy} onClick={onDismiss}>
          ← Trở lại
        </Button>
      </header>
      <div className={styles.body}>{children}</div>
    </Drawer>
  );
}
