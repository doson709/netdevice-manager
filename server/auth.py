from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dotenv import load_dotenv

# Tải cấu hình từ file .env
load_dotenv()

security = HTTPBearer()

# Cấu hình tài khoản Admin (Đọc từ ENV)
ADMIN_USERNAME = os.environ.get("NETDEVICE_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("NETDEVICE_ADMIN_PASSWORD", "")
ADMIN_TOKEN = os.environ.get("NETDEVICE_ADMIN_TOKEN", "")

def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Kiểm tra và xác thực Bearer token được đính kèm trong header Authorization."""
    token = credentials.credentials
    if token != ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên làm việc đã hết hạn hoặc mã xác thực không hợp lệ",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return "admin"
