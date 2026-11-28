import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePlanRepository } from '../plan/repositories/plan-context';
import { Button } from '../../shared/components/Button';
import styles from './DressCodeReferenceImage.module.css';

export function DressCodeReferenceImage({
  tripId,
  dressCodeId,
  available,
}: {
  tripId: string;
  dressCodeId: string;
  available: boolean;
}) {
  const repository = usePlanRepository();
  const supported = !!repository.dressCodeImage;
  const query = useQuery({
    queryKey: ['plan', tripId, 'dress-code-image', dressCodeId],
    enabled: available && supported,
    queryFn: ({ signal }) =>
      repository.dressCodeImage!({ tripId, dressCodeId, signal }),
  });
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!query.data) {
      setSrc(null);
      return;
    }
    const objectUrl = URL.createObjectURL(query.data);
    setSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [query.data]);
  if (!available) return null;
  if (!supported) return <p>Ảnh tham khảo chưa khả dụng trong chế độ dữ liệu hiện tại.</p>;
  if (query.isError)
    return (
      <div>
        <p role="alert">Chưa tải được ảnh tham khảo.</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Tải lại ảnh
        </Button>
      </div>
    );
  return src ? (
    <div className={styles.imagePanel}>
      <img className={styles.image} src={src} alt="Ảnh tham khảo dress code" />
      <a href={src} download={`dress-code-${dressCodeId}.jpg`}>
        Tải ảnh tham khảo
      </a>
    </div>
  ) : (
    <p role="status">Đang tải ảnh tham khảo…</p>
  );
}
