@echo off
title NetDevice Manager - Server Setup
echo =======================================================
echo     NetDevice Manager Server - Cai dat He thong
echo =======================================================
echo.

:: 1. Setup Backend FastAPI
echo [+] Dang thiet lap Backend FastAPI...
cd /d "%~dp0server"
if not exist venv (
    echo [+] Dang tao moi truong ao Python (venv)...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Tao moi truong ao that bai! Vui long kiem tra Python da cai dat chua.
        pause
        exit /b 1
    )
)
echo [+] Dang cai dat dependencies vao venv...
venv\Scripts\pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Cai dat dependencies Backend that bai!
    pause
    exit /b 1
)
cd /d "%~dp0"

:: 2. Setup Frontend React
echo.
echo [+] Dang thiet lap Frontend React...
cd /d "%~dp0frontend"
echo [+] Dang cai dat cac thu vien Node.js (npm)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Cai dat dependencies Frontend that bai!
    echo [TIP] Vui long kiem tra xem da cai dat Node.js va npm chua.
    pause
    exit /b 1
)
cd /d "%~dp0"

echo.
echo =======================================================
echo [SUCCESS] Da thiet lap hoan tat ca Backend va Frontend!
echo Bay gio ban co the chay "server_run.bat" de bat dau.
echo =======================================================
echo.
pause
