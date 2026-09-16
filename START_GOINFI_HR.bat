@echo off
TITLE Goinfi-HR System Launcher
echo ==========================================================
echo        GOINFI-HR MANAGEMENT SYSTEM (NEXT.JS 15)
echo ==========================================================
echo [1/2] Starting Goinfi-HR Web Server...
start "Goinfi-HR Web App" cmd /c "npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Opening Goinfi-HR in your browser...
start http://localhost:3000

echo.
echo ==========================================================
echo System is running!
echo URL: http://localhost:3000
echo Domain: http://ap1hr.goinfi.biz (Run SETUP_LOCAL_DOMAIN.bat once as Admin)
echo ==========================================================
pause
