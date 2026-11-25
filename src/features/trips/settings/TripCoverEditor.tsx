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
  const [error, setError] = useState('');
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
    setError('');
  }, [identity]);

  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  async function upload(file?: File) {
    if (!file || inFlight.current || busy || disabled || !canEdit) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Chọn ảnh JPEG hoặc PNG có dung lượng tối đa 5 MB.');
      return;
    }
    if (!repository.uploadCover) {
      setError('Tải ảnh bìa chưa khả dụng trong chế độ dữ liệu hiện tại.');
      return;
    }
    const signal = writeScope();
    if (signal.aborted) return;
    inFlight.current = signal;
    setBusy(true);
    setError('');
    try {
      await repository.uploadCover({ tripId: trip.id, file, signal });
      if (signal.aborted) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trip', 'cover', trip.id] }),
        queryClient.invalidateQueries({ queryKey: ['trip', 'detail', trip.id] }),
        queryClient.invalidateQueries({ queryKey: ['trips', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['shell', trip.id] }),
      ]);
    } catch {
      if (!signal.aborted) setError('Chưa tải được ảnh bìa. Kiểm tra kết nối rồi thử lại.');
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
    setError('');
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
        setError('Chưa xóa được ảnh bìa. Trạng thái hiện tại chưa thay đổi trên giao diện.');
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
            Ảnh JPEG hoặc PNG, tối đa 5 MB. Ảnh được cập nhật ngay khi chọn.
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
      {error && <Alert tone="error">{error}</Alert>}
    </section>
  );
}
