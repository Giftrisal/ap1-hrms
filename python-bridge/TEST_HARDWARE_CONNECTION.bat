@echo off
TITLE Test ZKTeco Biometric Machine Connection
echo =======================================================
echo    GOINFI-HR: ZKTeco Biometric Hardware Connection Test
echo =======================================================
echo.
echo Installing / checking required Python libraries (pyzk, requests)...
python -m pip install -r requirements.txt
echo.
echo -------------------------------------------------------
echo Testing connection with ZKTeco Machine at configured IP...
echo -------------------------------------------------------
python zk_bridge.py --test-connection
echo.
echo =======================================================
pause
