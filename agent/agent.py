import os
import sys
import json
import time
import uuid
import socket
import platform
import subprocess
import winreg
import psutil
import requests

# Xác định thư mục gốc trước tiên (cần cho log file path)
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CONFIG_PATH = os.path.join(BASE_DIR, "config.json")

# Khi đóng gói --noconsole: stdout/stderr là None — chuyển hướng print() sang file log
if getattr(sys, 'frozen', False) and (sys.stdout is None or sys.stderr is None):
    _log_path = os.path.join(BASE_DIR, "agent.log")
    _log_file = open(_log_path, "a", encoding="utf-8", errors="ignore")
    if sys.stdout is None:
        sys.stdout = _log_file
    if sys.stderr is None:
        sys.stderr = _log_file
else:
    # Hỗ trợ UTF-8 output cho console trên Windows tránh UnicodeEncodeError
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')


def load_config():
    """Tải cấu hình từ config.json."""
    if not os.path.exists(CONFIG_PATH):
        # Tạo tệp cấu hình mặc định nếu chưa tồn tại
        default_config = {
            "server_url": "http://localhost:8085",
            "secret_token": "secure-intranet-token-123",
            "device_uuid": "",
            "report_interval": 60,
            "location": "Phòng IT, Tầng 2",
            "department": "IT",
            "owner": "Nguyễn Văn A"
        }
        save_config(default_config)
        return default_config
    
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8-sig") as f:
            return json.load(f)
    except Exception as e:
        print(f"Lỗi đọc tệp cấu hình config.json: {e}")
        return {}

def save_config(config):
    """Lưu cấu hình vào config.json."""
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"Lỗi ghi tệp cấu hình: {e}")

def get_or_create_uuid(config):
    """Lấy Hardware ID (MachineGuid) độc nhất của Windows để định danh thiết bị, chống sao chép trùng lặp."""
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography", 0, winreg.KEY_READ)
        machine_guid, _ = winreg.QueryValueEx(key, "MachineGuid")
        winreg.CloseKey(key)
        machine_guid = machine_guid.strip()
    except Exception:
        # Fallback trong trường hợp đặc biệt không đọc được Registry
        machine_guid = config.get("device_uuid", "").strip()
        if not machine_guid:
            machine_guid = str(uuid.uuid4())
            
    # Đồng bộ hóa cứng vào config.json nếu chưa khớp (ví dụ thư mục bị sao chép từ máy khác sang)
    if config.get("device_uuid") != machine_guid:
        config["device_uuid"] = machine_guid
        save_config(config)
        
    return machine_guid

def run_powershell(cmd, timeout=30, silent=False):
    """Chạy lệnh PowerShell ẩn không hiện cửa sổ cmd phụ."""
    try:
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        process = subprocess.Popen(
            ["powershell", "-NoProfile", "-Command", cmd],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            startupinfo=startupinfo,
            text=True,
            encoding="utf-8",
            errors="ignore"
        )
        stdout, stderr = process.communicate(timeout=timeout)
        if process.returncode == 0:
            return stdout.strip()
    except Exception as e:
        if not silent:
            print(f"Lỗi chạy PowerShell: {e}")
    return ""

def get_system_uptime():
    """Lấy số giây hệ thống đã hoạt động (uptime)."""
    return time.time() - psutil.boot_time()

def get_cpu_model():
    """Đọc tên dòng CPU từ Windows Registry."""
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
        cpu_model, _ = winreg.QueryValueEx(key, "ProcessorNameString")
        winreg.CloseKey(key)
        return cpu_model.strip()
    except WindowsError:
        return platform.processor()

def get_gpu_info():
    """Thu thập thông tin card màn hình (GPU) qua PowerShell."""
    cmd = "Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM, DriverVersion | ConvertTo-Json"
    res = run_powershell(cmd)
    if not res:
        return []
    try:
        data = json.loads(res)
        if not isinstance(data, list):
            data = [data]
        
        gpus = []
        for item in data:
            ram_bytes = item.get("AdapterRAM", 0)
            # PowerShell đôi khi trả RAM dạng số âm nếu tràn 32-bit unsigned
            if ram_bytes and ram_bytes < 0:
                ram_bytes = ram_bytes + 2**32
            ram_gb = round(ram_bytes / (1024**3), 2) if ram_bytes else 0
            
            gpus.append({
                "name": item.get("Name", "Unknown GPU"),
                "vram_gb": ram_gb,
                "driver_version": item.get("DriverVersion", "")
            })
        return gpus
    except Exception:
        return []

