import { useState } from 'react';
import { paths } from '../../app/route-paths';
import { ButtonLink } from '../../shared/components/ButtonLink';
import { BrandWordmark } from '../../shared/components/BrandWordmark';
import { ContentState } from '../../shared/components/ContentState';
import { Drawer } from '../../shared/components/Drawer';
import { Alert } from '../../shared/components/Alert';
import type { HomeViewModel } from './model/home';
import heroPhoto from '../../shared/assets/figma/home-auth/1dc61.png';
import wavingMascot from '../../shared/assets/figma/home-auth/ddfc7.png';
import cameraMascot from '../../shared/assets/figma/home-auth/8b8b5.png';
import sparkles from '../../shared/assets/figma/home-auth/c4388.svg';
import pin from '../../shared/assets/figma/home-auth/8c4d0.svg';
import nextWhite from '../../shared/assets/figma/home-auth/0c64b.svg';
import nextBlue from '../../shared/assets/figma/home-auth/26153.svg';
import nextInk from '../../shared/assets/figma/home-auth/2ab11.svg';
import heart from '../../shared/assets/figma/home-auth/754d5.svg';
import calendar from '../../shared/assets/figma/home-auth/fc6d7.svg';
import map from '../../shared/assets/figma/home-auth/84cdf.svg';
import luggage from '../../shared/assets/figma/home-auth/8b292.svg';
import wallet from '../../shared/assets/figma/home-auth/7f207.svg';
import walletSmall from '../../shared/assets/figma/home-auth/251cf.svg';
import dot from '../../shared/assets/figma/home-auth/065e7.svg';
import styles from './HomePage.module.css';

const features = [
  { node: '933:7830', title: 'Lịch trình thông minh', text: 'Kéo thả hoạt động theo ngày, tự tính thời gian di chuyển.', icon: calendar, tone: 'sky' },
  { node: '933:7837', title: 'Bản đồ & địa điểm', text: 'Xem lộ trình mỗi ngày và khám phá địa điểm gần bạn.', icon: map, tone: 'lilac' },
  { node: '933:7844', title: 'Hành lý & dress code', text: 'Danh sách chuẩn bị theo thời tiết và hoạt động.', icon: luggage, tone: 'butter' },
  { node: '933:7854', title: 'Quỹ nhóm minh bạch', text: 'Ghi khoản chi, chia đều và đối soát chỉ trong vài chạm.', icon: wallet, tone: 'mint' },
] as const;
const destinationTones = ['mint', 'sky', 'butter', 'peach'] as const;

