import { BrandWordmark } from '../../../shared/components/BrandWordmark';
import permissionIcon from '../../../shared/assets/figma/new-surfaces/a5c0f.svg';
import auditIcon from '../../../shared/assets/figma/new-surfaces/d3c9c.svg';
import lockIcon from '../../../shared/assets/figma/new-surfaces/db526.svg';
import submitIcon from '../../../shared/assets/figma/new-surfaces/971cb.svg';
import styles from './AdminLoginHero.module.css';

export function AdminLoginBadge() { return <span className={styles.formBadge} aria-hidden="true"><img src={lockIcon} alt="" /></span>; }
export function AdminLoginSubmitIcon() { return <img src={submitIcon} alt="" />; }
export function AdminLoginHero() {
  return <aside className={styles.hero} data-node-id="946:16750">
    <div className={styles.brand}><BrandWordmark /></div>
    <span className={styles.eyebrow}>WOLFARI · SYSTEM ADMIN</span>
    <h2>Vận hành hệ thống<br />không can thiệp nghiệp vụ Trip</h2>
    <p className={styles.intro}>Web Admin dành cho quản trị cấp hệ thống: tài khoản, cấu hình provider, quota, danh mục và giám sát job/log.</p>
    <div className={styles.notes}>
      <section><span className={styles.badge}><img src={permissionIcon} alt="" /></span><div><h3>Nguyên tắc phân quyền</h3><p>Admin không mặc nhiên trở thành Owner/Member/Fund Holder và không xác nhận nghiệp vụ Finance thay người dùng.</p></div></section>
      <section><span className={styles.badge}><img src={auditIcon} alt="" /></span><div><h3>Audit</h3><p>Các thao tác quản trị quan trọng phải lưu người thực hiện, thời điểm và đối tượng.</p></div></section>
    </div>
  </aside>;
}
