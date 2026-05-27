# NetDevice Manager Frontend — Giao diện quản lý chuyên nghiệp

Ứng dụng web hiển thị Dashboard giám sát, biểu diễn tài nguyên mạng trạm thời gian thực, viết bằng React 18, Tailwind CSS, Recharts và Lucide Icons.

## Cấu trúc thư mục
*   `src/components/Layout.jsx`: Sidebar kính mờ, header điều hướng.
*   `src/pages/Dashboard.jsx`: Số liệu tổng quan, biểu đồ tròn/cột phân bố phòng ban/OS, hòm thư cảnh báo hệ thống.
*   `src/pages/DeviceList.jsx`: Bảng hiển thị thông số CPU, RAM, Disk, Mạng thời gian thực kèm các bộ lọc thông minh.
*   `src/pages/DeviceDetail.jsx`: Chi tiết phần cứng (CPU, Mainboard, BIOS, GPU), bản đồ ổ đĩa, biểu đồ lịch sử tải 24h, danh sách phần mềm được tối ưu hiệu năng phân trang.
*   `src/pages/SoftwareSearch.jsx`: Tra cứu phần mềm diện rộng toàn mạng LAN và bảng xếp hạng cài đặt.

## Yêu cầu môi trường
*   Node.js v18 hoặc v20+

## Hướng dẫn khởi chạy

1.  Mở cửa sổ Command Prompt hoặc PowerShell tại thư mục `frontend/`.
2.  Cài đặt các gói thư viện:
    ```bash
    npm install
    ```
3.  Khởi chạy chế độ phát triển (Development):
    ```bash
    npm run dev
    ```
    Giao diện Dashboard sẽ mở tại đường dẫn: `http://localhost:5173`.

## Cấu hình kết nối API
Mặc định, Frontend sẽ kết nối tới Backend tại `http://localhost:8080`. Nếu Backend của bạn chạy trên một IP hoặc cổng khác, bạn có thể tạo tệp `.env` tại thư mục gốc `frontend/` và cấu hình:
```env
VITE_API_URL=http://<IP-SERVER-CUA-BAN>:8080
```

## Đóng gói sản phẩm (Production Build)
Để đóng gói thành bộ file tĩnh HTML/JS tối ưu phục vụ cho việc deploy lên máy chủ sản xuất:
```bash
npm run build
```
Thư mục sản phẩm đầu ra sẽ nằm tại `dist/`.
