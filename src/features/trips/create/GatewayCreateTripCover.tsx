import { useEffect, useState, type ChangeEvent } from 'react';
import { Button } from '../../../shared/components/Button';
import { Icon } from '../../../shared/components/Icon';
import cover1 from '../../../shared/assets/figma/57139.svg';
import cover2 from '../../../shared/assets/figma/b13e3.svg';
import cover3 from '../../../shared/assets/figma/0ca42.svg';
import styles from './CreateTripPage.module.css';

const coverOptions = [
  { id: 'cover-1', image: cover1, label: 'Bầu trời xanh' },
  { id: 'cover-2', image: cover2, label: 'Hoàng hôn' },
  { id: 'cover-3', image: cover3, label: 'Thiên nhiên' },
] as const;

type CoverPreset = (typeof coverOptions)[number]['id'];
export type GatewayCoverChoice = File | CoverPreset;

export async function resolveGatewayCoverFile(choice: GatewayCoverChoice): Promise<File> {
  if (typeof choice !== 'string') return choice;

  const option = coverOptions.find(({ id }) => id === choice)!;
  const image = new Image();
  image.src = option.image;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = Math.round((canvas.width * image.naturalHeight) / image.naturalWidth);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Không thể chuẩn bị ảnh bìa.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Không thể chuẩn bị ảnh bìa.'));
      },
      'image/jpeg',
      0.9,
    );
  });
  return new File([blob], `${choice}.jpg`, { type: 'image/jpeg' });
}

export function GatewayCreateTripCover({
  choice,
  onChoiceChange,
}: {
  choice: GatewayCoverChoice | null;
  onChoiceChange: (choice: GatewayCoverChoice | null) => void;
}) {
  const file = typeof choice === 'string' ? null : choice;
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== 'function') {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const select = (next: GatewayCoverChoice | null) => {
    setError('');
    onChoiceChange(next);
  };

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!next) return;
    if (!['image/jpeg', 'image/png'].includes(next.type) || next.size > 5 * 1024 * 1024) {
      setError('Chọn ảnh JPEG hoặc PNG có dung lượng tối đa 5 MB.');
    } else if (!next.size) {
      setError('Tệp ảnh trống. Hãy chọn ảnh khác.');
    } else {
      select(next);
    }
  };

  return (
    <fieldset className={styles.coverField}>
      <legend>Ảnh bìa chuyến đi</legend>
      <div className={styles.coverChoices}>
        <label className={`${styles.uploadCover} ${file ? styles.selectedCover : ''}`}>
          <input
            type="file"
            accept="image/jpeg,image/png"
            aria-label="Chọn ảnh bìa"
            onChange={upload}
          />
          {file && src ? (
            <img src={src} alt="Ảnh bìa đã chọn" />
          ) : (
            <>
              <span className={styles.uploadBadge} aria-hidden="true">
                <Icon name="imagePlus" size={22} />
              </span>
              <strong>{file?.name ?? 'Tải ảnh lên'}</strong>
              <small>PNG, JPG · Tối đa 5 MB</small>
            </>
          )}
        </label>
        {coverOptions.map(({ id, image, label }) => (
          <button
            key={id}
            type="button"
            className={choice === id ? styles.selectedCover : ''}
            aria-label={`Chọn ảnh bìa ${label}`}
            aria-pressed={choice === id}
            onClick={() => select(id)}
          >
            <img src={image} alt="" />
          </button>
        ))}
      </div>
      {error && (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
      {choice && (
        <Button type="button" variant="plain" onClick={() => select(null)}>
          Bỏ ảnh bìa
        </Button>
      )}
    </fieldset>
  );
}
