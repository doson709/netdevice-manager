from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from pydantic import BaseModel

from .database import Base

# =====================================================================
#                      SQLALCHEMY ORM MODELS
# =====================================================================

class Device(Base):
    __tablename__ = "devices"

    device_id = Column(String, primary_key=True, index=True) # UUID định danh thiết bị
    mac_address = Column(String)
    hostname = Column(String, index=True)
    os_name = Column(String)
    os_version = Column(String)
    architecture = Column(String)
    current_user = Column(String)
    location = Column(String, index=True)
    department = Column(String, index=True)
    owner = Column(String, index=True)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    is_online = Column(Boolean, default=True)

    # Quan hệ
    hardware_snapshots = relationship("HardwareSnapshot", back_populates="device", cascade="all, delete-orphan")
    installed_software = relationship("Software", back_populates="device", cascade="all, delete-orphan")

class HardwareSnapshot(Base):
    __tablename__ = "hardware_snapshots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_id = Column(String, ForeignKey("devices.device_id", ondelete="CASCADE"), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    cpu_model = Column(String)
    cpu_cores = Column(Integer)
    cpu_usage = Column(Float)
    ram_total_gb = Column(Float)
    ram_used_gb = Column(Float)
    ram_usage = Column(Float)
    gpu_info = Column(String)          # Chuỗi JSON lưu trữ GPU list
    motherboard = Column(String)       # Chuỗi JSON lưu trữ Motherboard dict
    bios = Column(String)              # Chuỗi JSON lưu trữ BIOS dict
    uptime_seconds = Column(Float)

    # Quan hệ
    device = relationship("Device", back_populates="hardware_snapshots")
    disks = relationship("DiskSnapshot", back_populates="snapshot", cascade="all, delete-orphan")
    network_adapters = relationship("NetworkSnapshot", back_populates="snapshot", cascade="all, delete-orphan")

class DiskSnapshot(Base):
    __tablename__ = "disk_snapshots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    snapshot_id = Column(Integer, ForeignKey("hardware_snapshots.id", ondelete="CASCADE"), index=True)
    device = Column(String)
    mountpoint = Column(String)
    total_gb = Column(Float)
    used_gb = Column(Float)
    free_gb = Column(Float)
    usage_percent = Column(Float)

    # Quan hệ
    snapshot = relationship("HardwareSnapshot", back_populates="disks")

class Software(Base):
    __tablename__ = "software"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_id = Column(String, ForeignKey("devices.device_id", ondelete="CASCADE"), index=True)
    name = Column(String, index=True)
    version = Column(String)
    publisher = Column(String)
    discovered_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("device_id", "name", name="uq_device_software"),
    )

    # Quan hệ
    device = relationship("Device", back_populates="installed_software")

class NetworkSnapshot(Base):
    __tablename__ = "network_snapshots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    snapshot_id = Column(Integer, ForeignKey("hardware_snapshots.id", ondelete="CASCADE"), index=True)
    device_id = Column(String)
    adapter_name = Column(String)
    ip_address = Column(String, index=True)
    mac_address = Column(String)
    netmask = Column(String)

    # Quan hệ
    snapshot = relationship("HardwareSnapshot", back_populates="network_adapters")


# =====================================================================
#                        PYDANTIC SCHEMAS
# =====================================================================

class DiskInfoSchema(BaseModel):
    device: str
    mountpoint: str
    total_gb: float
    used_gb: float
    free_gb: float
    usage_percent: float

class NetworkAdapterSchema(BaseModel):
    adapter_name: str
    ip_address: str
    mac_address: str
    netmask: str

class GpuInfoSchema(BaseModel):
    name: str
    vram_gb: float
    driver_version: str

class MotherboardSchema(BaseModel):
    manufacturer: str
    product: str
    serial: str

class BiosSchema(BaseModel):
    manufacturer: str
    version: str
    release_date: str

class SoftwareSchema(BaseModel):
    name: str
    version: str
    publisher: str

class ProcessSchema(BaseModel):
    pid: int
    name: str
    memory_percent: float
    cpu_percent: float

class ReportPayload(BaseModel):
    device_id: str
    mac_address: str
    hostname: str
    os_name: str
    os_version: str
    architecture: str
    current_user: str
    location: str
    department: str
    owner: str
    uptime_seconds: float
    
    cpu_model: str
    cpu_cores: int
    cpu_usage: float
    ram_total_gb: float
    ram_used_gb: float
    ram_usage: float
    gpu_info: List[GpuInfoSchema]
    motherboard: MotherboardSchema
    bios: BiosSchema
    windows_activation: str
    
    disks: List[DiskInfoSchema]
    network_adapters: List[NetworkAdapterSchema]
    software: List[SoftwareSchema]
    processes: List[ProcessSchema]  # Mặc dù không ghi xuống DB toàn bộ processes nhưng dùng để hiển thị/ghi log nếu cần
