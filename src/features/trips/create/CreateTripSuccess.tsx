import { useRef, type RefObject } from 'react';
import { paths } from '../../../app/route-paths';
import { Button } from '../../../shared/components/Button';
import { ButtonLink } from '../../../shared/components/ButtonLink';
import { Drawer } from '../../../shared/components/Drawer';
import mascot from '../../../shared/assets/figma/ddfc7.png';
import styles from './CreateTripPage.module.css';

export function CreateTripSuccess({
  tripId,
  onDismiss,
  returnFocusRef,
}: {
  tripId: string;
  onDismiss: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const primaryFocusRef = useRef<HTMLAnchorElement>(null);
  return (
    <Drawer
      open
      label="Chuyến đi đã sẵn sàng"
      onDismiss={onDismiss}
      side="center"
      className={styles.successDialog ?? ''}
      initialFocusRef={primaryFocusRef}
      {...(returnFocusRef ? { returnFocusRef } : {})}
      showHeader={false}
    >
      <div className={styles.success}>
        <img src={mascot} alt="Chú sói Wolfari ăn mừng" />
        <p>HOÀN TẤT</p>
        <h1 id="create-trip-success-title">Chuyến đi đã sẵn sàng</h1>
        <span>
          Một hành trình mới đang chờ bạn. Bắt đầu lên lịch và lưu lại những điều tuyệt vời nhé!
        </span>
        <div className={styles.successActions}>
          <ButtonLink ref={primaryFocusRef} to={paths.trip(tripId)}>
            Mở chuyến đi <span aria-hidden="true">→</span>
          </ButtonLink>
          <Button type="button" variant="plain" onClick={onDismiss}>
            Đóng thông báo
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
