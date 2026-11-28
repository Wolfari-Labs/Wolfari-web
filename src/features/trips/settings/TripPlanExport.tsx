import { useEffect, useRef, useState } from 'react';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icon';
import type { TripDetailViewModel } from '../model/trip-detail';
import { useTripRepository } from '../repositories/repository-context';
import styles from './TripPlanExport.module.css';

export function TripPlanExport({
  trip,
  onBusyChange,
}: {
  trip: TripDetailViewModel;
  onBusyChange: (busy: boolean) => void;
}) {
  const repository = useTripRepository();
  const request = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);

  useEffect(
    () => () => {
      request.current?.abort();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  async function preview() {
    if (!repository.planPdf || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError('');
    try {
      const blob = await repository.planPdf({ tripId: trip.id, signal: controller.signal });
      if (controller.signal.aborted) return;
      const nextUrl = URL.createObjectURL(blob);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = nextUrl;
      setPreviewUrl(nextUrl);
    } catch {
      if (!controller.signal.aborted) setError('Chưa tải được bản xem trước. Vui lòng thử lại.');
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function download() {
    if (!previewUrl || busy) return;
    const anchor = document.createElement('a');
    anchor.href = previewUrl;
    anchor.download = `wolfari-plan-${trip.id}.pdf`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <section className={styles.export} aria-labelledby="trip-export-heading">
      <div className={styles.heading}>
        <h2 id="trip-export-heading">Xuất plan</h2>
        <p>Xem trước lịch trình chuyến đi trước khi tải file PDF.</p>
      </div>
      {repository.planPdf ? (
        <>
          <div className={styles.actions}>
            <Button variant="outline" loading={busy} onClick={() => void preview()}>
              {previewUrl ? 'Tải lại bản xem trước' : 'Xem trước PDF'}
            </Button>
            <Button disabled={!previewUrl || busy} onClick={download}>
              Tải PDF
            </Button>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <div className={styles.preview} aria-busy={busy || undefined}>
            {previewUrl ? (
              <iframe
                title="Xem trước plan chuyến đi"
                src={`${previewUrl}#view=FitH`}
                className={styles.document}
              />
            ) : (
              <div className={styles.placeholder}>
                <span className={styles.fileIcon} aria-hidden="true">
                  <Icon name="fileText" size={30} />
                </span>
                <strong>{trip.name}</strong>
                <p>{busy ? 'Đang tải bản xem trước…' : 'Chọn Xem trước PDF để xem lịch trình.'}</p>
              </div>
            )}
          </div>
          <span className={styles.status} role="status">
            {busy
              ? 'Đang tải bản xem trước…'
              : previewUrl
                ? 'Bản xem trước đã sẵn sàng. Bạn có thể tải PDF.'
                : ''}
          </span>
        </>
      ) : (
        <p>Xuất PDF chưa khả dụng trong chế độ dữ liệu hiện tại.</p>
      )}
    </section>
  );
}
