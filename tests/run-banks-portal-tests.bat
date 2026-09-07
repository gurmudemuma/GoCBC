@echo off
REM Banks Portal Test Runner
REM Run this script to execute all Banks Portal tests

echo ========================================
echo Banks Portal Comprehensive Test Suite
echo ========================================
echo.

echo Checking prerequisites...
echo.

REM Check if system is running
echo [1/5] Checking API health...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] API is not running!
    echo Please start the system first: START-SYSTEM.bat
    pause
    exit /b 1
)
echo [OK] API is healthy

echo [2/5] Checking UI availability...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] UI is not running!
    echo Please start the system first: START-SYSTEM.bat
    pause
    exit /b 1
)
echo [OK] UI is available

echo [3/5] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    pause
    exit /b 1
)
echo [OK] Node.js found

echo [4/5] Checking for test database...
echo.

echo [5/5] Checking Playwright installation...
cd /d "%~dp0.."
npx playwright --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Playwright not installed. Installing now...
    npm install -D @playwright/test
    npx playwright install chromium
)
echo [OK] Playwright ready
echo.

echo ========================================
echo Test Execution Options:
echo ========================================
echo.
echo 1. Run automated tests (Playwright)
echo 2. Open manual test script
echo 3. Quick smoke test (Tab 8 only)
echo 4. Full integration test
echo 5. Exit
echo.

set /p choice="Enter choice (1-5): "

if "%choice%"=="1" goto automated
if "%choice%"=="2" goto manual
if "%choice%"=="3" goto smoke
if "%choice%"=="4" goto integration
if "%choice%"=="5" exit /b 0

:automated
echo.
echo Running automated Playwright tests...
echo This will take 5-10 minutes...
echo.
cd /d "%~dp0.."
npx playwright test tests/banks-portal-automated.test.js --reporter=list
echo.
echo Test complete! Check results above.
pause
exit /b 0

:manual
echo.
echo Opening manual test script...
start "" "%~dp0banks-portal-manual-test-script.md"
echo.
echo Manual test script opened in your default editor.
echo Follow the instructions in the document.
pause
exit /b 0

:smoke
echo.
echo Running quick smoke test (Tab 8 - LC Settlements)...
echo.
cd /d "%~dp0.."
npx playwright test tests/banks-portal-automated.test.js --grep "Tab 8" --reporter=list
echo.
echo Smoke test complete!
pause
exit /b 0

:integration
echo.
echo Running full integration test...
echo.
cd /d "%~dp0.."
npx playwright test tests/banks-portal-automated.test.js --grep "Integration" --reporter=list
echo.
echo Integration test complete!
pause
exit /b 0
