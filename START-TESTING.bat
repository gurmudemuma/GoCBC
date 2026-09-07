@echo off
echo ========================================
echo   BANKS PORTAL - START TESTING NOW
echo ========================================
echo.
echo Choose your testing path:
echo.
echo [1] FAST: Automated tests (15 min)
echo [2] THOROUGH: Manual testing guide
echo [3] QUICK: Smoke test (5 min)
echo [4] VALIDATE: Integration check (1 min)
echo [5] HELP: Open documentation
echo [6] EXIT
echo.

set /p choice="Enter choice (1-6): "

if "%choice%"=="1" goto automated
if "%choice%"=="2" goto manual
if "%choice%"=="3" goto smoke
if "%choice%"=="4" goto validate
if "%choice%"=="5" goto help
if "%choice%"=="6" exit /b 0

echo Invalid choice. Please try again.
pause
exit /b 1

:automated
echo.
echo Running automated tests...
echo.
cd /d "%~dp0"
npx playwright test tests/banks-portal-automated.test.js --reporter=list
pause
exit /b 0

:manual
echo.
echo Opening manual test script...
start "" "%~dp0tests\banks-portal-manual-test-script.md"
pause
exit /b 0

:smoke
echo.
echo Running smoke test (Tab 8 only)...
echo.
cd /d "%~dp0"
npx playwright test tests/banks-portal-automated.test.js --grep "Tab 8" --reporter=list
pause
exit /b 0

:validate
echo.
echo Running validation check...
echo.
cd /d "%~dp0"
node tests\validate-banks-portal-integration.js
pause
exit /b 0

:help
echo.
echo Opening documentation...
start "" "%~dp0TESTING-EXECUTION-GUIDE.md"
pause
exit /b 0
