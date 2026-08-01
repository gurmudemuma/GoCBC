@echo off
REM Quick start script for CECBS - Double-click to start the system

echo.
echo ========================================
echo   Starting CECBS System
echo ========================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PowerShell not found!
    echo Please install PowerShell to run CECBS
    pause
    exit /b 1
)

REM Run the PowerShell startup script with SkipBuild for faster startup
powershell.exe -ExecutionPolicy Bypass -File "%~dp0start-all.ps1" -SkipBuild

echo.
pause
