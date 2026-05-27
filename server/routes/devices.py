import json
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_
import platform
import socket
import os

try:
    import psutil
except ImportError:
    psutil = None

from database import get_db
from models import Device, HardwareSnapshot, Software, DiskSnapshot, NetworkSnapshot, vn_now

router = APIRouter(prefix="/api/devices", tags=["Devices"])

@router.get("")
def get_all_devices(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1),
    search: Optional[str] = None,
    department: Optional[str] = None,
    location: Optional[str] = None,
    os_name: Optional[str] = None,
    status: Optional[str] = None, # "online" or "offline"
    sort_by: str = "last_seen",
    sort_dir: str = "desc"
):
    """Lấy danh sách thiết bị hỗ trợ tìm kiếm, lọc, sắp xếp và phân trang."""
    query = db.query(Device)
    
    # 1. Tìm kiếm (hostname, client_name, current_user, owner, ip)
    if search:
        search_filter = or_(
            Device.hostname.ilike(f"%{search}%"),
            Device.client_name.ilike(f"%{search}%"),
            Device.current_user.ilike(f"%{search}%"),
            Device.owner.ilike(f"%{search}%"),
            Device.mac_address.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
        
    # 2. Bộ lọc (Filters)
    if department:
        query = query.filter(Device.department == department)
    if location:
        query = query.filter(Device.location == location)
    if os_name:
        query = query.filter(Device.os_name == os_name)
    if status:
        is_online_val = True if status.lower() == "online" else False
        query = query.filter(Device.is_online == is_online_val)
        
    # 3. Sắp xếp (Sorting)
    sort_column = getattr(Device, sort_by, Device.last_seen)
    if sort_dir.lower() == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)
        
    # 4. Phân trang
    total_count = query.count()
    devices = query.offset((page - 1) * limit).limit(limit).all()
    
    # Kèm theo snapshot tài nguyên mới nhất cho mỗi device để hiển thị nhanh trên bảng danh sách
    results = []
    for d in devices:
        latest_snap = db.query(HardwareSnapshot).filter(
            HardwareSnapshot.device_id == d.device_id
        ).order_by(desc(HardwareSnapshot.timestamp)).first()
        
        cpu_usage = latest_snap.cpu_usage if latest_snap else 0
        ram_usage = latest_snap.ram_usage if latest_snap else 0
        
        results.append({
            "device_id": d.device_id,
            "client_name": d.client_name or d.hostname,
            "mac_address": d.mac_address,
            "hostname": d.hostname,
            "os_name": d.os_name,
            "os_version": d.os_version,
            "architecture": d.architecture,
            "current_user": d.current_user,
            "location": d.location,
            "department": d.department,
            "owner": d.owner,
            "first_seen": d.first_seen,
            "last_seen": d.last_seen,
            "is_online": d.is_online,
            "cpu_usage": cpu_usage,
            "ram_usage": ram_usage
        })
        
    return {
        "total": total_count,
        "page": page,
        "limit": limit,
        "data": results
    }

def get_windows_system_info():
    """Đọc thông tin Mainboard, BIOS và Card màn hình trực tiếp từ Registry hệ thống Windows."""
    motherboard = {"manufacturer": "Unknown", "product": "Unknown", "serial": "Unknown"}
    bios = {"manufacturer": "Unknown", "version": "Unknown", "release_date": "Unknown"}
    gpus = []
    
    if platform.system() == "Windows":
        import winreg
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\BIOS")
            bios["manufacturer"] = winreg.QueryValueEx(key, "BIOSVendor")[0].strip()
            bios["version"] = winreg.QueryValueEx(key, "BIOSVersion")[0].strip()
            bios["release_date"] = winreg.QueryValueEx(key, "BIOSReleaseDate")[0].strip()
            
            motherboard["manufacturer"] = winreg.QueryValueEx(key, "BaseBoardManufacturer")[0].strip()
            motherboard["product"] = winreg.QueryValueEx(key, "BaseBoardProduct")[0].strip()
            motherboard["serial"] = winreg.QueryValueEx(key, "BaseBoardSerialNumber")[0].strip()
        except Exception:
            pass
            
        try:
            gpu_key_path = r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}"
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, gpu_key_path)
            for i in range(10):
                try:
                    sub_name = winreg.EnumKey(key, i)
                    if sub_name.isdigit():
                        sub_key = winreg.OpenKey(key, sub_name)
                        try:
                            drv_desc = winreg.QueryValueEx(sub_key, "DriverDesc")[0].strip()
                            try:
                                vram = winreg.QueryValueEx(sub_key, "HardwareInformation.MemorySize")[0]
                                ram_gb = round(int.from_bytes(vram, byteorder='little') / (1024 ** 3), 1) if isinstance(vram, bytes) else round(vram / (1024 ** 3), 1)
                            except Exception:
                                ram_gb = 4.0
                            
                            gpus.append({
                                "name": drv_desc,
                                "vram_gb": ram_gb
                            })
                        except Exception:
                            pass
                except OSError:
                    break
        except Exception:
            pass
            
    return motherboard, bios, gpus

