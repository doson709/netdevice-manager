@echo off
title NetDevice Manager Agent Installer
echo =======================================================
echo     NetDevice Manager Agent - Bo cai dat tu dong
echo =======================================================
echo.

:: Kiem tra quyen Administrator
openfiles >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Vui long nhap chuot phai vao file install.bat va chon "Run as Administrator"!
    echo.
    pause
    exit /b
)

echo [+] Dang cai dat cac thu vien Python bat buoc...
pip install -r "%~dp0requirements.txt"
if %errorlevel% neq 0 (
    echo [WARNING] Co loi xay ra khi cai dat thu vien. Vui long kiem tra lai phien ban Python va pip.
)

echo.
echo =======================================================
echo                 CAU HINH THONG TIN CLIENT
echo =======================================================
set /p SERVER_URL="1. Nhap URL Server (mac dinh: http://localhost:8080): "
set /p TOKEN="2. Nhap Secret Token bao mat (mac dinh: secure-intranet-token-123): "
set /p LOC="3. Nhap vi tri lap dat (vi du: Phong IT, Tang 2): "
set /p DEP="4. Nhap ten phong ban (vi du: IT): "
set /p OWNER="5. Nhap ten nguoi su dung (vi du: Nguyen Van A): "

:: Dat gia tri mac dinh neu bo qua
if "%SERVER_URL%"=="" set SERVER_URL=http://localhost:8080
if "%TOKEN%"=="" set TOKEN=secure-intranet-token-123
if "%LOC%"=="" set LOC=Phong IT, Tang 2
if "%DEP%"=="" set DEP=IT
if "%OWNER%"=="" set OWNER=Nguyen Van A

:: Su dung PowerShell de cap nhat an toan file config.json
powershell -NoProfile -Command ^
    "$path = '%~dp0config.json';" ^
    "$json = Get-Content $path | ConvertFrom-Json;" ^
    "$json.server_url = '%SERVER_URL%';" ^
    "$json.secret_token = '%TOKEN%';" ^
    "$json.location = '%LOC%';" ^
    "$json.department = '%DEP%';" ^
    "$json.owner = '%OWNER%';" ^
    "$json | ConvertTo-Json -Depth 10 | Set-Content $path -Encoding UTF8"

echo.
echo [+] Da cap nhat file cau hinh config.json!
echo.

echo [+] Dang tao tac vu tu dong chay ngam cung Windows (Task Scheduler)...
schtasks /delete /tn "NetDeviceAgent" /f >nul 2>&1
schtasks /create /tn "NetDeviceAgent" /tr "pythonw.exe \"%~dp0agent.py\"" /sc onstart /ru SYSTEM /rl HIGHEST

if %errorlevel% eq 0 (
    echo.
    echo =======================================================
    echo [SUCCESS] Da cai dat va khoi tao Agent hoan tat!
    echo Tac vu da duoc dang ky chay ngam bang 'pythonw.exe' (SYSTEM)
    echo moi khi may tinh khoi dong (khong hien cua so đen).
    echo =======================================================
) else (
    echo [ERROR] Khong the dang ky Task Scheduler. Vui long thu lai bang quyen Admin.
)
echo.
pause
