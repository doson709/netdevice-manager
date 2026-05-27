@echo off
title NetDevice Manager Agent - Updater
echo =======================================================
echo     NetDevice Manager Agent - Tu dong Cap nhat
echo =======================================================
echo.

:: Kiem tra xem co phai la thu muc Git khong
if exist "%~dp0..\.git" (
    echo [+] Phat hien moi truong Git. Dang keo code moi tu repository...
    cd /d "%~dp0.."
    git pull
    cd /d "%~dp0"
) else (
    echo [+] Standalone Client. Dang tai phien ban Agent moi nhat tu GitHub...
    powershell -NoProfile -Command ^
        "echo '[+] Dang tai agent.py...';" ^
        "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/doson709/netdevice-manager/main/agent/agent.py' -OutFile '%~dp0agent.py' -TimeoutSec 15;" ^
        "echo '[+] Dang tai requirements.txt...';" ^
        "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/doson709/netdevice-manager/main/agent/requirements.txt' -OutFile '%~dp0requirements.txt' -TimeoutSec 15;"
)

echo.
echo [+] Dang tu dong kiem tra va nang cap dependencies...
pip install -r "%~dp0requirements.txt"

echo.
echo =======================================================
echo [SUCCESS] Da cap nhat phien ban Agent thanh cong!
echo =======================================================
echo.
pause
