import { useEffect, useRef, type CSSProperties } from 'react';
import { paths } from '../../app/route-paths';
import cameraMascot from '../../shared/assets/figma/8b8b5.png';
import { Icon } from '../../shared/components/Icon';
import { ButtonLink } from '../../shared/components/ButtonLink';
import { BrandWordmark } from '../../shared/components/BrandWordmark';
import { ContentState } from '../../shared/components/ContentState';
import type { HomeViewModel } from './model/home';
import { homeFeatureGroups, homeShowcases, homeSteps } from './home-content';
import { HeroPreview, MoneyPreview, PlanPreview, PreparePreview } from './HomePreviews';
import { useScrollReveal } from './useScrollReveal';
import styles from './HomePage.module.css';

const showcasePreviews = {
  'home-tour-plan': PlanPreview,
  'home-tour-prepare': PreparePreview,
  'home-tour-money': MoneyPreview,
} as const;
const destinationTones = ['mint', 'sky', 'butter', 'peach'] as const;
const stagger = (index: number) => ({ '--reveal-delay': `${index * 60}ms` }) as CSSProperties;

export function HomePage({ model, onRetry }: { model: HomeViewModel; onRetry: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useScrollReveal(root);
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (target.startsWith('home-')) document.getElementById(target)?.scrollIntoView();
  }, []);
  const user = model.viewerName !== null;
  return (
    <div
      ref={root}
      className={styles.page}
      data-node-id={user ? '298:1642' : '3:28'}
      data-flow="home"
    >
      <section className={styles.hero} data-layout="home-hero" aria-labelledby="home-title">
        <div className={styles.heroInner} data-layout="home-hero-frame">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <Icon name="sparkles" size={16} />
              {user
                ? `Chào ${model.viewerName}, đi đâu tiếp nhỉ?`
                : 'Lập kế hoạch du lịch nhóm, nhẹ tênh'}
            </p>
            <h1 id="home-title">
              <span>Cho những chuyến đi</span>{' '}
              <span>
                <span className={styles.accent}>thật đẹp</span>, cùng nhau
              </span>
            </h1>
            <p className={styles.heroDescription}>
              Wolfari gom lịch trình, bản đồ, hành lý, quỹ nhóm và giá vé vào một không gian chung —
              cả nhóm cùng theo dõi, cùng chuẩn bị.
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
            <ul className={styles.heroPoints}>
              <li>
                <Icon name="check" size={16} strokeWidth={2.4} />
                Mời cả nhóm qua email
              </li>
              <li>
                <Icon name="check" size={16} strokeWidth={2.4} />
                Lịch trình theo từng ngày
              </li>
              <li>
                <Icon name="check" size={16} strokeWidth={2.4} />
                Báo khi giá vé chạm ngưỡng
              </li>
            </ul>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section
        id="home-features"
        className={styles.features}
        data-layout="home-features"
        aria-labelledby="home-features-title"
      >
        <header className={styles.sectionIntro} data-reveal="">
          <p className={styles.kicker}>Tính năng</p>
          <h2 id="home-features-title">Tất cả những gì nhóm bạn cần</h2>
          <p>Chín công cụ cho một chuyến đi — từ lúc lên ý tưởng đến ngày về nhà.</p>
        </header>
        <div className={styles.featureGroups}>
          {homeFeatureGroups.map((group, groupIndex) => (
            <div
              key={group.id}
              className={styles.featureGroup}
              data-tone={group.tone}
              data-reveal=""
              style={stagger(groupIndex)}
            >
              <div className={styles.groupHead}>
                <h3>{group.label}</h3>
                <p>{group.summary}</p>
              </div>
              {group.features.map((feature) => (
                <article key={feature.title} className={styles.featureCard}>
                  <span className={styles.featureIcon} aria-hidden="true">
                    <Icon name={feature.icon} size={22} />
                  </span>
                  <div className={styles.featureText}>
                    <h4>{feature.title}</h4>
                    <p>{feature.description}</p>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>

      <div className={styles.tour} data-layout="home-tour">
        {homeShowcases.map((showcase, index) => {
          const Preview = showcasePreviews[showcase.id as keyof typeof showcasePreviews];
          return (
            <section
              key={showcase.id}
              id={showcase.id}
              className={styles.showcase}
              data-tone={showcase.tone}
              data-flip={index % 2 === 1}
              aria-labelledby={`${showcase.id}-title`}
            >
              <div className={styles.showcaseCopy} data-reveal="">
                <p className={styles.kicker}>{showcase.kicker}</p>
                <h2 id={`${showcase.id}-title`}>{showcase.title}</h2>
                <p className={styles.showcaseLead}>{showcase.description}</p>
                <ul className={styles.points}>
                  {showcase.points.map((point) => (
                    <li key={point.title}>
                      <span className={styles.pointIcon} aria-hidden="true">
                        <Icon name="check" size={14} strokeWidth={2.6} />
                      </span>
                      <span>
                        <strong>{point.title}</strong> {point.text}
                      </span>
                    </li>
                  ))}
                </ul>
                {showcase.note && (
                  <p className={styles.note}>
                    <Icon name="info" size={18} />
                    {showcase.note}
                  </p>
                )}
              </div>
              <div className={styles.showcaseVisual} data-reveal="" style={stagger(1)}>
                <Preview />
              </div>
            </section>
          );
        })}
      </div>

      <section
        id="home-steps"
        className={styles.steps}
        data-layout="home-steps"
        aria-labelledby="home-steps-title"
      >
        <header className={styles.sectionIntro} data-reveal="">
          <p className={styles.kicker}>Bắt đầu</p>
          <h2 id="home-steps-title">Ba bước để cả nhóm cùng lên đường</h2>
        </header>
        <ol className={styles.stepList}>
          {homeSteps.map((step, index) => (
            <li key={step.title} data-reveal="" style={stagger(index)}>
              <span className={styles.stepNumber} aria-hidden="true">
                {index + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        className={styles.destinations}
        data-layout="home-inspiration"
        aria-labelledby="home-inspiration-title"
      >
        <header className={styles.destinationsHeader} data-reveal="">
          <h2 id="home-inspiration-title">Điểm đến được yêu thích</h2>
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

      <section
        className={styles.closing}
        data-layout="home-footer"
        aria-label="Bắt đầu với Wolfari"
      >
        <div className={styles.cta} data-reveal="">
          <img
            className={styles.ctaMascot}
            loading="lazy"
            src={cameraMascot}
            alt=""
            width="164"
            height="198"
          />
          <div className={styles.ctaCopy}>
            <h2>{user ? 'Chuyến tiếp theo của cả nhóm?' : 'Sẵn sàng khám phá chưa?'}</h2>
            <p>Tạo chuyến đi, mời bạn đồng hành và bắt đầu lên kế hoạch cùng nhau.</p>
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
          <div className={styles.footerBrand}>
            <BrandWordmark className={styles.footerWordmark ?? ''} />
            <p>Lập kế hoạch du lịch nhóm, nhẹ tênh.</p>
          </div>
          <nav className={styles.footerNav} aria-label="Các mục trên trang chủ">
            <a href="#home-features">Tính năng</a>
            <a href="#home-tour-money">Quỹ nhóm & giá vé</a>
            <a href="#home-steps">Cách bắt đầu</a>
          </nav>
          <p className={styles.copyright}>© 2026 Wolfari · PBL6</p>
        </footer>
      </section>
    </div>
  );
}