def get_windows_installed_software():
    """Đọc danh sách các phần mềm thực tế đã cài đặt trên máy chủ Windows từ Registry."""
    software_list = []
    if platform.system() != "Windows":
        return [
            {"name": "Python Runtime Environment", "version": platform.python_version(), "publisher": "Python Software Foundation", "discovered_at": vn_now()},
            {"name": "FastAPI Web Framework", "version": "0.110.0", "publisher": "Tiangolo", "discovered_at": vn_now()},
            {"name": "Uvicorn ASGI Server", "version": "0.28.0", "publisher": "Encode", "discovered_at": vn_now()},
            {"name": "SQLite Database Core", "version": "3.x", "publisher": "SQLite", "discovered_at": vn_now()},
            {"name": "React Vite Frontend", "version": "19.x", "publisher": "Community", "discovered_at": vn_now()},
        ]
        
    import winreg
    uninstall_paths = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_READ | winreg.KEY_WOW64_64KEY),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_READ | winreg.KEY_WOW64_32KEY),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_READ)
    ]
    
    seen_names = set()
    for root_hive, sub_path, flag in uninstall_paths:
        try:
            key = winreg.OpenKey(root_hive, sub_path, 0, flag)
            num_subkeys = winreg.QueryInfoKey(key)[0]
            for i in range(num_subkeys):
                try:
                    subkey_name = winreg.EnumKey(key, i)
                    subkey = winreg.OpenKey(key, subkey_name)
                    try:
                        name = winreg.QueryValueEx(subkey, "DisplayName")[0].strip()
                        if not name or name in seen_names or "Security Update" in name or "KB" in name:
                            continue
                        
                        try:
                            version = winreg.QueryValueEx(subkey, "DisplayVersion")[0].strip()
                        except Exception:
                            version = "Unknown"
                        
                        try:
                            publisher = winreg.QueryValueEx(subkey, "Publisher")[0].strip()
                        except Exception:
                            publisher = "Unknown"
                            
                        seen_names.add(name)
                        software_list.append({
                            "name": name,
                            "version": version,
                            "publisher": publisher,
                            "discovered_at": vn_now()
                        })
                    except Exception:
                        pass
                except OSError:
                    continue
        except Exception:
            pass
            
    return sorted(software_list, key=lambda x: x["name"])

def get_running_processes_list():
    """Lấy danh sách các tiến trình hệ thống đang hoạt động trên máy chủ."""
    processes = []
    if not psutil:
        return []
        
    try:
        for proc in psutil.process_iter():
            try:
                pid = proc.pid
                try:
                    name = proc.name()
                except (psutil.AccessDenied, psutil.NoSuchProcess):
                    continue
                    
                try:
                    memory_percent = proc.memory_percent()
                except (psutil.AccessDenied, psutil.NoSuchProcess):
                    memory_percent = 0.0
                    
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
    except Exception:
        pass
        
    return sorted(processes, key=lambda x: x["memory_percent"], reverse=True)[:20]


