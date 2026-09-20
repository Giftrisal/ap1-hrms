@echo off
TITLE AP1 Television HRMS - 24/7 Office Server
COLOR 0B
echo ====================================================================
echo      AP1 TELEVISION NETWORK - 24/7 LOCAL OFFICE SERVER
echo ====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js Production Build...
if not exist ".next" (
    echo Building optimized production package (one-time setup)...
    call npm run build
)

echo.
echo [2/3] Starting AP1 HRMS Web Server on Port 3000...
start "AP1 HRMS Production Server" /min cmd /c "npm run start"

echo.
echo [3/3] Starting Biometric ZKTeco Hardware Bridge Daemon...
if exist "python-bridge\zk_bridge.py" (
    start "AP1 Biometric Hardware Bridge" /min cmd /c "cd python-bridge && python zk_bridge.py"
)

timeout /t 3 /nobreak >nul

echo.
echo ====================================================================
echo   SERVER IS LIVE AND RUNNING 24/7 LOCALLY!
echo ====================================================================
echo.
echo   * Local PC Access:       http://localhost:3000
echo   * Biometric Machine:     Direct LAN Sync (TCP 4370) - 100%% Active
echo   * Monthly Limits:        ZERO (Unlimited Free Local CPU & RAM)
echo.
echo Opening AP1 Television HRMS in your browser...
start http://localhost:3000

echo.
echo (Keep this window or minimize it. Server is running smoothly.)
echo Press any key to exit this launcher (services will keep running).
pause >nul
