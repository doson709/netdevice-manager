@echo off
setlocal enabledelayedexpansion
title NetDevice Manager Agent - Setup
echo =======================================================
echo     NetDevice Manager Agent - Cai dat Client
echo =======================================================
echo.

:: Kiem tra quyen Administrator va tu dong nang quyen
openfiles >nul 2>&1
if !errorlevel! NEQ 0 (
    echo [+] Dang yeu cau quyen Administrator de cai dat...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
cd /d "%~dp0"


echo [+] Dang cai dat cac thu vien Python bat buoc...
pip install -r "%~dp0requirements.txt"
if !errorlevel! NEQ 0 (
    echo [WARNING] Co loi xay ra khi cai dat thu vien. Vui long kiem tra lai phien ban Python va pip.
)

echo.
echo =======================================================
echo                 CAU HINH THONG TIN CLIENT
echo =======================================================
set /p SERVER_URL="1. Nhap URL Server (vi du: http://192.168.1.100:8085): "
set /p TOKEN="2. Nhap Secret Token bao mat (mac dinh: secure-intranet-token-123): "
set /p LOC="3. Nhap vi tri lap dat (vi du: Phong IT, Tang 2): "
set /p DEP="4. Nhap ten phong ban (vi du: IT): "
set /p OWNER="5. Nhap ten nguoi su dung (vi du: Nguyen Van A): "

:: Dat gia tri mac dinh neu bo qua
if "!SERVER_URL!"=="" set SERVER_URL=http://localhost:8085
if "!TOKEN!"=="" set TOKEN=secure-intranet-token-123
if "!LOC!"=="" set LOC=Phong IT, Tang 2
if "!DEP!"=="" set DEP=IT
if "!OWNER!"=="" set OWNER=Nguyen Van A

:: Tu dong them http:// neu nguoi dung nhap thieu
powershell -NoProfile -Command "$u='%SERVER_URL%'; if ($u -notmatch '^https?://') { $u = 'http://' + $u }; Write-Output $u" > "%TEMP%\_url.txt"
set /p SERVER_URL=<"%TEMP%\_url.txt"
del "%TEMP%\_url.txt" >nul 2>&1

:: Su dung Python de tao va cap nhat file config.json thong qua bien moi truong de tranh loi ky tu dac biet, dau nhay va bao mat
set "ENV_SERVER_URL=%SERVER_URL%"
set "ENV_TOKEN=%TOKEN%"
set "ENV_LOC=%LOC%"
set "ENV_DEP=%DEP%"
set "ENV_OWNER=%OWNER%"

python -c "import json, os, winreg; path = r'%~dp0config.json'; k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\Microsoft\Cryptography'); guid, _ = winreg.QueryValueEx(k, 'MachineGuid'); winreg.CloseKey(k); data = json.load(open(path, 'r', encoding='utf-8-sig')) if os.path.exists(path) else {}; data.update({'device_uuid': guid.strip(), 'server_url': os.environ.get('ENV_SERVER_URL'), 'secret_token': os.environ.get('ENV_TOKEN'), 'location': os.environ.get('ENV_LOC'), 'department': os.environ.get('ENV_DEP'), 'owner': os.environ.get('ENV_OWNER'), 'report_interval': data.get('report_interval', 60)}); json.dump(data, open(path, 'w', encoding='utf-8'), indent=4, ensure_ascii=False)"

echo.
echo [+] Da cap nhat file cau hinh config.json!
echo.

echo [+] Dang tao tac vu tu dong chay ngam cung Windows (Task Scheduler)...
schtasks /delete /tn "NetDeviceAgent" /f >nul 2>&1

:: Tim duong dan tuyet doi cua pythonw.exe de bao dam SYSTEM account co the goi duoc
set PYTHONW_PATH=pythonw.exe
for /f "delims=" %%i in ('where pythonw.exe 2^>nul') do (
    set PYTHONW_PATH=%%i
)

schtasks /create /tn "NetDeviceAgent" /tr "\"!PYTHONW_PATH!\" \"%~dp0agent.py\"" /sc onstart /ru SYSTEM /rl HIGHEST

if !errorlevel! EQU 0 (
    echo [+] Dang kich hoat chay ngam Agent ngay lap tuc...
    schtasks /run /tn "NetDeviceAgent" >nul 2>&1
    echo.
    echo =======================================================
    echo [SUCCESS] Da cai dat va khoi tao Agent hoan tat!
    echo Tac vu da duoc dang ky tu dong chay ngam bang SYSTEM
    echo moi khi may tinh khoi dong [an hoan toan, khong hien cua so].
    echo Dac biet: Agent da duoc KICH HOAT CHAY NGAM NGAY LAP TUC!
    echo =======================================================
) else (
    echo [ERROR] Khong the dang ky Task Scheduler. Vui long thu lai bang quyen Admin.
)
echo.
pause
