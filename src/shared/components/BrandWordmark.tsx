import styles from './BrandWordmark.module.css';

/**
 * Figma 865:6673 `v2/Brand/Wordmark`, exposed as one image named "Wolfari". Letters are CSS
 * generated content and the mountain mark, pin and swoosh are backgrounds, so the wordmark scales
 * as one unit and adds no stray visible text to the link that wraps it.
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={`${styles.wordmark} ${className ?? ''}`} role="img" aria-label="Wolfari">
      <span className={styles.row} aria-hidden="true">
        <span className={styles.w} />
        <span className={styles.mark} />
        <span className={styles.rest} />
        <span className={styles.pin} />
      </span>
      <span className={styles.swoosh} aria-hidden="true" />
    </span>
  );
}
