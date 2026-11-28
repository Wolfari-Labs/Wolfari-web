import { useState } from 'react';
import fallbackPhoto from '../../shared/assets/figma/16cac.png';
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
      <img
        src={available ? (compact ? image.smallUrl : image.thumbnailUrl) : fallbackPhoto}
        alt={available ? `Ảnh ${name}` : `Ảnh minh họa cho ${name}`}
        loading="lazy"
        onError={() => {
          if (available) setFailedUrl(image.url);
        }}
      />
      {available && (
        <span className={styles.credit} data-photo-credit>
          {linked ? (
            <a href={image.sourceUrl} target="_blank" rel="noreferrer">
              {image.attribution}
            </a>
          ) : (
            image.attribution
          )}
        </span>
      )}
    </span>
  );
}
