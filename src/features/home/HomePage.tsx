import { Link } from 'react-router';
import { paths } from '../../app/route-paths';
import { sceneAssets as art } from '../../shared/assets/scene-assets';
import { Button } from '../../shared/components/Button';
import { ButtonLink } from '../../shared/components/ButtonLink';
import { ContentState } from '../../shared/components/ContentState';
import { TravelCollage } from '../../shared/components/TravelCollage';
import type { HomeViewModel } from './model/home';
import styles from './HomePage.module.css';

const features: readonly {
  title: string;
  description: string;
  frame: keyof typeof art;
  icon: keyof typeof art;
}[] = [
  {
    title: 'Lên lịch trình thông minh',
    description: 'Tối ưu thời gian, tránh trùng lịch',
    frame: '1efdb.svg',
    icon: '7badc.svg',
  },
  {
    title: 'Bản đồ & địa điểm',
    description: 'Khám phá, lưu địa điểm, tính lộ trình',
    frame: '1efdb.svg',
    icon: '2f8ae.svg',
  },
  {
    title: 'Dress code & packing list',
    description: 'Gợi ý theo thời tiết, loại hoạt động',
    frame: 'a507a.svg',
    icon: '9fb2d.svg',
  },
  {
    title: 'Quản lý chi phí',
    description: 'Ghi nhận thu chi, theo dõi quỹ nhóm minh bạch',
    frame: '5673e.svg',
    icon: '69d2e.svg',
  },
  {
    title: 'Nhắc việc & thông báo',
    description: 'Đừng lỡ lịch hẹn, cùng nhau sẵn sàng',
    frame: 'a8d46.svg',
    icon: 'ff817.svg',
  },
  {
    title: 'Theo dõi giá vé',
    description: 'Cảnh báo khi có giá giảm, không lỡ cơ hội',
    frame: '28dbf.svg',
    icon: 'fcd4a.svg',
  },
];
export function HomePage({ model, onRetry }: { model: HomeViewModel; onRetry: () => void }) {
  const user = model.viewerName !== null;
  const featured =
    model.featured.status === 'ready' && model.featured.data.permissions.canRead
      ? model.featured.data
      : null;
  return (
    <div className={styles.page} data-node-id={user ? '298:1642' : '3:28'}>
      <section className={`${styles.hero} ${user ? styles.userHero : ''}`}>
        <div className={styles.heroCopy}>
          <p className={styles.greeting}>
            {user
              ? `CHÀO ${model.viewerName?.split(' ')[0]?.toLocaleUpperCase('vi')},`
              : 'CÙNG NHAU LÊN ĐƯỜNG'}
          </p>
          <p className={styles.eyebrow}>Lên kế hoạch thông minh</p>
          <h1>
            <span className={styles.desktopTitle}>
              <span>Cho những</span>
              <br />
              chuyến đi thật đẹp
            </span>
            <span className={styles.mobileTitle}>
              {user ? (
                <>
                  Đi đâu <em>tiếp</em> nhỉ?
                </>
              ) : (
                <>
                  Cho những
                  <br />
                  chuyến đi thật đẹp
                </>
              )}
            </span>
          </h1>
          {user && <img className={styles.mobileGreetingMascot} src={art['ddfc7.png']} alt="" />}
          <p className={styles.heroDescription}>
            Wolfari là nền tảng lập kế hoạch và đồng hành du lịch thông minh cho nhóm nhỏ. Giúp bạn
            dễ dàng lên lịch trình, quản lý chi phí, khám phá địa điểm và tận hưởng chuyến đi theo
            cách của riêng mình.
          </p>
          <div className={styles.actions}>
            <ButtonLink to={user ? paths.trips : paths.register}>
              {user ? 'Chuyến đi của tôi' : 'Bắt đầu ngay'}
            </ButtonLink>
            <Button variant="outline" disabled title="Chưa có nguồn video được chốt">
              Xem video giới thiệu
            </Button>
          </div>
        </div>
        <img className={styles.heroMascot} src={art['ddfc7.png']} alt="" />
        <div className={styles.heroCollage}>
          <TravelCollage />
        </div>
      </section>
      <section className={styles.mobileWelcome} aria-label="Khám phá hành trình">
        {!user ? (
          <>
            <div className={styles.destination}>
              <img className={styles.waveMascot} src={art['ddfc7.png']} alt="" />
              <strong>Xin chào, Đà Nẵng</strong>
              <p>Một điểm đến, thật nhiều kỷ niệm.</p>
            </div>
            <p className={styles.mobileIntro}>
              Lên lịch, chuẩn bị hành lý và quản lý quỹ — cả nhóm cùng nhau, trong một nơi.
            </p>
            <ButtonLink to={paths.register}>Bắt đầu hành trình</ButtonLink>
            <div className={styles.loginLine}>
              Đã có tài khoản?
              <ButtonLink variant="plain" to={paths.login}>
                Đăng nhập
              </ButtonLink>
            </div>
          </>
        ) : (
          <>
            {featured ? (
              <Link to={paths.trip(featured.id)} className={styles.featured}>
                <div className={styles.featuredCover}>
                  {featured.cover && <img src={featured.cover.src} alt={featured.cover.alt} />}
                  <span>CHUYẾN ĐI SẮP TỚI</span>
                </div>
                <div>
                  <h3>{featured.name}</h3>
                  <p>
                    {featured.dates}
                    {featured.memberCount !== null
                      ? ` · ${featured.memberCount} bạn đồng hành`
                      : ''}
                  </p>
                  <strong>Tiếp tục lên kế hoạch →</strong>
                </div>
              </Link>
            ) : model.featured.status === 'loading' ? (
              <ContentState state="loading" headingLevel={2} />
            ) : model.featured.status === 'error' ? (
              <ContentState
                state="error"
                headingLevel={2}
                error={model.featured.error}
                onRetry={onRetry}
              />
            ) : (
              <ContentState state="empty" headingLevel={2} />
            )}
            <div className={styles.unavailableTiles}>
              <div>
                Hành lý<strong>Chưa khả dụng</strong>
              </div>
              <div>
                Quỹ nhóm<strong>Chưa khả dụng</strong>
              </div>
            </div>
          </>
        )}
      </section>
      <section id="home-features" className={styles.features}>
        <div className={styles.featureIntro}>
          <p>Tất cả những gì bạn cần</p>
          <h2>Trong một nơi</h2>
          <p>
            Wolfari tích hợp đầy đủ các công cụ giúp chuyến đi của bạn trở nên đơn giản, thú vị và
            hiệu quả hơn bao giờ hết.
          </p>
          <img src={art['4ff86.png']} alt="" />
        </div>
        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article key={feature.title}>
              <div className={styles.featureArt} aria-hidden="true">
                <img className={styles.rim} src={art['513e7.svg']} alt="" />
                <img src={art[feature.frame]} alt="" />
                <img className={styles.featureGlyph} src={art[feature.icon]} alt="" />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.mobileFeatures}>
        <h2>Mọi thứ trong một nơi</h2>
        {[
          {
            title: 'Lịch trình & bản đồ',
            sub: 'Điểm đến và kế hoạch từng ngày',
            icon: '299b5.svg',
          },
          {
            title: 'Cùng nhau chuẩn bị',
            sub: 'Dress code, hành lý và nhắc việc',
            icon: '03d8e.svg',
          },
          { title: 'Quản lý quỹ nhóm', sub: 'Cùng nhau ghi lại hành trình', icon: '4a753.svg' },
        ].map((item) => (
          <article key={item.title}>
            <img src={art[item.icon as keyof typeof art]} alt="" />
            <div>
              <h3>{item.title}</h3>
              <p>{item.sub}</p>
            </div>
            <button disabled aria-label={`${item.title} · Chưa khả dụng`}>
              <img src={art['93a4f.svg']} alt="" />
            </button>
          </article>
        ))}
      </section>
      {user && (
        <section className={styles.mobileInspiration}>
          <header>
            <h2>Cảm hứng lên đường</h2>
            <button disabled>Khám phá</button>
          </header>
          {model.landing.status === 'ready' && model.landing.data.inspiration ? (
            <figure>
              <img
                src={model.landing.data.inspiration.cover.src}
                alt={model.landing.data.inspiration.cover.alt}
              />
              <figcaption>
                <h3>{model.landing.data.inspiration.title}</h3>
                <p>{model.landing.data.inspiration.subtitle}</p>
              </figcaption>
            </figure>
          ) : model.landing.status === 'error' ? (
            <ContentState
              state="error"
              headingLevel={2}
              error={model.landing.error}
              onRetry={onRetry}
            />
          ) : (
            <ContentState
              state={model.landing.status === 'loading' ? 'loading' : 'empty'}
              headingLevel={2}
            />
          )}
        </section>
      )}
      <section className={styles.appPreview}>
        <div>
          <h2>
            Xem trước
            <br />
            trải nghiệm của bạn
          </h2>
          <p>Dù là trên web hay điện thoại, Wolfari luôn đồng hành cùng bạn mọi lúc, mọi nơi.</p>
          <ul>
            {[
              'Giao diện thân thiện, dễ sử dụng',
              'Đồng bộ dữ liệu giữa các thiết bị',
              'Nhận thông báo theo thời gian thực',
            ].map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          <ButtonLink to={user ? paths.trips : paths.register}>Khám phá ứng dụng</ButtonLink>
        </div>
        <img
          className={styles.devices}
          src={art['2dc85.png']}
          alt="Minh họa giao diện Wolfari trên điện thoại và máy tính"
        />
      </section>
      <section className={styles.inspiration}>
        <header>
          <h2>
            Những hành trình
            <br />
            đang được lưu lại
          </h2>
          <img src={art['8b8b5.png']} alt="" />
          <p>Minh họa từ thiết kế</p>
        </header>
        <div className={styles.stories}>
          {model.landing.status === 'ready' ? (
            model.landing.data.stories.map((story, index) => (
              <figure key={story.name} className={index % 2 ? styles.tiltRight : styles.tiltLeft}>
                {story.cover && <img src={story.cover.src} alt={story.cover.alt} />}
                <figcaption>
                  <strong>{story.name}</strong>
                  <p>{story.duration}</p>
                </figcaption>
              </figure>
            ))
          ) : model.landing.status === 'loading' ? (
            <ContentState state="loading" headingLevel={2} />
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
            <ContentState state="empty" headingLevel={2} />
          )}
        </div>
        <aside>
          <h3>Truyền cảm hứng</h3>
          <blockquote>“Mỗi chuyến đi là một câu chuyện và bạn là người viết nên nó!”</blockquote>
        </aside>
      </section>
      <section className={styles.footer}>
        <h2>Ready to explore?</h2>
        <p>Cùng Wolfari, mọi hành trình đều trở nên đặc biệt!</p>
        <ButtonLink to={user ? paths.trips : paths.register}>
          {user ? 'Xem chuyến đi của tôi' : 'Bắt đầu hành trình'}
        </ButtonLink>
        <div className={styles.footerCollage} aria-hidden="true">
          <img src={art['1dc61.png']} alt="" />
          <img src={art['a84f7.png']} alt="" />
          <span className={styles.signpost} />
        </div>
      </section>
    </div>
  );
}
