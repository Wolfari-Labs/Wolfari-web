import { useEffect } from 'react';
import { paths } from '../../app/route-paths';
import heroPhoto from '../../shared/assets/figma/1dc61.png';
import cameraMascot from '../../shared/assets/figma/8b8b5.png';
import wavingMascot from '../../shared/assets/v2/mascot-waving.png';
import { Icon, type IconName } from '../../shared/components/Icon';
import { ButtonLink } from '../../shared/components/ButtonLink';
import { BrandWordmark } from '../../shared/components/BrandWordmark';
import { ContentState } from '../../shared/components/ContentState';
import type { HomeViewModel } from './model/home';
import styles from './HomePage.module.css';

// Figma 933:7825 Features: pastel card + gradient icon badge per capability.
const features: readonly {
  title: string;
  description: string;
  icon: IconName;
  tone: 'blue' | 'violet' | 'amber' | 'green';
}[] = [
  {
    title: 'Lịch trình thông minh',
    description: 'Kéo thả hoạt động theo ngày, tự tính thời gian di chuyển.',
    icon: 'calendar',
    tone: 'blue',
  },
  {
    title: 'Bản đồ & địa điểm',
    description: 'Xem lộ trình mỗi ngày và khám phá địa điểm gần bạn.',
    icon: 'mapFolded',
    tone: 'violet',
  },
  {
    title: 'Hành lý & dress code',
    description: 'Danh sách chuẩn bị theo thời tiết và hoạt động.',
    icon: 'luggage',
    tone: 'amber',
  },
  {
    title: 'Quỹ nhóm minh bạch',
    description: 'Ghi khoản chi, chia đều và đối soát chỉ trong vài chạm.',
    icon: 'fund',
    tone: 'green',
  },
];
const destinationTones = ['mint', 'sky', 'butter', 'peach'] as const;

export function HomePage({ model, onRetry }: { model: HomeViewModel; onRetry: () => void }) {
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (target === 'home-features') document.getElementById(target)?.scrollIntoView();
  }, []);
  const user = model.viewerName !== null;
  return (
    <div className={styles.page} data-node-id={user ? '298:1642' : '3:28'} data-flow="home">
      <section className={styles.hero} data-layout="home-hero">
        <div className={styles.heroInner} data-layout="home-hero-frame">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <Icon name="sparkles" size={16} />
              {user
                ? `Chào ${model.viewerName}, đi đâu tiếp nhỉ?`
                : 'Lập kế hoạch du lịch nhóm, nhẹ tênh'}
            </p>
            <h1>
              <span>Cho những chuyến đi</span>{' '}
              <span>
                <span className={styles.accent}>thật đẹp</span>, cùng nhau
              </span>
            </h1>
            <p className={styles.heroDescription}>
              Lên lịch, chuẩn bị hành lý, theo dõi giá vé và chia quỹ nhóm — tất cả trong một không
              gian chung cho cả hội.
            </p>
            <div className={styles.actions}>
              <ButtonLink to={user ? paths.newTrip : paths.register} className={styles.heroButton}>
                {user ? 'Tạo chuyến đi' : 'Bắt đầu hành trình'}
                <Icon name="chevronRight" size={20} className={styles.trailingIcon ?? ''} />
              </ButtonLink>
              <ButtonLink
                to={user ? paths.trips : paths.login}
                variant="secondary"
                className={styles.heroButton}
              >
                {user ? 'Chuyến đi của tôi' : 'Đăng nhập'}
              </ButtonLink>
            </div>
          </div>
          {/* Decorative product illustration (Figma 933:7799, 933:7806, 933:7818). */}
          <div className={styles.heroVisual} data-layout="home-collage" aria-hidden="true">
            <div className={styles.heroPhoto}>
              <img src={heroPhoto} alt="" width="640" height="500" fetchPriority="high" />
            </div>
            <img className={styles.heroMascot} src={wavingMascot} alt="" width="170" height="140" />
            <div className={styles.featuredCard}>
              <div className={styles.featuredPhoto}>
                <img src={heroPhoto} alt="" width="271" height="144" />
              </div>
              <strong>Đà Nẵng</strong>
              <span className={styles.featuredTrack}>
                <span />
              </span>
            </div>
            <div className={styles.statTile}>
              <span className={styles.statBadge}>
                <Icon name="fund" size={22} />
              </span>
              <strong>Quỹ nhóm</strong>
            </div>
          </div>
        </div>
      </section>
      <section id="home-features" className={styles.features} data-layout="home-features">
        <header className={styles.sectionIntro}>
          <h2>Tất cả những gì nhóm bạn cần</h2>
          <p>Từ ý tưởng đến lúc về nhà — Wolfari giữ mọi thứ gọn gàng.</p>
        </header>
        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article key={feature.title} className={styles.featureCard} data-tone={feature.tone}>
              <span className={styles.featureBadge} aria-hidden="true">
                <Icon name={feature.icon} size={26} />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.destinations} data-layout="home-inspiration">
        <header className={styles.destinationsHeader}>
          <h2>Điểm đến được yêu thích</h2>
          <p>Cảm hứng cho chuyến đi tiếp theo của cả nhóm.</p>
        </header>
        <div className={styles.destinationGrid}>
          {model.landing.status === 'ready' ? (
            model.landing.data.stories.map((story, index) => (
              <figure
                key={story.name}
                className={styles.destinationCard}
                data-tone={destinationTones[index % destinationTones.length]}
              >
                <div className={styles.destinationPhoto}>
                  {story.cover && (
                    <img
                      loading="lazy"
                      width="286"
                      height="240"
                      src={story.cover.src}
                      alt={story.cover.alt}
                    />
                  )}
                </div>
                <figcaption>
                  <strong>{story.name}</strong>
                  <span>{story.duration}</span>
                </figcaption>
              </figure>
            ))
          ) : model.landing.status === 'error' ? (
            <ContentState
              state={
                model.landing.error.code === 'SERVICE_UNAVAILABLE' && !model.landing.error.retryable
                  ? 'unavailable'
                  : 'error'
              }
              error={model.landing.error}
              onRetry={onRetry}
              headingLevel={2}
            />
          ) : (
            <ContentState
              state={model.landing.status === 'loading' ? 'loading' : 'empty'}
              headingLevel={2}
            />
          )}
        </div>
      </section>
      <section className={styles.closing} data-layout="home-footer">
        <div className={styles.cta}>
          <img
            className={styles.ctaMascot}
            loading="lazy"
            src={cameraMascot}
            alt=""
            width="130"
            height="148"
          />
          <div className={styles.ctaCopy}>
            <h2>{user ? 'Chuyến tiếp theo của cả nhóm?' : 'Sẵn sàng khám phá chưa?'}</h2>
            <p>Tạo chuyến đi đầu tiên chỉ trong 2 phút — miễn phí cho cả nhóm.</p>
          </div>
          <ButtonLink
            to={user ? paths.newTrip : paths.register}
            variant="secondary"
            className={styles.ctaButton}
          >
            {user ? 'Tạo chuyến đi ngay' : 'Bắt đầu ngay'}
            <Icon name="chevronRight" size={20} className={styles.trailingIcon ?? ''} />
          </ButtonLink>
        </div>
        <footer className={styles.footer}>
          <BrandWordmark className={styles.footerWordmark ?? ''} />
          <p>© 2026 Wolfari · PBL6</p>
        </footer>
      </section>
    </div>
  );
}
