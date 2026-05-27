# NetDevice Manager 🖥️

**NetDevice Manager** là hệ thống giám sát và quản lý thiết bị máy tính trạm nội bộ doanh nghiệp tập trung. Hệ thống cho phép tự động thu thập thông tin cấu hình phần cứng chi tiết, tài nguyên tải động (CPU, RAM, Disk) và danh sách phần mềm cài đặt từ các máy khách (Client Windows) gửi về máy chủ nội bộ thông qua kết nối bảo mật để hiển thị trực quan lên Dashboard Web.

---

## 📐 Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                    MẠNG NỘI BỘ (LAN)                    │
│                                                         │
│  ┌──────────┐   ┌──────────┐       ┌──────────┐         │
│  │ PC Agent │   │ PC Agent │  ...  │ PC Agent │         │
│  │ (Win)    │   │ (Win)    │       │ (Win)    │         │
│  └────┬─────┘   └────┬─────┘       └────┬─────┘         │
│       │ HTTP POST (Header API-Key)       │              │
│       └───────────────┼──────────────────┘               │
│                       ▼                                  │
│              ┌─────────────────┐                         │
│              │  SERVER (nội bộ)│                         │
│              │                  │                         │
│              │  ┌────────────┐  │                         │
│              │  │ Backend API │  │   ← FastAPI + SQLite   │
│              │  │ (port 8080) │  │     (WAL Mode)           │
│              │  └────────────┘  │                         │
│              │  ┌────────────┐  │                         │
│              │  │  Frontend   │  │   ← React + Tailwind   │
│              │  │  Dashboard  │  │     (Recharts)           │
│              │  └────────────┘  │                         │
│              └─────────────────┘                         │
│                       ▲                                  │
│                       │ HTTP GET (CORS enabled)          │
│                       │                                  │
│                 ┌─────┴─────┐                            │
│                 │ Browser   │                            │
│                 │ (Admin)   │                            │
│                 └───────────┘                            │
└─────────────────────────────────────────────────────────┘
```

---

## 📂 Cấu trúc dự án

```
netdevice-manager/
├── agent/                    # Cấu phần cài trên client máy khách
│   ├── agent.py              # Script thu thập dữ liệu (PowerShell/winreg/UUID/API-Key)
│   ├── config.json           # Cấu hình địa chỉ server, token và UUID trạm
│   ├── requirements.txt      # Dependencies Python của Agent (psutil, requests)
│   ├── install.bat           # File cài đặt tự động tạo Task Scheduler ngầm hệ thống
│   ├── start_agent.bat       # Script khởi chạy thử nghiệm Agent dạng Console
│   └── README.md             # Hướng dẫn chi tiết cài đặt Agent
│
├── server/                   # Cấu phần Server Backend
│   ├── main.py               # Điểm khởi chạy FastAPI, API Key auth và background jobs
│   ├── database.py           # SQLite kết nối tối ưu chế độ WAL và busy_timeout
│   ├── models.py             # Lược đồ cơ sở dữ liệu SQLAlchemy ORM và Pydantic schemas
│   ├── requirements.txt      # Dependencies Server (FastAPI, SQLAlchemy, Uvicorn)
│   ├── README.md             # Hướng dẫn vận hành và cấu hình cổng/tường lửa
│   └── routes/               # Thư mục chứa các API routes phân nhánh
│       ├── devices.py        # API CRUD thiết bị, metadata và lịch sử 24h
│       ├── dashboard.py      # API thống kê tổng quan, cơ cấu OS/phòng ban và cảnh báo đĩa
│       └── reports.py        # API quét phần mềm toàn diện mạng và xếp hạng cài đặt
│
└── frontend/                 # Cấu phần Frontend Dashboard web
    ├── index.html            # File HTML gốc (Đã được tối ưu hóa tiêu đề chuẩn SEO)
    ├── package.json          # Quản lý dependencies (React 19, Recharts, Lucide Icons)
    ├── tailwind.config.js    # Cấu hình quét tệp và mở rộng bảng màu HSL Brand cao cấp
    ├── postcss.config.js     # PostCSS hỗ trợ Tailwind CSS
    ├── vite.config.js        # Cấu hình Vite bundler
    └── src/
        ├── main.jsx          # Entry point của React
        ├── App.jsx           # Điều phối điều hướng (Routing)
        ├── index.css         # Import Tailwind, font Plus Jakarta Sans và glassmorphism
        └── components/       # UI Components chung
        └── pages/            # Các trang giao diện chính (Dashboard, DeviceList,...)
