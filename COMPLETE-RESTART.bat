@echo off
echo ========================================
echo  CECBS - COMPLETE RESTART
echo  Fixing Admin Login Routing Issue
echo ========================================
echo.

echo [1/6] Stopping all Node processes...
taskkill //F //IM node.exe 2>nul
echo Done.
timeout /t 3 /nobreak >nul
echo.

echo [2/6] Cleaning Next.js cache...
cd ui
if exist .next (
    rmdir /s /q .next
    echo .next cache deleted
) else (
    echo No .next cache found
)
echo.

echo [3/6] Starting API server...
cd ..\api
start "CECBS API Server" cmd /k "npm start"
echo API server starting... (waiting 8 seconds)
timeout /t 8 /nobreak >nul
echo.

echo [4/6] Starting UI server...
cd ..\ui
start "CECBS UI Server" cmd /k "npm run dev"
echo UI server starting... (waiting 15 seconds)
timeout /t 15 /nobreak >nul
echo.

echo [5/6] Opening clear storage page...
start http://localhost:3001/clear-storage.html
echo.

echo [6/6] Complete!
echo ========================================
echo.
echo  NEXT STEPS:
echo  1. Click "Clear All Storage" button in browser
echo  2. You'll be redirected to login page
echo  3. Login with:
echo     Username: admin
echo     Password: admin123
echo  4. You should see ADMIN PORTAL (not ECTA)
echo.
echo ========================================
echo  Both servers are running in separate windows
echo  Close this window when ready
echo ========================================
pause
