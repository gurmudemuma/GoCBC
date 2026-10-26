@echo off
echo ========================================
echo   Clearing Next.js Cache
echo ========================================
echo.

if exist .next (
    echo Found .next folder - removing...
    rmdir /s /q .next
    echo .next folder removed successfully!
) else (
    echo .next folder not found (already clean)
)

echo.
if exist node_modules\.cache (
    echo Found node_modules cache - removing...
    rmdir /s /q node_modules\.cache
    echo Cache removed successfully!
) else (
    echo No node_modules cache found
)

echo.
echo ========================================
echo   Cache cleared!
echo ========================================
echo.
echo Next steps:
echo   1. Start dev server: npm run dev
echo   2. Hard refresh browser: Ctrl+Shift+R
echo.
pause
