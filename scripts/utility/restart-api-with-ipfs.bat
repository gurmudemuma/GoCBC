@echo off
echo ==========================================
echo Restarting API with IPFS Support
echo ==========================================

cd api

echo.
echo Step 1: Stopping existing API server...
FOR /F "tokens=2" %%P IN ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') DO (
    echo Killing process %%P
    taskkill /F /PID %%P 2>nul
)
timeout /t 2 /nobreak >nul

echo.
echo Step 2: Starting API server with IPFS enabled...
echo Note: IPFS is now configured and running on port 5001
echo.
start "API Server" cmd /k "npm start"

echo.
echo ✓ API server is starting with IPFS support...
echo ✓ Wait 5-10 seconds for it to initialize
echo ✓ IPFS Daemon: http://localhost:5001
echo ✓ IPFS Gateway: http://localhost:8080
echo ✓ API Server: http://localhost:3001
echo.
echo Documents will now be stored in IPFS instead of local storage
echo.
pause
