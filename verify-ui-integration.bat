@echo off
REM CECBS UI Integration Verification Script (Batch)
REM Tests that blockchain identity management UI is properly integrated

echo ============================================
echo 🔍 CECBS UI Integration Verification
echo ============================================
echo.

setlocal enabledelayedexpansion
set CHECKS_PASSED=0
set CHECKS_FAILED=0

REM ============================================
REM 1. Check Files Exist
REM ============================================
echo 1. Checking files exist...

if exist "ui\src\components\admin\BlockchainIdentityPanel.tsx" (
    echo ✅ PASS: BlockchainIdentityPanel.tsx exists
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: BlockchainIdentityPanel.tsx NOT FOUND
    set /a CHECKS_FAILED+=1
)

if exist "ui\src\components\admin\UserManagement.tsx" (
    echo ✅ PASS: UserManagement.tsx exists
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: UserManagement.tsx NOT FOUND
    set /a CHECKS_FAILED+=1
)

echo.

REM ============================================
REM 2. Check Component Integration
REM ============================================
echo 2. Checking component integration...

findstr /C:"import BlockchainIdentityPanel from './BlockchainIdentityPanel'" "ui\src\components\admin\UserManagement.tsx" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ PASS: BlockchainIdentityPanel imported in UserManagement
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: BlockchainIdentityPanel NOT imported
    set /a CHECKS_FAILED+=1
)

findstr /C:"<BlockchainIdentityPanel" "ui\src\components\admin\UserManagement.tsx" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ PASS: BlockchainIdentityPanel component used in render
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: BlockchainIdentityPanel NOT used in render
    set /a CHECKS_FAILED+=1
)

findstr /C:"Tabs" "ui\src\components\admin\UserManagement.tsx" | findstr /C:"@mui/material" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ PASS: Tabs imported from Material-UI
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: Tabs NOT imported
    set /a CHECKS_FAILED+=1
)

findstr /C:"const TabPanel" "ui\src\components\admin\UserManagement.tsx" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ PASS: TabPanel component defined
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: TabPanel component NOT defined
    set /a CHECKS_FAILED+=1
)

findstr /C:"detailsTab" "ui\src\components\admin\UserManagement.tsx" | findstr /C:"useState" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ PASS: detailsTab state defined
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: detailsTab state NOT defined
    set /a CHECKS_FAILED+=1
)

echo.

REM ============================================
REM 3. Check API Integration
REM ============================================
echo 3. Checking API integration...

findstr /C:"api.get" "ui\src\components\admin\BlockchainIdentityPanel.tsx" | findstr /C:"crypto-users" | findstr /C:"identity" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ PASS: GET identity endpoint used
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: GET identity endpoint NOT found
    set /a CHECKS_FAILED+=1
)

findstr /C:"api.post" "ui\src\components\admin\BlockchainIdentityPanel.tsx" | findstr /C:"crypto-users/enroll" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ PASS: POST enroll endpoint used
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: POST enroll endpoint NOT found
    set /a CHECKS_FAILED+=1
)

findstr /C:"api.post" "ui\src\components\admin\BlockchainIdentityPanel.tsx" | findstr /C:"revoke" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ PASS: POST revoke endpoint used
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: POST revoke endpoint NOT found
    set /a CHECKS_FAILED+=1
)

findstr /C:"api.post" "ui\src\components\admin\BlockchainIdentityPanel.tsx" | findstr /C:"renew-certificate" >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ PASS: POST renew certificate endpoint used
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: POST renew certificate endpoint NOT found
    set /a CHECKS_FAILED+=1
)

echo.

REM ============================================
REM 4. Check Backend API Routes
REM ============================================
echo 4. Checking backend API routes...

if exist "api\src\routes\crypto-users.ts" (
    echo ✅ PASS: crypto-users.ts route file exists
    set /a CHECKS_PASSED+=1
    
    findstr /C:"router.get" "api\src\routes\crypto-users.ts" | findstr /C:":userId/identity" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ PASS: GET /:userId/identity endpoint defined
        set /a CHECKS_PASSED+=1
    ) else (
        echo ❌ FAIL: GET /:userId/identity endpoint NOT defined
        set /a CHECKS_FAILED+=1
    )
    
    findstr /C:"router.post" "api\src\routes\crypto-users.ts" | findstr /C:"/enroll" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ PASS: POST /enroll endpoint defined
        set /a CHECKS_PASSED+=1
    ) else (
        echo ❌ FAIL: POST /enroll endpoint NOT defined
        set /a CHECKS_FAILED+=1
    )
    
    findstr /C:"router.post" "api\src\routes\crypto-users.ts" | findstr /C:":userId/revoke" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ PASS: POST /:userId/revoke endpoint defined
        set /a CHECKS_PASSED+=1
    ) else (
        echo ❌ FAIL: POST /:userId/revoke endpoint NOT defined
        set /a CHECKS_FAILED+=1
    )
    
    findstr /C:"router.post" "api\src\routes\crypto-users.ts" | findstr /C:":userId/renew-certificate" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ PASS: POST /:userId/renew-certificate endpoint defined
        set /a CHECKS_PASSED+=1
    ) else (
        echo ❌ FAIL: POST /:userId/renew-certificate endpoint NOT defined
        set /a CHECKS_FAILED+=1
    )
) else (
    echo ❌ FAIL: crypto-users.ts route file NOT FOUND
    set /a CHECKS_FAILED+=1
)

echo.

REM ============================================
REM 5. Check Documentation
REM ============================================
echo 5. Checking documentation...

if exist "UI-BLOCKCHAIN-INTEGRATION-COMPLETE.md" (
    echo ✅ PASS: UI integration documentation exists
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: UI integration documentation NOT FOUND
    set /a CHECKS_FAILED+=1
)

if exist "UI-INTEGRATION-GUIDE.md" (
    echo ✅ PASS: UI integration guide exists
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: UI integration guide NOT FOUND
    set /a CHECKS_FAILED+=1
)

if exist "PORTAL-ADMIN-FULL-CONTROL.md" (
    echo ✅ PASS: Portal admin documentation exists
    set /a CHECKS_PASSED+=1
) else (
    echo ❌ FAIL: Portal admin documentation NOT FOUND
    set /a CHECKS_FAILED+=1
)

echo.

REM ============================================
REM Summary
REM ============================================
echo ============================================
echo 📊 Verification Summary
echo ============================================
echo.
echo Checks Passed: !CHECKS_PASSED!
echo Checks Failed: !CHECKS_FAILED!
echo.

if !CHECKS_FAILED! equ 0 (
    echo ✅ ALL CHECKS PASSED
    echo.
    echo 🎉 UI integration is COMPLETE and ready!
    echo.
    echo Next steps:
    echo   1. cd ui ^&^& npm install
    echo   2. npm start
    echo   3. Open http://localhost:3000
    echo   4. Login as admin and test User Management
    echo.
    exit /b 0
) else (
    echo ❌ SOME CHECKS FAILED
    echo.
    echo Please fix the failed checks before proceeding.
    echo.
    exit /b 1
)

