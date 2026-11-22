import heroPhoto from '../../shared/assets/figma/1dc61.png';
import mapArt from '../../shared/assets/v2/map-art.svg';
import wavingMascot from '../../shared/assets/v2/mascot-waving.png';
import { Icon } from '../../shared/components/Icon';
import styles from './HomePreviews.module.css';

/* Stylised, decorative product previews for the public Home. Every wrapper is aria-hidden: the
   same information is told in the surrounding copy. Names and amounts are sample content. */

type FaceTone = 'sky' | 'mint' | 'butter' | 'peach' | 'lilac';

function Face({ initial, tone }: { initial: string; tone: FaceTone }) {
  return (
    <span className={styles.face} data-tone={tone}>
      {initial}
    </span>
  );
}

function Check({ done }: { done: boolean }) {
  return (
    <span className={styles.check} data-done={done}>
      {done && <Icon name="check" size={12} strokeWidth={3} />}
    </span>
  );
}

export function HeroPreview() {
  return (
    <div className={styles.hero} data-layout="home-collage" aria-hidden="true">
      <img className={styles.heroMascot} src={wavingMascot} alt="" width="260" height="173" />
      <div className={styles.tripCard}>
        <div className={styles.tripCover}>
          <img src={heroPhoto} alt="" width="900" height="600" fetchPriority="high" />
          <span className={styles.coverChip}>
            <Icon name="calendar" size={14} />
            12/12 – 15/12
          </span>
        </div>
        <div className={styles.tripBody}>
          <div className={styles.tripHead}>
            <div className={styles.tripTitle}>
              <strong>Đà Nẵng – Hội An</strong>
              <span>4 ngày · 5 thành viên</span>
            </div>
            <span className={styles.faces}>
              <Face initial="M" tone="sky" />
              <Face initial="A" tone="mint" />
              <Face initial="T" tone="peach" />
              <span className={styles.faceMore}>+2</span>
            </span>
          </div>
          <div className={styles.tabs}>
            <span data-active="true">Lịch trình</span>
            <span>Bản đồ</span>
            <span>Hành lý</span>
            <span>Quỹ nhóm</span>
          </div>
          <div className={styles.dayLabel}>
            <strong>Ngày 1</strong>
            <span>3 hoạt động</span>
          </div>
          <ol className={styles.dayList}>
            <li>
              <span className={styles.time}>08:00</span>
              <span className={styles.dot} data-tone="blue" />
              <span className={styles.activity}>Bãi biển Mỹ Khê</span>
            </li>
            <li>
              <span className={styles.time}>11:30</span>
              <span className={styles.dot} data-tone="amber" />
              <span className={styles.activity}>Chợ Hàn</span>
            </li>
            <li>
              <span className={styles.time}>15:00</span>
              <span className={styles.dot} data-tone="green" />
              <span className={styles.activity}>Bán đảo Sơn Trà</span>
            </li>
          </ol>
        </div>
      </div>
      <div className={`${styles.floatCard} ${styles.floatPacking}`}>
        <span className={styles.tile} data-tone="amber">
          <Icon name="packing" size={18} />
        </span>
        <span className={styles.floatText}>
          <strong>Hành lý</strong>
          <span>9/12 món đã xong</span>
        </span>
        <span className={styles.progress}>
          <span style={{ width: '75%' }} />
        </span>
      </div>
      <div className={`${styles.floatCard} ${styles.floatPrice}`}>
        <span className={styles.tile} data-tone="coral">
          <Icon name="price" size={18} />
        </span>
        <span className={styles.floatText}>
          <strong>SGN → DAD</strong>
          <span>Giá đã chạm ngưỡng</span>
        </span>
        <span className={styles.floatAmount}>1.150.000 ₫</span>
      </div>
    </div>
  );
}

