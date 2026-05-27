@echo off
title NetDevice Manager - Server Uninstaller
echo =======================================================
echo     NetDevice Manager Server - Go cai dat He thong
echo =======================================================
echo.

echo [+] Dang dung cac tien trinh cua Backend va Frontend...
taskkill /f /fi "WINDOWTITLE eq NetDevice_Backend*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq NetDevice_Frontend*" >nul 2>&1

:: Giai phong cac cong mang
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8085') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo.
set /p DEL_DB="1. Ban co muon xoa Co so du lieu lich su giam sat (netdevice.db)? (Y/N): "
if /i "%DEL_DB%"=="Y" (
    echo [+] Dang xoa SQLite database...
    del /f /q "%~dp0server\netdevice.db*" >nul 2>&1
    echo [+] Da xoa database thanh cong.
)

echo.
set /p DEL_VENV="2. Ban co muon xoa Moi truong ao Python (venv) va node_modules khong? (Y/N): "
if /i "%DEL_VENV%"=="Y" (
    echo [+] Dang xoa Python venv (Vui long cho giay lat)...
    rmdir /s /q "%~dp0server\venv" >nul 2>&1
    echo [+] Dang xoa node_modules Frontend (Vui long cho giay lat)...
    rmdir /s /q "%~dp0frontend\node_modules" >nul 2>&1
    echo [+] Da xoa cac thu muc dependencies.
)

echo.
echo =======================================================
echo [SUCCESS] Da go bo hoan toan cac dich vu Server!
echo =======================================================
echo.
pause
