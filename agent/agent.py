import os
import sys
import json
import time
import uuid
import platform
import subprocess
import winreg
import psutil
import requests

# Hỗ trợ UTF-8 output cho console trên Windows tránh UnicodeEncodeError
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Đường dẫn tệp cấu hình
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

def load_config():
    """Tải cấu hình từ config.json."""
    if not os.path.exists(CONFIG_PATH):
        # Tạo tệp cấu hình mặc định nếu chưa tồn tại
        default_config = {
            "server_url": "http://localhost:8080",
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
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def save_config(config):
    """Lưu cấu hình vào config.json."""
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"Lỗi ghi tệp cấu hình: {e}")

def get_or_create_uuid(config):
    """Lấy hoặc sinh mới UUID thiết bị, đồng bộ hóa tại Registry để chống mất mát."""
    reg_path = r"Software\NetDeviceAgent"
    
    # 1. Thử đọc từ Registry trước
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, reg_path, 0, winreg.KEY_READ)
        device_uuid, _ = winreg.QueryValueEx(key, "device_uuid")
        winreg.CloseKey(key)
        if device_uuid:
            # Đồng bộ lại config.json nếu khác biệt
            if config.get("device_uuid") != device_uuid:
                config["device_uuid"] = device_uuid
                save_config(config)
            return device_uuid
    except WindowsError:
        pass

    # 2. Nếu Registry trống, kiểm tra config.json
    device_uuid = config.get("device_uuid")
    if not device_uuid:
        # Sinh mới UUID
        device_uuid = str(uuid.uuid4())
        config["device_uuid"] = device_uuid
        save_config(config)

    # 3. Ghi đè đồng bộ lại Registry
    try:
        key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, reg_path)
        winreg.SetValueEx(key, "device_uuid", 0, winreg.REG_SZ, device_uuid)
        winreg.CloseKey(key)
    except WindowsError as e:
        print(f"Không thể ghi Registry: {e}")

    return device_uuid

def run_powershell(cmd):
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
        stdout, stderr = process.communicate(timeout=15)
        if process.returncode == 0:
            return stdout.strip()
    except Exception as e:
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

def get_windows_activation():
    """Kiểm tra trạng thái kích hoạt bản quyền Windows."""
    cmd = 'Get-CimInstance SoftwareLicensingProduct | Where-Object {$_.LicenseStatus -eq 1 -and $_.Name -like "*Windows*"} | Select-Object -First 1 | ConvertTo-Json'
    res = run_powershell(cmd)
    if res:
        try:
            data = json.loads(res)
            if data:
                return "Activated"
        except Exception:
            pass
    return "Not Activated / Trial"

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

# Sửa lỗi import thiếu socket ở trên
import socket

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
    server_url = config.get("server_url", "http://localhost:8080")
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

def main():
    print("=== Khởi chạy NetDevice Manager Agent ===")
    while True:
        config = load_config()
        if not config:
            print("Không tải được cấu hình. Thử lại sau 10 giây...")
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
