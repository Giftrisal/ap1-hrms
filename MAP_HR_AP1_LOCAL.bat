@echo off
TITLE Map hr.ap1hdtv.com to cPanel Server
COLOR 0A
echo ==========================================================
echo    MAPPING hr.ap1hdtv.com TO CPANEL (192.250.235.39)
echo ==========================================================
echo.

:: Check for Administrative rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~s0' -Verb RunAs"
    exit /b
)

echo [1/3] Updating Windows hosts file...
findstr /i "hr.ap1hdtv.com" %windir%\system32\drivers\etc\hosts >nul
if %errorLevel% neq 0 (
    echo. >> %windir%\system32\drivers\etc\hosts
    echo 192.250.235.39 hr.ap1hdtv.com >> %windir%\system32\drivers\etc\hosts
    echo Added: 192.250.235.39 hr.ap1hdtv.com
) else (
    echo hr.ap1hdtv.com is already mapped in hosts file.
)

echo.
echo [2/3] Flushing Windows DNS Cache...
ipconfig /flushdns >nul

echo.
echo [3/3] Opening hr.ap1hdtv.com in browser...
start http://hr.ap1hdtv.com

echo.
echo ==========================================================
echo SUCCESS! hr.ap1hdtv.com is now pointing directly to cPanel!
echo ==========================================================
pause
