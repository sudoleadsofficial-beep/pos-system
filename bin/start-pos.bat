@echo off
setlocal enabledelayedexpansion

:: JKC POS - Standalone Offline Launcher
cd /d "%~dp0\.."

:: Add XAMPP PHP to Path if present
if exist "C:\xampp\php\php.exe" (
    set "PATH=C:\xampp\php;!PATH!"
)

:: Check if port 8000 is already in use
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    goto :LAUNCH_BROWSER
)

:: Start Laravel server in background
start /B "" php artisan serve --host=127.0.0.1 --port=8000 >nul 2>&1

:: Wait for port 8000 to open (up to 6 seconds)
for /L %%i in (1,1,12) do (
    netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
    if !ERRORLEVEL! equ 0 goto :LAUNCH_BROWSER
    timeout /t 1 /nobreak >nul 2>&1
)

:LAUNCH_BROWSER
:: Check for Chrome
set "CHROME_PATH="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

if defined CHROME_PATH (
    start "" "!CHROME_PATH!" --app=http://127.0.0.1:8000/amroza
    exit /b 0
)

:: Check for Edge fallback
set "EDGE_PATH="
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE_PATH=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

if defined EDGE_PATH (
    start "" "!EDGE_PATH!" --app=http://127.0.0.1:8000/amroza
    exit /b 0
)

:: Fallback to default browser
start http://127.0.0.1:8000/amroza
exit /b 0
