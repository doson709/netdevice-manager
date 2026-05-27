# NetDevice Server — Hướng dẫn cài đặt & khởi vận hành

Ứng dụng server FastAPI chịu trách nhiệm nhận dữ liệu định kỳ từ các Agent, lưu trữ vào SQLite (WAL mode) và cung cấp các API để dashboard truy vấn.

## Yêu cầu môi trường
*   Python 3.8+
*   Port 8085 còn trống (hoặc có thể cấu hình lại)

## Hướng dẫn khởi chạy nhanh

1.  Mở cửa sổ Command Prompt hoặc PowerShell tại thư mục `server/`.
2.  Tạo môi trường ảo Python (Virtual Environment):
    ```bash
    python -m venv venv
    ```
3.  Kích hoạt môi trường ảo:
    *   **Windows (Command Prompt):**
        ```bash
        venv\Scripts\activate
        ```
    *   **Windows (PowerShell):**
        ```bash
        .\venv\Scripts\activate
        ```
4.  Cài đặt các gói thư viện cần thiết:
    ```bash
    pip install -r requirements.txt
    ```
5.  Khởi chạy Server:
    ```bash
    python main.py
    ```
    Ứng dụng sẽ chạy tại cổng **8085** (`http://localhost:8085`).

## Các tham số môi trường (Tùy chọn)
*   **`NETDEVICE_SECRET_TOKEN`**: Khóa Token bảo mật để xác thực Agent. Mặc định là `secure-intranet-token-123`.

## Tài liệu API tự động (Swagger)
Khi Server đang khởi chạy, bạn có thể truy cập tài liệu hướng dẫn API đầy đủ tại đường dẫn:
`http://localhost:8085/docs` hoặc `http://localhost:8085/redoc`

## Cấu hình tường lửa (Firewall)
*   Nếu bạn chạy Server trên máy chủ và muốn các máy khách trong mạng LAN kết nối được, vui lòng mở **Inbound Port 8085** trên Windows Firewall (hoặc Firewall của máy chủ).
