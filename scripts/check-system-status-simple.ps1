# CECBS System Status Check Script
# Quick verification of all system components

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  CECBS System Status Check" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check API Server (Port 3001)
Write-Host "[1] Checking API Server (Port 3001)..." -ForegroundColor Yellow
$apiPort = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($apiPort) {
    Write-Host "    [OK] API Server: Running (PID: $($apiPort.OwningProcess))" -ForegroundColor Green
    
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5
        Write-Host "    [OK] Health Check: $($health.status)" -ForegroundColor Green
        Write-Host "    [OK] Database: $(if($health.services.database){'Connected'}else{'Disconnected'})" -ForegroundColor $(if($health.services.database){'Green'}else{'Red'})
        Write-Host "    [OK] Blockchain: $(if($health.services.blockchain){'Connected'}else{'Disconnected'})" -ForegroundColor $(if($health.services.blockchain){'Green'}else{'Red'})
        Write-Host "    [OK] Version: $($health.version)" -ForegroundColor Green
    } catch {
        Write-Host "    [WARN] Health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "    [ERROR] API Server: NOT running" -ForegroundColor Red
    Write-Host "    [INFO] Start with: cd api; npm run dev" -ForegroundColor Yellow
}

Write-Host ""

# Check UI Server (Port 3000)
Write-Host "[2] Checking UI Server (Port 3000)..." -ForegroundColor Yellow
$uiPort = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($uiPort) {
    Write-Host "    [OK] UI Server: Running (PID: $($uiPort.OwningProcess))" -ForegroundColor Green
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -UseBasicParsing
        Write-Host "    [OK] Response: HTTP $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "    [WARN] UI check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "    [ERROR] UI Server: NOT running" -ForegroundColor Red
    Write-Host "    [INFO] Start with: cd ui; npm run dev" -ForegroundColor Yellow
}

Write-Host ""

# Check Database
Write-Host "[3] Checking Database..." -ForegroundColor Yellow
$dbPath = ".\api\cecbs.db"
if (Test-Path $dbPath) {
    $dbSize = (Get-Item $dbPath).Length
    Write-Host "    [OK] Database: Found" -ForegroundColor Green
    Write-Host "    [OK] Path: $dbPath" -ForegroundColor Green
    Write-Host "    [OK] Size: $dbSize bytes" -ForegroundColor Green
} else {
    Write-Host "    [ERROR] Database: Not found at $dbPath" -ForegroundColor Red
}

Write-Host ""

# Test Applications API
Write-Host "[4] Testing Applications API..." -ForegroundColor Yellow
if ($apiPort) {
    try {
        $loginData = '{"username":"ecta_admin","password":"password123"}'
        
        $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 5
        Write-Host "    [OK] Authentication: Working" -ForegroundColor Green
        
        $token = $loginResponse.token
        $headers = @{
            Authorization = "Bearer $token"
        }
        
        $appsResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/exporters/exporter-applications?status=pending" -Method GET -Headers $headers -TimeoutSec 5
        Write-Host "    [OK] Applications API: Working" -ForegroundColor Green
        Write-Host "    [OK] Pending Applications: $($appsResponse.data.Count)" -ForegroundColor Green
        
        if ($appsResponse.data.Count -gt 0) {
            Write-Host ""
            Write-Host "    Application Details:" -ForegroundColor Cyan
            foreach($app in $appsResponse.data) {
                Write-Host "       - $($app.application_id): $($app.company_name) - $($app.status)" -ForegroundColor White
            }
        }
    } catch {
        Write-Host "    [WARN] API test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Access URLs" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  UI Home:           http://localhost:3000" -ForegroundColor White
Write-Host "  Login:             http://localhost:3000/login" -ForegroundColor White
Write-Host "  Register Exporter: http://localhost:3000/register-exporter" -ForegroundColor White
Write-Host "  ECTA Portal:       http://localhost:3000/portals/ecta" -ForegroundColor White
Write-Host "  API Docs:          http://localhost:3001/api-docs" -ForegroundColor White
Write-Host "  Health Check:      http://localhost:3001/health" -ForegroundColor White
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
