import { useState, type ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { useOutletContext } from 'react-router';
import type { RouteContext } from '../../../app/route-context';
import type { AdminSection } from '../model/shell';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Alert } from '../../../shared/components/Alert';
import type { AdminViewModel, AdminUserRow } from './AdminChrome.model';
import { unavailableAdminModel } from './AdminChrome.model';
import { ShareBadge } from '../../sharing/SharingPage';
import usersIcon from '../../../shared/assets/figma/new-surfaces/a5c0f.svg';
import compassIcon from '../../../shared/assets/figma/new-surfaces/67806.svg';
import globeIcon from '../../../shared/assets/figma/new-surfaces/54a79.svg';
import warningIcon from '../../../shared/assets/figma/new-surfaces/f09b1.svg';
import chartIcon from '../../../shared/assets/figma/new-surfaces/ca14c.svg';
import clockIcon from '../../../shared/assets/figma/new-surfaces/d3c9c.svg';
import fileIcon from '../../../shared/assets/figma/new-surfaces/eb5f4.svg';
import pinIcon from '../../../shared/assets/figma/new-surfaces/bb2ac.svg';
import imageIcon from '../../../shared/assets/figma/new-surfaces/7d48d.svg';
import mapIcon from '../../../shared/assets/figma/new-surfaces/92915.svg';
import weatherIcon from '../../../shared/assets/figma/new-surfaces/6f291.svg';
import priceIcon from '../../../shared/assets/figma/new-surfaces/929b5.svg';
import emailIcon from '../../../shared/assets/figma/new-surfaces/8fa84.svg';
import pushIcon from '../../../shared/assets/figma/new-surfaces/ae17b.svg';
import geocodingIcon from '../../../shared/assets/figma/new-surfaces/5fd2f.svg';
import lockIcon from '../../../shared/assets/figma/new-surfaces/398e0.svg';
import unlockIcon from '../../../shared/assets/figma/new-surfaces/22fd2.svg';
import eyeIcon from '../../../shared/assets/figma/new-surfaces/362ee.svg';
import addIcon from '../../../shared/assets/figma/new-surfaces/4b1de.svg';
import seaPalette from '../../../shared/assets/figma/new-surfaces/4d21c.svg';
import naturePalette from '../../../shared/assets/figma/new-surfaces/8c09d.svg';
import cityPalette from '../../../shared/assets/figma/new-surfaces/e9ba1.svg';
import switchOn from '../../../shared/assets/figma/new-surfaces/b5db1.svg';
import switchOff from '../../../shared/assets/figma/new-surfaces/dde83.svg';
import styles from './AdminChromeContent.module.css';

