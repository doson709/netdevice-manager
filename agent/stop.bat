@echo off
title NetDevice Manager Agent - Stopper
echo =======================================================
echo     NetDevice Manager Agent - Dung Giam sat
echo =======================================================
echo.

echo [+] Dang dung cac tien trinh Agent...

:: 1. Dung Task Scheduler chay ngam
schtasks /end /tn "NetDeviceAgent" >nul 2>&1
if %errorlevel% EQU 0 (
    echo [+] Da dung Tac vu chay ngam "NetDeviceAgent".
)

:: 2. Tat tien trinh pythonw.exe va python.exe chay agent.py
taskkill /f /fi "WINDOWTITLE eq NetDevice Manager Agent - Runner*" >nul 2>&1
taskkill /f /im pythonw.exe >nul 2>&1

:: Bo sung tim pid cu the cua agent.py va tat no
for /f "tokens=2" %%i in ('tasklist /nh /fi "imagename eq python.exe" /v ^| findstr /i "agent.py"') do (
    taskkill /f /pid %%i >nul 2>&1
)

echo.
echo =======================================================
echo [SUCCESS] Da dung toan bo tien trinh Agent Client!
echo =======================================================
echo.
pause
