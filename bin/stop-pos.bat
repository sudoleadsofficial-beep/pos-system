@echo off
setlocal enabledelayedexpansion

:: JKC POS - Clean Shutdown Script
echo Stopping JKC POS server...

:: Find PID listening on port 8000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8000 .*LISTENING"') do (
    set "PID=%%a"
    if defined PID (
        echo Found active server PID: !PID!
        taskkill /F /PID !PID! >nul 2>&1
    )
)

echo JKC POS server stopped successfully.
timeout /t 2 >nul 2>&1
exit /b 0
