import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../../../src/shared/styles/fonts.css';
import '../../../../../src/shared/styles/global.css';
import styles from './Review.module.css';

const sources = {
  plan: '../figma-plan-review-2026-10-30/20-236.png',
  editor: '../../figma-official/26-406.png',
  fund: '../figma-fund-members-review-2026-10-30/528-4683.png',
  price: '../../figma-official/768-7992.png',
  menu: '../figma-home-auth-review-2026-10-30/783-6655.png',
};
function Review() {
  const [screen, setScreen] = useState<keyof typeof sources>('editor');
  const [state, setState] = useState('default');
  const [size, setSize] = useState('1440x960');
  const [scale, setScale] = useState('0.65');
  const [compare, setCompare] = useState(true);
  const [width, height] = size.split('x').map(Number);
  const factor = Number(scale);
  const ref = `/@fs/${new URL(sources[screen], import.meta.url).pathname.replace(/^\//, '')}`;
  // Use Vite's filesystem URLs only for the existing local reference images.
  const sourceUrls = import.meta.glob('../figma-*/**/*.png', { eager: true, query: '?url', import: 'default' });
  const officialUrls = import.meta.glob('../../figma-official/*.png', { eager: true, query: '?url', import: 'default' });
  const sourceUrl = String(sourceUrls[sources[screen]] ?? officialUrls[sources[screen]] ?? ref);
  return <div className={styles.reviewer}>
    <header className={styles.toolbar}>
      <div><strong>Wolfari · CP-02</strong><p>Bản review bố trí D18 · dữ liệu minh họa · không gọi Backend</p></div>
      <label>Màn hình<select value={screen} onChange={e => setScreen(e.target.value as keyof typeof sources)}>
        <option value="editor">Lịch trình — modal giữa</option><option value="plan">Lịch trình — ngữ cảnh</option>
        <option value="fund">Quỹ — form phải / dưới</option><option value="price">Price Watch — form phải / dưới</option><option value="menu">Web — menu nguồn</option>
      </select></label>
      <label>Trạng thái<select value={state} onChange={e => setState(e.target.value)}>
        <option value="default">Sẵn sàng</option><option value="invalid">Lỗi nhập liệu</option><option value="pending">Đang gửi</option>
        <option value="unknown">Chưa rõ kết quả</option><option value="conflict">Xung đột phiên bản</option><option value="success">Đã xác nhận (mẫu)</option>
        <option value="empty">Chưa có dữ liệu</option><option value="denied">Không có quyền</option>
      </select></label>
      <label>Viewport CSS<select value={size} onChange={e => setSize(e.target.value)}>
        {['1440x960','1366x520','820x900','768x900','402x874','320x600'].map(v=><option key={v}>{v}</option>)}
      </select></label>
      <label>Tỷ lệ xem<select value={scale} onChange={e=>setScale(e.target.value)}><option value="1">100%</option><option value="0.65">65%</option><option value="0.5">50%</option></select></label>
      <label><input type="checkbox" checked={compare} onChange={e=>setCompare(e.target.checked)}/>Hiện ảnh nguồn</label>
    </header>
    <p className={styles.note}>Mẫu tương tác riêng trong docs. Chỉ ba bố trí đã duyệt; màu/font/motion và nội dung trạng thái vẫn đang review. Frame giữ đúng viewport đã chọn, tỷ lệ xem chỉ thu nhỏ khung bên ngoài. Ảnh nguồn không có đủ trạng thái mới.</p>
    <div className={styles.boards}>
      <section><h2>Mẫu CP02 · {size} · {state}</h2><div style={{width:width*factor,height:height*factor}} className={styles.stage}>
        <iframe title="Bản thiết kế Web CP02" src={`/screen.html?screen=${screen}&state=${state}`} style={{width,height,transform:`scale(${factor})`}} />
      </div></section>
      {compare&&<section><h2>Nguồn Figma · {screen==='editor'?'Overlay board, phần A':screen==='menu'?'402 × 874':'1440 × 960'}</h2>
        <img className={styles.reference} src={sourceUrl} alt="Ảnh thiết kế Figma để đối chiếu, không phải giao diện ứng dụng" style={{width:(screen==='menu'?402:1440)*factor}} />
      </section>}
    </div>
  </div>;
}
createRoot(document.getElementById('root')!).render(<Review/>);
