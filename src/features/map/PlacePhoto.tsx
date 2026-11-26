import { useState, type ReactNode } from 'react';
import type { PlaceImage } from './places';
import styles from './TripMapPage.module.css';

/**
 * POI-IMAGES: the licensed photo of a place with its visible credit. When the place has no photo,
 * or the file fails to load, the template artwork (`fallback`) is shown instead.
 */
export function PlacePhoto({
  photo,
  alt,
  className,
  width,
  height,
  sizes,
  fallback,
}: {
  photo: PlaceImage | null | undefined;
  /** The place name. */
  alt: string;
  className?: string | undefined;
  width: number;
  height: number;
  /** Rendered width for `srcSet` selection, e.g. "230px". */
  sizes: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!photo || failed === photo.url) return <>{fallback}</>;
  return (
    <>
      <img
        className={[className, styles.placePhoto].filter(Boolean).join(' ')}
        src={photo.thumbnailUrl}
        srcSet={`${photo.smallUrl} 320w, ${photo.thumbnailUrl} 640w, ${photo.url} 1280w`}
        sizes={sizes}
        width={width}
        height={height}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(photo.url)}
      />
      <small className={styles.photoCredit}>
        <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">
          {photo.attribution}
        </a>
      </small>
    </>
  );
}
