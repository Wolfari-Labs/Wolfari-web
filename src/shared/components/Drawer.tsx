import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { Dialog } from 'radix-ui';
import { Icon } from './Icon';
import styles from './Drawer.module.css';
export function Drawer({
  open,
  label,
  onDismiss,
  side = 'left',
  className = '',
  initialFocusRef,
  returnFocusRef,
  showHeader = true,
  children,
}: {
  open: boolean;
  label: string;
  onDismiss: () => void;
  side?: 'left' | 'right' | 'center';
  className?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  showHeader?: boolean;
  children: ReactNode;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open) returnFocus.current = document.activeElement as HTMLElement;
  }, [open]);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.backdrop} />
        <Dialog.Content
          aria-describedby={undefined}
          className={`${styles.drawer} ${side === 'center' ? styles.center : side === 'right' ? styles.right : ''} ${className}`}
          onOpenAutoFocus={(event) => {
            if (initialFocusRef?.current) {
              event.preventDefault();
              initialFocusRef.current.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const destination = returnFocusRef?.current ?? returnFocus.current;
            if (document.activeElement?.id !== 'main-content' && destination?.isConnected)
              destination.focus();
          }}
        >
          <div className={showHeader ? styles.heading : styles.hiddenHeading}>
            <Dialog.Title className={styles.title}>{label}</Dialog.Title>
            {showHeader && (
              <Dialog.Close aria-label={'Đóng ' + label.toLocaleLowerCase('vi')}>
                <Icon name="close" />
              </Dialog.Close>
            )}
          </div>
          <div className={styles.content}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
