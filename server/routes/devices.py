import json
from datetime import timedelta
from models import vn_now
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_

from database import get_db
from models import Device, HardwareSnapshot, Software, DiskSnapshot, NetworkSnapshot

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

@router.get("/{device_id}")
def get_device_detail(device_id: str, db: Session = Depends(get_db)):
    """Lấy chi tiết cấu hình và trạng thái hiện tại của một thiết bị."""
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
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Không tìm thấy thiết bị")
        
    db.delete(device)
    db.commit()
    return {"message": "Đã xóa thiết bị và dữ liệu lịch sử thành công"}