def get_hardware_info():
    """Lấy thông tin Mainboard và BIOS qua PowerShell."""
    # Mainboard
    board_cmd = "Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer, Product, SerialNumber | ConvertTo-Json"
    board_res = run_powershell(board_cmd)
    motherboard = {"manufacturer": "Unknown", "product": "Unknown", "serial": "Unknown"}
    if board_res:
        try:
            b_data = json.loads(board_res)
            motherboard["manufacturer"] = b_data.get("Manufacturer", "Unknown").strip()
            motherboard["product"] = b_data.get("Product", "Unknown").strip()
            motherboard["serial"] = b_data.get("SerialNumber", "Unknown").strip()
        except Exception:
            pass

    # BIOS
    bios_cmd = "Get-CimInstance Win32_BIOS | Select-Object Manufacturer, Version, ReleaseDate | ConvertTo-Json"
    bios_res = run_powershell(bios_cmd)
    bios = {"manufacturer": "Unknown", "version": "Unknown", "release_date": "Unknown"}
    if bios_res:
        try:
            b_data = json.loads(bios_res)
            bios["manufacturer"] = b_data.get("Manufacturer", "Unknown").strip()
            bios["version"] = b_data.get("Version", "Unknown").strip()
            # Xử lý cắt chuỗi ngày tháng WMI
            r_date = b_data.get("ReleaseDate", "")
            if r_date and len(r_date) >= 8:
                bios["release_date"] = f"{r_date[0:4]}-{r_date[4:6]}-{r_date[6:8]}"
            else:
                bios["release_date"] = r_date if r_date else "Unknown"
        except Exception:
            pass

    return motherboard, bios

_cached_activation = None

def get_windows_activation():
    """Kiểm tra trạng thái kích hoạt bản quyền Windows (có bộ nhớ đệm tránh truy vấn lặp lại gây lag)."""
    global _cached_activation
    if _cached_activation is not None:
        return _cached_activation

    # Gọi trực tiếp slmgr.vbs bằng cscript thông qua Python (không qua powershell để tránh overhead, lỗi phiên bản và bảo mật)
    try:
        # Tạo cấu trúc ẩn cửa sổ lệnh
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        
        # Chạy kiểm tra bản quyền với timeout cực ngắn (3 giây)
        res = subprocess.run(
            ['cscript', '//nologo', r'C:\Windows\System32\slmgr.vbs', '/xpr'],
            capture_output=True,
            text=True,
            timeout=3,
            startupinfo=startupinfo
        )
        if res.returncode == 0:
            output = res.stdout.strip().lower()
            # Hỗ trợ cả tiếng Anh và tiếng Việt (ví dụ: "permanently activated", "được kích hoạt vĩnh viễn", "licensed", "cấp phép")
            if "permanent" in output or "kích hoạt vĩnh viễn" in output or "activated" in output or "license" in output or "cấp phép" in output:
                _cached_activation = "Activated"
                return _cached_activation
            # Nếu chứa thông tin volume license/KMS kích hoạt có thời hạn
            elif "volume" in output or "hạn" in output or "expire" in output:
                _cached_activation = "Activated (KMS/Volume)"
                return _cached_activation
    except Exception:
        # Bỏ qua hoàn toàn tất cả các lỗi ngoại lệ (bao gồm cả lỗi timeout)
        # Điều này đảm bảo TUYỆT ĐỐI không bao giờ có log lỗi in ra màn hình console làm phiền người dùng
        pass

    # Nếu hết thời gian truy vấn hoặc gặp lỗi WMI/Licensing Service bị treo, mặc định trả về trạng thái ẩn
    _cached_activation = "Not Activated / Trial"
    return _cached_activation

