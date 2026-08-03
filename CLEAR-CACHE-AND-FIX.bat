@echo off
echo.
echo ================================================================
echo   AUTOMATED FIX: Admin Portal Routing
echo ================================================================
echo.
echo This script will:
echo   [1] Stop all Node.js processes (including UI server)
echo   [2] Delete .next cache folder
echo   [3] Restart UI server with fresh build
echo.
echo After this completes, you MUST:
echo   - Open browser to http://localhost:3000
echo   - Press F12 (DevTools)
echo   - Go to Application -^> Local Storage
echo   - Right-click -^> Clear
echo   - Login with: admin / admin123
echo.
echo ================================================================
echo.
pause

cd /d %~dp0

echo [1/3] Stopping all Node.js processes...
taskkill /F /IM node.exe /T 2>nul
if errorlevel 1 (
    echo     No Node.js processes found ^(already stopped^)
) else (
    echo     Node.js processes stopped
)
timeout /t 3 /nobreak >nul

echo.
echo [2/3] Deleting .next cache folder...
cd ui
if exist ".next" (
    rmdir /s /q ".next"
    echo     .next folder deleted successfully
) else (
    echo     .next folder not found ^(already clean^)
)

echo.
echo [3/3] Starting UI server with fresh build...
echo.
echo ================================================================
echo   UI Server Starting...
echo ================================================================
echo.
echo IMPORTANT: After UI starts, do this in your browser:
echo.
echo   1. Open: http://localhost:3000
echo   2. Press: F12 ^(DevTools^)
echo   3. Go to: Application tab
echo   4. Expand: Local Storage
echo   5. Click: http://localhost:3000
echo   6. Right-click -^> Clear
echo   7. Close DevTools
echo   8. Login: admin / admin123
echo   9. Should redirect to /admin ^(not /portals/ecta^)
echo.
echo ================================================================
echo.

npm run dev
