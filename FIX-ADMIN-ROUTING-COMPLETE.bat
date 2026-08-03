@echo off
echo.
echo ========================================
echo   COMPLETE FIX: Admin Routing
echo ========================================
echo.
echo This will:
echo   1. Stop the UI server
echo   2. Delete cached build (.next folder)
echo   3. Restart with fresh code
echo.
echo Press Ctrl+C to cancel, or
pause

cd /d "%~dp0ui"

echo.
echo [Step 1/3] Stopping UI server...
taskkill /F /IM node.exe 2>nul
echo     Done.
timeout /t 2 /nobreak >nul

echo.
echo [Step 2/3] Deleting .next cache...
if exist ".next" (
    rmdir /s /q ".next"
    echo     ✓ Cache deleted
) else (
    echo     • No cache found
)

echo.
echo [Step 3/3] Starting UI with fresh build...
echo.
echo ========================================
echo   UI Server Starting...
echo ========================================
echo.
echo After UI starts:
echo   1. Open http://localhost:3000
echo   2. Press F12 (DevTools)
echo   3. Go to Application -^> Local Storage
echo   4. Clear all (right-click -^> Clear)
echo   5. Login with: admin / admin123
echo   6. Should redirect to /admin (not /portals/ecta)
echo.
echo ========================================
echo.

npm run dev