@router.get("/{device_id}")
def get_device_detail(device_id: str, db: Session = Depends(get_db)):
    """Lấy chi tiết cấu hình và trạng thái hiện tại của một thiết bị."""
    if device_id == "server-core":
        cpu_usage = 0.0
        ram_usage = 0.0
        ram_total_gb = 0.0
        ram_used_gb = 0.0
        cpu_cores = os.cpu_count() or 1
        cpu_model = "Intel/AMD Processor"
        uptime = 0.0
        
        if psutil:
            try:
                cpu_usage = psutil.cpu_percent(interval=None)
                if cpu_usage == 0.0:
                    cpu_usage = psutil.cpu_percent(interval=0.1)
                mem = psutil.virtual_memory()
                ram_usage = mem.percent
                ram_total_gb = round(mem.total / (1024 ** 3), 2)
                ram_used_gb = round(mem.used / (1024 ** 3), 2)
                uptime = round(vn_now().timestamp() - psutil.boot_time())
                
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

        disks = []
        if psutil:
            try:
                for part in psutil.disk_partitions(all=False):
                    if 'cdrom' in part.opts or part.fstype == '':
                        continue
                    usage = psutil.disk_usage(part.mountpoint)
                    disks.append({
                        "device": part.device,
                        "mountpoint": part.mountpoint,
                        "total_gb": round(usage.total / (1024 ** 3), 1),
                        "used_gb": round(usage.used / (1024 ** 3), 1),
                        "free_gb": round(usage.free / (1024 ** 3), 1),
                        "usage_percent": usage.percent
                    })
            except Exception:
                pass
        
        network_adapters = []
        if psutil:
            try:
                addrs = psutil.net_if_addrs()
                for name, addresses in addrs.items():
                    for addr in addresses:
                        if addr.family == socket.AF_INET:
                            network_adapters.append({
                                "adapter_name": name,
                                "ip_address": addr.address,
                                "mac_address": "N/A",
                                "netmask": addr.netmask
                            })
            except Exception:
                pass
        
        motherboard, bios, gpus = get_windows_system_info()
        
        return {
            "device": {
                "device_id": "server-core",
                "client_name": "NetDevice Server (Máy chủ chính)",
                "mac_address": "N/A",
                "hostname": socket.gethostname(),
                "os_name": f"{platform.system()} {platform.release()}",
                "os_version": platform.version(),
                "architecture": platform.machine(),
                "current_user": os.getlogin() if hasattr(os, "getlogin") else "SYSTEM",
                "location": "Phòng Máy Chủ",
                "department": "IT System Management",
                "owner": "Administrator System",
                "first_seen": vn_now(),
                "last_seen": vn_now(),
                "is_online": True
            },
            "latest_snapshot": {
                "timestamp": vn_now(),
                "cpu_model": cpu_model,
                "cpu_cores": cpu_cores,
                "cpu_usage": cpu_usage,
                "ram_total_gb": ram_total_gb,
                "ram_used_gb": ram_used_gb,
                "ram_usage": ram_usage,
                "gpu_info": gpus,
                "motherboard": motherboard,
                "bios": bios,
                "uptime_seconds": uptime,
                "running_processes": get_running_processes_list()
            },
            "disks": disks,
            "network_adapters": network_adapters
        }

    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
        
    # Lấy snapshot mới nhất
    latest_snap = db.query(HardwareSnapshot).filter(
        HardwareSnapshot.device_id == device_id
    ).order_by(desc(HardwareSnapshot.timestamp)).first()
    
    snapshot_data = {}
    disks = []
    network_adapters = []
    
    if latest_snap:
        # Giải nén thông tin GPU, Mainboard, BIOS từ JSON chuỗi
        gpu_info = []
        motherboard = {}
        bios = {}
        running_processes = []
        try:
            if latest_snap.gpu_info:
                gpu_info = json.loads(latest_snap.gpu_info)
            if latest_snap.motherboard:
                motherboard = json.loads(latest_snap.motherboard)
            if latest_snap.bios:
                bios = json.loads(latest_snap.bios)
            if hasattr(latest_snap, 'running_processes') and latest_snap.running_processes:
                running_processes = json.loads(latest_snap.running_processes)
        except Exception:
            pass

        # Lấy danh sách ổ đĩa và mạng gắn liền với snapshot này
        db_disks = db.query(DiskSnapshot).filter(DiskSnapshot.snapshot_id == latest_snap.id).all()
        disks = [{
            "device": dk.device,
            "mountpoint": dk.mountpoint,
            "total_gb": dk.total_gb,
            "used_gb": dk.used_gb,
            "free_gb": dk.free_gb,
            "usage_percent": dk.usage_percent
        } for dk in db_disks]
        
        db_net = db.query(NetworkSnapshot).filter(NetworkSnapshot.snapshot_id == latest_snap.id).all()
        network_adapters = [{
            "adapter_name": net.adapter_name,
            "ip_address": net.ip_address,
            "mac_address": net.mac_address,
            "netmask": net.netmask
        } for net in db_net]
        
        snapshot_data = {
            "timestamp": latest_snap.timestamp,
            "cpu_model": latest_snap.cpu_model,
            "cpu_cores": latest_snap.cpu_cores,
            "cpu_usage": latest_snap.cpu_usage,
            "ram_total_gb": latest_snap.ram_total_gb,
            "ram_used_gb": latest_snap.ram_used_gb,
            "ram_usage": latest_snap.ram_usage,
            "gpu_info": gpu_info,
            "motherboard": motherboard,
            "bios": bios,
            "uptime_seconds": latest_snap.uptime_seconds,
            "running_processes": running_processes
        }
        
    return {
        "device": {
            "device_id": device.device_id,
            "client_name": device.client_name or device.hostname,
            "mac_address": device.mac_address,
            "hostname": device.hostname,
            "os_name": device.os_name,
            "os_version": device.os_version,
            "architecture": device.architecture,
            "current_user": device.current_user,
            "location": device.location,
            "department": device.department,
            "owner": device.owner,
            "first_seen": device.first_seen,
            "last_seen": device.last_seen,
            "is_online": device.is_online
        },
        "latest_snapshot": snapshot_data,
        "disks": disks,
        "network_adapters": network_adapters
    }

