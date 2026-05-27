@echo off
title NetDevice Manager - Server Launcher
echo =======================================================
echo     NetDevice Manager Server - Khoi chay He thong
echo =======================================================
echo.

:: 1. Chay Backend FastAPI
echo [+] Dang khoi chay Backend FastAPI (Port 8085)...
start "NetDevice_Backend" cmd /k "cd /d "%~dp0server" && venv\Scripts\python main.py"

:: Doi 2 giay cho backend khoi dong
timeout /t 2 /nobreak >nul

:: 2. Chay Frontend Vite
echo [+] Dang khoi chay Frontend Vite React (Port 5173)...
start "NetDevice_Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Doi 3 giay cho Vite san sang
timeout /t 3 /nobreak >nul

:: 3. Tu dong mo trinh duyet
echo [+] Dang mo trinh duyet truy cap Dashboard...
start http://localhost:5173

echo.
echo =======================================================
echo [SUCCESS] He thong da duoc khoi chay!
echo - Backend: http://localhost:8085
echo - Frontend: http://localhost:5173
echo.
echo De dung he thong, vui long chay file "server_stop.bat"
echo =======================================================
echo.
