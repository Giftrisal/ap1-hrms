@echo off
TITLE Goinfi-HR - ap1hr.goinfi.biz Domain Setup
echo ==========================================================
echo    Configuring http://ap1hr.goinfi.biz for Goinfi-HR
echo ==========================================================

:: Check for Administrative rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges to configure domain...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~s0' -Verb RunAs"
    exit /b
)

echo [1/3] Adding ap1hr.goinfi.biz to Windows hosts file...
findstr /i "ap1hr.goinfi.biz" %windir%\system32\drivers\etc\hosts >nul
if %errorLevel% neq 0 (
    echo. >> %windir%\system32\drivers\etc\hosts
    echo 127.0.0.1 ap1hr.goinfi.biz >> %windir%\system32\drivers\etc\hosts
    echo Successfully mapped 127.0.0.1 to ap1hr.goinfi.biz!
) else (
    echo ap1hr.goinfi.biz is already mapped in hosts file.
)

echo [2/3] Forwarding Port 80 to Port 3000 (so no :3000 is needed)...
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0 >nul 2>&1
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=3000 connectaddress=127.0.0.1
echo Port 80 forward configured!

echo [3/3] Flushing DNS cache...
ipconfig /flushdns >nul

echo.
echo ==========================================================
echo SUCCESS! http://ap1hr.goinfi.biz is now fully active!
echo Opening http://ap1hr.goinfi.biz in your browser...
echo ==========================================================
start http://ap1hr.goinfi.biz

pause
