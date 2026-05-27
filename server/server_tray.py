import os
import sys
import subprocess
import webbrowser
import socket
import time
import threading

# Thư mục gốc server/
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Đường dẫn tương đối ra thư mục gốc dự án
VENV_PIP = os.path.abspath(os.path.join(BASE_DIR, "..", "venv", "Scripts", "pip.exe"))
STOP_BAT = os.path.abspath(os.path.join(BASE_DIR, "..", "server_stop.bat"))
RUN_BAT = os.path.abspath(os.path.join(BASE_DIR, "..", "server_run.bat"))

# Tự động cài đặt thư viện khay hệ thống thầm lặng vào venv hoặc môi trường chính
try:
    from PIL import Image, ImageDraw
    import pystray
except ImportError:
    try:
        if os.path.exists(VENV_PIP):
            subprocess.check_call([VENV_PIP, "install", "pystray", "pillow", "--quiet"])
        else:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pystray", "pillow", "--quiet"])
        from PIL import Image, ImageDraw
        import pystray
    except Exception as e:
        print(f"Không thể cài đặt thư viện khay hệ thống: {e}")
        sys.exit(1)

def is_server_running(port=8085):
    """Kiểm tra xem cổng API server của NetDevice Backend có đang mở không."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        return s.connect_ex(('127.0.0.1', port)) == 0

def create_image(width, height, color_bg, color_glow):
    """Tạo một biểu tượng khay hệ thống (Tray Icon) chất lượng cao hình tròn phát sáng (Glow Brand)."""
    image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    dc = ImageDraw.Draw(image)
    
    # 1. Vẽ nền phát sáng mờ (Glow border)
    dc.ellipse([2, 2, width-3, height-3], fill=color_bg, outline=color_glow, width=3)
    # 2. Vẽ vòng tròn trung tâm đại diện cho hệ thống
    dc.ellipse([width//4, height//4, width*3//4, height*3//4], fill=color_glow)
    return image

def get_icon_image():
    """Tạo biểu tượng màu động: Xanh lục (Online), Đỏ/Xám (Offline)."""
    if is_server_running():
        # Trạng thái Online: Vòng tròn Slate viền Emerald phát sáng
        return create_image(64, 64, (15, 23, 42, 255), (16, 185, 129, 255))
    else:
        # Trạng thái Offline: Vòng tròn Slate viền Đỏ phát sáng
        return create_image(64, 64, (15, 23, 42, 255), (239, 68, 68, 255))

icon = None

def open_dashboard(icon, item):
    """Mở trang giao diện Dashboard của NetDevice trên trình duyệt mặc định."""
    webbrowser.open("http://localhost:5173/#/dashboard")

def stop_server(icon, item):
    """Kích hoạt tắt hệ thống máy chủ thông qua script server_stop.bat."""
    subprocess.Popen([STOP_BAT, "--keep-tray"], shell=True, cwd=os.path.dirname(STOP_BAT))
    # Cập nhật trạng thái sau khi dừng
    threading.Thread(target=update_status_delayed, args=(3.0,)).start()

def start_server(icon, item):
    """Kích hoạt chạy hệ thống máy chủ thông qua script server_run.bat."""
    subprocess.Popen([RUN_BAT], shell=True, cwd=os.path.dirname(RUN_BAT))
    # Cập nhật trạng thái sau khi khởi chạy
    threading.Thread(target=update_status_delayed, args=(6.0,)).start()

def restart_server(icon, item):
    """Khởi động lại hệ thống máy chủ bằng cách dừng và chạy lại."""
    subprocess.Popen([STOP_BAT, "--keep-tray"], shell=True, cwd=os.path.dirname(STOP_BAT))
    
    def run_after_stop():
        time.sleep(3.0)
        subprocess.Popen([RUN_BAT], shell=True, cwd=os.path.dirname(RUN_BAT))
        update_status_delayed(6.0)
        
    threading.Thread(target=run_after_stop, daemon=True).start()

def update_status_delayed(delay=2.0):
    """Đợi một chút rồi cập nhật ngay hình ảnh trạng thái icon khay hệ thống."""
    time.sleep(delay)
    if icon:
        icon.icon = get_icon_image()
        icon.title = f"NetDevice Manager (Server: {'ONLINE' if is_server_running() else 'OFFLINE'})"

def check_status_loop():
    """Luồng ngầm chạy vô tận kiểm tra trạng thái cổng kết nối để đổi màu icon khay hệ thống thời gian thực."""
    while icon and icon.visible:
        try:
            icon.icon = get_icon_image()
            icon.title = f"NetDevice Manager (Server: {'ONLINE' if is_server_running() else 'OFFLINE'})"
        except Exception:
            pass
        time.sleep(5)

def setup_menu():
    """Xây dựng menu chuột phải trực quan cho Khay hệ thống."""
    return pystray.Menu(
        pystray.MenuItem('Mở Giao diện Dashboard', open_dashboard, default=True),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem('Khởi chạy Hệ thống Server', start_server, enabled=lambda item: not is_server_running()),
        pystray.MenuItem('Khởi động lại Hệ thống Server', restart_server, enabled=lambda item: is_server_running()),
        pystray.MenuItem('Dừng Hệ thống Server', stop_server, enabled=lambda item: is_server_running())
    )

def main():
    global icon
    
    # Đảm bảo chỉ có duy nhất 1 ứng dụng khay hệ thống chạy song song (Single Instance Lock)
    try:
        global _lock_socket
        _lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        _lock_socket.bind(('127.0.0.1', 28086))
    except socket.error:
        # Đã có khay hệ thống đang chạy từ trước, thoát thầm lặng để tránh trùng lặp
        sys.exit(0)

    # Khởi tạo khay hệ thống
    icon = pystray.Icon(
        "NetDeviceServer",
        get_icon_image(),
        title="NetDevice Manager Server",
        menu=setup_menu()
    )
    
    # Kích hoạt luồng kiểm tra trạng thái ngầm định kỳ
    t = threading.Thread(target=check_status_loop)
    t.daemon = True
    t.start()
    
    # Khởi chạy ứng dụng khay hệ thống (đồng bộ chặn main thread)
    icon.run()

if __name__ == "__main__":
    main()
