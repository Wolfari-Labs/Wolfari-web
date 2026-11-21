import mountains from '../assets/v2/logo-mountains.svg';
import pin from '../assets/v2/logo-pin.svg';
import swoosh from '../assets/v2/logo-swoosh.svg';
import styles from './BrandWordmark.module.css';

/** Figma 865:6673 `v2/Brand/Wordmark`, exposed as one image named "Wolfari". */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={`${styles.wordmark} ${className ?? ''}`} role="img" aria-label="Wolfari">
      <span className={styles.row}>
        <span className={styles.w}>W</span>
        <span className={styles.mark}>
          <img src={mountains} alt="" width="34" height="34" />
        </span>
        <span className={styles.rest}>lfari</span>
        <img className={styles.pin} src={pin} alt="" width="16" height="20" />
      </span>
      <img className={styles.swoosh} src={swoosh} alt="" width="150" height="12" />
    </span>
  );
}
