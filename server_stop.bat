@echo off
title NetDevice Manager - Server Stopper
echo =======================================================
echo     NetDevice Manager Server - Dung He thong
echo =======================================================
echo.

echo [+] Dang dung cac tien trinh cua Backend va Frontend...

:: 1. Tat cac cua so console cmd tuong ung
taskkill /f /fi "WINDOWTITLE eq NetDevice_Backend*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq NetDevice_Frontend*" >nul 2>&1

:: 2. Tim va tat cac tien trinh dang chiem dung cong 8085 (Backend) va 5173 (Frontend)
echo [+] Dang giai phong cong mang 8085...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8085') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [+] Dang giai phong cong mang 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo =======================================================
echo [SUCCESS] Da dung toan bo he thong Server an toan!
echo =======================================================
echo.
pause
