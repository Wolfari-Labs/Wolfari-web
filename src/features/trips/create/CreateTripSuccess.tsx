import { paths } from '../../../app/route-paths';
import { Button } from '../../../shared/components/Button';
import { ButtonLink } from '../../../shared/components/ButtonLink';
import mascot from '../../../shared/assets/figma/ddfc7.png';
import styles from './CreateTripPage.module.css';

export function CreateTripSuccess({ tripId, onContinue }: { tripId: string; onContinue: () => void }) {
  return (
    <div className={styles.successBackdrop} role="presentation">
      <section className={styles.success} role="dialog" aria-modal="true" aria-labelledby="create-trip-success-title">
        <img src={mascot} alt="Chú sói Wolfari ăn mừng" />
        <p>HOÀN TẤT</p>
        <h1 id="create-trip-success-title">Chuyến đi đã sẵn sàng</h1>
        <span>Một hành trình mới đang chờ bạn. Bắt đầu lên lịch và lưu lại những điều tuyệt vời nhé!</span>
        <div className={styles.successActions}>
          <ButtonLink to={paths.trip(tripId)}>Mở chuyến đi <span aria-hidden="true">→</span></ButtonLink>
          <Button type="button" variant="plain" onClick={onContinue}>Tiếp tục chỉnh sửa</Button>
        </div>
      </section>
    </div>
  );
}
