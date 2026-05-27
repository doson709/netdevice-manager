@echo off
title NetDevice Manager Agent - Uninstaller
echo =======================================================
echo     NetDevice Manager Agent - Go cai dat Client
echo =======================================================
echo.

:: Kiem tra quyen Administrator
openfiles >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Vui long nhap chuot phai vao file uninstall.bat va chon "Run as Administrator"!
    echo.
    pause
    exit /b
)

echo [+] Dang dung va xoa tac vu tu dong chay ngam (Task Scheduler)...
schtasks /end /tn "NetDeviceAgent" >nul 2>&1
schtasks /delete /tn "NetDeviceAgent" /f >nul 2>&1
if %errorlevel% eq 0 (
    echo [+] Da xoa thanh cong Tac vu chay ngam "NetDeviceAgent" khoi Windows.
)

echo [+] Dang dong cac tien trinh Agent hoat dong...
taskkill /f /im pythonw.exe >nul 2>&1
for /f "tokens=2" %%i in ('tasklist /nh /fi "imagename eq python.exe" /v ^| findstr /i "agent.py"') do (
    taskkill /f /pid %%i >nul 2>&1
)

echo [+] Dang xoa cac thong tin lien quan trong Windows Registry...
reg delete "HKCU\Software\NetDeviceAgent" /f >nul 2>&1
if %errorlevel% eq 0 (
    echo [+] Da xoa sach ma dinh danh UUID trong Registry.
)

echo.
set /p DEL_CONF="Ban co muon xoa file cau hinh config.json khong? (Y/N): "
if /i "%DEL_CONF%"=="Y" (
    del /f /q "%~dp0config.json" >nul 2>&1
    echo [+] Da xoa file cau hinh config.json.
)

echo.
echo =======================================================
echo [SUCCESS] Da go bo hoan toan NetDevice Agent khoi may tinh!
echo =======================================================
echo.
pause
