@echo off
TITLE Goinfi-HR - Switch to 24/7 Cloud Domain
echo ==========================================================
echo    Switching ap1hr.goinfi.biz to 24/7 Vercel Cloud Server
echo ==========================================================

:: Check for Administrative rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges to clean local hosts...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~s0' -Verb RunAs"
    exit /b
)

echo [1/3] Removing local 127.0.0.1 override from hosts file...
powershell -Command "$file = '%windir%\system32\drivers\etc\hosts'; (Get-Content $file) | Where-Object { $_ -notmatch 'ap1hr.goinfi.biz' } | Set-Content $file"

echo [2/3] Cleaning local port proxy...
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0 >nul 2>&1

echo [3/3] Flushing DNS cache...
ipconfig /flushdns >nul

echo.
echo ==========================================================
echo SUCCESS! Your PC will now connect directly to the 24/7 Cloud!
echo Opening https://ap1hr.goinfi.biz in your browser...
echo ==========================================================
start https://ap1hr.goinfi.biz

pause
