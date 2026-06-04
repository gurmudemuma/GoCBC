# CECBS System Status Check Script
# Quick verification of all system components

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  CECBS System Status Check" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check API Server (Port 3001)
Write-Host "🔍 Checking API Server (Port 3001)..." -ForegroundColor Yellow
$apiPort = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($apiPort) {
    Write-Host "   ✅ API Server: Running (PID: $($apiPort.OwningProcess))" -ForegroundColor Green
    
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5
        Write-Host "   ✅ Health Check: $($health.status)" -ForegroundColor Green
        Write-Host "   ✅ Database: $(if($health.services.database){'Connected'}else{'Disconnected'})" -ForegroundColor $(if($health.services.database){'Green'}else{'Red'})
        Write-Host "   ✅ Blockchain: $(if($health.services.blockchain){'Connected'}else{'Disconnected'})" -ForegroundColor $(if($health.services.blockchain){'Green'}else{'Red'})
        Write-Host "   ✅ Version: $($health.version)" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ API Server: NOT running" -ForegroundColor Red
    Write-Host "   💡 Start with: cd api; npm run dev" -ForegroundColor Yellow
}

Write-Host ""

# Check UI Server (Port 3000)
Write-Host "🔍 Checking UI Server (Port 3000)..." -ForegroundColor Yellow
$uiPort = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($uiPort) {
    Write-Host "   ✅ UI Server: Running (PID: $($uiPort.OwningProcess))" -ForegroundColor Green
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -UseBasicParsing
        Write-Host "   ✅ Response: HTTP $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  UI check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ UI Server: NOT running" -ForegroundColor Red
    Write-Host "   💡 Start with: cd ui; npm run dev" -ForegroundColor Yellow
}

Write-Host ""

# Check Database
Write-Host "🔍 Checking Database..." -ForegroundColor Yellow
$dbPath = ".\api\cecbs.db"
if (Test-Path $dbPath) {
    $dbSize = (Get-Item $dbPath).Length
    Write-Host "   ✅ Database: Found" -ForegroundColor Green
    Write-Host "   ✅ Path: $dbPath" -ForegroundColor Green
    Write-Host "   ✅ Size: $dbSize bytes" -ForegroundColor Green
} else {
    Write-Host "   ❌ Database: Not found at $dbPath" -ForegroundColor Red
}

Write-Host ""

# Test Applications API
Write-Host "🔍 Testing Applications API..." -ForegroundColor Yellow
if ($apiPort) {
    try {
        $loginData = @{
            username = "ecta_admin"
            password = "password123"
        } | ConvertTo-Json
        
        $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 5
        Write-Host "   ✅ Authentication: Working" -ForegroundColor Green
        
        $token = $loginResponse.token
        $headers = @{
            Authorization = "Bearer $token"
        }
        
        $appsResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/exporters/exporter-applications?status=pending" -Method GET -Headers $headers -TimeoutSec 5
        Write-Host "   ✅ Applications API: Working" -ForegroundColor Green
        Write-Host "   ✅ Pending Applications: $($appsResponse.data.Count)" -ForegroundColor Green
        
        if ($appsResponse.data.Count -gt 0) {
            Write-Host ""
            Write-Host "   📋 Application Details:" -ForegroundColor Cyan
            foreach($app in $appsResponse.data) {
                Write-Host "      • $($app.application_id): $($app.company_name) - $($app.status)" -ForegroundColor White
            }
        }
    } catch {
        Write-Host "   ⚠️  API test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Access URLs" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  🌐 UI Home:           http://localhost:3000" -ForegroundColor White
Write-Host "  🔐 Login:             http://localhost:3000/login" -ForegroundColor White
Write-Host "  📝 Register Exporter: http://localhost:3000/register-exporter" -ForegroundColor White
Write-Host "  🏢 ECTA Portal:       http://localhost:3000/portals/ecta" -ForegroundColor White
Write-Host "  🔧 API Docs:          http://localhost:3001/api-docs" -ForegroundColor White
Write-Host "  💊 Health Check:      http://localhost:3001/health" -ForegroundColor White
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
