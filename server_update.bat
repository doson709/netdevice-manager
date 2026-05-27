@echo off
title NetDevice Manager - Server Updater
echo =======================================================
echo     NetDevice Manager Server - Tu dong Cap nhat
echo =======================================================
echo.

echo [+] Dang keo ma nguon moi nhat tu Git Repository...
git pull
if %errorlevel% NEQ 0 (
    echo [ERROR] Keo ma nguon that bai. Vui long kiem tra ket noi Git/Internet!
    pause
    exit /b 1
)

echo.
echo [+] Dang tu dong nang cap cac dependencies cua Backend...
cd /d "%~dp0server"
if exist venv (
    venv\Scripts\pip install -r requirements.txt
) else (
    echo [INFO] Chua khoi tao venv. Vui long chay server_setup.bat truoc.
)
cd /d "%~dp0"

echo.
echo [+] Dang tu dong nang cap cac dependencies cua Frontend...
cd /d "%~dp0frontend"
if exist node_modules (
    call npm install
) else (
    echo [INFO] Chua khoi tao node_modules. Vui long chay server_setup.bat truoc.
)
cd /d "%~dp0"

echo.
echo =======================================================
echo [SUCCESS] Da cap nhat he thong Server len phien ban moi nhat!
echo =======================================================
echo.
pause
