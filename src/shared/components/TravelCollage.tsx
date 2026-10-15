import { sceneAssets as art } from '../assets/scene-assets';
import styles from './TravelCollage.module.css';

// Shared Figma postcard composition: Home 34:497 and Auth 298:1951.
export function TravelCollage({ variant = 'home' }: { variant?: 'home' | 'auth' }) {
  return (
    <div className={`${styles.scene} ${styles[variant]}`} aria-hidden="true">
      <div className={styles.main}>
        <img src={art['1dc61.png']} alt="" />
      </div>
      <div className={styles.tape} />
      <div className={styles.note}>
        ✓ Plan ✓
        <br />✓ Explore ✓<br />✓ Go! ✓
      </div>
      <figure className={styles.daLat}>
        <img src={art['6059f.png']} alt="" />
        <figcaption>Đà Lạt</figcaption>
      </figure>
      <figure className={styles.phuQuoc}>
        <img src={art['a84f7.png']} alt="" />
        <figcaption>Phú Quốc</figcaption>
      </figure>
      <span className={styles.camera} />
    </div>
  );
}