def get_installed_software():
    """Quét danh sách các phần mềm đã cài đặt từ Windows Registry."""
    software_list = []
    
    # Các đường dẫn Registry Uninstall của Windows
    paths = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_READ | winreg.KEY_WOW64_64KEY),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_READ | winreg.KEY_WOW64_32KEY),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_READ)
    ]
    
    seen = set()
    for root, subpath, access in paths:
        try:
            key = winreg.OpenKey(root, subpath, 0, access)
            count = winreg.QueryInfoKey(key)[0]
            for i in range(count):
                try:
                    sub_key_name = winreg.EnumKey(key, i)
                    sub_key = winreg.OpenKey(key, sub_key_name)
                    
                    try:
                        name, _ = winreg.QueryValueEx(sub_key, "DisplayName")
                        version = winreg.QueryValueEx(sub_key, "DisplayVersion")[0] if winreg.QueryValueEx(sub_key, "DisplayVersion") else ""
                        publisher = winreg.QueryValueEx(sub_key, "Publisher")[0] if winreg.QueryValueEx(sub_key, "Publisher") else ""
                        
                        name = name.strip()
                        version = str(version).strip()
                        publisher = str(publisher).strip()
                        
                        # Bỏ qua các cập nhật hệ thống KB...
                        if name and name not in seen and not name.startswith("KB") and "Update" not in name:
                            seen.add(name)
                            software_list.append({
                                "name": name,
                                "version": version,
                                "publisher": publisher
                            })
                    except WindowsError:
                        pass
                    finally:
                        winreg.CloseKey(sub_key)
                except WindowsError:
                    pass
            winreg.CloseKey(key)
        except WindowsError:
            pass
            
    return software_list

def get_active_network_info():
    """Lấy danh sách các cổng mạng và xác định adapter hoạt động chính."""
    adapters = []
    main_ip = "127.0.0.1"
    main_mac = ""
    
    # 1. Đọc qua psutil
    addrs = psutil.net_if_addrs()
    stats = psutil.net_if_stats()
    
    # Tìm default adapter (qua lệnh route nội bộ hoặc adapter active có IP)
    # Lấy IP chính kết nối ra ngoài
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        main_ip = s.getsockname()[0]
        s.close()
    except Exception:
        # Fallback nếu không có internet
        for interface, addr_list in addrs.items():
            for addr in addr_list:
                if addr.family == psutil.AF_LINK:
                    continue
                if addr.ip and not addr.ip.startswith("127."):
                    main_ip = addr.ip
                    break
    
    for interface, addr_list in addrs.items():
        ip = ""
        mac = ""
        netmask = ""
        is_up = stats[interface].isup if interface in stats else False
        
        for addr in addr_list:
            if addr.family == psutil.AF_LINK:
                mac = addr.address.replace("-", ":").upper()
            elif addr.family == socket.AF_INET if hasattr(socket, "AF_INET") else 2:
                ip = addr.address
                netmask = addr.netmask
        
        if ip and mac:
            adapters.append({
                "adapter_name": interface,
                "ip_address": ip,
                "mac_address": mac,
                "netmask": netmask or "255.255.255.0"
            })
            
            # Gán MAC chính nếu khớp IP chính
            if ip == main_ip:
                main_mac = mac
                
    # Nếu không tìm thấy main_mac từ IP chính, lấy đại diện adapter active đầu tiên
    if not main_mac and adapters:
        main_mac = adapters[0]["mac_address"]
        
    return adapters, main_ip, main_mac

