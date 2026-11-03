import mainPhoto from '../assets/figma/1dc61.png';
import daLatPhoto from '../assets/figma/6059f.png';
import phuQuocPhoto from '../assets/figma/a84f7.png';
import styles from './TravelCollage.module.css';

// Shared Figma postcard composition: Home 34:497 and Auth 298:1951.
export function TravelCollage({ variant = 'home' }: { variant?: 'home' | 'auth' }) {
  return (
    <div className={`${styles.scene} ${styles[variant] ?? ''}`} aria-hidden="true">
      <div className={styles.main}>
        <img src={mainPhoto} alt="" fetchPriority="high" width="500" height="367" />
      </div>
      <div className={styles.tape} />
      <div className={styles.note}>
        <span>✓ Plan ✓</span>
        <span>✓ Explore ✓</span>
        <span>✓ Go! ✓</span>
      </div>
      <figure className={styles.daLat}>
        <img src={daLatPhoto} alt="" />
        <figcaption>Đà Lạt</figcaption>
      </figure>
      <figure className={styles.phuQuoc}>
        <img src={phuQuocPhoto} alt="" />
        <figcaption>Phú Quốc</figcaption>
      </figure>
      <span className={styles.camera} />
    </div>
  );
}
