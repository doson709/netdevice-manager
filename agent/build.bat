@echo off
setlocal enabledelayedexpansion
title NetDevice Agent - Build EXE

echo.
echo ==============================================================
echo    NETDEVICE MANAGER AGENT  -  DONG GOI THANH EXE
echo ==============================================================
echo.

:: Kiem tra Python
py --version >nul 2>&1
if !errorlevel! NEQ 0 (
    echo [LOI] Khong tim thay Python. Vui long cai Python 3.8+ va thu lai.
    pause
    exit /b 1
)

echo [1/4] Cai dat PyInstaller...
py -m pip install pyinstaller --quiet
if !errorlevel! NEQ 0 (
    echo [LOI] Khong the cai PyInstaller. Kiem tra pip va ket noi mang.
    pause
    exit /b 1
)
echo      OK

echo.
echo [2/4] Cai dat thu vien phu thuoc...
py -m pip install psutil==5.9.8 requests==2.31.0 --quiet
if !errorlevel! NEQ 0 (
    echo [CANH BAO] Co loi khi cai thu vien. Thu tiep tuc build...
)
echo      OK

echo.
echo [3/4] Dang dong goi agent.py thanh NetDeviceAgent.exe...
echo      (Co the mat 1-2 phut, vui long cho...)
py -m PyInstaller ^
    --onefile ^
    --noconsole ^
    --name NetDeviceAgent ^
    --hidden-import tkinter ^
    --hidden-import tkinter.messagebox ^
    --clean ^
    --noconfirm ^
    agent.py

if !errorlevel! NEQ 0 (
    echo.
    echo [LOI] Build that bai! Xem thong bao loi phia tren.
    pause
    exit /b 1
)

echo.
echo [4/4] Don dep file tam...
if exist "NetDeviceAgent.spec" del /f /q "NetDeviceAgent.spec"
if exist "build" rmdir /s /q "build"
echo      OK

echo.
echo ==============================================================
echo    BUILD THANH CONG!
echo ==============================================================
echo.
echo    File EXE : dist\NetDeviceAgent.exe
echo.
echo    Huong dan phan phoi cho may client:
echo    1. Copy file: dist\NetDeviceAgent.exe
echo    2. Chay tren may client - Wizard se hien de nhap thong tin va
echo       tich chon "Tu dong khoi dong cung Windows" (mac dinh bat).
echo    3. Tu lan 2 tro di: chay ngam tu dong hoan toan.
echo.
echo ==============================================================
echo.
pause
