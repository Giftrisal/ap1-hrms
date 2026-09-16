@echo off
TITLE Goinfi-HR - Instant DNS Fix for ap1hr.goinfi.biz
echo ==========================================================
echo    Fixing ap1hr.goinfi.biz to bypass ISP DNS Cache Delay
echo ==========================================================

:: Check for Administrative rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges to apply instant fix...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~s0' -Verb RunAs"
    exit /b
)

echo [1/3] Removing old entries...
powershell -Command "$file = '%windir%\system32\drivers\etc\hosts'; (Get-Content $file) | Where-Object { $_ -notmatch 'ap1hr.goinfi.biz' } | Set-Content $file"

echo [2/3] Adding Vercel Cloud IP (76.76.21.21) for ap1hr.goinfi.biz...
echo 76.76.21.21 ap1hr.goinfi.biz >> %windir%\system32\drivers\etc\hosts

echo [3/3] Flushing Windows DNS Cache...
ipconfig /flushdns >nul

echo.
echo ==========================================================
echo SUCCESS! Your PC will now open ap1hr.goinfi.biz immediately!
echo Opening https://ap1hr.goinfi.biz in your browser...
echo ==========================================================
start https://ap1hr.goinfi.biz

pause
