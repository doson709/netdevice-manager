import os
import json
import asyncio
import threading
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import engine, Base, get_db, SessionLocal
from models import Device, HardwareSnapshot, DiskSnapshot, Software, NetworkSnapshot, ReportPayload
from routes import devices, dashboard, reports

# Khởi tạo bảng cơ sở dữ liệu nếu chưa tồn tại
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NetDevice Manager API",
    description="Backend quản lý, giám sát thiết bị máy tính tập trung trong mạng nội bộ.",
    version="1.0.0"
)

# Cấu hình CORS để cho phép Frontend React gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Mạng nội bộ cho phép truy cập rộng
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cấu hình mã khóa token bảo mật phía server (Đọc từ ENV hoặc mặc định)
SECRET_TOKEN = os.environ.get("NETDEVICE_SECRET_TOKEN", "secure-intranet-token-123")

# Đăng ký các router nhánh
app.include_router(devices.router)
app.include_router(dashboard.router)
app.include_router(reports.router)

# =====================================================================
#                        API GỬI BÁO CÁO CỦA AGENT
# =====================================================================

@app.post("/api/report")
def receive_agent_report(
    payload: ReportPayload, 
    x_api_key: str = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db)
):
    """Endpoint nhận báo cáo định kỳ từ Client Agent (Có xác thực API Key)."""
    
    # 1. Xác thực Token bảo mật
    if not x_api_key or x_api_key != SECRET_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mã xác thực API Key không hợp lệ"
        )
        
    try:
        now = datetime.utcnow()
        
        # 2. Xử lý ghi nhận thiết bị (Devices)
        device = db.query(Device).filter(Device.device_id == payload.device_id).first()
        if not device:
            # Tạo mới thiết bị
            device = Device(
                device_id=payload.device_id,
                mac_address=payload.mac_address,
                hostname=payload.hostname,
                os_name=payload.os_name,
                os_version=payload.os_version,
                architecture=payload.architecture,
                current_user=payload.current_user,
                location=payload.location,
                department=payload.department,
                owner=payload.owner,
                first_seen=now,
                last_seen=now,
                is_online=True
            )
            db.add(device)
        else:
            # Cập nhật thông số động
            device.mac_address = payload.mac_address
            device.hostname = payload.hostname
            device.os_name = payload.os_name
            device.os_version = payload.os_version
            device.architecture = payload.architecture
            device.current_user = payload.current_user
            device.last_seen = now
            device.is_online = True
            
            # Cập nhật metadata nếu agent gửi cấu hình mới
            if payload.location:
                device.location = payload.location
            if payload.department:
                device.department = payload.department
            if payload.owner:
                device.owner = payload.owner
                
        db.flush() # Lấy ID/xác nhận thay đổi để ràng buộc khóa ngoại
        
        # 3. Ghi Snapshot tài nguyên phần cứng (HardwareSnapshot)
        gpu_json = json.dumps([g.dict() for g in payload.gpu_info], ensure_ascii=False)
        board_json = json.dumps(payload.motherboard.dict(), ensure_ascii=False)
        bios_json = json.dumps(payload.bios.dict(), ensure_ascii=False)
        proc_json = json.dumps([p.dict() for p in payload.processes], ensure_ascii=False)
        
        snapshot = HardwareSnapshot(
            device_id=payload.device_id,
            timestamp=now,
            cpu_model=payload.cpu_model,
            cpu_cores=payload.cpu_cores,
            cpu_usage=payload.cpu_usage,
            ram_total_gb=payload.ram_total_gb,
            ram_used_gb=payload.ram_used_gb,
            ram_usage=payload.ram_usage,
            gpu_info=gpu_json,
            motherboard=board_json,
            bios=bios_json,
            uptime_seconds=payload.uptime_seconds,
            running_processes=proc_json
        )
        db.add(snapshot)
        db.flush() # Lấy snapshot.id để tạo Disk & Network snaps
        
        # 4. Ghi thông số ổ đĩa chi tiết (DiskSnapshots)
        for dk in payload.disks:
            disk_snap = DiskSnapshot(
                snapshot_id=snapshot.id,
                device=dk.device,
                mountpoint=dk.mountpoint,
                total_gb=dk.total_gb,
                used_gb=dk.used_gb,
                free_gb=dk.free_gb,
                usage_percent=dk.usage_percent
            )
            db.add(disk_snap)
            
        # 5. Ghi thông số mạng chi tiết (NetworkSnapshots)
        for net in payload.network_adapters:
            net_snap = NetworkSnapshot(
                snapshot_id=snapshot.id,
                device_id=payload.device_id,
                adapter_name=net.adapter_name,
                ip_address=net.ip_address,
                mac_address=net.mac_address,
                netmask=net.netmask
            )
            db.add(net_snap)
            
        # 6. Đồng bộ tối ưu danh sách phần mềm (Software - Cơ chế UPSERT hiệu năng cao)
        # Truy vấn các phần mềm hiện đang lưu của thiết bị này
        db_softwares = db.query(Software).filter(Software.device_id == payload.device_id).all()
        db_sw_dict = {sw.name: sw for sw in db_softwares}
        
        incoming_sw_names = set()
        
        for sw in payload.software:
            sw_name = sw.name.strip()
            incoming_sw_names.add(sw_name)
            
            if sw_name in db_sw_dict:
                # Nếu tồn tại rồi -> Cập nhật version/publisher nếu có thay đổi
                existing_sw = db_sw_dict[sw_name]
                if existing_sw.version != sw.version or existing_sw.publisher != sw.publisher:
                    existing_sw.version = sw.version
                    existing_sw.publisher = sw.publisher
            else:
                # Nếu chưa tồn tại -> Thêm mới phần mềm
                new_sw = Software(
                    device_id=payload.device_id,
                    name=sw_name,
                    version=sw.version,
                    publisher=sw.publisher,
                    discovered_at=now
                )
                db.add(new_sw)
                
        # Xóa các phần mềm cũ không còn tồn tại trên máy client (đã uninstall)
        for sw_name, existing_sw in db_sw_dict.items():
            if sw_name not in incoming_sw_names:
                db.delete(existing_sw)
                
        db.commit()
        return {"status": "success", "message": "Báo cáo dữ liệu hoàn tất!"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi ghi dữ liệu: {e}"
        )

