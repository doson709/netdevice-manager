from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from typing import Optional, List

from ..database import get_db
from ..models import Device, Software

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/software/search")
def search_global_software(
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1)
):
    """Tìm kiếm một phần mềm cụ thể xem những máy tính nào đã cài đặt."""
    q = db.query(Software, Device).join(Device, Software.device_id == Device.device_id).filter(
        or_(
            Software.name.ilike(f"%{query}%"),
            Software.publisher.ilike(f"%{query}%")
        )
    )
    
    total = q.count()
    records = q.order_by(Software.name).offset((page - 1) * limit).limit(limit).all()
    
    data = []
    for sw, dev in records:
        data.append({
            "device_id": dev.device_id,
            "hostname": dev.hostname,
            "owner": dev.owner,
            "department": dev.department,
            "is_online": dev.is_online,
            "software_name": sw.name,
            "version": sw.version,
            "publisher": sw.publisher,
            "discovered_at": sw.discovered_at
        })
        
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "data": data
    }

@router.get("/software/top")
def get_top_installed_software(db: Session = Depends(get_db), limit: int = 15):
    """Lấy danh sách các phần mềm phổ biến nhất được cài đặt trong mạng nội bộ."""
    stats = db.query(
        Software.name,
        Software.publisher,
        func.count(Software.id).label("install_count")
    ).group_by(Software.name, Software.publisher).order_by(desc("install_count")).limit(limit).all()
    
    results = []
    for name, pub, count in stats:
        results.append({
            "name": name,
            "publisher": pub if pub else "Unknown",
            "count": count
        })
    return results

@router.get("/devices/export")
def get_export_data(db: Session = Depends(get_db)):
    """Lấy toàn bộ danh sách thiết bị đầy đủ cấu hình phục vụ cho việc xuất file Excel/CSV ở Frontend."""
    devices = db.query(Device).order_by(Device.hostname).all()
    results = []
    for d in devices:
        results.append({
            "ID Thiết bị (UUID)": d.device_id,
            "Tên máy": d.hostname,
            "Địa chỉ MAC": d.mac_address,
            "Hệ điều hành": d.os_name,
            "Phiên bản OS": d.os_version,
            "Kiến trúc": d.architecture,
            "User hiện tại": d.current_user,
            "Vị trí": d.location,
            "Phòng ban": d.department,
            "Người quản lý": d.owner,
            "Kích hoạt lần đầu": d.first_seen.strftime("%Y-%m-%d %H:%M:%S"),
            "Cập nhật cuối": d.last_seen.strftime("%Y-%m-%d %H:%M:%S"),
            "Trạng thái": "Online" if d.is_online else "Offline"
        })
    return results
