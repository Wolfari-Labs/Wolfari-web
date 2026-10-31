# Figma chính thức — evidence index

Nguồn duy nhất: https://www.figma.com/design/hdy2sOZk6rfjKXKDJ9HW9y/Wolfari-Travel-Workspace

Đọc qua Figma MCP ngày 29/10/2026; không chỉnh sửa design canvas. Các lần vượt giới hạn trả về 48.000 byte đã chia nhỏ và đọc lại, không dùng payload lỗi làm dữ liệu.

| Tệp | Nội dung / giới hạn |
|---|---|
| `page-*.xml` | Metadata 3 pages; có frame tự đóng và instances không expand nên không dùng để suy ra frame rỗng hoặc tổng component. |
| `inventory-*.json` | Page roots, local component/component-set definitions, property/variant definitions, indexed type counts; Admin có raw reactions. |
| `frames-*.json` | Toàn bộ 7.239 FRAME nodes do Plugin API enumerate, gồm descendants trong instances; columns nằm trong từng tệp. Không phải 7.239 màn hình độc lập. |
| `screens-*.json` | 97 Desktop + 54 Mobile + 16 Admin root/section-level frames; gồm cả boards, notes, flows. Mẫu text/sections có giới hạn, font families, instance names, image hashes. |
| [SCREEN_REGISTER.md](SCREEN_REGISTER.md) | 167 dòng: tên, node, dimensions, phân loại, route/flow liên quan, coverage ảnh. |
| `variables.json` | 257 variables, 5 collections, đủ modes/values/scopes; 74 biến là prototype state, không phải CSS token. |
| `styles.json` | 28 text styles, 2 paint styles, 15 effect styles, 0 grid styles. |
| `desktop-prototype-edges-*.json`, `mobile-prototype-edges.json` | Edges đã nhóm theo screen/target/action; không phải chứng nhận đã click/chạy toàn bộ prototype. |
| `alignment.json`, `alignment-notes.json` | Web alignment hierarchy, design/response/Finance/Price/Dress notes nguyên văn nguồn. |
| `*.png` | 18 screenshot chính thức đã tải và xem; tên là node ID thay dấu ':' bằng '-'. |

Không lưu signed/ephemeral asset URL, email hoặc user ID của tài khoản MCP. Screenshot có tên/dữ liệu minh họa của thiết kế, không phải dữ liệu production. Assets chưa xuất hàng loạt sang application: lưu image hashes và component references để kiểm tra provenance/reuse trước CP-03.

Library search không tìm published matches cho truy vấn mẫu; `get_libraries` trả không subscribed libraries. Điều đó không phủ nhận 175 local components. Code Connect bị giới hạn gói Starter (tool đòi Organization/Enterprise Dev/Full); route/component mapping hiện dựa source + MCP, không giả định có Code Connect mapping.
