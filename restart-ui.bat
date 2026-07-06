@echo off
echo ==========================================
echo Restarting UI with New Theme
echo ==========================================

cd ui

echo.
echo Step 1: Killing any existing Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Step 2: Clearing cache and old builds...
if exist .next rmdir /s /q .next
if exist node_modules\.cache rmdir /s /q node_modules\.cache
if exist out rmdir /s /q out

echo.
echo Step 3: Starting development server...
echo Note: The new purple/golden/black/white theme will now be active
echo.
start "UI Dev Server" cmd /k "npm run dev"

echo.
echo ✓ UI server is starting...
echo ✓ Wait 10-15 seconds for it to compile
echo ✓ Then refresh your browser at http://localhost:3000
echo.
pause
