# CECBS - Complete Reset Script
# This will clear everything and start fresh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CECBS - Complete System Reset" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Stopping development servers..." -ForegroundColor Yellow
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "  ✅ Servers stopped" -ForegroundColor Green
Write-Host ""

Write-Host "[2/4] Clearing Next.js build cache..." -ForegroundColor Yellow
if (Test-Path "ui\.next") {
    Remove-Item -Path "ui\.next" -Recurse -Force
    Write-Host "  ✅ Build cache cleared" -ForegroundColor Green
} else {
    Write-Host "  ℹ️  No build cache found" -ForegroundColor Gray
}
Write-Host ""

Write-Host "[3/4] Instructions for browser..." -ForegroundColor Yellow
Write-Host "  🌐 Open your browser and do the following:" -ForegroundColor White
Write-Host "     1. Press F12 to open DevTools" -ForegroundColor White
Write-Host "     2. Go to Application tab" -ForegroundColor White
Write-Host "     3. Click 'Clear storage' on the left" -ForegroundColor White
Write-Host "     4. Click 'Clear site data' button" -ForegroundColor White
Write-Host "     5. Close the browser completely" -ForegroundColor White
Write-Host ""
Write-Host "  OR run this in browser console:" -ForegroundColor White
Write-Host "     localStorage.clear(); sessionStorage.clear(); location.reload();" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press ENTER when you've cleared browser storage"

Write-Host "[4/4] Starting servers..." -ForegroundColor Yellow
Write-Host "  Starting API server..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd api; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "  Starting UI server..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ui; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ RESET COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Wait 30-40 seconds for servers to start" -ForegroundColor White
Write-Host "2. Go to: http://localhost:3000/login" -ForegroundColor White
Write-Host "3. Login as: ethiopianpremium / password123" -ForegroundColor White
Write-Host "4. Should redirect to /portals/exporter" -ForegroundColor White
Write-Host ""
Write-Host "If issues persist, check the console logs in the new PowerShell windows" -ForegroundColor Gray
Write-Host ""