export function PlanPreview() {
  return (
    <div className={styles.panel} aria-hidden="true">
      <div className={styles.board}>
        <div className={styles.column}>
          <div className={styles.columnHead}>
            <strong>Ngày 1</strong>
            <span>12/12</span>
          </div>
          <div className={styles.activityCard}>
            <Icon name="grip" size={16} className={styles.grip ?? ''} />
            <span className={styles.activityText}>
              <strong>Bãi biển Mỹ Khê</strong>
              <span>08:00 · 2 giờ</span>
            </span>
          </div>
          <div className={`${styles.activityCard} ${styles.dragging}`}>
            <Icon name="grip" size={16} className={styles.grip ?? ''} />
            <span className={styles.activityText}>
              <strong>Chợ Hàn</strong>
              <span>11:30 · Ăn trưa</span>
            </span>
          </div>
          <div className={styles.activityCard}>
            <Icon name="grip" size={16} className={styles.grip ?? ''} />
            <span className={styles.activityText}>
              <strong>Bán đảo Sơn Trà</strong>
              <span>15:00 · 3 giờ</span>
            </span>
          </div>
        </div>
        <div className={`${styles.column} ${styles.pool}`}>
          <div className={styles.columnHead}>
            <strong>Chưa xếp lịch</strong>
            <span>2</span>
          </div>
          <div className={styles.activityCard}>
            <Icon name="grip" size={16} className={styles.grip ?? ''} />
            <span className={styles.activityText}>
              <strong>Cầu Rồng</strong>
              <span>Buổi tối</span>
            </span>
          </div>
          <div className={styles.activityCard}>
            <Icon name="grip" size={16} className={styles.grip ?? ''} />
            <span className={styles.activityText}>
              <strong>Cà phê muối</strong>
              <span>Ý tưởng</span>
            </span>
          </div>
        </div>
      </div>
      <div className={styles.mapCard}>
        <div className={styles.map}>
          <img src={mapArt} alt="" width="680" height="700" loading="lazy" />
          <svg viewBox="0 0 400 140" preserveAspectRatio="xMidYMid slice">
            <path
              d="M112 98 C 150 58, 175 108, 205 70 S 268 40, 290 58"
              fill="none"
              stroke="#1f5fd1"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="2 9"
            />
            {[
              [112, 98, '1'],
              [205, 70, '2'],
              [290, 58, '3'],
            ].map(([x, y, label]) => (
              <g key={label}>
                <circle cx={x} cy={y} r="13" fill="#1f5fd1" stroke="#fff" strokeWidth="3" />
                <text
                  x={x}
                  y={Number(y) + 4.5}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill="#fff"
                >
                  {label}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className={styles.mapFoot}>
          <Icon name="map" size={16} />
          <strong>Lộ trình Ngày 1</strong>
          <span>3 điểm dừng</span>
        </div>
      </div>
    </div>
  );
}

export function PreparePreview() {
  const items = [
    { name: 'Kem chống nắng', done: true, who: ['M', 'sky'] as const },
    { name: 'Sạc dự phòng', done: true, who: ['A', 'mint'] as const },
    { name: 'Bộ sơ cứu', done: true, who: ['M', 'sky'] as const },
    { name: 'Loa bluetooth', done: false, who: ['T', 'peach'] as const },
    { name: 'Thuốc say xe', done: false, who: null },
  ];
  return (
    <div className={`${styles.panel} ${styles.prepare}`} data-tone="amber" aria-hidden="true">
      <div className={`${styles.card} ${styles.packingCard}`}>
        <div className={styles.cardHead}>
          <span className={styles.tile} data-tone="amber">
            <Icon name="packing" size={18} />
          </span>
          <strong>Hành lý chung</strong>
          <span className={styles.count}>9/12</span>
        </div>
        <span className={styles.progress}>
          <span style={{ width: '75%' }} />
        </span>
        <span className={styles.category}>Đồ dùng chung</span>
        <ul className={styles.checklist}>
          {items.map((item) => (
            <li key={item.name} data-done={item.done}>
              <Check done={item.done} />
              <span className={styles.itemName}>{item.name}</span>
              {item.who ? (
                <Face initial={item.who[0]} tone={item.who[1]} />
              ) : (
                <span className={styles.unassigned}>Chưa giao</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.tile} data-tone="violet">
            <Icon name="dress" size={18} />
          </span>
          <strong>Dress code</strong>
        </div>
        <span className={styles.cardSub}>Ngày 2 · Đi biển</span>
        <span className={styles.swatches}>
          <span style={{ background: '#f4e3c7' }} />
          <span style={{ background: '#8ec5e8' }} />
          <span style={{ background: '#ffffff' }} />
          <span style={{ background: '#e5603f' }} />
        </span>
        <span className={styles.chips}>
          <span>Áo linen</span>
          <span>Quần short</span>
          <span>Sandal</span>
        </span>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.tile} data-tone="blue">
            <Icon name="members" size={18} />
          </span>
          <strong>Thành viên</strong>
        </div>
        <ul className={styles.memberList}>
          <li>
            <Face initial="M" tone="sky" />
            <span>Minh</span>
            <span className={styles.role} data-tone="blue">
              Chủ chuyến
            </span>
          </li>
          <li>
            <Face initial="A" tone="mint" />
            <span>An</span>
            <span className={styles.role}>Thành viên</span>
          </li>
          <li>
            <Face initial="T" tone="peach" />
            <span>Thảo</span>
            <span className={styles.role} data-tone="amber">
              Đã mời
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function MoneyPreview() {
  return (
    <div className={`${styles.panel} ${styles.money}`} data-tone="green" aria-hidden="true">
      <div className={`${styles.card} ${styles.fundCard}`}>
        <div className={styles.cardHead}>
          <span className={styles.tile} data-tone="green">
            <Icon name="fund" size={18} />
          </span>
          <strong>Quỹ nhóm</strong>
          <span className={styles.holder}>Minh giữ quỹ</span>
        </div>
        <div className={styles.balance}>
          <span>Còn lại</span>
          <strong>3.200.000 ₫</strong>
        </div>
        <div className={styles.stats}>
          <span>
            Đã góp
            <strong>6.000.000 ₫</strong>
          </span>
          <span>
            Đã chi
            <strong>2.800.000 ₫</strong>
          </span>
        </div>
        <ul className={styles.ledger}>
          <li>
            <Face initial="A" tone="mint" />
            <span className={styles.ledgerText}>
              <strong>An góp quỹ</strong>
              <span className={styles.status} data-tone="green">
                Đã đối chiếu
              </span>
            </span>
            <span className={styles.amount} data-sign="in">
              +1.200.000 ₫
            </span>
          </li>
          <li>
            <Face initial="T" tone="peach" />
            <span className={styles.ledgerText}>
              <strong>Ăn tối hải sản</strong>
              <span className={styles.status} data-tone="amber">
                Chờ đối chiếu
              </span>
            </span>
            <span className={styles.amount}>−1.450.000 ₫</span>
          </li>
        </ul>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.tile} data-tone="coral">
            <Icon name="price" size={18} />
          </span>
          <strong>SGN → DAD</strong>
          <span className={styles.cardMeta}>15/12</span>
        </div>
        <svg className={styles.spark} viewBox="0 0 240 72" preserveAspectRatio="none">
          <line
            x1="0"
            y1="44"
            x2="240"
            y2="44"
            stroke="#c2412d"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <polyline
            points="0,14 30,20 60,12 90,26 120,22 150,34 180,30 210,48 240,54"
            fill="none"
            stroke="#1f5fd1"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx="240" cy="54" r="4" fill="#1f5fd1" />
        </svg>
        <div className={styles.priceRow}>
          <span>Ngưỡng 1.200.000 ₫</span>
          <strong>1.150.000 ₫</strong>
        </div>
      </div>
      <div className={`${styles.card} ${styles.toast}`}>
        <span className={styles.tile} data-tone="blue">
          <Icon name="bell" size={18} />
        </span>
        <span className={styles.toastText}>
          <strong>Giá vé SGN → DAD đã chạm ngưỡng</strong>
          <span>Vừa xong</span>
        </span>
      </div>
    </div>
  );
}
