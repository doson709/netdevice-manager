@echo off
title NetDevice Manager - Server Launcher
echo =======================================================
echo     NetDevice Manager Server - Khoi chay He thong
echo =======================================================
echo.

:: 1. Chay Backend FastAPI (Chay ngam, an hoan toan)
echo [+] Dang khoi chay Backend FastAPI (Port 8085) an...
powershell -NoProfile -Command "Start-Process -FilePath '%~dp0server\venv\Scripts\python.exe' -ArgumentList 'main.py' -WindowStyle Hidden -WorkingDirectory '%~dp0server'"

:: Doi 2 giay cho backend khoi dong
timeout /t 2 /nobreak >nul

:: 2. Chay Frontend Vite (Chay ngam, an hoan toan)
echo [+] Dang khoi chay Frontend Vite React (Port 5173) an...
powershell -NoProfile -Command "Start-Process -FilePath 'npm.cmd' -ArgumentList 'run dev' -WindowStyle Hidden -WorkingDirectory '%~dp0frontend'"

:: Doi 3 giay cho Vite san sang
timeout /t 3 /nobreak >nul

:: 3. Tu dong khoi chay Khay he thong (Tray Icon)
echo [+] Dang khoi chay Khay he thong NetDevice Tray...
if exist "%~dp0venv\Scripts\pythonw.exe" (
    start "" "%~dp0venv\Scripts\pythonw.exe" "%~dp0server\server_tray.py"
) else (
    start "" pythonw "%~dp0server\server_tray.py"
)

echo.
echo =======================================================
echo [SUCCESS] He thong da duoc khoi chay!
echo - Backend: http://localhost:8085
echo - Frontend: http://localhost:5173
echo.
echo De dung he thong, vui long chay file "server_stop.bat"
echo =======================================================
echo.