def collect_all_data(config):
    """Tổng hợp toàn bộ thông tin của máy trạm."""
    print("Bắt đầu thu thập dữ liệu hệ thống...")
    
    # 1. Định danh UUID
    device_uuid = get_or_create_uuid(config)
    
    # 2. Hệ thống & Uptime
    current_user = os.getlogin() if hasattr(os, "getlogin") else os.environ.get("USERNAME", "Unknown")
    uptime = get_system_uptime()
    
    # 3. CPU
    cpu_model = get_cpu_model()
    cpu_cores_physical = psutil.cpu_count(logical=False) or 1
    cpu_cores_logical = psutil.cpu_count(logical=True) or 1
    cpu_usage = psutil.cpu_percent(interval=1)
    
    # 4. RAM
    ram = psutil.virtual_memory()
    ram_total_gb = round(ram.total / (1024**3), 2)
    ram_used_gb = round(ram.used / (1024**3), 2)
    ram_usage = ram.percent
    
    # 5. Disk Partitions
    disks = []
    for part in psutil.disk_partitions():
        # Chỉ quét các ổ đĩa NTFS/FAT vật lý có thể ghi
        if "fixed" not in part.opts and "rw" not in part.opts:
            continue
        try:
            usage = psutil.disk_usage(part.mountpoint)
            disks.append({
                "device": part.device,
                "mountpoint": part.mountpoint,
                "total_gb": round(usage.total / (1024**3), 2),
                "used_gb": round(usage.used / (1024**3), 2),
                "free_gb": round(usage.free / (1024**3), 2),
                "usage_percent": usage.percent
            })
        except Exception:
            pass
            
    # 6. Network
    network_adapters, main_ip, main_mac = get_active_network_info()
    
    # 7. GPU, Mainboard, BIOS, Windows License
    gpu_list = get_gpu_info()
    motherboard, bios = get_hardware_info()
    win_activation = get_windows_activation()
    
    # 8. Installed Software
    software = get_installed_software()
    
    # 9. Top 20 Processes
    processes = []
    for proc in psutil.process_iter():
        try:
            pid = proc.pid
            
            # Đọc tên tiến trình
            try:
                name = proc.name()
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                continue # Bỏ qua nếu không đọc được cả tên
                
            # Đọc phần trăm bộ nhớ
            try:
                memory_percent = proc.memory_percent()
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                memory_percent = 0.0
                
            # Đọc phần trăm CPU
            try:
                cpu_percent = proc.cpu_percent()
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                cpu_percent = 0.0
                
            if name:
                processes.append({
                    "pid": pid,
                    "name": name,
                    "memory_percent": round(memory_percent, 2) if memory_percent else 0.0,
                    "cpu_percent": round(cpu_percent, 2) if cpu_percent else 0.0
                })
        except (psutil.NoSuchProcess, psutil.ZombieProcess):
            pass
            
    # Sắp xếp top 20 tiến trình tiêu thụ RAM cao nhất
    processes = sorted(processes, key=lambda x: x["memory_percent"], reverse=True)[:20]
    
    # Đóng gói dữ liệu Payload
    payload = {
        "device_id": device_uuid,
        "mac_address": main_mac,
        "hostname": socket.gethostname(),
        "os_name": platform.system(),
        "os_version": f"{platform.release()} (Build {platform.version()})",
        "architecture": platform.machine(),
        "current_user": current_user,
        "location": config.get("location", ""),
        "department": config.get("department", ""),
        "owner": config.get("owner", ""),
        "uptime_seconds": uptime,
        
        # Phần cứng
        "cpu_model": cpu_model,
        "cpu_cores": cpu_cores_logical,
        "cpu_usage": cpu_usage,
        "ram_total_gb": ram_total_gb,
        "ram_used_gb": ram_used_gb,
        "ram_usage": ram_usage,
        "gpu_info": gpu_list,
        "motherboard": motherboard,
        "bios": bios,
        "windows_activation": win_activation,
        
        # Snapshot quan hệ
        "disks": disks,
        "network_adapters": network_adapters,
        
        # Danh sách phần mềm
        "software": software,
        
        # Top tiến trình
        "processes": processes
    }
    
    return payload

