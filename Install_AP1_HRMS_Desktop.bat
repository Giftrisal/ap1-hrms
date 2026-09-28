@echo off
title AP1 Television HRMS - Office PC Desktop App Setup
color 0b
cls
echo =====================================================================
echo           AP1 Television HRMS - Desktop App Installer
echo           (Office PC Workstation Shortcut Generator)
echo =====================================================================
echo.
echo Setting up dedicated AP1 Television HRMS workstation on this computer...
echo.

set "APP_URL=https://hr.ap1hdtv.com/login"
set "APP_NAME=AP1 Television HRMS"
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP_DIR%\%APP_NAME%.lnk"

:: Detect Browser (Edge or Chrome)
set "BROWSER_EXE="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
)

if "%BROWSER_EXE%"=="" (
    echo [ALERT] No standalone browser found. Creating standard desktop shortcut...
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%APP_URL%'; $s.Description = 'AP1 Television HRMS'; $s.Save();"
) else (
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%BROWSER_EXE%'; $s.Arguments = '--app=%APP_URL%'; $s.Description = 'AP1 Television HRMS Workstation'; $s.Save();"
)

echo.
echo =====================================================================
echo  [SUCCESS] AP1 Television HRMS Desktop Software Installed!
echo =====================================================================
echo.
echo Desktop Shortcut: %SHORTCUT_PATH%
echo.
echo You can now find the "AP1 Television HRMS" application icon on your
echo Desktop. Double-clicking it opens the HRMS in a dedicated standalone
echo window without browser toolbars.
echo.
pause
