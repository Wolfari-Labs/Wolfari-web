import destinationPhoto from '../../../shared/assets/figma/06bd1.png';
import destinationThumb1 from '../../../shared/assets/figma/ead32.svg';
import destinationThumb2 from '../../../shared/assets/figma/5b6b8.svg';
import destinationThumb3 from '../../../shared/assets/figma/274c0.svg';
import mascotReadingMap from '../../../shared/assets/v2/mascot-reading-map.png';
import thumbDaNang from '../../../shared/assets/v2/destination-danang.jpg';
import thumbPhuQuoc from '../../../shared/assets/v2/destination-phuquoc.jpg';
import thumbSaPa from '../../../shared/assets/v2/destination-sapa.jpg';
import thumbHaNoi from '../../../shared/assets/v2/destination-hanoi.jpg';
import thumbNinhBinh from '../../../shared/assets/v2/destination-ninhbinh.jpg';
import thumbHue from '../../../shared/assets/v2/destination-hue.jpg';
import { GeoapifyMap } from '../../map/GeoapifyMap';
import type { MapCenter, MapPoint } from '../../map/GeoapifyMap';
import styles from './CreateTripPage.module.css';

const defaultMapCenter: MapCenter = { latitude: 16.0544, longitude: 108.2022 };

const destinations = [
  {
    name: 'Đà Nẵng',
    caption: 'Thành phố biển',
    tags: 'Biển · Văn hóa',
    image: destinationPhoto,
    thumb: thumbDaNang,
    coordinates: { latitude: 16.0544, longitude: 108.2022 },
  },
  {
    name: 'Phú Quốc',
    caption: 'Đảo ngọc',
    tags: 'Biển đảo · Nghỉ dưỡng',
    image: destinationThumb1,
    thumb: thumbPhuQuoc,
    coordinates: { latitude: 10.2899, longitude: 103.984 },
  },
  {
    name: 'Sa Pa',
    caption: 'Phố núi trong mây',
    tags: 'Thiên nhiên · Khám phá',
    image: destinationThumb2,
    thumb: thumbSaPa,
    coordinates: { latitude: 22.3364, longitude: 103.8438 },
  },
  {
    name: 'Hà Nội',
    caption: 'Thủ đô ngàn năm',
    tags: 'Văn hóa · Ẩm thực',
    image: destinationThumb3,
    thumb: thumbHaNoi,
    coordinates: { latitude: 21.0285, longitude: 105.8542 },
  },
  {
    name: 'Ninh Bình',
    caption: 'Non nước hữu tình',
    tags: 'Thiên nhiên · Check-in',
    image: destinationThumb1,
    thumb: thumbNinhBinh,
    coordinates: { latitude: 20.2506, longitude: 105.9745 },
  },
  {
    name: 'Huế',
    caption: 'Cố đô thơ mộng',
    tags: 'Di sản · Ẩm thực',
    image: destinationThumb2,
    thumb: thumbHue,
    coordinates: { latitude: 16.4637, longitude: 107.5909 },
  },
];

export function TripDestinationMobilePreview({ destination }: { destination: string }) {
  const selected = destinations.find((item) => item.name === destination);
  return (
    <div className={styles.mobileDestinationPreview}>
      <img
        src={selected?.image ?? destinationPhoto}
        alt={destination ? `Điểm đến ${destination}` : 'Gợi ý điểm đến Đà Nẵng'}
      />
      <div>
        <strong>{destination || 'Đà Nẵng'}</strong>
        <span>{selected?.caption ?? 'Thành phố đáng sống'}</span>
      </div>
    </div>
  );
}

export function TripDestinationPreview({
  destination,
  onSelect,
  label = 'Gợi ý điểm đến',
  disabled,
}: {
  destination: string;
  onSelect: (name: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const selected = destinations.find((item) => item.name === destination);
  const mapPoints: MapPoint[] = selected
    ? [
        {
          id: selected.name,
          name: selected.name,
          ...selected.coordinates,
          number: 1,
          selected: true,
          clusterable: false,
        },
      ]
    : [];

  return (
    <aside className={styles.destinationPanel} aria-label={label}>
      <div className={styles.mapCard}>
        <h2>Bản đồ điểm đến</h2>
        <div className={styles.mapArea}>
          <GeoapifyMap
            points={mapPoints}
            selectedId={selected?.name ?? null}
            focus={selected?.coordinates ?? defaultMapCenter}
            initialView={defaultMapCenter}
            embedded
            scrollWheelZoom
          />
          <span className={styles.mapHint}>
            {selected
              ? `Đang xem bản đồ ${selected.name}`
              : destination
                ? 'Chọn gợi ý bên dưới để ghim vị trí lên bản đồ'
                : 'Chọn một nơi để bắt đầu hành trình'}
          </span>
          <div className={styles.selectedDestination}>
            <img src={selected?.thumb ?? thumbDaNang} alt="" />
            <div>
              <small>Điểm đến đã chọn</small>
              <strong>{destination || 'Chưa chọn điểm đến'}</strong>
              <span>{selected?.caption ?? 'Chọn từ danh sách gợi ý bên dưới'}</span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.suggestions}>
        <h2>Gợi ý điểm đến phổ biến</h2>
        <div>
          {destinations.map((item) => (
            <button
              key={item.name}
              type="button"
              disabled={disabled}
              aria-pressed={destination === item.name}
              onClick={() => onSelect(item.name)}
            >
              <img src={item.thumb} alt="" />
              <span>
                <strong>{item.name}</strong>
                <small>{item.tags}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.mascotCard}>
        <img src={mascotReadingMap} alt="" />
        <div>
          <strong>Biến ý tưởng thành hành trình đáng nhớ!</strong>
          <p>
            Sau khi tạo, cả nhóm có thể cùng lên lịch trình, chọn dress code và chuẩn bị hành lý.
          </p>
        </div>
      </div>
    </aside>
  );
}
