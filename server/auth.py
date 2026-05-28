from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

security = HTTPBearer()

# Cấu hình tài khoản Admin (Đọc từ ENV hoặc sử dụng mặc định)
ADMIN_USERNAME = os.environ.get("NETDEVICE_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("NETDEVICE_ADMIN_PASSWORD", "Ngangiang2021")
ADMIN_TOKEN = os.environ.get("NETDEVICE_ADMIN_TOKEN", "admin-session-token-secure-123")

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
