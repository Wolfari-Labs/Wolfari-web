import type { DomainError } from '../types/result';
import styles from './ContentState.module.css';
import { Button } from './Button';
import { Skeleton } from './Skeleton';

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
  headingLevel = 1,
}: {
  state: 'loading' | 'empty' | 'error' | 'placeholder' | 'not-found' | 'unavailable';
  headingLevel?: 1 | 2;
  error?: DomainError;
  onRetry?: () => void;
}) {
  const [title, description] =
    state === 'unavailable'
      ? ['Chức năng chưa khả dụng', 'Phần này chưa được tích hợp.']
      : error
        ? messages[error.code]
        : state === 'error'
          ? messages.SERVICE_UNAVAILABLE
          : state === 'loading'
            ? ['Đang tải…', 'Vui lòng đợi trong giây lát.']
            : state === 'empty'
              ? ['Chưa có nội dung', 'Nội dung sẽ xuất hiện tại đây khi có dữ liệu.']
              : state === 'not-found'
                ? ['Không tìm thấy trang', 'Chọn một mục trong thanh điều hướng để tiếp tục.']
                : ['Không gian làm việc', 'Nội dung màn hình sẽ được triển khai ở flow tiếp theo.'];
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
      {error?.correlationId && <small>Mã đối chiếu: {error.correlationId}</small>}
      {onRetry && (error?.retryable || error?.code === 'VERSION_CONFLICT') && (
        <Button variant="outline" onClick={onRetry}>
          Tải lại
        </Button>
      )}
    </section>
  );
}
