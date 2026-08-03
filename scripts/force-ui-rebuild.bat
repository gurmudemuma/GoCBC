@echo off
echo.
echo ========================================
echo   Force UI Rebuild - Clean Cache
echo ========================================
echo.

cd /d "%~dp0..\ui"

echo [1/4] Stopping any running processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/4] Deleting .next cache folder...
if exist ".next" (
    rmdir /s /q ".next"
    echo     ✓ .next folder deleted
) else (
    echo     • .next folder not found (already clean)
)

echo [3/4] Deleting node_modules cache (optional)...
echo     Press Ctrl+C to skip, or
pause
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo     ✓ node_modules cache deleted
)

echo [4/4] Starting fresh UI build...
echo.
npm run dev

pause
