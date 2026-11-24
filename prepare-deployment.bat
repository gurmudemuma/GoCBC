@echo off
REM ============================================================
REM CECBS Pre-Deployment Preparation Script (Windows Wrapper)
REM Runs the bash script using Git Bash or WSL
REM ============================================================

echo.
echo ============================================================
echo   CECBS Pre-Deployment Preparation
echo ============================================================
echo.

REM Check if Git Bash is available
where bash >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Starting preparation script with Bash...
    echo.
    bash prepare-deployment.sh
    goto :end
)

REM Check if WSL is available
where wsl >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Starting preparation script with WSL...
    echo.
    wsl bash prepare-deployment.sh
    goto :end
)

REM Neither found
echo ERROR: Neither Git Bash nor WSL found!
echo.
echo Please install one of the following:
echo   1. Git for Windows (includes Git Bash): https://git-scm.com/download/win
echo   2. Windows Subsystem for Linux (WSL): wsl --install
echo.
echo Then run this script again.
pause
exit /b 1

:end
pause
