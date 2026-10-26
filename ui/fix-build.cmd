@echo off
echo ========================================
echo   Fixing Next.js Build Issues
echo ========================================
echo.

echo Step 1: Removing .next directory...
if exist .next (
    rmdir /s /q .next
    echo .next removed!
) else (
    echo .next not found (already clean)
)

echo.
echo Step 2: Removing node_modules cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo Cache removed!
) else (
    echo No cache found
)

echo.
echo ========================================
echo   Cache cleared successfully!
echo ========================================
echo.
echo Now restart your dev server:
echo   npm run dev
echo.
echo Or if dev server is running, just hard refresh:
echo   Ctrl+Shift+R
echo.
pause
