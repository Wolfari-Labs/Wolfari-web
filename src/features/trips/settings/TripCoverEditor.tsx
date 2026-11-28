import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icon';
import type { TripDetailViewModel } from '../model/trip-detail';
import { useTripRepository } from '../repositories/repository-context';
import { useTripCoverImage } from '../hooks/use-trip-cover-image';
import { useWriteScope } from '../../../shared/lib/use-write-scope';
import styles from './TripCoverEditor.module.css';

function uploadErrorMessage(error: unknown) {
  switch (error instanceof Error && 'code' in error ? error.code : null) {
    case 'VALIDATION_FAILED':
      return 'Máy chủ không đọc được ảnh. Hãy chọn ảnh JPEG hoặc PNG tĩnh, tối đa 5 MB và 30 megapixel.';
    case 'UNAUTHENTICATED':
      return 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để đổi ảnh bìa.';
    case 'PERMISSION_DENIED':
      return 'Bạn không có quyền đổi ảnh bìa của chuyến đi này.';
    case 'RESOURCE_NOT_FOUND':
      return 'Chuyến đi không còn khả dụng.';
    case 'STATE_CONFLICT':
      return 'Trạng thái chuyến đi đã thay đổi. Tải lại chuyến đi trước khi đổi ảnh bìa.';
    case 'SERVICE_UNAVAILABLE':
      return 'Dịch vụ ảnh bìa tạm thời chưa khả dụng. Tải lại chuyến đi để kiểm tra ảnh trước khi thử lại.';
    default:
      return 'Chưa xác nhận được ảnh bìa đã lưu. Tải lại chuyến đi để kiểm tra trước khi thử lại.';
  }
}

export function TripCoverEditor({
  trip,
  disabled = false,
  onBusyChange,
}: {
  trip: TripDetailViewModel;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const repository = useTripRepository();
  const queryClient = useQueryClient();
  const cover = useTripCoverImage(trip.id, trip.presentation.coverAvailable);
  const coverSrc = cover.src ?? trip.presentation.cover?.src;
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const identity = `${trip.currentMembership.userId}:${trip.id}`;
  const writeScope = useWriteScope(identity);
  const inFlight = useRef<AbortSignal | null>(null);
  const canEdit =
    trip.currentMembership.role === 'OWNER' &&
    !trip.currentMembership.leftAt &&
    trip.permissions.canUpdate &&
    trip.lifecycle !== 'ARCHIVED' &&
    !trip.archivedAt;

  useLayoutEffect(() => {
    inFlight.current = null;
    setBusy(false);
    setFeedback(null);
  }, [identity]);

  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  async function upload(file?: File) {
    if (!file || inFlight.current || busy || disabled || !canEdit) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setFeedback({ tone: 'error', message: 'Chọn ảnh JPEG hoặc PNG có dung lượng tối đa 5 MB.' });
      return;
    }
    if (!file.size) {
      setFeedback({ tone: 'error', message: 'Tệp ảnh trống. Hãy chọn ảnh khác.' });
      return;
    }
    if (!repository.uploadCover) {
      setFeedback({
        tone: 'error',
        message: 'Tải ảnh bìa chưa khả dụng trong chế độ dữ liệu hiện tại.',
      });
      return;
    }
    const signal = writeScope();
    if (signal.aborted) return;
    inFlight.current = signal;
    setBusy(true);
    setFeedback(null);
    try {
      await repository.uploadCover({ tripId: trip.id, file, signal });
      if (signal.aborted) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trip', 'cover', trip.id] }),
        queryClient.invalidateQueries({ queryKey: ['trip', 'detail', trip.id] }),
        queryClient.invalidateQueries({ queryKey: ['trips', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['shell', trip.id] }),
      ]);
      if (!signal.aborted) setFeedback({ tone: 'success', message: 'Đã lưu ảnh bìa.' });
    } catch (error) {
      if (!signal.aborted) setFeedback({ tone: 'error', message: uploadErrorMessage(error) });
    } finally {
      if (inFlight.current === signal) inFlight.current = null;
      if (!signal.aborted) setBusy(false);
    }
  }

  async function remove() {
    if (!repository.removeCover || inFlight.current || busy || disabled || !canEdit) return;
    const signal = writeScope();
    if (signal.aborted) return;
    inFlight.current = signal;
    setBusy(true);
    setFeedback(null);
    try {
      await repository.removeCover({ tripId: trip.id, signal });
      if (signal.aborted) return;
      queryClient.removeQueries({ queryKey: ['trip', 'cover', trip.id] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trip', 'detail', trip.id] }),
        queryClient.invalidateQueries({ queryKey: ['trips', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['shell', trip.id] }),
      ]);
    } catch {
      if (!signal.aborted)
        setFeedback({
          tone: 'error',
          message: 'Chưa xác nhận được ảnh bìa đã xóa. Tải lại chuyến đi để kiểm tra.',
        });
    } finally {
      if (inFlight.current === signal) inFlight.current = null;
      if (!signal.aborted) setBusy(false);
    }
  }

  return (
    <section className={styles.editor} aria-labelledby="trip-cover-heading">
      <h3 id="trip-cover-heading">Ảnh bìa chuyến đi</h3>
      {coverSrc ? (
        <img className={styles.cover} src={coverSrc} alt="" />
      ) : cover.isError ? (
        <div className={styles.placeholder}>
          <Alert tone="error">Chưa tải được ảnh bìa.</Alert>
          <Button
            variant="outline"
            disabled={disabled || busy || cover.isFetching}
            onClick={() => void cover.refetch()}
          >
            Tải lại ảnh
          </Button>
        </div>
      ) : (
        <div className={styles.placeholder}>
          {cover.isPending && repository.getCover && trip.presentation.coverAvailable
            ? 'Đang tải ảnh bìa…'
            : trip.presentation.coverAvailable
              ? 'Ảnh bìa chưa thể tải trong chế độ dữ liệu hiện tại.'
              : 'Chưa có ảnh bìa.'}
        </div>
      )}
      {canEdit && (
        <>
          <div className={styles.actions}>
            <label className={styles.fileButton}>
              <Icon name="imagePlus" size={18} />
              Chọn ảnh bìa
              <input
                className={styles.fileInput}
                type="file"
                aria-label="Chọn ảnh bìa"
                accept="image/jpeg,image/png"
                disabled={disabled || busy || !repository.uploadCover}
                onChange={(event) => {
                  void upload(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </label>
            {trip.presentation.coverAvailable && (
              <Button
                variant="outline"
                loading={busy}
                disabled={disabled || busy || !repository.removeCover}
                onClick={() => void remove()}
              >
                Xóa ảnh
              </Button>
            )}
          </div>
          <p className={styles.note}>
            Ảnh JPEG hoặc PNG tĩnh, tối đa 5 MB và 30 megapixel. Ảnh được lưu ngay khi chọn.
          </p>
          {!repository.uploadCover && (
            <p className={styles.note}>Tải ảnh bìa chưa khả dụng trong chế độ dữ liệu hiện tại.</p>
          )}
        </>
      )}
      {busy && (
        <p className={styles.note} role="status">
          Đang cập nhật ảnh bìa…
        </p>
      )}
      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}
    </section>
  );
}