const descriptions: Record<AdminSection,string> = {
  overview:'Theo dõi nhanh tài khoản, Trip, provider và background job.',accounts:'Quản lý trạng thái tài khoản và xem trạng thái hoạt động Trip ở mức hệ thống.',
  providers:'Bật/tắt cấu hình tích hợp, theo dõi health và quota; không hiển thị secret trên client.',configuration:'Quản lý cấu hình nội dung dùng chung, tách khỏi dữ liệu nghiệp vụ từng Trip.',
  monitoring:'Theo dõi background job, lỗi tích hợp và audit thao tác quản trị.',audit:'Theo dõi background job, lỗi tích hợp và audit thao tác quản trị.',
};
const providerIcons = {map:mapIcon,weather:weatherIcon,price:priceIcon,email:emailIcon,push:pushIcon,geocoding:geocodingIcon};
const number = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('vi-VN').format(value);
function Heading({icon,tone='blue',title,subtitle,children}:{icon:string;tone?:string;title:string;subtitle?:string;children?:ReactNode}) {
  return <div className={styles.heading}><ShareBadge icon={icon} tone={tone} /><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{children}</div>;
}
function Note({children,tone='muted',title}:{children:ReactNode;tone?:string;title?:string}) {return <div className={styles.note} data-tone={tone}>{title && <strong>{title}</strong>}<p>{children}</p></div>;}
function EmptyData(){return <p className={styles.empty} role="status">Chưa có kết nối dữ liệu quản trị. Không hiển thị số liệu giả.</p>;}
function Tag({children,tone}:{children:ReactNode;tone?:string}){return <span className={styles.tag} data-tone={tone}>{children}</span>;}
function TripStatus({counts,bars=false}:{counts:AdminViewModel['tripCounts'];bars?:boolean}) {return <div className={styles.tripStatus} data-bars={bars || undefined}>
  {['Đang lên kế hoạch','Đang diễn ra','Đã lưu trữ'].map((label,index)=><div key={label}><span>{label}</span><strong>{number(counts[index] ?? null)}</strong>{bars && <div className={styles.track}><i style={{width: counts[index] === null ? '0%' : `${[74,26,9][index]}%`}} /></div>}</div>)}
</div>;}
function Switch({enabled,onClick,label}:{enabled:boolean;onClick:()=>void;label:string}) {return <button type="button" className={styles.switch} aria-label={label} aria-pressed={enabled} onClick={onClick}><img src={enabled?switchOn:switchOff} alt="" /></button>;}

