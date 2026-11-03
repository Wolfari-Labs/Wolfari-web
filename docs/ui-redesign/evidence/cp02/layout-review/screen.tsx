import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../../../../../src/shared/components/Button';
import { Input } from '../../../../../src/shared/components/Input';
import { Select } from '../../../../../src/shared/components/Select';
import { Textarea } from '../../../../../src/shared/components/Textarea';
import { Alert } from '../../../../../src/shared/components/Alert';
import { Drawer } from '../../../../../src/shared/components/Drawer';
import { Badge } from '../../../../../src/shared/components/Ui';
import '../../../../../src/shared/styles/fonts.css';
import '../../../../../src/shared/styles/global.css';
import styles from './Screen.module.css';

const asset = (name: string, ext='svg') => new URL(`./assets/${name}.${ext}`, import.meta.url).href;
const params = new URLSearchParams(location.search);
const view = params.get('screen') ?? 'editor';
const initialState = params.get('state') ?? 'default';
const labels = ['Tổng quan chuyến đi','Bản đồ địa điểm','Lịch trình','Dress code','Packing list','Thành viên','Quỹ nhóm','Theo dõi giá vé','Cài đặt'];
const icons = ['imgSidebarIconTngQuan','imgSidebarIconBnDDaDim','imgSidebarIconLchTrinh','imgSidebarIconDressCode','imgSidebarIconPackingList','imgSidebarIconThanhVien','imgSidebarIconQuNhom','imgSidebarIconTheoDoiGiaVe','imgSidebarIconCaiDt'];
const active = view==='fund'||view==='menu'?6:view==='price'?7:2;
const destinations: Record<number,string> = {2:'plan',6:'fund',7:'price'};
const messages: Record<string,[string,string]> = {
  invalid:['Kiểm tra thông tin','Một số trường cần được sửa. Bản nháp vẫn được giữ.'],
  pending:['Đang gửi yêu cầu','Chưa có kết quả xác nhận. Không gửi thêm yêu cầu thay thế.'],
  unknown:['Chưa rõ kết quả','Giữ bản nháp này và kiểm tra lại yêu cầu trước khi tiếp tục.'],
  conflict:['Dữ liệu đã thay đổi','Bản nháp vẫn còn. Cần tải dữ liệu mới và đối chiếu trước khi gửi lại.'],
  success:['Đã có kết quả xác nhận — minh họa','Đây là trạng thái mẫu để review, không có thao tác được ghi lên hệ thống.'],
  denied:['Bạn không có quyền thực hiện','Bạn vẫn có thể xem thông tin. Liên hệ chủ chuyến đi nếu cần thay đổi quyền.'],
};
function Feedback({state}:{state:string}) {
  const message=messages[state];
  return message?<Alert tone={state==='invalid'?'error':state==='success'?'success':state==='denied'?'info':'warning'}>
    <strong>{message[0]}</strong><p>{message[1]}</p>
  </Alert>:null;
}
function Panel({title,children,className=''}:{title:string;children:ReactNode;className?:string}) {
  return <section className={`${styles.panel} ${className}`}><h2>{title}</h2>{children}</section>;
}
function App() {
  const [state,setState]=useState(initialState);
  const [editor,setEditor]=useState(view==='editor');
  const [menu,setMenu]=useState(view==='menu');
  const [aux,setAux]=useState('');
  const [tab,setTab]=useState('contributions');
  const [day,setDay]=useState('Ngày 1');
  const [name,setName]=useState('Bãi biển Mỹ Khê');
  const [startDate,setStartDate]=useState('2026-11-12');
  const [endDate,setEndDate]=useState('2026-11-12');
  const [start,setStart]=useState('14:00');
  const [end,setEnd]=useState('16:00');
  const [description,setDescription]=useState('');
  const [publicDescription,setPublicDescription]=useState('');
  const [kind,setKind]=useState('VISIT');
  const [place,setPlace]=useState('mykhe');
  const [tripType,setTripType]=useState('ONE_WAY');
  const editorTrigger=useRef<HTMLButtonElement>(null);
  const nameRef=useRef<HTMLInputElement>(null);
  const busy=['pending','unknown','conflict','denied','success'].includes(state);
  const invalid=state==='invalid';
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setState('pending');};
  const unavailable=(label:string)=>setAux(label);
  const navigation=<nav aria-label="Điều hướng chuyến đi">{labels.map((label,i)=>destinations[i]?<a key={label} href={`/screen.html?screen=${destinations[i]}`} aria-current={active===i?'page':undefined}>
    <img src={asset(icons[i])} width="22" height="22" alt=""/>{label}</a>:<button key={label} onClick={()=>unavailable(label)}>
    <img src={asset(icons[i])} width="22" height="22" alt=""/>{label}</button>)}</nav>;
  const branding=<div className={styles.sidebarBrand}><p>Cùng bạn<br/>đi xa hơn!</p><img src={asset('imgSidebarRouteDeco')} width="150" height="65" alt=""/><img src={asset('imgReadingMascot','png')} width="166" height="166" alt=""/></div>;
  const plan=<>
    <div className={styles.days} aria-label="Chọn ngày">{['Tất cả','Chưa xếp lịch','Ngày 1','Ngày 2','Ngày 3'].map(item=><Button key={item} variant={day===item?'primary':'outline'} aria-pressed={day===item} onClick={()=>setDay(item)}>{item}</Button>)}</div>
    <div className={styles.metrics}>{[['Hoạt động trong bộ mẫu','3'],['Đã hoàn thành','1'],['Ngày chuyến đi','3'],['Thành viên mẫu','4']].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <Panel title={`Lịch trình · ${day}`}><div className={styles.actions}><Button ref={editorTrigger} onClick={()=>setEditor(true)}>Thêm hoạt động</Button></div>
      {state==='empty'||day==='Ngày 3'?<p>Chưa có hoạt động trong ngày này. Bạn có thể thêm hoạt động hoặc đổi ngày.</p>:
      ['Bãi biển Mỹ Khê','Ăn tối cùng nhóm','Dạo cầu Rồng'].filter((_,i)=>day!=='Chưa xếp lịch'||i===2).map((item,i)=><article className={styles.activity} key={item}>
        <div><strong>{i===2?'Chưa xếp lịch':i===0?'14:00 – 16:00':'18:00 – 19:00'}</strong><span>{i===2?'Chưa có ngày':'12/11/2026'}</span></div>
        <div><h3>{item}</h3><span>{i===0?'Bãi biển Mỹ Khê, Đà Nẵng':'Địa điểm sẽ được nhóm bổ sung'}</span></div><Button variant="outline" onClick={()=>{setName(item);setEditor(true);}}>Chỉnh sửa</Button>
      </article>)}
    </Panel>
  </>;
  const fund=<>
    <section className={styles.fundState}><h1>Quỹ nhóm · Đang mở</h1><Badge>Owner · mẫu review</Badge><p>TEST / thủ công. Không chuyển tiền qua bản mẫu.</p></section>
    <div className={styles.metrics}>{[['Ngân sách mục tiêu','9.000.000 ₫'],['Số dư hiện tại','7.000.000 ₫'],['Dự phòng hoàn trả','0 ₫'],['Có thể sử dụng','7.000.000 ₫']].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className={styles.fundGrid}>
      <Panel title="Đóng góp & lịch sử"><div className={styles.tabs}><Button variant={tab==='contributions'?'primary':'outline'} aria-pressed={tab==='contributions'} onClick={()=>setTab('contributions')}>Đóng góp</Button><Button variant={tab==='history'?'primary':'outline'} aria-pressed={tab==='history'} onClick={()=>setTab('history')}>Lịch sử</Button></div>
        {state==='empty'?<p>Chưa có đợt đóng góp. Tạo đợt đầu tiên bằng biểu mẫu bên cạnh hoặc bên dưới.</p>:tab==='contributions'?<>
          <div className={styles.tableWrap}><table><caption>Chi phí chung · dữ liệu minh họa</caption><thead><tr><th>Thành viên</th><th>Nghĩa vụ</th><th>Trạng thái</th><th>Hạn</th></tr></thead><tbody>
            {['An','Bình','Chi','Dũng'].map((person,i)=><tr key={person}><th scope="row">{person}</th><td>1.750.000 ₫</td><td>{i===0?'Đã xác nhận':i===1?'Đã báo chuyển':'Chờ đóng'}{i===2&&<p className={styles.reason}>Lý do từ chối lần trước: nội dung chuyển chưa khớp.</p>}</td><td>10/11/2026</td></tr>)}
          </tbody></table></div><Alert live={false}>Báo đã chuyển chưa có nghĩa là đã nhận tiền. Chỉ người giữ quỹ xác nhận hoặc từ chối.</Alert>
        </>:<div><h3>Giao dịch mẫu đã xác nhận</h3><p>30/10/2026 09:15 · Ghi nhận đóng góp · +1.750.000 ₫</p><p>Số dư sau giao dịch: 7.000.000 ₫. Đây không phải lịch sử Backend.</p></div>}
      </Panel>
      <Panel title="Tạo đợt đóng góp"><p className={styles.muted}>Chỉ chủ chuyến đi tạo nghĩa vụ đóng góp.</p><form onSubmit={submit} className={styles.form}>
        <fieldset disabled={busy}><Input label="Tên đợt" required maxLength={200} defaultValue="Chi phí chung"/>
          <Select label="Tài khoản nhận đã xác nhận" required><option>Tài khoản mẫu đã xác nhận</option></Select>
          <div><h3>Số tiền từng thành viên (VND)</h3><p className={styles.muted}>Để trống nếu không đưa người đó vào đợt này.</p></div>
          {['An','Bình','Chi','Dũng'].map((person,i)=><Input key={person} label={person} inputMode="numeric" defaultValue={i===2&&invalid?'0':'1750000'} error={i===2&&invalid?'Số tiền phải là số nguyên lớn hơn 0.':undefined}/>)}
          <Input label="Hạn đóng (không bắt buộc)" type="datetime-local" hint="Giờ chuyến đi · Asia/Ho_Chi_Minh" defaultValue="2026-11-10T20:00"/>
          <Textarea label="Ghi chú (không bắt buộc)" maxLength={2000} rows={3}/>
        </fieldset><Feedback state={state}/><Button type="submit" disabled={busy} loading={state==='pending'}>Tạo đợt đóng góp</Button>
        <p className={styles.muted}>Mẫu chỉ chuyển sang trạng thái chờ để review; không tạo giao dịch.</p>
      </form></Panel>
    </div>
  </>;
  const price=<div className={styles.priceGrid}>
    <Panel title="Theo dõi của chuyến đi">{state==='empty'?<p>Chưa có theo dõi. Dùng biểu mẫu tạo bên cạnh hoặc bên dưới.</p>:['Hà Nội → Đà Nẵng','Đà Nẵng → Hà Nội'].map((route,i)=><article key={route} className={styles.watch}>
      <h3>{route}</h3><p>12/11/2026 · Một chiều</p><Badge>{i===0?'Đang theo dõi':'Đã tạm dừng'}</Badge><dl><dt>Giá quan sát mẫu</dt><dd>{i===0?'1.250.000':'1.650.000'} ₫</dd><dt>Ngưỡng</dt><dd>1.400.000 ₫</dd></dl><small>MOCK_FLIGHT · Quan sát 30/10/2026 09:00 UTC</small>
    </article>)}<Alert live={false}>MOCK_FLIGHT là dữ liệu mẫu, không phải giá bán vé thực tế. Wolfari không đặt vé.</Alert></Panel>
    <div className={styles.stack}><Panel title="Lịch sử giá vé"><p className={styles.muted}>Bảng dữ liệu minh họa cho vùng quan sát; biểu đồ vẫn chờ review riêng.</p><table><caption>Hà Nội → Đà Nẵng · MOCK_FLIGHT</caption><thead><tr><th>Quan sát (UTC)</th><th>VND</th></tr></thead><tbody>{['1.600.000','1.450.000','1.250.000'].map((v,i)=><tr key={v}><td>{28+i}/10 · 09:00</td><td>{v}</td></tr>)}</tbody></table></Panel>
      <Panel title="Cách theo dõi hoạt động"><ol><li>Lưu tiêu chí và ngưỡng giá.</li><li>Hiển thị nguồn và thời điểm quan sát.</li><li>Trạng thái giá không phải xác nhận đặt vé.</li></ol></Panel></div>
    <Panel title="Tạo theo dõi giá vé"><form className={styles.form} onSubmit={submit}><fieldset disabled={busy}>
      <Select label="Hành trình" value={tripType} onChange={e=>setTripType(e.target.value)}><option value="ONE_WAY">Một chiều</option><option value="ROUND_TRIP">Khứ hồi</option></Select>
      <Input label="Điểm đi · mã IATA" defaultValue="HAN" required maxLength={3} minLength={3}/><Input label="Điểm đến · mã IATA" defaultValue={invalid?'HAN':'DAD'} required maxLength={3} minLength={3} error={invalid?'Điểm đến phải khác điểm đi.':undefined}/>
      <Input label="Ngày đi (UTC)" type="date" defaultValue="2026-11-12" required/><Input label="Giờ khởi hành (UTC)" type="time" defaultValue="09:00" required/>
      {tripType==='ROUND_TRIP'&&<Input label="Ngày về (UTC)" type="date" defaultValue="2026-11-14" min="2026-11-12" required/>}
      <div className={styles.passengers}><Input label="Người lớn" type="number" min={1} max={9} defaultValue={1}/><Input label="Trẻ em" type="number" min={0} max={9} defaultValue={0}/><Input label="Em bé" type="number" min={0} max={9} defaultValue={0}/></div>
      <p className={styles.muted}>Tổng tối đa 9 người; số em bé không vượt số người lớn.</p>
      <Select label="Cabin"><option value="">Không chọn</option><option>ECONOMY</option><option>PREMIUM_ECONOMY</option><option>BUSINESS</option><option>FIRST</option></Select>
      <Input label="Ngưỡng giá (VND)" inputMode="numeric" defaultValue="1400000" required/><p className={styles.muted}>Nhà cung cấp: MOCK_FLIGHT · tiền tệ VND.</p>
    </fieldset><Feedback state={state}/><Button type="submit" disabled={busy} loading={state==='pending'}>Tạo theo dõi — mẫu</Button></form></Panel>
  </div>;
  return <>
    <a href="#main-content" className={styles.skip}>Đến nội dung chính</a>
    <header className={styles.header}><a href="/screen.html?screen=plan" aria-label="Wolfari · về mẫu Lịch trình"><img className={styles.logo} src={asset('imgOfficialLogo','png')} width="155" height="52" alt="Wolfari"/></a>
      <nav className={styles.topNav} aria-label="Điều hướng chính"><button onClick={()=>unavailable('Trang chủ')}>Trang chủ</button><button onClick={()=>unavailable('Chuyến đi của tôi')}>Chuyến đi của tôi</button><a href="/screen.html?screen=plan">Lên lịch</a></nav>
      <div className={styles.account}><Button variant="ghost" onClick={()=>unavailable('Thông báo')}>Thông báo</Button><Button variant="ghost" onClick={()=>unavailable('Tài khoản')}>Tài khoản mẫu</Button></div>
      <Button className={styles.menuButton} variant="outline" onClick={()=>setMenu(true)}>Menu</Button>
    </header>
    <div className={styles.layout}><aside className={styles.sidebar}>{navigation}{branding}</aside><main id="main-content" tabIndex={-1} className={styles.main}>
      <p className={styles.crumb}>Chuyến đi của tôi / Đà Nẵng 3N2Đ / {labels[active]}</p>
      <section className={styles.hero} aria-label="Chuyến đi mẫu"><img className={styles.landscape} src={asset('imgFrame')} alt=""/><img className={styles.paper} src={asset('imgFrame1')} alt=""/>
        <div className={styles.heroText}><h2>Đà Nẵng 3N2Đ</h2><p>12 – 14/11/2026 · 4 thành viên mẫu</p><Badge>Sắp tới</Badge></div><div className={styles.heroActions}><Button variant="outline" onClick={()=>unavailable('Chỉnh sửa chuyến đi')}>Chỉnh sửa</Button><Button disabled title="Chia sẻ chưa khả dụng">Chia sẻ</Button></div>
      </section>
      <p className={styles.demo}>BẢN THIẾT KẾ CP02 · Dữ liệu minh họa · Không lưu thay đổi hoặc chuyển tiền.</p>
      {view!=='editor'&&<Feedback state={state}/>}
      {view==='fund'||view==='menu'?fund:view==='price'?price:plan}
      {view==='editor'&&!editor&&<><Feedback state={state}/><Button onClick={()=>setEditor(true)}>Mở lại bản nháp hoạt động</Button></>}
    </main></div>
    <Drawer open={editor} label="Chỉnh sửa hoạt động" side="center" className={styles.editor} initialFocusRef={nameRef} returnFocusRef={editorTrigger} onDismiss={()=>setEditor(false)}>
      <p className={styles.muted}>Mẫu CP02 · Asia/Ho_Chi_Minh · bản nháp giữ khi đóng.</p>
      <form onSubmit={submit} className={styles.form}><fieldset disabled={busy}>
        <Input ref={nameRef} label="Tên hoạt động" value={name} onChange={e=>setName(e.target.value)} required maxLength={200} error={invalid?'Nhập tên hoạt động trước khi lưu.':undefined}/>
        <Select label="Loại hoạt động" value={kind} onChange={e=>setKind(e.target.value)}><option value="VISIT">Tham quan</option><option value="MEAL">Ăn uống</option><option value="MOVE">Di chuyển</option><option value="OTHER">Khác</option></Select>
        <Input label="Ngày bắt đầu" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} hint="Để trống ngày và giờ nếu chưa xếp lịch."/>
        <div className={styles.pair}><Input label="Giờ bắt đầu" type="time" value={start} onChange={e=>setStart(e.target.value)}/><Input label="Giờ kết thúc" type="time" value={end} onChange={e=>setEnd(e.target.value)}/></div>
        <Input label="Ngày kết thúc" type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} hint="Chọn ngày kế tiếp nếu hoạt động qua đêm."/>
        <Select label="Địa điểm" value={place} onChange={e=>setPlace(e.target.value)}><option value="">Chưa gắn địa điểm</option><option value="mykhe">Bãi biển Mỹ Khê, Đà Nẵng</option></Select>
        <Textarea label="Mô tả (không bắt buộc)" rows={2} value={description} onChange={e=>setDescription(e.target.value)}/>
        <Textarea label="Mô tả công khai (không bắt buộc)" rows={2} value={publicDescription} onChange={e=>setPublicDescription(e.target.value)}/>
      </fieldset><Feedback state={state}/><footer className={styles.formActions}><Button variant="outline" onClick={()=>setEditor(false)}>Đóng bản nháp</Button><Button type="submit" disabled={busy} loading={state==='pending'}>Lưu — mẫu</Button></footer></form>
    </Drawer>
    <Drawer open={menu} label="Menu Wolfari" onDismiss={()=>setMenu(false)} className={styles.menu}>
      <img src={asset('imgOfficialLogo','png')} width="120" height="40" alt="Wolfari"/>{navigation}
      <div className={styles.menuAccount}><Button variant="outline" onClick={()=>{setMenu(false);unavailable('Thông báo');}}>Thông báo</Button><Button variant="outline" onClick={()=>{setMenu(false);unavailable('Tài khoản');}}>Tài khoản</Button></div>{branding}
    </Drawer>
    <Drawer open={Boolean(aux)} label={aux||'Thông tin bản mẫu'} side="center" onDismiss={()=>setAux('')}><p>Phần “{aux}” nằm ngoài mẫu bố trí D18 này. Không có điều hướng hoặc thao tác Backend được thực hiện.</p><Button onClick={()=>setAux('')}>Quay lại bản mẫu</Button></Drawer>
  </>;
}
createRoot(document.getElementById('root')!).render(<App/>);
