import { useState } from 'react';
import { Icon } from '../../shared/components/Icon';
import type { PlaceImage } from './places';
import styles from './PlacePhoto.module.css';

export function PlacePhoto({
  image,
  name,
  compact = false,
  linked = false,
}: {
  image: PlaceImage | null | undefined;
  name: string;
  compact?: boolean;
  linked?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const available = image && failedUrl !== image.url;
  return (
    <span className={styles.photo} data-place-photo data-compact={compact || undefined}>
      {available ? (
        <>
          <img
            src={compact ? image.smallUrl : image.thumbnailUrl}
            alt={`Ảnh ${name}`}
            loading="lazy"
            onError={() => setFailedUrl(image.url)}
          />
          <span className={styles.credit} data-photo-credit>
            {linked ? (
              <a href={image.sourceUrl} target="_blank" rel="noreferrer">
                {image.attribution}
              </a>
            ) : (
              image.attribution
            )}
          </span>
        </>
      ) : (
        <span className={styles.placeholder} role="img" aria-label={`${name} chưa có ảnh`}>
          <Icon name="map" size={compact ? 20 : 32} />
        </span>
      )}
    </span>
  );
}
