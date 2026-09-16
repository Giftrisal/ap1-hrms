@echo off
TITLE Goinfi-HR ZKTeco Biometric Bridge Daemon
echo ===================================================
echo     GOINFI-HR: ZKTeco LAN Sync Daemon
echo ===================================================
echo Checking Python dependencies...
python -m pip install -r requirements.txt

echo Starting Biometric Bridge Daemon (5 minute sync interval)...
python zk_bridge.py --daemon --interval 300

pause
