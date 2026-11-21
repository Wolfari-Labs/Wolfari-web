import heroPhoto from '../../shared/assets/figma/1dc61.png';
import wavingMascot from '../../shared/assets/v2/mascot-waving.png';
import { Icon, type IconName } from '../../shared/components/Icon';
import styles from './AuthPage.module.css';

const highlights: readonly { label: string; icon: IconName; tone: string }[] = [
  { label: 'Lịch trình', icon: 'calendar', tone: 'blue' },
  { label: 'Bản đồ', icon: 'mapFolded', tone: 'violet' },
  { label: 'Hành lý', icon: 'luggage', tone: 'amber' },
  { label: 'Quỹ nhóm', icon: 'fund', tone: 'green' },
];

/** Figma 933:7624 / 944:15952 photo panel shared by the Web v2 identity screens. */
export function AuthHero({ title }: { title: readonly [string, string] }) {
  return (
    <div className={styles.hero} data-layout="auth-hero">
      <div className={styles.heroPanel}>
        <img className={styles.heroPhoto} src={heroPhoto} alt="" width="700" height="864" />
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
                  <Icon name={item.icon} size={22} />
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
