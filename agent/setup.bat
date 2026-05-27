@echo off
title NetDevice Manager Agent - Setup
echo =======================================================
echo     NetDevice Manager Agent - Cai dat Client
echo =======================================================
echo.

:: Kiem tra quyen Administrator
openfiles >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Vui long nhap chuot phai vao file setup.bat va chon "Run as Administrator"!
    echo.
    pause
    exit /b
)

:: Goi truc tiep install.bat de cau hinh thong tin tuong tac
call "%~dp0install.bat"
