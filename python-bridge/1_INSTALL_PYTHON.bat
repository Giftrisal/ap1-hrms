@echo off
TITLE Automatic Python Installer
echo ========================================================
echo       Downloading & Installing Python for Windows
echo ========================================================
echo.
echo Downloading official Python installer (approx 25MB)...
curl -L -o python_setup.exe https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe

if not exist python_setup.exe (
    echo Download failed. Please download manually from:
    echo https://www.python.org/downloads/
    pause
    exit /b
)

echo.
echo Installing Python (with 'Add to PATH' enabled)...
echo Please wait about 1-2 minutes...
python_setup.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0

del python_setup.exe

echo.
echo ========================================================
echo Python installed successfully!
echo Please CLOSE this window and run TEST_HARDWARE_CONNECTION.bat again!
echo ========================================================
pause
