@echo off
chcp 65001 >nul
title AP1 Television - ZKTeco Hardware Machine Memory Manager
color 0b

:MENU
cls
echo ==============================================================================
echo        AP1 TELEVISION - ZKTECO BIOMETRIC MACHINE MEMORY MANAGER
echo ==============================================================================
echo.
echo   [1] मेसिनमा दर्ता भएका सबै प्रयोगकर्ताहरू हेर्नुहोस् (List All Users)
echo   [2] कुनै एक कर्मचारीको PIN मेसिनबाट हटाउनुहोस् (Delete User by PIN)
echo   [3] मेसिनका सबै पुराना औंठाछाप र युजर्स मेटाउनुहोस् (Clear All Users from Machine)
echo   [4] मेसिनका सबै पुराना हाजिरी लगहरू मेटाउनुहोस् (Clear All Attendance Logs)
echo   [5] मेसिनको LAN कनेक्सन जाँच गर्नुहोस् (Test Connection)
echo   [6] बाहिर निस्कनुहोस् (Exit)
echo.
echo ==============================================================================
set /p CHOICE="कृपया विकल्प छनोट गर्नुहोस् (१-६): "

if "%CHOICE%"=="1" goto LIST_USERS
if "%CHOICE%"=="2" goto DELETE_USER
if "%CHOICE%"=="3" goto CLEAR_USERS
if "%CHOICE%"=="4" goto CLEAR_ATTENDANCE
if "%CHOICE%"=="5" goto TEST_CONN
if "%CHOICE%"=="6" exit /b
goto MENU

:LIST_USERS
cls
echo [१] बायोमेट्रिक मेसिनमा भएका युजर्स खोज्दै...
python python-bridge/zk_bridge.py --list-users
echo.
pause
goto MENU

:DELETE_USER
cls
set /p DELPIN="हटाउन चाहेको कर्मचारीको PIN नम्बर लेख्नुहोस् (उदा. 1): "
if "%DELPIN%"=="" goto MENU
echo मेसिनबाट PIN #%DELPIN% हटाउँदै...
python python-bridge/zk_bridge.py --delete-user %DELPIN%
echo.
pause
goto MENU

:CLEAR_USERS
cls
echo ------------------------------------------------------------------------------
echo चेतावनी: यसले बायोमेट्रिक मेसिनमा भएका सबै औंठाछाप र युजर्स मेटाउनेछ!
echo ------------------------------------------------------------------------------
set /p CONFIRM="के तपाईं पक्का हुनुहुन्छ? (Y/N): "
if /i not "%CONFIRM%"=="Y" goto MENU
echo मेसिनका सबै औंठाछाप र युजर्स मेटाउँदै...
python python-bridge/zk_bridge.py --clear-users
echo.
pause
goto MENU

:CLEAR_ATTENDANCE
cls
echo ------------------------------------------------------------------------------
echo बायोमेट्रिक मेसिनको पुराना हाजिरी पन्च लग मेटाउँदै...
echo ------------------------------------------------------------------------------
python python-bridge/zk_bridge.py --clear-attendance
echo.
pause
goto MENU

:TEST_CONN
cls
python python-bridge/zk_bridge.py --test-connection
echo.
pause
goto MENU
