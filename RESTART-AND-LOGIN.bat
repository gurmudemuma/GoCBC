@echo off
echo ========================================
echo  CECBS - Restart Servers and Login
echo ========================================
echo.

echo [1/4] Stopping all Node processes...
taskkill //F //IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Starting API server...
cd api
start "CECBS API" cmd /k "npm start"
timeout /t 5 /nobreak >nul

echo [3/4] Starting UI server...
cd ..\ui
start "CECBS UI" cmd /k "npm run dev"
timeout /t 10 /nobreak >nul

echo [4/4] Opening browser...
start http://localhost:3001/clear-storage.html

echo.
echo ========================================
echo  SERVERS STARTED!
echo ========================================
echo.
echo  API Server: http://localhost:3001
echo  UI Server:  http://localhost:3001
echo.
echo  After clearing storage:
echo  1. Go to: http://localhost:3001/login
echo  2. Login with:
echo     Username: admin
echo     Password: admin123
echo.
echo  Press any key to close this window...
pause >nul