/** W01/W01.1: Figma's editorial landing page, not a live trip dashboard. */
export function HomePage({ model, onRetry }: { model: HomeViewModel; onRetry: () => void }) {
  const user = model.viewerName !== null;
  const [notice, setNotice] = useState<string | null>(null);
  const unavailable = (feature: string) => setNotice(`${feature} chưa được kết nối trong phiên bản hiện tại. Không có dữ liệu hay thay đổi nào được gửi.`);
  return (
    <div className={styles.page} data-node-id={user ? '938:7830' : '933:7734'} data-flow="home">
      <section className={styles.hero} data-layout="home-hero" aria-labelledby="home-title">
        <div className={styles.heroCopy} data-layout="home-hero-frame">
          <p className={styles.eyebrow}><img src={sparkles} alt="" />{user ? `Chào ${model.viewerName?.split(/\s+/).at(-1)}, đi đâu tiếp nhỉ?` : 'Lập kế hoạch du lịch nhóm, nhẹ tênh'}</p>
          <h1 id="home-title"><span>Cho những chuyến đi</span><span><span className={styles.accent}>thật đẹp</span>, cùng nhau</span></h1>
          <p className={styles.heroDescription}>Lên lịch, chuẩn bị hành lý, theo dõi giá vé và chia quỹ nhóm — tất cả trong một không gian chung cho cả hội.</p>
          <div className={styles.actions}>
            <ButtonLink to={user ? paths.newTrip : paths.register} className={styles.heroButton}>{user ? 'Tạo chuyến đi' : 'Bắt đầu hành trình'}<img src={nextWhite} alt="" /></ButtonLink>
            <ButtonLink to={user ? paths.trips : paths.login} variant="secondary" className={styles.heroButton}>{user ? 'Chuyến đi của tôi' : 'Đăng nhập'}</ButtonLink>
          </div>
          <button className={styles.socialProof} type="button" title="Số liệu minh họa của thiết kế, không phải thống kê trực tiếp" onClick={() => setNotice('Avatar, số nhóm, chuyến đi và số tiền trong phần giới thiệu là nội dung minh họa của thiết kế; không phải thống kê hoặc dữ liệu tài khoản của bạn.')}>
            <span className={styles.avatarStack} aria-hidden="true">{['T', 'H', 'Q', 'M'].map((initial) => <span key={initial}>{initial}</span>)}</span>
            <span>{user ? 'Bạn có 1 chuyến đang diễn ra · 3 chuyến sắp tới' : '2.400+ nhóm bạn đã lên đường cùng Wolfari'}</span>
          </button>
        </div>
        <figure className={styles.collage} data-layout="home-collage" aria-label="Minh họa giao diện chuyến đi và quỹ nhóm, không phải dữ liệu tài khoản">
          <div className={styles.heroPhoto} data-node-id="933:7799"><img className={styles.photo} src={heroPhoto} alt="Biển Đà Nẵng" fetchPriority="high" width="640" height="500" /><span className={styles.locationPill}><img src={pin} alt="" />Hơn 120 điểm đến Việt Nam</span></div>
          <img className={styles.heroMascot} src={wavingMascot} alt="" width="170" height="140" />
          <div className={styles.featuredTrip} data-node-id="933:7806" aria-hidden="true"><div className={styles.featuredPhoto}><img src={heroPhoto} alt="" width="271" height="144" /><span className={styles.tripStatus}><img src={dot} alt="" />Đang diễn ra</span></div><div className={styles.featuredBody}><strong>Đà Nẵng 3N2Đ</strong><span>12 – 14/10 · 4 người</span><div className={styles.tripProgress}><span><i /></span><small>Ngày 1/3</small></div></div></div>
          <div className={styles.fundTile} aria-hidden="true"><span><img src={walletSmall} alt="" /></span><strong>6,25tr</strong><p>Quỹ nhóm · 69%</p></div>
        </figure>
      </section>
      <section id="home-features" className={styles.features} data-layout="home-features" aria-labelledby="home-features-title"><header className={styles.sectionIntro}><h2 id="home-features-title">Tất cả những gì nhóm bạn cần</h2><p>Từ ý tưởng đến lúc về nhà — Wolfari giữ mọi thứ gọn gàng.</p></header><div className={styles.featureGrid}>{features.map((feature) => <article key={feature.node} className={styles.featureCard} data-tone={feature.tone} data-node-id={feature.node}><span className={styles.featureIcon}><img src={feature.icon} alt="" /></span><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div></section>
      <section className={styles.destinations} data-layout="home-inspiration" aria-labelledby="home-inspiration-title">
        <header className={styles.destinationsHeader}><div><h2 id="home-inspiration-title">Điểm đến được yêu thích</h2><p>Cảm hứng cho chuyến đi tiếp theo của cả nhóm.</p></div><button type="button" onClick={() => unavailable('Danh mục điểm đến')}>Xem tất cả →</button></header>
        <div className={styles.destinationGrid}>{model.landing.status === 'ready' ? model.landing.data.stories.map((story, index) => <figure key={story.name} className={styles.destinationCard} data-tone={destinationTones[index % destinationTones.length]}><div className={styles.destinationPhoto}>{story.cover && <img className={styles.photo} loading="lazy" width="286" height="240" src={story.cover.src} alt={story.cover.alt} />}<button type="button" className={styles.favorite} aria-label={`Yêu thích ${story.name}`} onClick={() => unavailable('Lưu điểm đến yêu thích')}><img src={heart} alt="" /></button></div><figcaption><div><strong>{story.name}</strong><span>{story.duration}</span></div><button type="button" className={styles.destinationLink} aria-label={`Khám phá ${story.name}`} onClick={() => unavailable(`Thông tin điểm đến ${story.name}`)}><img src={nextInk} alt="" /></button></figcaption></figure>) : model.landing.status === 'error' ? <ContentState state={model.landing.error.code === 'SERVICE_UNAVAILABLE' && !model.landing.error.retryable ? 'unavailable' : 'error'} error={model.landing.error} onRetry={onRetry} headingLevel={2} /> : <ContentState state={model.landing.status === 'loading' ? 'loading' : 'empty'} headingLevel={2} />}</div>
      </section>
      <section className={styles.closing} data-layout="home-footer" aria-label="Bắt đầu với Wolfari"><div className={styles.cta}><div className={styles.ctaContent}><img className={styles.ctaMascot} src={cameraMascot} alt="" width="130" height="148" /><div className={styles.ctaCopy}><h2>{user ? 'Chuyến tiếp theo của cả nhóm?' : 'Sẵn sàng khám phá chưa?'}</h2><p>Tạo chuyến đi đầu tiên chỉ trong 2 phút — miễn phí cho cả nhóm.</p></div></div><ButtonLink to={user ? paths.newTrip : paths.register} variant="secondary" className={styles.ctaButton}>{user ? 'Tạo chuyến đi ngay' : 'Bắt đầu ngay'}<img src={nextBlue} alt="" /></ButtonLink></div><footer className={styles.footer}><BrandWordmark /><nav className={styles.footerNav} aria-label="Thông tin Wolfari"><a href="#home-features">Giới thiệu</a><button type="button" onClick={() => unavailable('Hướng dẫn')}>Hướng dẫn</button><button type="button" onClick={() => unavailable('Điều khoản')}>Điều khoản</button><button type="button" onClick={() => unavailable('Liên hệ')}>Liên hệ</button></nav><p>© 2026 Wolfari · PBL6</p></footer></section>
      <Drawer open={notice !== null} label="Thông tin tính năng" side="center" onDismiss={() => setNotice(null)}><Alert live={false}>{notice}</Alert></Drawer>
    </div>
  );
}
