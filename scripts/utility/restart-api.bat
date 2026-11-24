@echo off
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║           RESTARTING API WITH FOREX FIX                       ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

echo Step 1: Finding processes on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Killing process: %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Step 2: Waiting for port to be released...
timeout /t 3 /nobreak >nul

echo.
echo Step 3: Starting API server with forex fix...
cd api
start "CECBS API Server" cmd /k "npm start"

echo.
echo ✅ API server is starting in a new window
echo.
echo Wait 5 seconds for the server to fully start, then:
echo   node complete-system-test.js
echo.
pause
