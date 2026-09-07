@echo off
echo ============================================
echo RESTARTING CECBS WITH BLOCKCHAIN SIGNATURES
echo ============================================
echo.

REM Kill existing Node.js processes for API and UI
echo Stopping existing API and UI servers...
taskkill /F /IM node.exe /T 2>nul
timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo Starting API Server (with blockchain-signatures route)...
echo ============================================
cd /d "%~dp0api"
start "CECBS API Server" cmd /k "npm start"

timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo Starting UI Server...
echo ============================================
cd /d "%~dp0ui"
start "CECBS UI Server" cmd /k "npm run dev"

echo.
echo ============================================
echo CECBS RESTARTED SUCCESSFULLY!
echo ============================================
echo.
echo API Server: http://localhost:3001
echo UI Server: http://localhost:3000
echo.
echo Wait 30 seconds for both servers to fully start, then:
echo 1. Open http://localhost:3000
echo 2. Login as Bank Officer
echo 3. Open any Forex/LC/Payment details
echo 4. Blockchain signatures will now be visible!
echo.
echo Press any key to close this window...
pause >nul
