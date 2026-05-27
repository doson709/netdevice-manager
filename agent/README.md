# NetDevice Agent — Hướng dẫn cài đặt

Cấu phần Agent được cài đặt trên từng máy khách (client) Windows để thu thập thông tin và báo cáo về server trung tâm.

## Yêu cầu hệ thống
1. Hệ điều hành: Windows 7, 10, 11 hoặc Windows Server 2012+
2. Đã cài đặt **Python 3.8+** (Nhớ tick chọn **"Add Python to PATH"** trong quá trình cài đặt)
3. Có kết nối mạng nội bộ thông suốt tới địa chỉ IP của máy chủ.

## Cài đặt & Vận hành nhanh bằng Script (.bat)

Thư mục Agent đã được trang bị sẵn bộ 5 kịch bản lệnh `.bat` vận hành trọn gói vô cùng tiện lợi:

### 1. Cài đặt hệ thống (`setup.bat`)
*   Nhấp chuột phải vào tệp **setup.bat** -> Chọn **"Run as Administrator"** (Chạy với quyền Admin).
*   Nhập các thông tin hệ thống khi được yêu cầu:
    *   **URL Server:** Địa chỉ IP và cổng của máy chủ API (ví dụ: `http://192.168.1.100:8085`).
    *   **Secret Token:** Mã khóa bảo mật kết nối nội bộ (phải khớp với mã cấu hình ở Server).
    *   **Vị trí / Phòng ban / Người phụ trách:** Thông tin để hiển thị trên dashboard.
*   Script sẽ tự động cài các thư viện bắt buộc, đồng bộ `config.json` và đăng ký một tác vụ chạy ngầm vĩnh viễn trong **Task Scheduler** Windows (`NetDeviceAgent`) khởi động cùng hệ thống dưới quyền `SYSTEM` ẩn hoàn toàn (không hiện màn hình đen gây gián đoạn công việc).

### 2. Khởi chạy giám sát (`run.bat`)
*   Kích hoạt tệp **run.bat** bằng cách nhấp đúp chuột.
*   Script sẽ đồng thời kích hoạt Task chạy ngầm trong Windows Task Scheduler và khởi chạy cửa sổ Console theo dõi logs trực tiếp gửi báo cáo dữ liệu trạm về Server.

### 3. Dừng giám sát (`stop.bat`)
*   Kích hoạt tệp **stop.bat** bằng cách nhấp đúp chuột.
*   Script sẽ đóng sạch cửa sổ Console theo dõi và dừng hoàn toàn tác vụ chạy ngầm của Agent trong Task Scheduler.

### 4. Cập nhật Agent (`update.bat`)
*   Kích hoạt tệp **update.bat** bằng cách nhấp đúp chuột.
*   Script tự động nâng cấp tệp mã nguồn và các thư viện dependencies lên phiên bản mới nhất từ Git (Dev) hoặc tải trực tiếp từ GitHub (Standalone Client).

### 5. Gỡ bỏ giám sát (`uninstall.bat`)
*   Nhấp chuột phải vào tệp **uninstall.bat** -> Chọn **"Run as Administrator"** (Chạy với quyền Admin).
*   Script tự động gỡ sạch tác vụ chạy ngầm Task Scheduler, giải phóng tiến trình `pythonw.exe` đang chạy, dọn sạch mã đăng ký UUID trong Registry và cung cấp tùy chọn xóa tệp cấu hình `config.json`.
