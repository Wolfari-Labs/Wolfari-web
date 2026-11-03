import type { DomainError } from '../types/result';
import styles from './ContentState.module.css';
import { Button } from './Button';
import { Skeleton } from './Skeleton';
import { ButtonLink } from './ButtonLink';

const messages = {
  PERMISSION_DENIED: ['Bạn không có quyền truy cập', 'Chọn nội dung bạn có quyền xem để tiếp tục.'],
  RESOURCE_NOT_FOUND: ['Không tìm thấy nội dung', 'Nội dung này hiện không khả dụng.'],
  VERSION_CONFLICT: ['Dữ liệu đã thay đổi', 'Tải lại dữ liệu mới nhất trước khi tiếp tục.'],
  SERVICE_UNAVAILABLE: ['Chưa thể tải nội dung', 'Vui lòng thử lại sau.'],
} as const;

export function ContentState({
  state,
  error,
  onRetry,
  showHome = false,
  onReload,
  headingLevel = 1,
}: {
  state: 'loading' | 'empty' | 'error' | 'placeholder' | 'not-found' | 'unavailable';
  headingLevel?: 1 | 2;
  error?: DomainError;
  onRetry?: () => void;
  showHome?: boolean;
  onReload?: () => void;
}) {
  const [title, description] =
    state === 'unavailable'
      ? ['Chức năng chưa khả dụng', 'Bạn có thể tiếp tục ở những mục khác của chuyến đi.']
      : error
        ? (messages[error.code as keyof typeof messages] ?? messages.SERVICE_UNAVAILABLE)
        : state === 'error'
          ? messages.SERVICE_UNAVAILABLE
          : state === 'loading'
            ? ['Đang tải…', 'Vui lòng đợi trong giây lát.']
            : state === 'empty'
              ? ['Chưa có nội dung', 'Nội dung sẽ xuất hiện tại đây khi có dữ liệu.']
              : state === 'not-found'
                ? ['Không tìm thấy trang', 'Chọn một mục trong thanh điều hướng để tiếp tục.']
                : ['Không gian làm việc', 'Chọn một mục trong thanh điều hướng để bắt đầu.'];
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <section
      className={styles.state}
      aria-busy={state === 'loading'}
      role={state === 'error' ? 'alert' : 'status'}
    >
      {state === 'loading' && <Skeleton className={styles.skeleton} />}
      <Heading>{title}</Heading>
      <p>{description}</p>
      {error?.correlationId && (
        <details>
          <summary>Chi tiết hỗ trợ</summary>
          <small>Mã đối chiếu: {error.correlationId}</small>
        </details>
      )}
      {onRetry && (error?.retryable || error?.code === 'VERSION_CONFLICT') && (
        <Button variant="outline" onClick={onRetry}>
          Tải lại
        </Button>
      )}
      {(showHome || onReload) && (
        <div className={styles.recovery}>
          {showHome && (
            <ButtonLink variant="outline" to="/">
              Về trang chủ
            </ButtonLink>
          )}
          {onReload && (
            <Button variant="outline" onClick={onReload}>
              Tải lại trang
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
