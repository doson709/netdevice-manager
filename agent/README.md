# NetDevice Agent — Hướng dẫn cài đặt

Cấu phần Agent được cài đặt trên từng máy khách (client) Windows để thu thập thông tin và báo cáo về server trung tâm.

## Yêu cầu hệ thống
1. Hệ điều hành: Windows 7, 10, 11 hoặc Windows Server 2012+
2. Đã cài đặt **Python 3.8+** (Nhớ tick chọn **"Add Python to PATH"** trong quá trình cài đặt)
3. Có kết nối mạng nội bộ thông suốt tới địa chỉ IP của máy chủ.

## Cài đặt 1-Click (Khuyến nghị)
1. Tải toàn bộ thư mục `agent/` về máy khách.
2. Nhấp chuột phải vào tệp `install.bat` và chọn **"Run as Administrator"** (Chạy với quyền quản trị viên).
3. Nhập các thông tin hệ thống khi được nhắc:
   * **URL Server:** Địa chỉ IP và cổng của máy chủ API (ví dụ: `http://192.168.1.100:8080`).
   * **Secret Token:** Mã khóa bảo mật kết nối nội bộ (phải khớp với mã cấu hình ở Server).
   * **Vị trí / Phòng ban / Người phụ trách:** Metadata để quản lý trên dashboard.
4. Trình cài đặt sẽ tự động:
   * Cài đặt các thư viện bắt buộc từ `requirements.txt`.
   * Cập nhật tệp cấu hình `config.json`.
   * Đăng ký một tác vụ chạy nền vĩnh viễn trong **Task Scheduler** Windows (`NetDeviceAgent`) khởi động cùng Windows dưới quyền hệ thống `SYSTEM` ẩn hoàn toàn (không hiện màn hình đen).

## Khởi chạy thủ công (Kiểm thử)
Nếu muốn chạy trực tiếp trên console để theo dõi log:
1. Mở cửa sổ CMD trong thư mục `agent/`.
2. Cài đặt các dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Chạy trực tiếp qua tệp `start_agent.bat` hoặc lệnh:
   ```bash
   python agent.py
   ```
