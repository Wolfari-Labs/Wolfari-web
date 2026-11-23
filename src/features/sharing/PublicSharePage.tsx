import { useState } from 'react';
import { Link } from 'react-router';
import { paths } from '../../app/route-paths';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { ShareBadge } from './SharingPage';
import blurredCover from '../../shared/assets/figma/new-surfaces/1dc61.png';
import mascotMap from '../../shared/assets/figma/new-surfaces/4ff86.png';
import mascotWave from '../../shared/assets/figma/new-surfaces/ddfc7.png';
import lockBadge from '../../shared/assets/figma/new-surfaces/43035.svg';
import unavailableBadge from '../../shared/assets/figma/new-surfaces/2e820.svg';
import lockIcon from '../../shared/assets/figma/new-surfaces/b9783.svg';
import eyeIcon from '../../shared/assets/figma/new-surfaces/6ac42.svg';
import homeIcon from '../../shared/assets/figma/new-surfaces/69eaf.svg';
import shareIcon from '../../shared/assets/figma/new-surfaces/2e60f.svg';
import calendarIcon from '../../shared/assets/figma/new-surfaces/e2b00.svg';
import moreIcon from '../../shared/assets/figma/new-surfaces/f71d6.svg';
import mapIcon from '../../shared/assets/figma/new-surfaces/f8169.svg';
import dressIcon from '../../shared/assets/figma/new-surfaces/f0124.svg';
import packingIcon from '../../shared/assets/figma/new-surfaces/7df3f.svg';
import styles from './PublicSharePage.module.css';

export interface PublicShareModel {
  name: string;
  dateLabel: string;
  expires: string;
  cover: string;
  activities: readonly { time: string; name: string; description: string; image: string }[];
  mapSummary: string;
  dressSummary: string;
  packingSummary: string;
}
export function PublicShareView({ model }: { model: PublicShareModel }) {
  return <section className={styles.page} data-node-id="944:17204">
    <p className={styles.banner}><img src={shareIcon} alt="" />Liên kết chia sẻ chỉ xem · Không tạo membership · Dữ liệu hiển thị theo phạm vi Owner đã cho phép</p>
    <header className={styles.hero}>
      <img src={model.cover} alt="" /><div className={styles.heroCopy}><p>HÀNH TRÌNH ĐƯỢC CHIA SẺ</p><h1>{model.name}</h1><div className={styles.tags}><span>{model.dateLabel}</span><span>Chỉ xem</span><span>Liên kết hết hạn: {model.expires}</span></div></div>
    </header>
    <div className={styles.columns}>
      <section className={styles.panel} aria-labelledby="public-itinerary-title"><div className={styles.panelHeading}><ShareBadge icon={calendarIcon} /><h2 id="public-itinerary-title">Lịch trình · Ngày 1</h2></div>
        {model.activities.map(item => <div className={styles.activity} key={`${item.time}-${item.name}`}><time>{item.time}</time><img className={styles.activityImage} src={item.image} alt="" /><div><strong>{item.name}</strong><p>{item.description}</p></div><img src={moreIcon} alt="" /></div>)}
      </section>
      <section className={styles.panel} aria-labelledby="public-content-title"><h2 id="public-content-title">Nội dung được chia sẻ</h2>
        {[[mapIcon,'violet','Bản đồ & địa điểm',model.mapSummary],[dressIcon,'blue','Dress code',model.dressSummary],[packingIcon,'amber','Packing list',model.packingSummary]].map(([icon,tone,title,description]) => <div key={title} className={styles.contentRow}><ShareBadge icon={icon!} tone={tone!} /><div><strong>{title}</strong><p>{description}</p></div></div>)}
        <p className={styles.privacy}>Finance, liên hệ thành viên, người được giao Packing và dữ liệu riêng tư không hiển thị trong Public Share.</p>
      </section>
    </div>
  </section>;
}
export function PublicShareGate({ state = 'unavailable', onUnlock, runtime = false }: { state?: 'protected' | 'unavailable'; onUnlock?: (password: string) => void; runtime?: boolean }) {
  const [password, setPassword] = useState('');
  const protectedLink = state === 'protected';
  return <section className={styles.gatePage} data-node-id={protectedLink ? '944:17340' : '944:17410'}>
    <img className={styles.blurredCover} src={blurredCover} alt="" />
    <div className={styles.gateWrap}>
      <form className={styles.gate} onSubmit={event => {event.preventDefault(); onUnlock?.(password);}}>
        <div className={styles.gateBadge}><ShareBadge icon={protectedLink ? lockBadge : unavailableBadge} tone={protectedLink ? 'violet' : 'coral'} /></div>
        <h1>{protectedLink ? 'Liên kết được bảo vệ' : 'Liên kết không còn khả dụng'}</h1>
        <p>{protectedLink ? 'Nhập mật khẩu do người chia sẻ cung cấp để xem nội dung công khai của chuyến đi.' : runtime ? 'Chia sẻ công khai chưa khả dụng trong phiên bản hiện tại. Không có dữ liệu chuyến đi được công khai.' : 'Liên kết có thể đã hết hạn, bị thu hồi, bị vô hiệu hóa hoặc Trip đã bị xóa.'}</p>
        {protectedLink ? <><Input label="Mật khẩu" type="password" value={password} leadingIcon={<img src={lockIcon} alt="" />} onChange={event => setPassword(event.target.value)} /><Button type="submit" icon={<img src={eyeIcon} alt="" />}>Mở liên kết</Button></>
          : <Link className={styles.homeLink} to={paths.home}><img src={homeIcon} alt="" />Về trang chủ</Link>}
      </form>
      <img className={styles.mascot} src={protectedLink ? mascotWave : mascotMap} alt="" width="130" height={protectedLink ? '108' : '130'} />
    </div>
  </section>;
}
/** No public-share API exists; opaque share IDs never unlock private trip queries. */
export function PublicSharePage() { return <PublicShareGate runtime />; }
