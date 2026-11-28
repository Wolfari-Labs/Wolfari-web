import type { SharingModel } from './SharingPage';
import type { PublicShareModel } from './PublicSharePage';
import cover from '../../shared/assets/figma/new-surfaces/1dc61.png';
import sonTra from '../../shared/assets/figma/new-surfaces/16cac.png';
import food from '../../shared/assets/figma/new-surfaces/42524.png';
import beach from '../../shared/assets/figma/new-surfaces/a84f7.png';

/** Design-preview data. Runtime routes never import this module. */
export const sharingFigma: SharingModel = {
  name: 'Đà Nẵng 3N2Đ',dateLabel:'12 – 14/10/2026',memberLabel:'4 thành viên',cover,
  days:['Ngày 1 (12/10/2026)','Ngày 2 (13/10/2026)','Ngày 3 (14/10/2026)'],documentPages:10,
  history:[{id:'pdf',title:'PDF · Tất cả ngày',time:'Hôm nay, 09:15',status:'complete'},
    {id:'image',title:'Infographic · Ngày 1',time:'Hôm nay, 10:24',status:'processing'},
    {id:'excel',title:'Excel · Ngày 1, 2, 3',time:'Hôm qua, 21:36',status:'complete'}],
};
export const sharingProcessingFigma: SharingModel = {...sharingFigma,history:[{id:'current',title:'PDF · Tất cả ngày',time:'Vừa xong',status:'processing',fresh:true},...sharingFigma.history]};
export const sharingCreatedFigma: SharingModel = {...sharingFigma,link:{url:'wolfari.app/s/da-nang-3n2d',expires:'26/10/2026',content:'Lịch trình, Bản đồ, Dress code',password:false}};
export const publicShareFigma: PublicShareModel = {name:'Đà Nẵng 3N2Đ',dateLabel:'12 – 14/10/2026',expires:'26/10/2026',cover,
  activities:[{time:'08:00',name:'Bán đảo Sơn Trà',description:'Tham quan · 2h30m',image:sonTra},{time:'11:30',name:'Ăn trưa hải sản',description:'Ẩm thực · 1h30m',image:food},{time:'15:00',name:'Bãi biển Mỹ Khê',description:'Tắm biển · 2h00m',image:beach}],
  mapSummary:'6 địa điểm · 4 trong lịch trình',dressSummary:'Nhẹ, thoáng · ưu tiên xanh biển và trắng',packingSummary:'Áo khoác mỏng · Kem chống nắng · Sạc dự phòng'};
