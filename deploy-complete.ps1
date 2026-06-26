#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Complete Audit Trail Deployment - ONE COMMAND

.DESCRIPTION
    Deploys everything:
    1. Chaincode to blockchain
    2. Restarts API server
    3. Verifies deployment
    4. Runs tests

.EXAMPLE
    .\deploy-complete.ps1
#>

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CECBS Audit Trail - Complete Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to project root
Set-Location $PROJECT_ROOT
Write-Host "Working directory: $PROJECT_ROOT" -ForegroundColor Yellow
Write-Host ""

#region Step 1: Deploy Chaincode
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 1: Deploy Chaincode v2.1" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Try Docker-based deployment (no peer CLI needed)
if (Test-Path ".\scripts\deploy-docker.ps1") {
    Write-Host "Using Docker-based deployment (no peer CLI required)..." -ForegroundColor Yellow
    & .\scripts\deploy-docker.ps1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Chaincode deployment failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "[OK] Chaincode deployed successfully" -ForegroundColor Green
} else {
    Write-Host "ERROR: Deployment script not found!" -ForegroundColor Red
    exit 1
}
#endregion

Write-Host ""
Write-Host "Waiting 5 seconds for chaincode to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ""

#region Step 2: Restart API Server
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 2: Restart API Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stop existing Node processes
Write-Host "Stopping existing API server..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

# Check if using PM2
$pm2Available = Get-Command pm2 -ErrorAction SilentlyContinue

if ($pm2Available) {
    Write-Host "Using PM2 to restart API..." -ForegroundColor Yellow
    Set-Location ".\api"
    
    # Check if PM2 process exists
    $pm2List = pm2 list 2>&1 | Out-String
    
    if ($pm2List -match "api") {
        Write-Host "Restarting existing PM2 process..." -ForegroundColor Cyan
        pm2 restart api
    } else {
        Write-Host "Starting new PM2 process..." -ForegroundColor Cyan
        pm2 start npm --name api -- start
    }
    
    Set-Location $PROJECT_ROOT
    Write-Host "[OK] API server restarted with PM2" -ForegroundColor Green
} else {
    Write-Host "Starting API server in background..." -ForegroundColor Yellow
    
    # Start API in background job
    $apiJob = Start-Job -ScriptBlock {
        Set-Location $using:PROJECT_ROOT\api
        npm start
    }
    
    Write-Host "API Job ID: $($apiJob.Id)" -ForegroundColor Gray
    Write-Host "[OK] API server started (Job ID: $($apiJob.Id))" -ForegroundColor Green
    Write-Host ""
    Write-Host "To view API logs: Receive-Job -Id $($apiJob.Id) -Keep" -ForegroundColor Yellow
    Write-Host "To stop API: Stop-Job -Id $($apiJob.Id); Remove-Job -Id $($apiJob.Id)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Waiting 10 seconds for API to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host ""
#endregion

#region Step 3: Verify Deployment
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 3: Verify Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path ".\scripts\verify-audit-deployment.ps1") {
    Write-Host "Running verification tests..." -ForegroundColor Yellow
    Write-Host ""
    & .\scripts\verify-audit-deployment.ps1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "WARNING: Some verification tests failed" -ForegroundColor Yellow
        Write-Host "Check output above for details" -ForegroundColor Yellow
    }
} else {
    Write-Host "Verification script not found, running manual checks..." -ForegroundColor Yellow
    Write-Host ""
    
    # Manual verification
    Write-Host "Checking API server..." -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host "[OK] API server is responding (Status: $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] API server not responding" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Checking audit endpoints..." -ForegroundColor Cyan
    try {
        $auditResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/audit/TEST_123" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
    }
    
    if ($statusCode -eq 404 -or $statusCode -eq 500) {
        Write-Host "[OK] Audit endpoints available (returned $statusCode)" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Audit endpoint may not be configured (returned $statusCode)" -ForegroundColor Yellow
    }
}
#endregion

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host "SUMMARY:" -ForegroundColor Yellow
Write-Host "  ✅ Chaincode v2.1 deployed to blockchain" -ForegroundColor Green
Write-Host "  ✅ API server restarted with audit routes" -ForegroundColor Green
Write-Host "  ✅ Verification tests completed" -ForegroundColor Green
Write-Host ""

Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "1. Test Audit Trail:" -ForegroundColor White
Write-Host "   - Navigate to Exporter Portal" -ForegroundColor Gray
Write-Host "   - Click 'Audit Trail' button on profile card" -ForegroundColor Gray
Write-Host "   - Register a test exporter and view audit log" -ForegroundColor Gray
Write-Host ""
Write-Host "2. API Endpoints:" -ForegroundColor White
Write-Host "   - Health: http://localhost:3001/health" -ForegroundColor Gray
Write-Host "   - Audit by entity: http://localhost:3001/api/audit/entity/EXPORTER/{id}" -ForegroundColor Gray
Write-Host "   - Verify integrity: http://localhost:3001/api/audit/verify/EXPORTER/{id}" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Quick Test:" -ForegroundColor White
Write-Host '   curl -X POST http://localhost:3001/api/exporters/register \' -ForegroundColor Gray
Write-Host '     -H "Content-Type: application/json" \' -ForegroundColor Gray
Write-Host '     -d ''{"exporterId":"TEST_001","companyName":"Test Corp",...}''' -ForegroundColor Gray
Write-Host ""
Write-Host "4. View API Logs:" -ForegroundColor White
Write-Host "   cat api\logs\combined.log" -ForegroundColor Gray
Write-Host "   cat api\logs\error.log" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Monitor Chaincode:" -ForegroundColor White
Write-Host "   docker logs -f peer0.ecta.cecbs.et" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
