import { Icon } from './Icon';
import styles from './Ui.module.css';
import toastStyles from './SuccessToast.module.css';

/** Only confirmed, non-critical success belongs here. Recovery stays in the page. */
export function SuccessToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <Toast.Provider label="Thông báo" duration={4500} swipeDirection="right">
      <Toast.Root
        open={!!message}
        onOpenChange={(open) => {
          if (!open) onDismiss();
        }}
        className={`${styles.toast} ${toastStyles.toast}`}
      >
        <span className={toastStyles.badge} aria-hidden="true">
          <Icon name="check" size={18} strokeWidth={2.4} />
        </span>
        <Toast.Title className={toastStyles.title}>{message}</Toast.Title>
        <Toast.Close
          className={`${styles.toastClose} ${toastStyles.close}`}
          aria-label="Đóng thông báo thành công"
        >
          <Icon name="close" size={18} />
        </Toast.Close>
      </Toast.Root>
      <Toast.Viewport className={styles.toastViewport} label="Thông báo kết quả ({hotkey})" />
    </Toast.Provider>
  );
}
import { Toast } from 'radix-ui';
