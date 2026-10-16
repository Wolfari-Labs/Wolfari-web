import { useEffect } from 'react';
import { paths } from '../../app/route-paths';
import { sceneAssets as art } from '../../shared/assets/scene-assets';
import { Button } from '../../shared/components/Button';
import { ButtonLink } from '../../shared/components/ButtonLink';
import { ContentState } from '../../shared/components/ContentState';
import { TravelCollage } from '../../shared/components/TravelCollage';
import type { HomeViewModel } from './model/home';
import styles from './HomePage.module.css';

const features = [
  { title: ['Lên lịch trình', 'thông minh'], description: 'Tối ưu thời gian, tránh trùng lịch', frame: '1efdb.svg', icon: '7badc.svg' },
  { title: ['Bản đồ &', 'địa điểm'], description: 'Khám phá, lưu địa điểm, tính lộ trình', frame: '1efdb.svg', icon: '2f8ae.svg' },
  { title: ['Dress code &', 'packing list'], description: 'Gợi ý theo thời tiết, loại hoạt động', frame: 'a507a.svg', icon: '9fb2d.svg' },
  { title: ['Quản lý chi phí'], description: 'Ghi nhận thu chi, theo dõi quỹ nhóm minh bạch', frame: '5673e.svg', icon: '69d2e.svg' },
  { title: ['Nhắc việc &', 'thông báo'], description: 'Đúng lúc, đúng việc, không bỏ lỡ', frame: 'a8d46.svg', icon: 'ff817.svg' },
  { title: ['Theo dõi giá vé'], description: 'Cảnh báo khi giá giảm, không bỏ lỡ cơ hội', frame: '28dbf.svg', icon: 'fcd4a.svg' },
] as const;

function Clouds({ top = false }: { top?: boolean }) {
  return <div aria-hidden="true" className={top ? styles.topClouds : styles.clouds}><img src={art['4bccc.png']} alt="" /></div>;
}

export function HomePage({ model, onRetry }: { model: HomeViewModel; onRetry: () => void }) {
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (target === 'home-features' || target === 'home-about') document.getElementById(target)?.scrollIntoView();
  }, []);
  const user = model.viewerName !== null;
  return (
    <div className={styles.page} data-node-id={user ? '298:1642' : '3:28'} data-flow="home">
      <section className={styles.hero} data-layout="home-hero">
        <Clouds top /><Clouds />
        <div className={styles.heroDecor} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Lên kế hoạch thông minh</p>
          <h1><span>Cho những</span><span>chuyến đi thật đẹp</span></h1>
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
            <Button variant="outline" disabled title="Chưa có nguồn video được chốt">Xem video giới thiệu</Button>
          </div>
        </div>
        <img className={styles.heroMascot} src={art['ddfc7.png']} alt="" />
        <div className={styles.heroCollage} data-layout="home-collage"><TravelCollage /></div>
      </section>
      <section id="home-features" className={styles.features} data-layout="home-features">
        <Clouds />
        <div className={styles.featureDecor} aria-hidden="true" />
        <div className={styles.featureIntro}>
          <p>Tất cả những gì bạn cần</p><h2>Trong một nơi</h2>
          <p>Wolfari tích hợp đầy đủ các công cụ giúp chuyến đi của bạn<br className={styles.desktopBreak} /> trở nên đơn giản, thú vị và hiệu quả hơn bao giờ hết.</p>
          <img src={art['4ff86.png']} alt="" />
        </div>
        <div className={styles.featureGrid}>
          {features.map(feature => (
            <article key={feature.icon}>
              <div className={styles.featureArt} aria-hidden="true">
                <img className={styles.rim} src={art['513e7.svg']} alt="" />
                <img src={art[feature.frame]} alt="" />
                <img className={styles.featureGlyph} src={art[feature.icon]} alt="" />
              </div>
              <h3>{feature.title.map(line => <span key={line}>{line}</span>)}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="home-about" className={styles.appPreview} data-layout="home-about">
        <Clouds /><div className={styles.appDecor} aria-hidden="true" />
        <div className={styles.appCopy}>
          <h2><span>Xem trước</span><span>trải nghiệm của bạn</span></h2>
          <p>Dù là trên web hay điện thoại, Wolfari luôn đồng hành cùng bạn mọi lúc, mọi nơi.</p>
          <ul>{['Giao diện thân thiện, dễ sử dụng', 'Đồng bộ dữ liệu giữa các thiết bị', 'Nhận thông báo theo thời gian thực'].map(text => <li key={text}>{text}</li>)}</ul>
          <ButtonLink
            to={user ? paths.trips : paths.register}
            icon={<img src={art['ac8db.svg']} width="18" height="18" alt="" />}
          >
            Khám phá ứng dụng
          </ButtonLink>
        </div>
        <img className={styles.devices} data-layout="home-devices" src={art['2dc85.png']} alt="Minh họa giao diện Wolfari trên điện thoại và máy tính" />
      </section>
      <section className={styles.inspiration} data-layout="home-inspiration">
        <Clouds /><div className={styles.inspirationDecor} aria-hidden="true" />
        <header><h2><span>Những hành trình</span><span>đang được lưu lại</span></h2><img src={art['8b8b5.png']} alt="" /><p>Minh họa từ thiết kế</p></header>
        <div className={styles.stories}>
          {model.landing.status === 'ready' ? model.landing.data.stories.map((story, index) => (
            <figure key={story.name} className={index % 2 ? styles.tiltRight : styles.tiltLeft}>
              {story.cover && <img src={story.cover.src} alt={story.cover.alt} />}
              <figcaption><strong>{story.name}</strong><p>{story.duration}</p></figcaption>
            </figure>
          )) : model.landing.status === 'error' ? <ContentState state={model.landing.error.code === 'SERVICE_UNAVAILABLE' && !model.landing.error.retryable ? 'unavailable' : 'error'} error={model.landing.error} onRetry={onRetry} headingLevel={2} /> : <ContentState state={model.landing.status === 'loading' ? 'loading' : 'empty'} headingLevel={2} />}
        </div>
        <aside><h3>Truyền cảm hứng</h3><blockquote>“Mỗi chuyến đi là một câu chuyện và bạn là người viết nên nó!”</blockquote></aside>
      </section>
      <section className={styles.footer} data-layout="home-footer">
        <h2>Ready to explore?</h2><p>Cùng Wolfari, mọi hành trình đều trở nên đặc biệt!</p>
        <ButtonLink
          to={user ? paths.trips : paths.register}
          icon={<img src={art['ac8db.svg']} width="18" height="18" alt="" />}
        >
          {user ? 'Xem chuyến đi của tôi' : 'Bắt đầu hành trình'}
        </ButtonLink>
        <div className={styles.footerCollage} aria-hidden="true"><img src={art['1dc61.png']} alt="" /><img src={art['a84f7.png']} alt="" /><span className={styles.signpost}><span>Plan</span><span>Explore</span><span>Go!</span></span></div>
      </section>
    </div>
  );
}
