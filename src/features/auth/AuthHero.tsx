import heroPhoto from '../../shared/assets/figma/home-auth/1dc61.png';
import wavingMascot from '../../shared/assets/figma/home-auth/ddfc7.png';
import pin from '../../shared/assets/figma/home-auth/8c4d0.svg';
import calendar from '../../shared/assets/figma/home-auth/57432.svg';
import map from '../../shared/assets/figma/home-auth/abc56.svg';
import luggage from '../../shared/assets/figma/home-auth/b9309.svg';
import wallet from '../../shared/assets/figma/home-auth/ab931.svg';
import styles from './AuthPage.module.css';

const highlights = [
  { label: 'Lịch trình', icon: calendar, tone: 'blue' },
  { label: 'Bản đồ', icon: map, tone: 'violet' },
  { label: 'Hành lý', icon: luggage, tone: 'amber' },
  { label: 'Quỹ nhóm', icon: wallet, tone: 'green' },
];

/** Figma 933:7624 / 944:15952 photo panel shared by the Web v2 identity screens. */
export function AuthHero({ title }: { title: readonly [string, string] }) {
  return (
    <div className={styles.hero} data-layout="auth-hero">
      <div className={styles.heroPanel}>
        <img className={styles.heroPhoto} src={heroPhoto} alt="" width="700" height="864" />
        <span className={styles.heroPill}><img src={pin} alt="" />Hơn 120 điểm đến Việt Nam</span>
        <div className={styles.heroCopy}>
          <p className={styles.heroTitle}>
            <span>{title[0]}</span> <span>{title[1]}</span>
          </p>
          <p className={styles.heroDescription}>
            Lên lịch, chuẩn bị hành lý và chia quỹ nhóm — tất cả trong một nơi.
          </p>
          <ul className={styles.highlights}>
            {highlights.map((item) => (
              <li key={item.label} data-tone={item.tone}>
                <span className={styles.highlightBadge} aria-hidden="true">
                  <img src={item.icon} alt="" />
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <img className={styles.heroMascot} src={wavingMascot} alt="" width="150" height="124" />
    </div>
  );
}