# =====================================================================
#             CÁC NHIỆM VỤ CHẠY NGẦM (BACKGROUND TASKS)
# =====================================================================

# Biến cờ kiểm soát vòng lặp nền
shutdown_event = threading.Event()

def background_agent_status_monitor():
    """Vòng lặp giám sát: Phát hiện máy offline (quá 5 phút không báo cáo)."""
    while not shutdown_event.is_set():
        try:
            db = SessionLocal()
            five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
            
            # Quét các thiết bị online nhưng thời gian báo cáo cuối vượt quá 5 phút
            stale_devices = db.query(Device).filter(
                (Device.is_online == True) & 
                (Device.last_seen < five_minutes_ago)
            ).all()
            
            if stale_devices:
                for d in stale_devices:
                    d.is_online = False
                    print(f"[MONITOR] Thiet bi {d.hostname} ({d.device_id}) mat tin hieu -> Chuyen sang Offline")
                db.commit()
        except Exception as e:
            print(f"[MONITOR ERROR] Loi vong lap quet trang thai: {e}")
        finally:
            db.close()
            
        # Nghỉ 60 giây trước chu kỳ tiếp theo
        shutdown_event.wait(timeout=60)

def background_db_cleanup_task():
    """Vòng lặp dọn dẹp: Xóa bỏ dữ liệu snapshot quá 30 ngày để chống phình ổ đĩa."""
    while not shutdown_event.is_set():
        try:
            db = SessionLocal()
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            
            # Xóa các snapshots cũ (quan hệ cascading sẽ tự xóa disk & network snaps)
            deleted_count = db.query(HardwareSnapshot).filter(
                HardwareSnapshot.timestamp < thirty_days_ago
            ).delete(synchronize_session=False)
            
            if deleted_count > 0:
                db.commit()
                print(f"[CLEANUP] Da xoa thanh cong {deleted_count} ban ghi snapshots cu hon 30 ngay.")
        except Exception as e:
            print(f"[CLEANUP ERROR] Loi vong lap don dep: {e}")
        finally:
            db.close()
            
        # Chạy dọn dẹp mỗi 12 tiếng một lần
        shutdown_event.wait(timeout=12 * 3600)

@app.on_event("startup")
def startup_event():
    """Khởi động các tiến trình chạy ngầm khi Server khởi chạy."""
    monitor_thread = threading.Thread(target=background_agent_status_monitor, daemon=True)
    cleanup_thread = threading.Thread(target=background_db_cleanup_task, daemon=True)
    
    monitor_thread.start()
    cleanup_thread.start()
    print("=== Khoi dong cac tien trinh giam sat chay ngam ===")

@app.on_event("shutdown")
def shutdown_event_handler():
    """Dừng các tiến trình chạy ngầm một cách an toàn."""
    shutdown_event.set()
    print("=== Dung tien trinh chay ngam an toan ===")

@app.get("/")
def read_root():
    return {
        "message": "Chào mừng đến với NetDevice Manager Server!",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    # Khởi chạy server tại cổng 8085 (tránh xung đột với httpd cổng 8080)
    uvicorn.run("main:app", host="0.0.0.0", port=8085, reload=False)
