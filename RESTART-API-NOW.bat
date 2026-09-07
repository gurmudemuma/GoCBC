@echo off
echo Stopping API server...
taskkill /F /FI "WINDOWTITLE eq CECBS API Server*" 2>nul
taskkill /F /FI "WINDOWTITLE eq *npm start*" 2>nul
timeout /t 2 /nobreak >nul

echo Starting API server with REAL blockchain signatures...
cd /d "%~dp0api"
start "CECBS API Server" cmd /k "npm start"

echo.
echo ✅ API Server restarted!
echo.
echo Now:
echo 1. Wait 10 seconds for server to start
echo 2. Refresh your browser (Ctrl+F5)
echo 3. Open any LC/Forex/Payment details
echo 4. Blockchain signatures will now appear!
echo.
pause