```

---

## 💎 Điểm sáng kỹ thuật & Tối ưu hóa cao cấp

*   **Bảo mật nội bộ an toàn:** Truyền tải xác thực thông qua Header `X-API-Key` chặn đứng hoàn toàn việc giả mạo gói tin báo cáo trong mạng nội bộ LAN.
*   **Tương thích Windows 11+:** Gọi truy vấn **PowerShell CIM** (`Get-CimInstance`) kết hợp đọc Registry nâng cao thay thế hoàn toàn công cụ `wmic` đã bị khai tử bởi Microsoft.
*   **SQLite WAL Mode & Concurrency:** Kích hoạt chế độ **WAL (Write-Ahead Logging)** kết hợp busy_timeout 30s xử lý ghi đồng thời mượt mà, triệt tiêu lỗi tranh chấp khóa.
*   **Thuật toán UPSERT phần mềm tối ưu:** Nhận diện và chỉ cập nhật sự thay đổi (Add new / Update version / Delete obsolete) của danh sách phần mềm thay vì xóa ghi lại hàng loạt, giảm hao mòn đĩa cứng và tăng tốc độ xử lý dữ liệu.
*   **Định danh tự phục hồi:** Tạo mã UUID ngầm lưu song song tại `config.json` và **Windows Registry** (`HKCU`). Thiết bị không bị đổi định danh trên dashboard kể cả khi cài lại hoặc xóa file cấu hình.
*   **Hiệu năng UI đỉnh cao:** Thiết kế Kính mờ (glassmorphism) hiện đại, trang bị **Virtual list & Pagination** cho bảng danh sách hàng trăm phần mềm giúp trình duyệt render tức thì không giật lag.

---

## 🚦 Hướng dẫn khởi chạy nhanh (Quickstart)

### 1. Khởi chạy Server (FastAPI + SQLite)
Yêu cầu Python 3.8+ cài đặt sẵn trên máy chủ.
```bash
cd server
python -m venv venv
# Windows (CMD):
venv\Scripts\activate
# Windows (PowerShell):
.\venv\Scripts\activate

pip install -r requirements.txt
python main.py
```
*Server API hoạt động tại cổng **8080** (`http://localhost:8080`).*

### 2. Triển khai Agent trên các máy khách
Yêu cầu Python 3.8+ đã được thêm vào PATH.
1.  Copy thư mục `agent/` sang máy khách.
2.  Nhấp chuột phải vào `install.bat` -> chọn **Run as Administrator** (Chạy với quyền Admin).
3.  Nhập IP Server, thông tin phòng ban, vị trí và mã Token bảo mật của bạn.
*Agent sẽ tự động cài thư viện, sinh UUID, và đăng ký tác vụ chạy ngầm vĩnh viễn vơi **Task Scheduler** Windows.*

### 3. Khởi chạy Dashboard Web (Vite React)
Yêu cầu Node.js v18 hoặc v20+.
```bash
cd frontend
npm install
npm run dev
```
*Dashboard Web sẽ mở tại địa chỉ `http://localhost:5173`.*

---

## 📝 Tài liệu hướng dẫn chi tiết
*   Hướng dẫn cụ thể về Agent: [agent/README.md](file:///agent/README.md)
*   Hướng dẫn cụ thể về Server Backend: [server/README.md](file:///server/README.md)
*   Hướng dẫn cụ thể về Giao diện: [frontend/README.md](file:///frontend/README.md)
