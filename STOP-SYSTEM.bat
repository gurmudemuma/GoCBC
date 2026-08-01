@echo off
REM Quick stop script for CECBS - Double-click to stop the system

echo.
echo ========================================
echo   Stopping CECBS System
echo ========================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PowerShell not found!
    pause
    exit /b 1
)

REM Run the PowerShell stop script, keeping data by default
powershell.exe -ExecutionPolicy Bypass -File "%~dp0stop-all.ps1" -KeepData

echo.
echo System stopped. Data has been preserved.
echo.
pause
