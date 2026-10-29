import { useEffect } from 'react';
import { paths } from '../../app/route-paths';
import homeArt0 from '../../shared/assets/figma/1efdb.svg';
import homeArt1 from '../../shared/assets/figma/7badc.svg';
import homeArt2 from '../../shared/assets/figma/2f8ae.svg';
import homeArt3 from '../../shared/assets/figma/a507a.svg';
import homeArt4 from '../../shared/assets/figma/9fb2d.svg';
import homeArt5 from '../../shared/assets/figma/5673e.svg';
import homeArt6 from '../../shared/assets/figma/69d2e.svg';
import homeArt7 from '../../shared/assets/figma/a8d46.svg';
import homeArt8 from '../../shared/assets/figma/ff817.svg';
import homeArt9 from '../../shared/assets/figma/28dbf.svg';
import homeArt10 from '../../shared/assets/figma/fcd4a.svg';
import homeArt11 from '../../shared/assets/figma/4bccc.png';
import homeArt12 from '../../shared/assets/figma/ac8db.svg';
import homeArt13 from '../../shared/assets/figma/ddfc7.png';
import homeArt14 from '../../shared/assets/figma/4ff86.png';
import homeArt15 from '../../shared/assets/figma/513e7.svg';
import homeArt16 from '../../shared/assets/figma/2dc85.png';
import homeArt17 from '../../shared/assets/figma/8b8b5.png';
import homeArt18 from '../../shared/assets/figma/1dc61.png';
import homeArt19 from '../../shared/assets/figma/a84f7.png';
import { Icon } from '../../shared/components/Icon';
import { ButtonLink } from '../../shared/components/ButtonLink';
import { ContentState } from '../../shared/components/ContentState';
import { TravelCollage } from '../../shared/components/TravelCollage';
import type { HomeViewModel } from './model/home';
import styles from './HomePage.module.css';

const art = {
  '1efdb.svg': homeArt0,
  '7badc.svg': homeArt1,
  '2f8ae.svg': homeArt2,
  'a507a.svg': homeArt3,
  '9fb2d.svg': homeArt4,
  '5673e.svg': homeArt5,
  '69d2e.svg': homeArt6,
  'a8d46.svg': homeArt7,
  'ff817.svg': homeArt8,
  '28dbf.svg': homeArt9,
  'fcd4a.svg': homeArt10,
  '4bccc.png': homeArt11,
  'ac8db.svg': homeArt12,
  'ddfc7.png': homeArt13,
  '4ff86.png': homeArt14,
  '513e7.svg': homeArt15,
  '2dc85.png': homeArt16,
  '8b8b5.png': homeArt17,
  '1dc61.png': homeArt18,
  'a84f7.png': homeArt19,
};

const features = [
  {
    title: ['Lên lịch trình', 'thông minh'],
    description: 'Sắp xếp từng ngày, cùng hoàn thiện kế hoạch',
    frame: '1efdb.svg',
    icon: '7badc.svg',
  },
  {
    title: ['Bản đồ &', 'địa điểm'],
    description: 'Xem những địa điểm đã lưu trong chuyến đi',
    frame: '1efdb.svg',
    icon: '2f8ae.svg',
  },
  {
    title: ['Dress code &', 'packing list'],
    description: 'Xem hướng dẫn và đồ dùng cho chuyến đi',
    frame: 'a507a.svg',
    icon: '9fb2d.svg',
  },
  {
    title: ['Quản lý chi phí'],
    description: 'Theo dõi đợt thu và khoản đóng góp của nhóm',
    frame: '5673e.svg',
    icon: '69d2e.svg',
  },
  {
    title: ['Nhắc việc &', 'thông báo'],
    description: 'Theo dõi cập nhật và lời mời trong hộp thư',
    frame: 'a8d46.svg',
    icon: 'ff817.svg',
  },
  {
    title: ['Theo dõi giá vé'],
    description: 'Thử nghiệm ngưỡng giá với dữ liệu mô phỏng',
    frame: '28dbf.svg',
    icon: 'fcd4a.svg',
  },
] as const;

function Clouds({ top = false }: { top?: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-cloud-layer={top ? 'top' : 'lower'}
      className={top ? styles.topClouds : styles.clouds}
    >
      <img src={art['4bccc.png']} alt="" />
    </div>
  );
}