/** A01–A05 and their presentation states. Commands are provided, not simulated here. */
export function AdminWorkspaceView({section,model=unavailableAdminModel,onUnavailable,initialDialog,toast}:{
  section:AdminSection;model?:AdminViewModel;onUnavailable:(action:string)=>void;initialDialog?:'lock'|'configuration';toast?:ReactNode;
}) {
  const [statusFilter,setStatusFilter]=useState('all'),[jobFilter,setJobFilter]=useState('all');
  const [selectedJob,setSelectedJob]=useState<string|null>(model.jobs[0]?.id ?? null);
  const [dialog,setDialog]=useState<'lock'|'configuration'|null>(initialDialog ?? null);
  const [selectedUser,setSelectedUser]=useState<AdminUserRow|null>(model.users.find(row=>row.id==='spam') ?? null);
  const [configType,setConfigType]=useState('Template export'),[configName,setConfigName]=useState('');
  const job=model.jobs.find(row=>row.id===selectedJob);
  const unavailable=()=>onUnavailable('Thao tác quản trị');
  return <section className={styles.workspace} data-admin-section={section}>
    <p className={styles.description}>{descriptions[section]}</p>
    {section==='overview' ? <>
      <div className={styles.stats}>{[
        {value:number(model.accounts),label:'Tài khoản',detail:model.lockedAccounts===null?'Chưa có dữ liệu':`${number(model.lockedAccounts)} tài khoản bị khóa`,tone:'blue',icon:usersIcon},
        {value:number(model.activeTrips),label:'Trip đang hoạt động',detail:model.tripCounts[2]===null?'Chưa có dữ liệu':`${number(model.tripCounts[2])} Trip đã lưu trữ`,tone:'green',icon:compassIcon},
        {value:model.availableProviders===null?'—':`${number(model.availableProviders)} / ${number(model.providerCount)}`,label:'Provider khả dụng',detail:model.availableProviders===null?'Chưa có dữ liệu':'Price provider đang cảnh báo',tone:'amber',icon:globeIcon},
        {value:number(model.attentionJobs),label:'Job cần chú ý',detail:model.attentionJobs===null?'Chưa có dữ liệu':'1 export · 1 price watch',tone:'coral',icon:warningIcon},
      ].map(stat=><div key={stat.label} className={styles.stat} data-tone={stat.tone}><ShareBadge icon={stat.icon} tone={stat.tone} /><strong>{stat.value}</strong><span>{stat.label}</span><Tag>{stat.detail}</Tag></div>)}</div>
      <div className={styles.overviewColumns}><section className={styles.panel}><Heading icon={warningIcon} tone="coral" title="Cảnh báo vận hành" /><div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Mức</th><th>Nguồn</th><th>Nội dung</th><th>Thời điểm</th></tr></thead><tbody>{model.alerts.map(row=><tr key={row.source}><td><Tag tone={row.level==='Lỗi'?'coral':row.level==='Cảnh báo'?'amber':'blue'}>{row.level}</Tag></td><td><strong>{row.source}</strong><small>{row.detail}</small></td><td>{row.message}</td><td>{row.time}</td></tr>)}</tbody></table>{!model.alerts.length && <EmptyData />}</div><Note>Provider lỗi không được giả thành dữ liệu hợp lệ; các chức năng cốt lõi không phụ thuộc provider vẫn tiếp tục hoạt động.</Note></section>
      <aside className={styles.panel}><Heading icon={chartIcon} tone="violet" title="Trip theo trạng thái" /><TripStatus counts={model.tripCounts} bars /><Note tone="violet">Admin chỉ xem dữ liệu quản trị cần thiết; không dùng Web Admin để chỉnh Plan hoặc thao tác quỹ thay người dùng.</Note></aside></div>
    </> : section==='accounts' ? <div className={styles.twoColumns}>
      <section className={styles.panel}><Heading icon={usersIcon} title="Người dùng" subtitle={model.accounts===null?'Số tài khoản chưa khả dụng':`${number(model.accounts)} tài khoản`}><label className={styles.filter}>Trạng thái: <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Lọc trạng thái tài khoản"><option value="all">Tất cả</option><option value="ACTIVE">ACTIVE</option><option value="LOCKED">LOCKED</option></select></label></Heading>
        <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Người dùng</th><th>Trạng thái</th><th>Trip</th><th>Tham gia</th><th>Thao tác</th></tr></thead><tbody>{model.users.filter(row=>statusFilter==='all'||row.status===statusFilter).map(row=><tr key={row.id} data-selected={row.id===selectedUser?.id && !!dialog || undefined}><td><strong>{row.name}</strong><small>{row.email}</small></td><td><Tag tone={row.status==='ACTIVE'?'green':'coral'}>{row.status}</Tag></td><td>{row.trips}</td><td>{row.joined}</td><td>{row.protected?'—':<Button className={styles.smallButton} variant="ghost" data-tone={row.status==='LOCKED'?'violet':'coral'} icon={<img src={row.status==='LOCKED'?unlockIcon:lockIcon} alt="" />} onClick={()=>{if(row.status==='LOCKED')onUnavailable('Mở khóa tài khoản');else{setSelectedUser(row);setDialog('lock');}}}>{row.status==='LOCKED'?'Mở khóa':'Khóa'}</Button>}</td></tr>)}</tbody></table>{!model.users.length && <EmptyData />}</div>
        <Note title="Phạm vi dữ liệu">Danh sách quản trị chỉ hiển thị metadata cần cho vận hành; không mở nội dung riêng tư của Trip từ đây.</Note>
      </section><aside className={styles.panel}><Heading icon={compassIcon} tone="green" title="Trạng thái Trip" /><TripStatus counts={model.tripCounts} /><Note tone="violet">Admin không tự có Owner/Member chỉ vì có quyền hệ thống.</Note></aside>
    </div> : section==='providers' ? <section className={`${styles.panel} ${styles.fullPanel}`}><Heading icon={globeIcon} tone="violet" title="Tích hợp bên ngoài" subtitle="Secret/API key chỉ lưu server-side."><Tag tone="green">{model.availableProviders===null?'Chưa có dữ liệu':`${model.availableProviders} / ${model.providerCount} khả dụng`}</Tag></Heading>
      <div className={styles.tableScroll}><table className={`${styles.table} ${styles.providerTable}`}><thead><tr><th>Provider</th><th>Chức năng</th><th>Health</th><th>Quota</th><th>Cập nhật</th><th>Cấu hình</th></tr></thead><tbody>{model.providers.map(row=><tr key={row.name} data-selected={row.health==='Degraded'||undefined}><td><span className={styles.providerName}><ShareBadge icon={providerIcons[row.icon]} tone={row.tone} small /><strong>{row.name}</strong></span></td><td>{row.purpose}</td><td><Tag tone={row.health==='Healthy'?'green':row.health==='Degraded'?'amber':'muted'}>{row.health}</Tag></td><td><div className={styles.quota}><span><i data-warning={row.health==='Degraded'||undefined} style={{width:`${row.quota??0}%`}} /></span><small>{row.quota===null?'—':`${row.quota}% / ngày`}</small></div></td><td>{row.updated}</td><td><Switch label={`Bật/tắt ${row.name}`} enabled={row.enabled} onClick={()=>onUnavailable(`Thay đổi provider ${row.name}`)} /></td></tr>)}</tbody></table>{!model.providers.length && <EmptyData />}</div>
      <Note tone="amber">Provider lỗi phải trả trạng thái phù hợp; không gọi retry vô hạn và không trình bày mock/fallback như dữ liệu thật.</Note>
    </section> : section==='configuration' ? <><div className={styles.catalogColumns}>{[
      ['Template export','Mẫu PDF / Excel / infographic',fileIcon,'blue'],['Tiện ích công cộng','Danh mục gợi ý địa điểm',pinIcon,'green'],['Theme infographic','Bộ theme xuất ảnh',imageIcon,'violet'],
    ].map(([title,subtitle,icon,tone],index)=><section key={title} className={`${styles.panel} ${styles.catalog}`}><Heading icon={icon!} tone={tone!} title={title!} subtitle={subtitle!} />
      {model.catalogs[index]?.map(row=><div className={styles.catalogRow} key={row.name}>{row.palette && <img src={{sea:seaPalette,nature:naturePalette,city:cityPalette}[row.palette]} alt="" />}<div><strong>{row.name}</strong>{row.detail && <small>{row.detail}</small>}</div>{row.tag && <Tag tone={index===0?'green':'violet'}>{row.tag}</Tag>}{row.enabled!==undefined && <Switch enabled={row.enabled} label={`Bật/tắt ${row.name}`} onClick={unavailable} />}<button type="button" className={styles.more} onClick={unavailable} aria-label={`Tùy chọn ${row.name}`}>⋯</button></div>)}
      {!model.catalogs[index]?.length && <EmptyData />}<Button variant="outline" className={styles.add} icon={<img src={addIcon} alt="" />} onClick={()=>{setConfigType(title!);setDialog('configuration');}}>Thêm cấu hình</Button>
    </section>)}</div><div className={styles.catalogNote}><Note title="Lưu ý" tone="violet">Cấu hình dùng chung không cho phép truy cập dữ liệu riêng tư của Trip.</Note></div></>
      : <div className={styles.twoColumns}><section className={styles.panel}><Heading icon={clockIcon} title="Background jobs"><div className={styles.jobFilters}>{['all','FAILED','RETRYING','RUNNING'].map(value=><button key={value} type="button" aria-pressed={jobFilter===value} onClick={()=>setJobFilter(value)}>{value==='all'?'Tất cả':value}</button>)}</div></Heading>
        <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Job</th><th>Loại</th><th>Trạng thái</th><th>Lần chạy</th><th>Thao tác</th></tr></thead><tbody>{model.jobs.filter(row=>jobFilter==='all'||row.status===jobFilter).map(row=><tr key={row.id} data-selected={row.id===selectedJob||undefined}><td><strong>{row.id}</strong><small>{row.description}</small></td><td>{row.type}</td><td><Tag tone={row.status==='SUCCESS'?'green':row.status==='FAILED'?'coral':row.status==='RETRYING'?'amber':'blue'}>{row.status}</Tag></td><td>{row.time}</td><td>{row.status==='SUCCESS'?'—':<Button variant="ghost" className={styles.smallButton} data-tone="violet" icon={<img src={eyeIcon} alt="" />} onClick={()=>setSelectedJob(row.id)}>Xem log</Button>}</td></tr>)}</tbody></table>{!model.jobs.length && <EmptyData />}</div><Note title="Idempotency" tone="blue">Job retry/callback gửi lại không được tạo tác động nghiệp vụ trùng.</Note>
      </section><aside className={styles.panel}><Heading icon={warningIcon} tone="coral" title={job?`Log · ${job.id}`:'Log vận hành'} subtitle={job?`${job.type} · ${job.status}${job.status==='FAILED'?' lần 2':''}`:'Chưa có dữ liệu'} />
        {job?.log ? <div className={styles.log}>{job.log.map((line,index)=><p key={`${index}-${line}`} data-kind={index===2?'error':index===3?'warning':undefined}>{line}</p>)}</div>:<EmptyData />}
        <p className={styles.auditHeading}>Audit gần đây</p>{model.audit.map(row=><div className={styles.auditRow} key={row.title}><i /><div><strong>{row.title}</strong><small>{row.time}</small></div></div>)}<Note tone="violet" title="Audit">Thao tác quản trị quan trọng phải gắn người thực hiện và thời điểm.</Note>
      </aside></div>}
    <Dialog.Root open={dialog!==null} onOpenChange={open=>{if(!open)setDialog(null);}}><Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={dialog==='lock'?styles.lockDialog:styles.configDialog}>
      {dialog==='lock'?<><div className={styles.lockEmblem}><img src={lockIcon} alt="" /></div><Dialog.Title>Khóa tài khoản?</Dialog.Title><Dialog.Description>Tài khoản {selectedUser?.email ?? 'đã chọn'} sẽ không thể tạo phiên truy cập mới. Thao tác này không tự xóa Trip hoặc thay đổi lịch sử nghiệp vụ.</Dialog.Description><Button variant="destructive" onClick={()=>onUnavailable('Khóa tài khoản')}>Khóa tài khoản</Button><Dialog.Close asChild><Button variant="plain">Hủy</Button></Dialog.Close></>
        : <form onSubmit={event=>{event.preventDefault();onUnavailable('Lưu cấu hình');}}><div className={styles.dialogHeading}><ShareBadge icon={addIcon} tone="violet" /><div><Dialog.Title>Thêm cấu hình dùng chung</Dialog.Title><Dialog.Description>Chọn loại cấu hình và nhập tên. Thay đổi cấu hình phải được ghi audit.</Dialog.Description></div></div><Select label="Loại cấu hình" value={configType} onChange={event=>setConfigType(event.target.value)}>{['Template export','Tiện ích công cộng','Theme infographic'].map(value=><option key={value}>{value}</option>)}</Select><Input label="Tên cấu hình mới" value={configName} onChange={event=>setConfigName(event.target.value)} placeholder="Ví dụ: Lịch trình A5 dạng sổ tay" /><Note>Người thực hiện và thời điểm sẽ được lưu vào audit log.</Note><div className={styles.dialogActions}><Dialog.Close asChild><Button variant="outline">Hủy</Button></Dialog.Close><Button type="submit">Lưu cấu hình</Button></div></form>}
    </Dialog.Content></Dialog.Portal></Dialog.Root>
    {toast}
  </section>;
}
export function AdminWorkspacePage() {
  const {adminSection='overview'}=useOutletContext<RouteContext>();
  const [message,setMessage]=useState('');
  return <AdminWorkspaceView section={adminSection} onUnavailable={action=>setMessage(`${action} chưa khả dụng. Phiên bản hiện tại chưa kết nối API quản trị; không có thay đổi được gửi.`)} toast={message?<Alert live>{message}</Alert>:undefined} />;
}
