@echo off
TITLE Goinfi-HR System Launcher
echo ==========================================================
echo        GOINFI-HR MANAGEMENT SYSTEM (NEXT.JS 15)
echo ==========================================================
echo [1/2] Starting Goinfi-HR Web Server (http://localhost:3000)...
start "Goinfi-HR Web App" cmd /c "npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Opening Goinfi-HR in your default browser...
start http://localhost:3000

echo.
echo ==========================================================
echo System is running!
echo Biometric Daemon can be launched from python-bridge\run_bridge.bat
echo ==========================================================
pause
