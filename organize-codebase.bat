@echo off
REM ============================================================
REM CECBS Codebase Organization Script (Windows Wrapper)
REM ============================================================

echo.
echo ============================================================
echo   CECBS Codebase Organization
echo ============================================================
echo.

REM Check if Git Bash is available
where bash >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Starting organization script with Bash...
    echo.
    bash organize-codebase.sh
    goto :end
)

REM Check if WSL is available
where wsl >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Starting organization script with WSL...
    echo.
    wsl bash organize-codebase.sh
    goto :end
)

REM Neither found
echo ERROR: Neither Git Bash nor WSL found!
echo.
echo Please install one of the following:
echo   1. Git for Windows (includes Git Bash): https://git-scm.com/download/win
echo   2. Windows Subsystem for Linux (WSL): wsl --install
echo.
pause
exit /b 1

:end
pause
