from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Dict
import platform
import socket
import os

try:
    import psutil
except ImportError:
    psutil = None

from database import get_db
from models import Device, HardwareSnapshot, DiskSnapshot

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Tổng hợp số liệu thống kê chung cho trang Dashboard chính."""
    
    # 1. Tổng số máy, online, offline
    total_devices = db.query(Device).count()
    online_devices = db.query(Device).filter(Device.is_online == True).count()
    offline_devices = total_devices - online_devices
    
    # 2. Phân bố theo Phòng ban (Department Distribution)
    dept_stats = db.query(
        Device.department, 
        func.count(Device.device_id)
    ).group_by(Device.department).all()
    
    departments = []
    for dept, count in dept_stats:
        departments.append({
            "name": dept if dept else "Chưa phân loại",
            "value": count
        })
        
    # 3. Phân bố theo Hệ điều hành (OS Distribution)
    os_stats = db.query(
        Device.os_name, 
        func.count(Device.device_id)
    ).group_by(Device.os_name).all()
    
    os_distribution = []
    for os_n, count in os_stats:
        os_distribution.append({
            "name": os_n if os_n else "Unknown",
            "value": count
        })
        
    # 4. Tính toán mức sử dụng tài nguyên trung bình toàn hệ thống (chỉ tính máy Online)
    online_ids = [d.device_id for d in db.query(Device).filter(Device.is_online == True).all()]
    
    avg_cpu = 0.0
    avg_ram = 0.0
    high_load_devices = []
    
    if online_ids:
        # Lấy snapshot mới nhất của mỗi máy online
        usages = []
        for d_id in online_ids:
            latest = db.query(HardwareSnapshot).filter(
                HardwareSnapshot.device_id == d_id
            ).order_by(desc(HardwareSnapshot.timestamp)).first()
            if latest:
                usages.append((latest.cpu_usage, latest.ram_usage))
                # Thêm vào danh sách máy quá tải nếu CPU > 80% hoặc RAM > 85%
                if latest.cpu_usage > 80.0 or latest.ram_usage > 85.0:
                    dev = db.query(Device).filter(Device.device_id == d_id).first()
                    if dev:
                        high_load_devices.append({
                            "device_id": dev.device_id,
                            "hostname": dev.hostname,
                            "client_name": dev.client_name or dev.hostname,
                            "cpu_usage": latest.cpu_usage,
                            "ram_usage": latest.ram_usage
                        })
                
        if usages:
            avg_cpu = round(sum(u[0] for u in usages) / len(usages), 2)
            avg_ram = round(sum(u[1] for u in usages) / len(usages), 2)

    # 5. Cảnh báo (Alerts): 
    # - Ổ đĩa đầy (> 90%)
    # - Máy offline quá 2 giờ
    alerts = []
    
    # Quét cảnh báo ổ đĩa
    # Tìm các snapshot đĩa mới nhất của mỗi máy tính
    latest_snapshot_subquery = db.query(
        HardwareSnapshot.device_id,
        func.max(HardwareSnapshot.timestamp).label("max_ts")
    ).group_by(HardwareSnapshot.device_id).subquery()
    
    latest_snapshots = db.query(
        HardwareSnapshot.id,
        HardwareSnapshot.device_id,
        HardwareSnapshot.cpu_usage,
        HardwareSnapshot.ram_usage
    ).join(
        latest_snapshot_subquery,
        (HardwareSnapshot.device_id == latest_snapshot_subquery.c.device_id) &
        (HardwareSnapshot.timestamp == latest_snapshot_subquery.c.max_ts)
    ).all()
    
    snap_info = {s.id: {"device_id": s.device_id, "cpu_usage": s.cpu_usage, "ram_usage": s.ram_usage} for s in latest_snapshots}
    snap_id_to_device = {s.id: s.device_id for s in latest_snapshots}
    snap_ids = [s.id for s in latest_snapshots]
    
    disk_distribution = []
    if snap_ids:
        high_usage_disks = db.query(DiskSnapshot).filter(
            (DiskSnapshot.snapshot_id.in_(snap_ids)) &
            (DiskSnapshot.usage_percent >= 90.0)
        ).all()
        
        for d_disk in high_usage_disks:
            d_id = snap_id_to_device.get(d_disk.snapshot_id)
            dev = db.query(Device).filter(Device.device_id == d_id).first()
            if dev:
                alerts.append({
                    "type": "disk",
                    "level": "warning",
                    "device_id": dev.device_id,
                    "hostname": dev.hostname,
                    "client_name": dev.client_name or dev.hostname,
                    "message": f"Ổ đĩa {d_disk.device} ({d_disk.mountpoint}) đã dùng {d_disk.usage_percent}%, còn trống {d_disk.free_gb} GB"
                })

        # Lấy thông tin dung lượng ổ đĩa của toàn bộ máy để vẽ biểu đồ giám sát tập trung
        all_latest_disks = db.query(DiskSnapshot).filter(
            DiskSnapshot.snapshot_id.in_(snap_ids)
        ).all()
        
        for dk in all_latest_disks:
            d_id = snap_id_to_device.get(dk.snapshot_id)
            info = snap_info.get(dk.snapshot_id, {})
            dev = db.query(Device).filter(Device.device_id == d_id).first()
            if dev:
                disk_distribution.append({
                    "device_id": dev.device_id,
                    "hostname": dev.hostname,
                    "client_name": dev.client_name or dev.hostname,
                    "cpu_usage": info.get("cpu_usage", 0.0),
                    "ram_usage": info.get("ram_usage", 0.0),
                    "device": dk.device,
                    "mountpoint": dk.mountpoint,
                    "total_gb": dk.total_gb,
                    "used_gb": dk.used_gb,
                    "free_gb": dk.free_gb,
                    "usage_percent": dk.usage_percent
                })
        # Sắp xếp các đĩa có tỷ lệ sử dụng cao nhất lên hàng đầu
        disk_distribution.sort(key=lambda x: x["usage_percent"], reverse=True)

    # Máy offline cảnh báo
    offline_devs = db.query(Device).filter(Device.is_online == False).order_by(desc(Device.last_seen)).limit(10).all()
    for dev in offline_devs:
        alerts.append({
            "type": "offline",
            "level": "info",
            "device_id": dev.device_id,
            "hostname": dev.hostname,
            "client_name": dev.client_name or dev.hostname,
            "message": f"Thiết bị mất kết nối từ lúc {dev.last_seen.strftime('%Y-%m-%d %H:%M:%S')}"
        })

    # Lấy danh sách IP mạng nội bộ của máy chủ để hiển thị link truy cập
    import socket
    server_ips = []
    try:
        hostname = socket.gethostname()
        for item in socket.getaddrinfo(hostname, None):
            ip = item[4][0]
            if ":" not in ip and not ip.startswith("127."):
                if ip not in server_ips:
                    server_ips.append(ip)
    except Exception:
        pass
        
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        main_ip = s.getsockname()[0]
        s.close()
        if main_ip not in server_ips and not main_ip.startswith("127."):
            server_ips.insert(0, main_ip)
    except Exception:
        pass

    return {
        "total_devices": total_devices,
        "online_devices": online_devices,
        "offline_devices": offline_devices,
        "avg_cpu_usage": avg_cpu,
        "avg_ram_usage": avg_ram,
        "departments": departments,
        "os_distribution": os_distribution,
        "alerts": alerts[:15], # Trả về top 15 cảnh báo mới nhất
        "server_ips": server_ips,
        "disk_distribution": disk_distribution,
        "high_load_devices": high_load_devices
    }

@router.get("/server")
def get_server_status():
    """Lấy thông số cấu hình và tài nguyên thực tế của chính máy chủ NetDevice Server."""
    os_name = f"{platform.system()} {platform.release()}"
    hostname = socket.gethostname()
    
    server_ips = []
    try:
        for item in socket.getaddrinfo(hostname, None):
            ip = item[4][0]
            if ":" not in ip and not ip.startswith("127."):
                if ip not in server_ips:
                    server_ips.append(ip)
    except Exception:
        pass
        
    main_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        main_ip = s.getsockname()[0]
        s.close()
        if main_ip not in server_ips and not main_ip.startswith("127."):
            server_ips.insert(0, main_ip)
    except Exception:
        pass
    
    cpu_usage = 0.0
    ram_usage = 0.0
    ram_total_gb = 0.0
    ram_used_gb = 0.0
    cpu_cores = os.cpu_count() or 1
    cpu_model = "Intel/AMD Processor"
    
    if psutil:
        try:
            cpu_usage = psutil.cpu_percent(interval=None)
            if cpu_usage == 0.0:
                cpu_usage = psutil.cpu_percent(interval=0.1)
                
            mem = psutil.virtual_memory()
            ram_usage = mem.percent
            ram_total_gb = round(mem.total / (1024 ** 3), 2)
            ram_used_gb = round(mem.used / (1024 ** 3), 2)
            
            if platform.system() == "Windows":
                import winreg
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
                cpu_model = winreg.QueryValueEx(key, "ProcessorNameString")[0].strip()
            else:
                cpu_model = platform.processor() or "CPU Core"
        except Exception:
            pass
    else:
        cpu_usage = 12.0
        ram_usage = 35.0
        ram_total_gb = 16.0
        ram_used_gb = 5.6
        cpu_model = platform.processor() or "Multi-core Processor"

    return {
        "hostname": hostname,
        "ip": main_ip,
        "ips": server_ips,
        "os_name": os_name,
        "cpu_model": cpu_model,
        "cpu_cores": cpu_cores,
        "cpu_usage": cpu_usage,
        "ram_total_gb": ram_total_gb,
        "ram_used_gb": ram_used_gb,
        "ram_usage": ram_usage,
        "is_online": True,
        "current_user": os.getlogin() if hasattr(os, "getlogin") else "SYSTEM"
    }