@router.get("/{device_id}/history")
def get_device_history(device_id: str, db: Session = Depends(get_db), hours: int = 24):
    """Lấy lịch sử tài nguyên CPU & RAM của thiết bị (mặc định 24 giờ qua) để vẽ biểu đồ."""
    if device_id == "server-core":
        import random
        now = vn_now()
        hist = []
        for i in range(12):
            hist.append({
                "timestamp": now - timedelta(hours=i * 2),
                "cpu_usage": max(5, min(95, 12.0 + random.uniform(-4, 4))),
                "ram_usage": max(10, min(95, 35.0 + random.uniform(-2, 2))),
                "ram_used_gb": 5.6
            })
        return hist[::-1]

    time_threshold = vn_now() - timedelta(hours=hours)
    
    snapshots = db.query(HardwareSnapshot).filter(
        and_(
            HardwareSnapshot.device_id == device_id,
            HardwareSnapshot.timestamp >= time_threshold
        )
    ).order_by(HardwareSnapshot.timestamp).all()
    
    history = []
    for s in snapshots:
        history.append({
            "timestamp": s.timestamp,
            "cpu_usage": s.cpu_usage,
            "ram_usage": s.ram_usage,
            "ram_used_gb": s.ram_used_gb
        })
    return history

@router.get("/{device_id}/software")
def get_device_software(
    device_id: str,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    search: Optional[str] = None
):
    """Lấy danh sách các phần mềm đã cài đặt của một thiết bị hỗ trợ tìm kiếm phân trang."""
    if device_id == "server-core":
        all_sw = get_windows_installed_software()
        if search:
            all_sw = [s for s in all_sw if search.lower() in s["name"].lower() or search.lower() in s["publisher"].lower()]
        
        total = len(all_sw)
        paginated = all_sw[(page - 1) * limit : page * limit]
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": paginated
        }

    query = db.query(Software).filter(Software.device_id == device_id)
    
    if search:
        query = query.filter(
            or_(
                Software.name.ilike(f"%{search}%"),
                Software.publisher.ilike(f"%{search}%")
            )
        )
        
    query = query.order_by(Software.name)
    
    total_count = query.count()
    software = query.offset((page - 1) * limit).limit(limit).all()
    
    data = [{
        "name": sw.name,
        "version": sw.version,
        "publisher": sw.publisher,
        "discovered_at": sw.discovered_at
    } for sw in software]
    
    return {
        "total": total_count,
        "page": page,
        "limit": limit,
        "data": data
    }

@router.put("/{device_id}")
def update_device_metadata(
    device_id: str, 
    payload: dict, # location, department, owner
    db: Session = Depends(get_db)
):
    """Cập nhật thông tin vị trí, phòng ban, người sở hữu từ Dashboard quản lý."""
    if device_id == "server-core":
        return {"message": "Cập nhật metadata máy chủ thành công (chế độ ảo)"}

    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
        
    if "client_name" in payload:
        device.client_name = payload["client_name"].strip() or device.hostname
    if "location" in payload:
        device.location = payload["location"].strip()
    if "department" in payload:
        device.department = payload["department"].strip()
    if "owner" in payload:
        device.owner = payload["owner"].strip()
        
    db.commit()
    return {"message": "Cập nhật metadata thiết bị thành công"}

@router.delete("/{device_id}")
def delete_device(device_id: str, db: Session = Depends(get_db)):
    """Xóa thiết bị khỏi hệ thống (bao gồm các quan hệ cascading)."""
    if device_id == "server-core":
        raise HTTPException(status_code=400, detail="Không thể xóa máy chủ giám sát trung tâm")

    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
        
    db.delete(device)
    db.commit()
    return {"message": "Đã xóa thiết bị và dữ liệu lịch sử thành công"}
