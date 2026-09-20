@echo off
TITLE AP1 Television HRMS - 24/7 Windows Startup Auto-Runner
COLOR 0A
echo ====================================================================
echo   INSTALL AP1 HRMS 24/7 AUTO-RUNNER (STARTUP INSTALLER)
echo ====================================================================
echo.
echo This utility installs AP1 HRMS into Windows Startup.
echo Whenever this PC boots or restarts, the HRMS server and
echo Biometric Auto-Sync will start automatically in the background!
echo.

set SCRIPT_PATH=%~dp0START_AP1_OFFICE_SERVER.bat
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_VBS=%TEMP%\CreateAP1StartupShortcut.vbs

echo [1/2] Creating Windows Startup shortcut...
(
echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
echo sLinkFile = "%STARTUP_DIR%\AP1_Television_HRMS_24_7_Server.lnk"
echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
echo oLink.TargetPath = "%SCRIPT_PATH%"
echo oLink.WorkingDirectory = "%~dp0"
echo oLink.WindowStyle = 7
echo oLink.Description = "AP1 Television HRMS 24/7 Office Server"
echo oLink.Save
) > "%SHORTCUT_VBS%"

cscript //nologo "%SHORTCUT_VBS%"
del "%SHORTCUT_VBS%" >nul 2>&1

echo.
echo [2/2] Verification...
if exist "%STARTUP_DIR%\AP1_Television_HRMS_24_7_Server.lnk" (
    echo.
    echo ====================================================================
    echo   SUCCESS! AP1 HRMS IS NOW INSTALLED IN 24/7 WINDOWS STARTUP!
    echo ====================================================================
    echo.
    echo Next time you turn on this PC, the HRMS Server and Biometrics
    echo will launch automatically in the background without needing any clicks!
    echo.
) else (
    echo Failed to create startup link. Please run as Administrator.
)

pause
