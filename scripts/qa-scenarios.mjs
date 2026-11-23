import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
// Format: module | SRS | priority | precondition | action | observable outcome.
// These are design records, not execution results or placeholder passing tests.
const lines = `
DangNhap|FR-ID-01|P0|Guest; email TEST mới|Đăng ký hợp lệ; xác minh qua mail TEST; đăng nhập ở context mới|Chỉ một tài khoản; phiên hợp lệ; email xác minh đúng người
DangNhap|FR-ID-01,BR-27|P0|Email TEST mới; cùng intent đăng ký|Gửi lại cùng đăng ký; đối chiếu tài khoản và mail|Không tạo tài khoản trùng; không lộ thông tin bí mật
DangNhap|FR-ID-02|P0|Tài khoản TEST active|Nhập mật khẩu sai; thử truy cập profile và API me|Không cấp phiên; dữ liệu riêng tư không trả về
DangNhap|FR-ID-05|P0|Tài khoản đã bị khóa bằng cơ chế quản trị được phép|Đăng nhập; dùng phiên cũ gọi màn hình bảo vệ|Từ chối tài khoản bị khóa; không thay đổi dữ liệu
DangNhap|FR-ID-03|P0|Phiên hợp lệ và Trip có dữ liệu|Đăng xuất; dùng lại phiên cũ; đăng nhập lại|Phiên cũ bị từ chối; dữ liệu Trip được bảo toàn
HoSo|FR-ID-04,DR-01|P1|User TEST riêng|Sửa tên tiếng Việt; reload context mới|Tên lưu đúng Unicode; vai trò Trip không đổi
HoSo|FR-ID-04|P1|User TEST riêng|Gửi tên rỗng và trường không hợp lệ qua UI|Validation rõ trường lỗi; dữ liệu đã lưu không đổi
HoSo|FR-ID-04,NFR-SEC-01|P0|Hai user khác nhau|Đổi ID hồ sơ trong request cập nhật|Không sửa được hồ sơ người khác hay system_role
HoSo|DR-03|P1|Hai context cùng user đọc cùng version|A lưu tên; B lưu tên khác từ bản cũ|B không ghi đè A; draft và hướng xử lý conflict rõ
TongQuan|IR-UI-02,NFR-USA-01|P1|User chưa có Trip|Mở danh sách Trips|Empty state có hành động tạo; không dữ liệu demo
TongQuan|FR-TR-01,NFR-SEC-02|P0|User có nhiều Trip; outsider có Trip khác|Tải danh sách, phân trang, mở Trip|Chỉ dữ liệu được phép; cursor không lặp hoặc bỏ mất bản ghi trong dataset ổn định
TongQuan|NFR-REL-01,NFR-USA-01|P1|Trip có Plan/Fund; fault injection hạ tầng TEST được cho phép|Làm một nguồn đọc lỗi; reload overview|Lỗi từng phần rõ; phần còn lại không bị thay dữ liệu giả
QuanLyChuyenDi|FR-TR-01,BR-06,BR-07|P0|Owner TEST; dataset trống|Tạo Trip 1 ngày, 4 ngày; thử 0 ngày, 5 ngày và ngày kết thúc trước bắt đầu|Biên 1/4 được chấp nhận; ngoài giới hạn bị từ chối; không Trip/Owner dở dang
QuanLyChuyenDi|FR-TR-01|P0|Trip có Activity tại ngày cuối|Rút ngắn ngày Trip làm Activity nằm ngoài|Yêu cầu giải quyết Activity; không tự xóa hoạt động
QuanLyChuyenDi|FR-TR-03,BR-01|P0|Owner, Member và Finance OPEN|Chuyển Owner cho Member; reload hai context|Đúng một Owner; Owner cũ thành Member; policy/Holder không tự đổi
QuanLyChuyenDi|FR-TR-05,BR-08|P0|Trip có Finance OPEN rồi CLOSED trên dữ liệu TEST|Thử Archive mỗi trạng thái; mở lại Trip|OPEN bị chặn; CLOSED cho Archive; mở lại không mở Finance hay tự resume watch
QuanLyChuyenDi|FR-TR-06|P1|Trip có Activity hoàn thành và Finance|Nhân bản chỉ Plan; đọc Trip mới|Owner mới là người copy; reset completion; không copy tiền/member/share/history
QuanLyChuyenDi|FR-TR-07|P0|Trip chỉ của ca kiểm thử; Finance chưa bật|Xóa qua UI xác nhận; mở link và export cũ|Chặn truy cập; tác vụ hủy; lịch sử cần thiết không mất
ThanhVienLoiMoi|FR-TR-02,AT-03|P0|Owner và recipient TEST ở hai context|Tạo lời mời; recipient chấp nhận; Owner reload roster|Một membership MEMBER đúng recipient; lời mời ACCEPTED
ThanhVienLoiMoi|FR-TR-02,BR-27|P0|Lời mời PENDING cùng recipient|Tạo trùng và accept đồng thời bằng hai context|Không hai PENDING hiệu lực; không membership trùng
ThanhVienLoiMoi|FR-TR-02,BR-06|P0|Trip có 5 thành viên và hai lời mời hợp lệ|Hai recipient chấp nhận đồng thời|Tổng thành viên không vượt 6; người bị chặn không có membership
ThanhVienLoiMoi|FR-TR-02|P0|Lời mời revoked/declined/expired/accepted|Mở lại và gửi accept từng trạng thái|Không tạo lại membership; UI giải thích trạng thái kết thúc
ThanhVienLoiMoi|FR-TR-04,BR-10|P0|Member có nghĩa vụ chưa hoàn tất rồi đã xử lý|Yêu cầu rời/xóa trước và sau xử lý|Chặn trách nhiệm chưa xong; không xóa lịch sử hay tự hoàn tiền
QuyenSuaKeHoach|FR-PL-01,BR-11|P0|Owner và hai Member|Chọn OWNER_ONLY, ALL_MEMBERS, SELECTED_MEMBERS; reload|Quyền đúng từng mode; chỉ Member được chọn được sửa ở SELECTED
QuyenSuaKeHoach|FR-PL-02|P0|Selected Member có quyền|Member rời rồi nhận lời mời mới|Quyền riêng cũ không tự khôi phục; lịch sử còn
QuyenSuaKeHoach|FR-PL-03|P0|Member đang mở editor; Owner ở context riêng|Owner thu hồi quyền; Member bấm lưu draft cũ|Backend chặn; Plan không thay đổi; vẫn xem khi còn membership
QuyenSuaKeHoach|FR-PL-04,BR-12|P0|Member không có Plan edit|Đánh dấu Activity; thử sửa policy và Finance của người khác|Completion được phép; policy/Finance không được suy quyền
LichTrinh|FR-PL-05,BR-06|P0|Trip có 49 Activity; editor hợp lệ|Tạo thứ 50 rồi thứ 51; reload|50 hợp lệ; 51 bị từ chối; danh sách không mất Activity
LichTrinh|FR-PL-06,AT-06|P0|Trip 4 ngày|Lưu end=start, end<start, ngoài Trip, qua đêm trong Trip và trùng giờ|Ba nhánh sai bị chặn; qua đêm hợp lệ; trùng giờ cảnh báo không cấm mặc định
LichTrinh|FR-PL-07|P0|Hai Activity có ID và thời gian đã lưu|Kéo thả hoặc keyboard đổi thứ tự; đọc bằng context khác|Đổi order; giữ nguyên tập ID, nội dung, giờ và số lượng
LichTrinh|FR-PL-10,BR-26,AT-05|P0|Hai editor đọc cùng plan_version|A sửa; B lưu từ version cũ|B bị conflict; không mất cập nhật A; reload đúng version mới
LichTrinh|FR-PL-05,FR-TR-12|P0|Activity có liên kết lịch sử tài chính|Xóa Activity trên dữ liệu TEST|Activity mất khỏi Plan; lịch sử Finance còn; reminder chưa gửi bị hủy
BanDoDiaDiem|FR-LOC-01,IR-INT-02|P1|Provider TEST được chọn; Member có quyền xem|Tìm kiếm và mở địa điểm; không bấm thêm|Kết quả có nguồn; Plan không thay đổi
BanDoDiaDiem|FR-LOC-02,BR-06|P1|49 địa điểm đã lưu; editor|Thêm địa điểm 50 rồi 51|Không vượt 50; Member không edit không thêm được
BanDoDiaDiem|FR-LOC-03|P1|Địa điểm gắn hai Activity|Xóa địa điểm; xử lý liên kết theo UI|Thông báo hai Activity; không tham chiếu treo sau xóa
BanDoDiaDiem|FR-LOC-04,FR-LOC-05|P0|Provider có dữ liệu rồi lỗi trong TEST|Xem tuyến; gây lỗi provider có kiểm soát|Không tự sửa Plan; thiếu route không hiển thị thời gian 0 giả
TrangPhuc|FR-PK-01|P1|Owner/editor; Trip có ngày và Activity|Tạo Dress theo DAY và ACTIVITY; sửa, reload, xóa|Nội dung gắn đúng scope; persistence và quyền đúng
TrangPhuc|FR-PK-01,NFR-SAF-02|P1|Dress đã lưu; Weather TEST đổi|Refresh Weather rồi reload Dress|Không tự ghi đè trang phục đã lưu
TrangPhuc|FR-PK-01,FR-PL-03|P0|Member read-only đang xem Dress|Thử tạo/sửa/xóa bằng request lấy từ Web|Backend từ chối; nội dung không đổi
HanhLy|FR-PK-02,DR-01|P1|Editor TEST|Tạo item quantity 1; thử 0 và âm; để không phân công|Số lượng dương; item mới TODO; không phân công vẫn hợp lệ
HanhLy|FR-PK-03|P1|Item completed giao Member A|Đổi sang B rồi cho B rời Trip|Reset TODO; sau rời chưa phân công; lịch sử giữ
HanhLy|FR-PK-04|P0|Member A không edit; item của A/B/unassigned|A cập nhật cả ba item|Chỉ item của A được cập nhật; không đổi nội dung/assignee
HanhLy|FR-PK-05|P1|Item completed|Đổi tên/số lượng; riêng ca khác đổi note/category|Tên/quantity reset; note/category không reset completion
GoiYThongMinh|FR-DSS-01,FR-DSS-02|P0|Plan đã lưu; Member read-only|Yêu cầu DSS; xem lý do; thử apply|Xem được nhưng không apply; chưa apply Plan không đổi
GoiYThongMinh|FR-DSS-02,FR-PL-10|P0|Gợi ý dựa version N; editor khác sửa N+1|Apply gợi ý cũ|Không ghi đè Plan mới; cần tạo/kiểm tra lại
GoiYThongMinh|FR-DSS-03,FR-PK-06|P1|Packing đã có item tương tự|Chọn một phần gợi ý và apply|Chỉ item chọn được tạo; cảnh báo trùng; không tự cộng quantity
GoiYThongMinh|FR-DSS-04,FR-DSS-05,FR-DSS-06|P0|Thiếu Weather/Route/opening hours từng phần|Yêu cầu gợi ý và kiểm tra lịch|Có lý do và giới hạn; không giả thời tiết/route; không khẳng định tối ưu tuyệt đối
QuyNhom|FR-FIN-01,BR-03|P0|Owner khác Holder; Finance chưa bật|Owner bật quỹ; Holder xác nhận đích TEST; reload|Một Holder; đích lưu đúng; chưa có thu hoặc tăng số dư
QuyNhom|FR-FIN-02,BR-15|P0|Nghĩa vụ 200000 VND PENDING; Member khác Holder|Member báo chuyển; Holder từ chối có lý do; reload; Member báo lại|TRANSFER_REPORTED rồi PENDING rồi TRANSFER_REPORTED; lý do còn; ledger/số dư không đổi
QuyNhom|FR-FIN-02,FR-FIN-04,BR-16|P0|Số dư 0; hai khoản 200000 và 300000 được báo|Holder xác nhận hai khoản; reload context khác|Số dư 500000; đúng hai bút toán thu; lưu actor xác nhận
QuyNhom|FR-FIN-02,FR-TR-11,AT-18|P0|Một khoản báo chuyển; hai context Holder|Xác nhận đồng thời khác key; replay cùng key/body|Đúng một tác động thu; một khoản đóng; ledger và balance nhất quán
QuyNhom|FR-FIN-02,NFR-SEC-01|P0|Owner không là Holder; khoản Member báo|Owner thử xác nhận; Member báo hộ nghĩa vụ người khác|Sai quyền bị từ chối; không ảnh hưởng sổ
QuyNhom|FR-FIN-02|P0|Khoản báo chuyển thuộc Holder; Owner khác Holder|Holder tự xác nhận rồi Owner xác minh|Chỉ verifier độc lập hợp lệ xác nhận; Trip một người ghi thiếu xác minh độc lập
QuyNhom|FR-FIN-03,BR-18|P1|Quỹ có số dư; Holder và Member|Holder lưu draft chi rồi ghi sổ; Member ghi note chi ngoài quỹ|Draft/note không trừ quỹ; chỉ ghi sổ chi hợp lệ trừ đúng một lần
QuyNhom|FR-FIN-04,DR-02|P0|Available 500000; hai khoản reserve 300000|Gửi đồng thời hai reserve từ workflow Web|Không reserve tổng 600000; không số dư giả; sổ nhất quán
QuyNhom|FR-FIN-05|P0|Refund đã reserve; recipient khác Holder|Holder báo đã chuyển; recipient chưa nhận rồi xác nhận|Chưa nhận giữ tiền reserve; hoàn tất trừ số dư và giải phóng một lần
QuyNhom|FR-FIN-06,AT-11|P0|Holder cũ/mới; snapshot bàn giao|Hai bên xác nhận; xen giao dịch làm đổi snapshot; thử hủy|Xác nhận cũ mất hiệu lực; không hai Holder; hủy giữ Holder cũ
QuyNhom|FR-FIN-07,BR-21,AT-12|P0|Quỹ số dư 0 không nghĩa vụ; nhiều thành viên|Owner bắt đầu đóng; từng người xác nhận cùng snapshot|Chỉ CLOSED khi đủ xác nhận; không mở lại
QuyNhom|FR-FIN-08|P0|Quỹ CLOSING rồi CLOSED|Ghi nhận giao dịch đến muộn qua cơ chế TEST hiện có|CLOSING cần hủy đối chiếu; CLOSED không tự sửa sổ; không ghi trùng
TheoDoiGiaVe|FR-PW-01,BR-22|P0|Hai Member; Finance chưa bật|Tạo cùng điều kiện khác threshold|Hai watch độc lập; Finance không đổi; quyền không gộp
TheoDoiGiaVe|FR-PW-01,AT-24|P0|Member có quyền|Nhập origin=destination; infants>adults; thiếu ngày/ngưỡng|Validation chặn; không watch được lưu
TheoDoiGiaVe|FR-PW-02,AT-23|P0|Nguồn giá mô phỏng Backend có điều khiển đã duyệt; threshold 1500000|Phát 1499999,1500000,1500001 trong dataset độc lập|Chỉ giá nhỏ hơn ngưỡng phát cảnh báo đầu
TheoDoiGiaVe|FR-PW-02,AT-23|P0|Lần cảnh báo gần nhất 1400000; điều kiện/ngưỡng không đổi|Giá 1330000/1330001 tại 23:59:59 và 24:00:00 từ lần trước|Chỉ đủ cả giảm ít nhất 5% và ít nhất 24h mới cảnh báo lặp
TheoDoiGiaVe|FR-PW-02,FR-PW-06,AT-22|P0|Hai ngưỡng 1500000/1300000; cùng query; kiểm soát worker không retry|Worker lấy giá 1400000; đọc watch, alerts và log xử lý được cấp|Một fetch/query/result; chỉ watch thứ nhất alert; cùng giá không đủ chứng minh dedup
TheoDoiGiaVe|FR-PW-04|P1|Hai watch cùng nhóm đang ACTIVE|Pause/resume/stop một watch; thử resume stopped|Watch khác giữ trạng thái; STOPPED cuối; lịch sử còn
TheoDoiGiaVe|FR-PW-07,DR-03|P0|Hai context đọc cùng watch version|A sửa threshold; B sửa bản cũ|B conflict; threshold A còn; reload version mới
TheoDoiGiaVe|FR-PW-03,FR-PW-05|P0|TEST booking chưa rõ kết quả; quỹ đã reserve|Ghi nhận kết quả chưa rõ và replay thao tác|Không retry mua vé thật; không release tiền/Expense trùng
TheoDoiGiaVe|FR-PW-02|P1|Mốc alert tồn tại; thay threshold hoặc resume|Đánh giá quy tắc tái kích hoạt|SPEC_BLOCKED OQ-02; không tự đặt kỳ vọng reset mốc
ThongBao|FR-NT-01|P1|User và Member có preferences khác|User tắt email/push; reload; Owner thử sửa preference Member|Tùy chọn riêng giữ; nghĩa vụ/in-app data không mất; Owner không sửa hộ
ThongBao|FR-NT-02,AT-14|P1|Reminder TEST gắn Activity/Packing|Đổi giờ, complete, delete, rời và Archive ở các dataset riêng|Cập nhật/hủy đúng; timezone Trip; không gửi bù hàng loạt khi reopen
ThongBao|FR-NT-03|P0|Notification cũ; recipient đã mất membership|Mở link notification|Backend chặn dữ liệu Trip; notification không cấp thêm quyền
ThongBao|FR-NT-03,NFR-REL-01|P1|Mail sink TEST ngừng nhận theo kế hoạch fault được duyệt|Lưu nghiệp vụ phát notification; reload|Nghiệp vụ còn; không suy accepted event thành email delivered
XuatDuLieu|FR-EX-01,NFR-L10N-03|P1|Owner/Member read-only; có tiếng Việt và Finance TEST|Export từng PDF/Excel/infographic; kiểm tra nội dung file|Đúng định dạng/phạm vi/Unicode; không credential; không cần Plan edit
XuatDuLieu|FR-EX-02,DR-04,AT-15|P0|Dataset N; job export được nhận|Sửa Plan thành N+1 khi export xử lý; tải file|File cùng snapshot N và thời điểm; không trộn phiên bản
XuatDuLieu|FR-EX-03|P0|Export riêng Member; Owner và Member sau rời|Owner thử tải file người khác; Member tải sau rời|Từ chối cả hai; link cũ không vượt quyền
ChiaSeCongKhai|FR-TR-08,FR-TR-09,NFR-SEC-04|P0|Owner tạo share TEST; guest context|Guest mở và kiểm tra response JSON cùng UI|Chỉ allowlist; không Finance/contact/assignee/passenger/token; không membership mới
ChiaSeCongKhai|FR-TR-10,AT-16|P0|Link có password/expiry|Sai password; đúng; hết hạn; revoke; xóa Trip ở ca riêng|Chỉ hợp lệ được xem; các nhánh còn lại chặn cả API
ChiaSeCongKhai|FR-TR-10,DR-04|P1|Link hợp lệ; Trip chưa xóa|Sửa Plan; Archive; chuyển Owner|Share dữ liệu hiện tại; Archive không revoke; quyền quản lý sang Owner mới
QuanTriWeb|FR-AD-01,IR-UI-04|P0|Guest/User/Admin riêng|Mở admin và gọi chức năng quản trị được cấp|Guest/User bị chặn; Admin chỉ quyền được cấp; placeholder không được tính chức năng Passed
QuanTriWeb|FR-AD-01,BR-02|P0|Admin không tham gia Trip; Holder khác|Admin truy cập/sửa Trip và xác nhận thu/chi/closure|Không có quyền Owner hay Finance mặc định
QuanTriWeb|FR-AD-01|P1|Admin tham gia Trip với vai trò Member|Thử thao tác Owner và thao tác Member|Chỉ theo vai trò Trip; quyền hệ thống không vượt quyền nghiệp vụ
ChatLuongWeb|IR-UI-01,NFR-USA-01|P1|Mỗi màn hình đã có dữ liệu TEST|Kiểm tra 1440,768,390 và keyboard Tab/Escape; mở đóng dialog/menu|Không tràn ngang; control sử dụng được; focus vào modal và trả trigger; không chỉ dùng màu
ChatLuongWeb|NFR-USA-01|P1|Form và màn hình loading/empty/error/success thật|Chạy axe; kiểm tra label, thông báo và screen reader thủ công|Lưu từng violation; axe không thay thế manual; không tự sửa sản phẩm
ChatLuongWeb|NFR-SEC-02,AT-17|P0|Hai Trip độc lập và hai actor|Đổi Trip/resource IDs ở URL/request từ các module|Backend chặn cross-Trip; không leak JSON/file; dữ liệu đích không đổi
ChatLuongWeb|NFR-SEC-03,IR-COMM-01|P0|Phiên TEST riêng|Kiểm tra storage, HTTPS, log đã cho phép và artifact|Không credential usable trong log sản phẩm/client storage; report TEST phải được bảo vệ
ChatLuongWeb|NFR-REL-03,BR-27|P0|Mutation có idempotency thật và dataset riêng|Mất phản hồi sau commit bằng fault TEST được duyệt; gửi lại cùng intent|Không tác động trùng; reload phản ánh commit; không mock để kết luận E2E
ChatLuongWeb|NFR-PER-01,AT-20|P1|OQ-05 chưa phê duyệt máy/tải/dataset|Chuẩn bị kế hoạch 50 users 10 phút 100 Trips 4000 Activity; chưa chạy tải|SPEC_BLOCKED đến khi chốt; không nhận latency một trang là p95 SLA
ChatLuongWeb|NFR-REL-04,DR-06|P1|OQ-06 chưa chốt; backup thuộc TEST riêng|Yêu cầu kế hoạch restore có kiểm soát và retention|SPEC_BLOCKED phần định lượng; không tự restore/xóa database
ChatLuongWeb|NFR-USA-02|P1|OQ-08 chưa chốt người dùng đại diện|Chuẩn bị usability tasks và ngưỡng nghiệm thu|SPEC_BLOCKED; axe không chứng minh task completion
`.trim().split('\n');
const counters = new Map();
const known = new Set(JSON.parse(readFileSync(resolve(root, 'docs/qa/requirements.json'), 'utf8')).map(r => r.id));
const scenarios = lines.map(line => {
  const [module, ids, priority, pre, action, expected] = line.split('|');
  const srs = ids.split(',');
  for (const id of srs) if (!known.has(id)) throw new Error(`Unknown SRS ${id}`);
  const n = (counters.get(module) || 0) + 1; counters.set(module, n);
  return { id: `DES-${module}-${String(n).padStart(3, '0')}`, module, srs, priority,
    title: action, preconditions: ['TEST-only; Backend thật; dataset độc lập theo Run ID; actor ở context riêng.', pre],
    steps: [action, 'Đọc lại dữ liệu đã lưu từ Web/context độc lập và API hiện có; đối chiếu trước/sau, quyền và lịch sử liên quan.', 'Đính kèm evidence và ghi rõ từng bộ dữ liệu biên; không kết luận từ HTTP 200 đơn lẻ.'],
    expected: [expected], automation: 'DESIGNED_NOT_AUTOMATED', status: expected.includes('SPEC_BLOCKED') ? 'SPEC_BLOCKED' : 'NOT RUN' };
});
writeFileSync(resolve(root, 'docs/qa/scenarios.json'), JSON.stringify(scenarios, null, 2) + '\n');
console.log(`${scenarios.length} designed scenarios in ${counters.size} modules; none marked Passed.`);