export function HomePage({ model, onRetry }: { model: HomeViewModel; onRetry: () => void }) {
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (target === 'home-features' || target === 'home-about')
      document.getElementById(target)?.scrollIntoView();
  }, []);
  const user = model.viewerName !== null;
  return (
    <div className={styles.page} data-node-id={user ? '298:1642' : '3:28'} data-flow="home">
      <section className={styles.hero} data-layout="home-hero">
        <Clouds top />
        <Clouds />
        <div className={styles.heroInner} data-layout="home-hero-frame">
          <div className={styles.heroDecor} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Lên kế hoạch thông minh</p>
            <h1>
              <span>Cho những</span>
              <span>chuyến đi thật đẹp</span>
            </h1>
            <p className={styles.heroDescription}>
              <span>Wolfari là nền tảng lập kế hoạch và đồng hành du lịch thông minh </span>
              <span>cho nhóm nhỏ. Giúp bạn dễ dàng lên lịch trình, quản lý chi phí, </span>
              <span>khám phá địa điểm và tận hưởng chuyến đi theo cách của riêng mình.</span>
            </p>
            <div className={styles.actions}>
              <ButtonLink
                to={user ? paths.trips : paths.register}
                icon={<img src={art['ac8db.svg']} width="18" height="18" alt="" />}
              >
                {user ? 'Chuyến đi của tôi' : 'Bắt đầu ngay'}
              </ButtonLink>
              <a href="#home-features" className={styles.exploreLink}>
                Khám phá tính năng <Icon name="down" size={18} />
              </a>
            </div>
          </div>
          <img className={styles.heroMascot} src={art['ddfc7.png']} alt="" />
          <div className={styles.heroCollage} data-layout="home-collage">
            <TravelCollage />
          </div>
        </div>
      </section>
      <section id="home-features" className={styles.features} data-layout="home-features">
        <Clouds />
        <div className={styles.featuresInner} data-layout="home-features-frame">
          <div className={styles.featureDecor} aria-hidden="true" />
          <div className={styles.featureIntro}>
            <p>Tất cả những gì bạn cần</p>
            <h2>Trong một nơi</h2>
            <p>
              Cùng nhóm chuẩn bị chuyến đi của bạn
              <br className={styles.desktopBreak} /> trở nên đơn giản, thú vị và hiệu quả hơn bao
              giờ hết.
            </p>
            <img loading="lazy" src={art['4ff86.png']} alt="" width="126" height="126" />
          </div>
          <div className={styles.featureGrid}>
            {features.map((feature) => (
              <article key={feature.icon}>
                <div className={styles.featureArt} aria-hidden="true">
                  <img loading="lazy" className={styles.rim} src={art['513e7.svg']} alt="" />
                  <img loading="lazy" src={art[feature.frame]} alt="" />
                  <img
                    loading="lazy"
                    className={styles.featureGlyph}
                    src={art[feature.icon]}
                    alt=""
                  />
                </div>
                <h3>
                  {feature.title.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section id="home-about" className={styles.appPreview} data-layout="home-about">
        <Clouds />
        <div className={styles.appPreviewInner} data-layout="home-about-frame">
          <div className={styles.appDecor} aria-hidden="true" />
          <div className={styles.appCopy}>
            <h2>
              <span>Xem trước</span>
              <span>trải nghiệm của bạn</span>
            </h2>
            <p>Dù là trên web hay điện thoại, Wolfari luôn đồng hành cùng bạn mọi lúc, mọi nơi.</p>
            <ul>
              {[
                'Giao diện thân thiện, dễ sử dụng',
                'Đồng bộ dữ liệu giữa các thiết bị',
                'Xem cập nhật trong hộp thư thông báo',
              ].map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
            <ButtonLink
              to={user ? paths.trips : paths.register}
              icon={<img src={art['ac8db.svg']} width="18" height="18" alt="" />}
            >
              Khám phá ứng dụng
            </ButtonLink>
          </div>
          <img
            loading="lazy"
            className={styles.devices}
            data-layout="home-devices"
            src={art['2dc85.png']}
            alt="Minh họa giao diện Wolfari trên điện thoại và máy tính"
          />
        </div>
      </section>
      <section className={styles.inspiration} data-layout="home-inspiration">
        <Clouds />
        <div className={styles.inspirationInner} data-layout="home-inspiration-frame">
          <div className={styles.inspirationDecor} aria-hidden="true" />
          <header>
            <h2>
              <span>Những hành trình</span>
              <span>đang được lưu lại</span>
            </h2>
            <img loading="lazy" decoding="async" src={art['8b8b5.png']} alt="" />
            <p>Minh họa từ thiết kế</p>
          </header>
          <div className={styles.stories}>
            {model.landing.status === 'ready' ? (
              model.landing.data.stories.map((story, index) => (
                <figure key={story.name} className={index % 2 ? styles.tiltRight : styles.tiltLeft}>
                  {story.cover && (
                    <img
                      loading="lazy"
                      width="380"
                      height="260"
                      src={story.cover.src}
                      alt={story.cover.alt}
                    />
                  )}
                  <figcaption>
                    <strong>{story.name}</strong>
                    <p>{story.duration}</p>
                  </figcaption>
                </figure>
              ))
            ) : model.landing.status === 'error' ? (
              <ContentState
                state={
                  model.landing.error.code === 'SERVICE_UNAVAILABLE' &&
                  !model.landing.error.retryable
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
          <aside>
            <h3>Truyền cảm hứng</h3>
            <blockquote>“Mỗi chuyến đi là một câu chuyện và bạn là người viết nên nó!”</blockquote>
          </aside>
        </div>
      </section>
      <section className={styles.footer} data-layout="home-footer">
        <div className={styles.footerInner} data-layout="home-footer-frame">
          <h2>Ready to explore?</h2>
          <p>Cùng Wolfari, mọi hành trình đều trở nên đặc biệt!</p>
          <ButtonLink
            to={user ? paths.trips : paths.register}
            icon={<img src={art['ac8db.svg']} width="18" height="18" alt="" />}
          >
            {user ? 'Xem chuyến đi của tôi' : 'Bắt đầu hành trình'}
          </ButtonLink>
          <div className={styles.footerCollage} aria-hidden="true">
            <img loading="lazy" decoding="async" src={art['1dc61.png']} alt="" />
            <img loading="lazy" decoding="async" src={art['a84f7.png']} alt="" />
            <span className={styles.signpost}>
              <span>Plan</span>
              <span>Explore</span>
              <span>Go!</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
