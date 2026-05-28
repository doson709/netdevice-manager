import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_
from typing import Optional, List

from database import get_db
from models import Device, Software, HardwareSnapshot

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/software/search")
def search_global_software(
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1)
):
    """Tìm kiếm một phần mềm đã cài đặt HOẶC tiến trình đang chạy xem có trên những máy tính nào."""
    combined_results = []
    
    # 1. Tìm kiếm trong các phần mềm đã cài đặt (Registry Software)
    sw_q = db.query(Software, Device).join(Device, Software.device_id == Device.device_id).filter(
        or_(
            Software.name.ilike(f"%{query}%"),
            Software.publisher.ilike(f"%{query}%")
        )
    ).all()
    
    for sw, dev in sw_q:
        combined_results.append({
            "device_id": dev.device_id,
            "hostname": dev.hostname,
            "client_name": dev.client_name,
            "owner": dev.owner,
            "department": dev.department,
            "is_online": dev.is_online,
            "search_type": "software",
            "display_name": sw.name,
            "version": sw.version or "Unknown",
            "publisher": sw.publisher or "Unknown",
            "discovered_at": sw.discovered_at
        })
        
    # 2. Tìm kiếm trong các tiến trình đang hoạt động (Parsed JSON in HardwareSnapshots)
    try:
        subquery = db.query(
            HardwareSnapshot.device_id,
            func.max(HardwareSnapshot.timestamp).label("max_ts")
        ).group_by(HardwareSnapshot.device_id).subquery()
        
        latest_snapshots = db.query(HardwareSnapshot).join(
            subquery,
            and_(
                HardwareSnapshot.device_id == subquery.c.device_id,
                HardwareSnapshot.timestamp == subquery.c.max_ts
            )
        ).all()
        
        for snap in latest_snapshots:
            if not snap.running_processes:
                continue
            try:
                proc_list = json.loads(snap.running_processes)
            except Exception:
                continue
                
            for p in proc_list:
                p_name = p.get("name", "")
                if query.lower() in p_name.lower():
                    dev = db.query(Device).filter(Device.device_id == snap.device_id).first()
                    if dev:
                        combined_results.append({
                            "device_id": dev.device_id,
                            "hostname": dev.hostname,
                            "client_name": dev.client_name,
                            "owner": dev.owner,
                            "department": dev.department,
                            "is_online": dev.is_online,
                            "search_type": "process",
                            "display_name": p_name,
                            "version": f"PID: {p.get('pid', 0)} (Đang chạy)",
                            "publisher": f"Tải CPU: {p.get('cpu_percent', 0.0)}% | RAM: {p.get('memory_percent', 0.0)}%",
                            "discovered_at": snap.timestamp
                        })
    except Exception as e:
        print(f"[SEARCH ERROR] Loi tim kiem tien trinh: {e}")
        
    # Sắp xếp kết quả: phần mềm lên đầu, tiến trình ở dưới, hoặc theo bảng chữ cái của tên đối tượng phát hiện
    combined_results.sort(key=lambda x: (x["search_type"], x["display_name"].lower()))
    
    total = len(combined_results)
    
    # Thực hiện phân trang trong bộ nhớ
    paginated_data = combined_results[(page - 1) * limit : page * limit]
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "data": paginated_data
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
