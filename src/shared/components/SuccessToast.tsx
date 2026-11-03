import { Icon } from './Icon';
import styles from './Ui.module.css';

/** Only confirmed, non-critical success belongs here. Recovery stays in the page. */
export function SuccessToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <Toast.Provider label="Thông báo" duration={4500} swipeDirection="right">
      <Toast.Root
        open={!!message}
        onOpenChange={(open) => {
          if (!open) onDismiss();
        }}
        className={styles.toast}
      >
        <Icon name="check" />
        <Toast.Title>{message}</Toast.Title>
        <Toast.Close className={styles.toastClose} aria-label="Đóng thông báo thành công">
          <Icon name="close" size={18} />
        </Toast.Close>
      </Toast.Root>
      <Toast.Viewport className={styles.toastViewport} label="Thông báo kết quả ({hotkey})" />
    </Toast.Provider>
  );
}
import { Toast } from 'radix-ui';