def send_report(config, payload):
    """Gửi dữ liệu báo cáo về FastAPI Server tập trung."""
    server_url = config.get("server_url", "http://localhost:8085")
    if not server_url.startswith("http://") and not server_url.startswith("https://"):
        server_url = "http://" + server_url
    report_endpoint = f"{server_url.rstrip('/')}/api/report"
    token = config.get("secret_token", "")
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": token
    }
    
    try:
        response = requests.post(report_endpoint, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            print("Gửi báo cáo thành công lên Server!")
            return True
        else:
            print(f"Server trả về mã lỗi: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Không thể kết nối đến Server tại {report_endpoint}: {e}")
    return False

def is_first_run(config):
    """Kiểm tra xem đây có phải lần chạy đầu tiên chưa được cấu hình."""
    server_url = config.get("server_url", "").strip()
    return not server_url or server_url in (
        "http://localhost:8085",
        "http://localhost:8085/",
        "http://127.0.0.1:8085",
        "http://127.0.0.1:8085/"
    )


def set_autostart(enable=True):
    """Cấu hình tự động chạy cùng Windows trong Registry HKEY_CURRENT_USER."""
    try:
        exe_path = sys.executable
        reg_key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
            0, winreg.KEY_SET_VALUE
        )
        if enable:
            winreg.SetValueEx(reg_key, "NetDeviceAgent", 0, winreg.REG_SZ, f'"{exe_path}"')
            print("Đã đăng ký tự động khởi động cùng Windows.")
        else:
            try:
                winreg.DeleteValue(reg_key, "NetDeviceAgent")
                print("Đã hủy đăng ký tự động khởi động cùng Windows.")
            except FileNotFoundError:
                pass
        winreg.CloseKey(reg_key)
        return True
    except Exception as e:
        print(f"Lỗi đăng ký Registry auto-start: {e}")
        return False


def first_run_setup():
    """Wizard cài đặt lần đầu — hiện cửa sổ tkinter, không cần terminal."""
    try:
        import tkinter as tk
        from tkinter import messagebox
    except ImportError:
        # Fallback: nếu tkinter không có, dùng console
        return _first_run_setup_console()

    config = load_config()
    setup_done = [False]

    root = tk.Tk()
    root.title("NetDevice Manager Agent — Cài đặt lần đầu")
    root.configure(bg="#0f172a")
    root.resizable(False, False)

    # Căn giữa cửa sổ trên màn hình
    w, h = 500, 600
    ws = root.winfo_screenwidth()
    hs = root.winfo_screenheight()
    root.geometry(f"{w}x{h}+{(ws - w) // 2}+{(hs - h) // 2}")
    root.attributes("-topmost", True)

    # HEADER
    hdr = tk.Frame(root, bg="#1d4ed8", pady=14)
    hdr.pack(fill="x")
    tk.Label(hdr, text="NetDevice Manager Agent", bg="#1d4ed8", fg="white",
             font=("Segoe UI", 13, "bold")).pack()
    tk.Label(hdr, text="Cài đặt lần đầu  —  Kết nối với Server giám sát",
             bg="#1d4ed8", fg="#93c5fd", font=("Segoe UI", 9)).pack()

    # FORM
    form = tk.Frame(root, bg="#0f172a", padx=24)
    form.pack(fill="both", expand=True, pady=4)

    def field(label, default=""):
        tk.Label(form, text=label, bg="#0f172a", fg="#94a3b8",
                 font=("Segoe UI", 8, "bold"), anchor="w").pack(fill="x", pady=(8, 2))
        e = tk.Entry(form, bg="#1e293b", fg="white", insertbackground="white",
                     relief="flat", font=("Segoe UI", 10),
                     highlightthickness=1, highlightcolor="#3b82f6",
                     highlightbackground="#334155")
        e.pack(fill="x", ipady=6)
        if default:
            e.insert(0, default)
        return e

    e_url      = field("URL SERVER  (bắt buộc)  —  vd: http://192.168.1.100:8085")
    e_token    = field("SECRET TOKEN", "secure-intranet-token-123")
    e_location = field("VỊ TRÍ ĐẶT MÁY  —  vd: Phòng IT, Tầng 2", "Phong IT")
    e_dept     = field("PHÒNG BAN  —  vd: IT, Kế toán, Kỹ thuật", "IT")
    e_owner    = field("NGƯỜI PHỤ TRÁCH / SỬ DỤNG MÁY")
    e_interval = field("CHU KỲ GỬI BÁO CÁO  (giây)", "60")

    # CHECKBOX AUTO-START
    var_autostart = tk.BooleanVar(value=True)
    chk_autostart = tk.Checkbutton(form, text="Tự động khởi động cùng Windows (khuyên dùng)",
                                   variable=var_autostart, bg="#0f172a", fg="#94a3b8",
                                   selectcolor="#1e293b", activebackground="#0f172a",
                                   activeforeground="white", font=("Segoe UI", 9),
                                   cursor="hand2")
    chk_autostart.pack(anchor="w", pady=(12, 4))

    def on_submit():
        url = e_url.get().strip()
        if not url:
            messagebox.showerror("Lỗi",
                "URL Server là bắt buộc!\nVí dụ: http://192.168.1.100:8085",
                parent=root)
            return
        if not url.startswith("http"):
            url = "http://" + url
        config["server_url"]      = url.rstrip("/")
        config["secret_token"]    = e_token.get().strip() or "secure-intranet-token-123"
        config["location"]        = e_location.get().strip() or "Phong IT"
        config["department"]      = e_dept.get().strip() or "IT"
        config["owner"]           = e_owner.get().strip() or "Chua xac dinh"
        try:
            config["report_interval"] = max(10, int(e_interval.get().strip()))
        except ValueError:
            config["report_interval"] = 60
        
        # Đăng ký tự động khởi động cùng Windows nếu được chọn
        set_autostart(var_autostart.get())
        
        save_config(config)
        setup_done[0] = True
        root.destroy()

    # SUBMIT BUTTON
    bf = tk.Frame(root, bg="#0f172a", padx=24, pady=14)
    bf.pack(fill="x")
    tk.Button(bf, text="\u2713   Lưu cấu hình và bắt đầu Agent",
              command=on_submit, bg="#2563eb", fg="white",
              activebackground="#1d4ed8", activeforeground="white",
              font=("Segoe UI", 10, "bold"), relief="flat",
              cursor="hand2", pady=10).pack(fill="x")

    # Không cho đóng cửa sổ khi chưa điền thông tin
    root.protocol("WM_DELETE_WINDOW", lambda: None)
    root.mainloop()

    if not setup_done[0]:
        sys.exit(0)
    return load_config()


