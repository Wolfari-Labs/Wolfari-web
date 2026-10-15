import { assets } from '../../../shared/assets/asset-map';
import underline from '../../../shared/assets/figma/d758d.svg';
import accent from '../../../shared/assets/figma/ccb7f.svg';
import pin from '../../../shared/assets/figma/56724.svg';
import flightPath from '../../../shared/assets/figma/a5059.svg';
import plane from '../../../shared/assets/figma/5f666.svg';
import plus from '../../../shared/assets/figma/51f13.svg';
import mobileUnderline from '../../../shared/assets/figma/ec029.svg';
import styles from './TripListHero.module.css';

export function TripListHero() {
  return (
    <header className={styles.hero} data-node-id="65:548">
      <div className={styles.art} aria-hidden="true">
        <img className={styles.mascot} src={assets['4ff86.png']} alt="" />
        <span className={styles.pin}>
          <img src={pin} alt="" />
        </span>
        <img className={styles.accent} src={accent} alt="" />
        <p className={styles.note}>
          Việt Nam
          <br />
          còn nhiều nơi để khám phá!
        </p>
        <img className={styles.flightPath} src={flightPath} alt="" />
        <img className={styles.plane} src={plane} alt="" />
      </div>
      <div className={styles.copy}>
        <h1>
          Chuyến đi <span>của tôi</span>
        </h1>
        <img className={styles.underline} src={underline} alt="" />
        <img className={styles.mobileUnderline} src={mobileUnderline} alt="" />
        <p className={styles.desktopSubtitle}>Những hành trình bạn tạo và cùng tham gia.</p>
        <p className={styles.mobileSubtitle}>Hẹn những ngày thật đẹp.</p>
      </div>
      <button
        className={styles.create}
        disabled
        title="Tạo chuyến đi chưa được triển khai trong flow này"
      >
        <img src={plus} alt="" />
        Tạo chuyến đi
      </button>
    </header>
  );
}
