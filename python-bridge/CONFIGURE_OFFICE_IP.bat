@echo off
TITLE Goinfi-HR: Configure Machine IP Address
echo ================================================================
echo    GOINFI-HR x AP1: ZKTeco Biometric Hardware IP Setup
echo ================================================================
echo.
echo Please enter the IP Address assigned to the ZKTeco machine
echo at AP1 Office (e.g. 192.168.1.201 or 10.0.10.12)
echo.
set /p USER_IP="Machine IP Address [Press Enter for 192.168.1.201]: "
if "%USER_IP%"=="" set USER_IP=192.168.1.201

echo.
echo [1/3] Saving IP %USER_IP% to configuration...
(
echo # ZKTeco Biometric Machine Connection Configuration
echo ZK_DEVICE_IP=%USER_IP%
echo ZK_DEVICE_PORT=4370
echo.
echo # Target Production HR Server API
echo HR_API_URL=https://ap1hr.goinfi.biz/api/biometric/sync
echo BIOMETRIC_API_SECRET=goinfi_secure_zk_secret_2026
echo.
echo # Auto-sync interval in seconds (60 = 1 minute sync)
echo ZK_SYNC_INTERVAL=60
) > .env

echo [2/3] Configuration saved!
echo.
echo [3/3] Testing communication with machine at %USER_IP%:4370...
python zk_bridge.py --ip %USER_IP% --sync-now

echo.
echo ================================================================
echo Setup Complete! 
echo If you saw "Sync complete!", the machine is ready for AP1 Office!
echo ================================================================
pause
