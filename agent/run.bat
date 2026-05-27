@echo off
title NetDevice Manager Agent - Runner
echo =======================================================
echo     NetDevice Manager Agent - Khoi chay Giam sat
echo =======================================================
echo.

:: 1. Kiem tra xem Task Scheduler co tac vu ngam khong, neu co thi kich hoat chay ngam
schtasks /run /tn "NetDeviceAgent" >nul 2>&1
if %errorlevel% EQU 0 (
    echo [+] Da kich hoat thanh cong Tac vu chay ngam "NetDeviceAgent" (SYSTEM).
) else (
    echo [WARNING] Tac vu chay ngam "NetDeviceAgent" chua duoc dang ky hoac chua co quyen Admin.
)

:: 2. Khoi chay hien thi dang Console de nguoi dung co the theo doi truc tiep logs
echo [+] Dang khoi chay console giam sat...
echo [Bam Ctrl+C de dung chay agent]
echo.
python "%~dp0agent.py"
pause
