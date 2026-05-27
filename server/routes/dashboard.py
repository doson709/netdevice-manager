from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Dict

from ..database import get_db
from ..models import Device, HardwareSnapshot, DiskSnapshot

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
    
    if online_ids:
        # Lấy snapshot mới nhất của mỗi máy online
        usages = []
        for d_id in online_ids:
            latest = db.query(HardwareSnapshot).filter(
                HardwareSnapshot.device_id == d_id
            ).order_by(desc(HardwareSnapshot.timestamp)).first()
            if latest:
                usages.append((latest.cpu_usage, latest.ram_usage))
                
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
    
    latest_snapshots = db.query(HardwareSnapshot.id, HardwareSnapshot.device_id).join(
        latest_snapshot_subquery,
        (HardwareSnapshot.device_id == latest_snapshot_subquery.c.device_id) &
        (HardwareSnapshot.timestamp == latest_snapshot_subquery.c.max_ts)
    ).all()
    
    snap_id_to_device = {s.id: s.device_id for s in latest_snapshots}
    snap_ids = [s.id for s in latest_snapshots]
    
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
                    "message": f"Ổ đĩa {d_disk.device} ({d_disk.mountpoint}) đã dùng {d_disk.usage_percent}%, còn trống {d_disk.free_gb} GB"
                })

    # Máy offline cảnh báo
    offline_devs = db.query(Device).filter(Device.is_online == False).order_by(desc(Device.last_seen)).limit(10).all()
    for dev in offline_devs:
        alerts.append({
            "type": "offline",
            "level": "info",
            "device_id": dev.device_id,
            "hostname": dev.hostname,
            "message": f"Thiết bị mất kết nối từ lúc {dev.last_seen.strftime('%Y-%m-%d %H:%M:%S')}"
        })

    return {
        "total_devices": total_devices,
        "online_devices": online_devices,
        "offline_devices": offline_devices,
        "avg_cpu_usage": avg_cpu,
        "avg_ram_usage": avg_ram,
        "departments": departments,
        "os_distribution": os_distribution,
        "alerts": alerts[:15] # Trả về top 15 cảnh báo mới nhất
    }
