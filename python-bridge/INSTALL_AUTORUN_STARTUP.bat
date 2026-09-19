@echo off
TITLE Goinfi-HR Auto-Start Setup
echo ========================================================
echo   GOINFI-HR: Install 24/7 Silent Auto-Sync on Office PC
echo ========================================================
echo.
echo Installing Python requirements...
python -m pip install -r requirements.txt
echo.
echo Creating Auto-Start shortcut in Windows Startup folder...
set SCRIPT_DIR=%~dp0
set VBS_TARGET=%SCRIPT_DIR%START_SILENT.vbs
set SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Goinfi_Biometric_Sync.lnk

powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT_PATH%');$s.TargetPath='wscript.exe';$s.Arguments='\"%VBS_TARGET%\"';$s.WorkingDirectory='%SCRIPT_DIR%';$s.Save()"

echo.
echo ========================================================
echo [SUCCESS] Auto-sync installed successfully!
echo Whenever this PC starts, Goinfi-HR will automatically
echo sync all punches from your ZKTeco machine to ap1hr.goinfi.biz!
echo ========================================================
echo.
echo Starting sync right now...
wscript "%VBS_TARGET%"
echo Running silently in background!
pause
