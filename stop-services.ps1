# CECBS Service Stop Script
# Stops all CECBS services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Stopping CECBS Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stop Node processes (API & UI)
Write-Host "Stopping API and UI..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "✓ Node processes stopped" -ForegroundColor Green

# Stop Docker containers
Write-Host "Stopping blockchain network..." -ForegroundColor Yellow
Set-Location "C:\CEX"
docker-compose -f docker-compose-fabric.yml down
Write-Host "✓ Blockchain network stopped" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "ALL SERVICES STOPPED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
