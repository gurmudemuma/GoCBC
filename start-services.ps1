# CECBS Service Startup Script
# Starts API and UI services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting CECBS Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Check if blockchain is running
Write-Host "Checking blockchain network..." -ForegroundColor Yellow
$peers = docker ps --filter "name=peer" --format "{{.Names}}" | Measure-Object | Select-Object -ExpandProperty Count

if ($peers -eq 0) {
    Write-Host "✗ Blockchain network not running!" -ForegroundColor Red
    Write-Host "Run: docker-compose -f docker-compose-fabric.yml up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Blockchain network running ($peers peers)" -ForegroundColor Green
Write-Host ""

# Start API server in new window
Write-Host "Starting API server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\CEX\api; Write-Host 'API Server Starting...' -ForegroundColor Cyan; npm start"
Write-Host "✓ API server starting on http://localhost:3001" -ForegroundColor Green

# Wait a bit for API to start
Start-Sleep -Seconds 5

# Start UI in new window
Write-Host "Starting UI..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\CEX\ui; Write-Host 'UI Starting...' -ForegroundColor Cyan; npm run dev"
Write-Host "✓ UI starting on http://localhost:3000" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SERVICES STARTED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access Points:" -ForegroundColor Cyan
Write-Host "• UI: http://localhost:3000" -ForegroundColor White
Write-Host "• API: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Default Logins:" -ForegroundColor Cyan
Write-Host "• ECTA: ecta_admin / password123" -ForegroundColor White
Write-Host "• NBE: nbe_admin / password123" -ForegroundColor White
Write-Host "• Banks: bank_admin / password123" -ForegroundColor White
Write-Host "• Exporter: EXP1087072 / password123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C in service windows to stop" -ForegroundColor Yellow
Write-Host ""
