@echo off
TITLE Remove ap1hr.goinfi.biz & Clean PC Cache
color 0c
cls
echo ==========================================================
echo       Permanently Removing ap1hr.goinfi.biz from PC
echo ==========================================================
echo.

:: Check for Administrative rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Requesting Administrator privileges to clean hosts file...
    powershell -Command "Start-Process cmd -ArgumentList '/c %~s0' -Verb RunAs"
    exit /b
)

echo [1/2] Removing ap1hr.goinfi.biz entry from hosts file...
powershell -Command "$file = '%windir%\system32\drivers\etc\hosts'; if (Test-Path $file) { (Get-Content $file) | Where-Object { $_ -notmatch 'ap1hr\.goinfi\.biz' } | Set-Content $file -Force }"

echo [2/2] Flushing Windows DNS Cache...
ipconfig /flushdns >nul

echo.
echo ==========================================================
echo  [SUCCESS] ap1hr.goinfi.biz has been completely removed!
echo  Your PC will no longer connect to this old domain.
echo  The official domain is: https://hr.ap1hdtv.com
echo ==========================================================
echo.
pause
