@echo off
title NetDevice Server Tray Launcher
cd /d "%~dp0"

echo Dang khoi dong khay he thong NetDevice...

if exist ..\venv\Scripts\pythonw.exe (
    start "" ..\venv\Scripts\pythonw.exe server_tray.py
) else (
    start "" pythonw server_tray.py
)

exit
