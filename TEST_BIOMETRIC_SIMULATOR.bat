@echo off
TITLE Goinfi-HR Biometric Simulator Test
echo ==========================================================
echo       GOINFI-HR BIOMETRIC PUNCH SIMULATOR
echo ==========================================================
echo Generating realistic punch records for 32 staff members...
echo Target Endpoint: http://localhost:3000/api/biometric/sync
echo.

cd /d "D:\Goinfi All Files\Main Files\goinfi-hr\python-bridge"
python zk_simulator.py

echo.
echo ==========================================================
echo Done! Open http://localhost:3000/dashboard to see live punches.
echo ==========================================================
pause