def _first_run_setup_console():
    """Fallback wizard dùng terminal nếu tkinter không khả dụng."""
    print()
    print("=" * 62)
    print("    NETDEVICE MANAGER AGENT  -  CAI DAT LAN DAU")
    print("=" * 62)
    config = load_config()
    while True:
        url = input("  [1] URL Server (vd: http://192.168.1.100:8085)\n  > ").strip()
        if url:
            if not url.startswith("http"):
                url = "http://" + url
            config["server_url"] = url.rstrip("/")
            break
        print("      !! URL Server la bat buoc.")
    token = input(f"\n  [2] Secret Token [secure-intranet-token-123]\n  > ").strip()
    config["secret_token"] = token or "secure-intranet-token-123"
    location = input(f"\n  [3] Vi tri dat may [Phong IT]\n  > ").strip()
    config["location"] = location or "Phong IT"
    department = input(f"\n  [4] Phong ban [IT]\n  > ").strip()
    config["department"] = department or "IT"
    owner = input(f"\n  [5] Nguoi phu trach [Chua xac dinh]\n  > ").strip()
    config["owner"] = owner or "Chua xac dinh"
    interval_str = input(f"\n  [6] Chu ky gui bao cao giay [60]\n  > ").strip()
    try:
        config["report_interval"] = max(10, int(interval_str)) if interval_str else 60
    except ValueError:
        config["report_interval"] = 60
        
    autostart_str = input("\n  [7] Tu dong khoi dong cung Windows? (C/K) [C]\n  > ").strip().lower()
    enable_autostart = autostart_str != 'k'
    set_autostart(enable_autostart)
    
    save_config(config)
    print(f"\n  OK  Server: {config['server_url']}")
    return config



def main():
    print("=== Khoi chay NetDevice Manager Agent ===")

    # Kiểm tra cấu hình — nếu là lần đầu, hiện wizard setup
    config = load_config()
    if is_first_run(config):
        config = first_run_setup()

    while True:
        config = load_config()
        if not config:
            print("Khong tai duoc cau hinh. Thu lai sau 10 giay...")
            time.sleep(10)
            continue
            
        try:
            payload = collect_all_data(config)
            send_report(config, payload)
        except Exception as e:
            print(f"Lỗi không mong muốn trong chu kỳ chạy: {e}")
            
        interval = config.get("report_interval", 60)
        print(f"Đợi {interval} giây cho chu kỳ báo cáo tiếp theo...")
        time.sleep(interval)

if __name__ == "__main__":
    main()
