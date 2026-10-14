import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../shared/components/Button';
import { Input } from '../shared/components/Input';
import { Select } from '../shared/components/Select';
import { Alert } from '../shared/components/Alert';
import { Drawer } from '../shared/components/Drawer';
import { NavigationButton } from '../shared/components/NavigationButton';
import { ContentState } from '../shared/components/ContentState';
import { uiAssets } from '../shared/assets/asset-map';
import '../shared/styles/fonts.css';
import '../shared/styles/global.css';
import styles from './design-system.module.css';

function DesignSystemPreview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState('default');
  const [navigation, setNavigation] = useState(0);
  return (
    <main className={styles.preview}>
      <header className={styles.header}>
        <div>
          <h1>Wolfari · Shared UI foundation</h1>
          <p>Fixture preview · Các ví dụ chỉ kiểm tra giao diện và tương tác cục bộ.</p>
        </div>
        <img src={uiAssets.logo} alt="Wolfari" className={styles.logo} />
      </header>
      <a href="/" className={styles.back}>
        Về App Shell
      </a>
      <section className={styles.panel} aria-labelledby="tokens-title">
        <h2 id="tokens-title">Tokens & typography</h2>
        <div className={styles.swatches}>
          {['ink', 'blue', 'pale', 'selected', 'line'].map((name) => (
            <div key={name}>
              <span className={`${styles.swatch} ${styles[name]}`} />
              {name}
            </div>
          ))}
        </div>
        <p className={styles.bodySample}>Be Vietnam Pro · Lên kế hoạch cùng nhau.</p>
        <p className={styles.handwritten}>Cùng bạn đi xa hơn!</p>
      </section>
      <section className={styles.panel} aria-labelledby="buttons-title">
        <h2 id="buttons-title">Button</h2>
        <div className={styles.row}>
          <Button icon={<img src={uiAssets.send} alt="" />}>Thao tác minh họa</Button>
          <Button variant="outline">Xem minh họa</Button>
          <Button disabled>Disabled</Button>
          <Button loading={loading}>Loading minh họa</Button>
          <Button variant="plain" aria-pressed={loading} onClick={() => setLoading(!loading)}>
            Bật/tắt loading
          </Button>
        </div>
      </section>
      <section className={styles.panel} aria-labelledby="fields-title">
        <h2 id="fields-title">Input & Select</h2>
        <form
          className={styles.grid}
          onSubmit={(event) => {
            event.preventDefault();
            setError('Lỗi minh họa: hãy kiểm tra nội dung đã nhập.');
          }}
        >
          <Input
            label="Nội dung minh họa"
            placeholder="Nhập thông tin"
            hint="Giá trị được giữ trong input, không gửi request."
            error={error}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            leadingIcon={<img src={focused ? uiAssets.editFocused : uiAssets.edit} alt="" />}
          />
          <Input
            label="Tìm kiếm minh họa"
            type="search"
            placeholder="Tìm theo tên"
            leadingIcon={<img src={uiAssets.search} alt="" />}
          />
          <Select
            label="Lựa chọn minh họa"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            hint="Select native hỗ trợ bàn phím."
          >
            <option value="default">Mặc định</option>
            <option value="other">Lựa chọn khác</option>
          </Select>
          <Input label="Input disabled" disabled value="Chỉ đọc minh họa" />
          <Select label="Select disabled" disabled defaultValue="default">
            <option value="default">Không khả dụng</option>
          </Select>
          <Select label="Select error" error="Thông báo lỗi minh họa" defaultValue="default">
            <option value="default">Cần kiểm tra</option>
          </Select>
          <div className={styles.row}>
            <Button type="submit" variant="outline">
              Hiện lỗi minh họa
            </Button>
            <Button variant="plain" onClick={() => setError(undefined)}>
              Xóa lỗi minh họa
            </Button>
          </div>
        </form>
      </section>
      <section className={styles.panel} aria-labelledby="alerts-title">
        <h2 id="alerts-title">Alert</h2>
        <div className={styles.grid}>
          <Alert live={false}>
            Thông tin minh họa. Nội dung dài tự xuống dòng theo chiều rộng màn hình.
          </Alert>
          <Alert tone="success" live={false}>
            Mẫu màu success · Không phải kết quả lưu dữ liệu.
          </Alert>
          <Alert tone="warning" live={false}>
            Cảnh báo minh họa.
          </Alert>
          <Alert tone="error" live={false}>
            Lỗi minh họa.
          </Alert>
        </div>
      </section>
      <section className={styles.panel} aria-labelledby="drawer-title">
        <h2 id="drawer-title">Drawer & navigation</h2>
        <Button
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          Mở drawer minh họa
        </Button>
        <Drawer
          open={drawerOpen}
          label="Điều hướng minh họa"
          onDismiss={() => setDrawerOpen(false)}
        >
          <nav aria-label="Điều hướng minh họa">
            {Array.from({ length: 12 }, (_, index) => (
              <NavigationButton
                key={index}
                selected={navigation === index}
                onClick={() => setNavigation(index)}
              >
                Mục minh họa {index + 1}
              </NavigationButton>
            ))}
            <NavigationButton selected={false} disabled>
              Mục chưa khả dụng
            </NavigationButton>
          </nav>
        </Drawer>
      </section>
      <section className={styles.panel} aria-labelledby="states-title">
        <h2 id="states-title">Loading / empty / error / unavailable</h2>
        <div className={styles.grid}>
          <ContentState state="loading" headingLevel={2} />
          <ContentState state="empty" headingLevel={2} />
          <ContentState
            state="error"
            headingLevel={2}
            error={{ code: 'SERVICE_UNAVAILABLE', correlationId: 'preview-only', retryable: false }}
          />
          <ContentState state="unavailable" headingLevel={2} />
        </div>
      </section>
      <footer>UI foundation preview · Không có mutation hoặc kết nối Backend.</footer>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');
createRoot(root).render(
  <StrictMode>
    {import.meta.env.DEV || import.meta.env.MODE === 'preview' ? (
      <DesignSystemPreview />
    ) : (
      <ContentState state="unavailable" />
    )}
  </StrictMode>,
);
