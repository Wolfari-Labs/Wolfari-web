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
        srcSet={
          available
            ? `${image.smallUrl} 320w, ${image.thumbnailUrl} 640w, ${image.url} 1280w`
            : undefined
        }
        sizes={available ? (compact ? '78px' : 'auto, (max-width: 768px) 100vw, 354px') : undefined}
        loading="lazy"
        decoding="async"
        onError={() => {
          if (available) setFailedUrl(image.url);
        }}
      />
      {available && (
        <span className={styles.credit} data-photo-credit>
          {linked ? (
            <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer">
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
