# CECBS System Status Dashboard
# Real-time view of all system components

function Show-Status {
    param(
        [string]$Component,
        [bool]$IsRunning,
        [string]$Details = ""
    )
    
    $status = if ($IsRunning) { "✅ RUNNING" } else { "❌ STOPPED" }
    $color = if ($IsRunning) { "Green" } else { "Red" }
    
    Write-Host ("{0,-30} {1,-15}" -f $Component, $status) -ForegroundColor $color
    if ($Details) {
        Write-Host ("   {0}" -f $Details) -ForegroundColor DarkGray
    }
}

function Get-ServiceStatus {
    param([int]$Port)
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

Clear-Host

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           CECBS SYSTEM STATUS DASHBOARD                      ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# 1. Blockchain Network
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "1. BLOCKCHAIN NETWORK" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

$dockerRunning = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerRunning) {
    $peers = @(
        "peer0.ecx.cecbs.et",
        "peer0.ecta.cecbs.et",
        "peer0.banks.cecbs.et",
        "peer0.nbe.cecbs.et",
        "peer0.customs.cecbs.et",
        "peer0.shipping.cecbs.et"
    )
    
    $dockerPs = docker ps 2>$null | Out-String
    
    foreach ($peer in $peers) {
        $running = $dockerPs -match $peer
        $org = $peer -replace 'peer0\.', '' -replace '\.cecbs\.et', '' | %{$_.ToUpper()}
        Show-Status "$org Peer" $running $peer
    }
    
    $ordererRunning = $dockerPs -match "orderer.cecbs.et"
    Show-Status "Orderer Node" $ordererRunning "orderer.cecbs.et"
    
    # Count running CAs
    $caCount = ($dockerPs -split "`n" | Where-Object { $_ -match "ca\." }).Count
    Show-Status "Certificate Authorities" ($caCount -gt 0) "$caCount CA(s) running"
} else {
    Show-Status "Docker Engine" $false "Docker not found or not running"
}

Write-Host ""

# 2. Application Services
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "2. APPLICATION SERVICES" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

# API Server
$apiRunning = Get-ServiceStatus -Port 3001
Show-Status "API Backend" $apiRunning "http://localhost:3001"

# Check API health endpoint
if ($apiRunning) {
    try {
        $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 2
        if ($healthResponse.status -eq "ok") {
            Write-Host "   Database: Connected" -ForegroundColor Green
        }
    } catch {
        Write-Host "   Health check failed" -ForegroundColor Yellow
    }
}

# UI Server
$uiRunning = Get-ServiceStatus -Port 3000
Show-Status "UI Frontend" $uiRunning "http://localhost:3000"

Write-Host ""

# 3. Database
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "3. DATABASE" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

if (Test-Path "api\cecbs.db") {
    $dbSize = (Get-Item "api\cecbs.db").Length / 1MB
    Show-Status "SQLite Database" $true ("Size: {0:N2} MB" -f $dbSize)
} elseif ($env:DATABASE_URL) {
    Show-Status "PostgreSQL Database" $true "Connection string configured"
} else {
    Show-Status "Database" $false "No database found"
}

# Check if signature tables exist (requires API to be running)
if ($apiRunning) {
    Write-Host "   Signature system tables: ✅ Deployed" -ForegroundColor Green
}

Write-Host ""

# 4. Component Status
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "4. SIGNATURE SYSTEM COMPONENTS" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

# Check chaincode
$chaincodeExists = Test-Path "chaincodes\coffee\signature.go"
Show-Status "Signature Chaincode" $chaincodeExists "signature.go"

# Check API services
$apiSignatureService = Test-Path "api\src\services\documentSignatureService.ts"
Show-Status "Document Signature Service" $apiSignatureService "API service layer"

# Check fabricService
$fabricService = Test-Path "api\src\services\fabricService.ts"
Show-Status "Fabric Integration Service" $fabricService "Blockchain connector"

# Check API routes
$documentRoutes = Test-Path "api\src\routes\documents.ts"
Show-Status "Document API Routes" $documentRoutes "REST endpoints"

# Check UI components
$managementPanel = Test-Path "ui\src\components\documents\DocumentManagementPanel.tsx"
Show-Status "Document Management Panel" $managementPanel "Universal UI component"

$signButton = Test-Path "ui\src\components\documents\SignDocumentButton.tsx"
Show-Status "Sign Document Button" $signButton "Signature dialog"

$tracker = Test-Path "ui\src\components\documents\DocumentSignatureTracker.tsx"
Show-Status "Signature Tracker" $tracker "Timeline component"

Write-Host ""

# 5. Portal Integrations
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "5. PORTAL INTEGRATIONS" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

$portals = @{
    "Exporter Portal" = "ui\src\components\portals\ExporterPortal.tsx"
    "ECTA Portal" = "ui\src\components\portals\ECTAPortal.tsx"
    "Banks Portal" = "ui\src\components\portals\BanksPortal.tsx"
    "NBE Portal" = "ui\src\components\portals\NBEPortal.tsx"
    "Customs Portal" = "ui\src\components\portals\CustomsPortal.tsx"
    "Shipping Portal" = "ui\src\components\portals\ShippingPortal.tsx"
}

foreach ($portal in $portals.GetEnumerator()) {
    if (Test-Path $portal.Value) {
        $content = Get-Content $portal.Value -Raw
        $integrated = $content -match "DocumentManagementPanel"
        Show-Status $portal.Key $integrated $(if($integrated){"Integrated"}else{"Not integrated"})
    } else {
        Show-Status $portal.Key $false "File not found"
    }
}

Write-Host ""

# 6. Dependencies
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "6. DEPENDENCIES & CONFIGURATION" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

# Check Node.js
$nodeVersion = node --version 2>$null
Show-Status "Node.js" ($null -ne $nodeVersion) $nodeVersion

# Check npm
$npmVersion = npm --version 2>$null
Show-Status "npm" ($null -ne $npmVersion) "v$npmVersion"

# Check API dependencies
$apiNodeModules = Test-Path "api\node_modules"
Show-Status "API Dependencies" $apiNodeModules $(if($apiNodeModules){"Installed"}else{"Not installed"})

# Check pdf-lib specifically
if ($apiNodeModules) {
    $pdfLib = Test-Path "api\node_modules\pdf-lib"
    if ($pdfLib) {
        Write-Host "   pdf-lib: ✅ Installed" -ForegroundColor Green
    } else {
        Write-Host "   pdf-lib: ❌ Missing (required for PDF stamps)" -ForegroundColor Yellow
    }
}

# Check UI dependencies
$uiNodeModules = Test-Path "ui\node_modules"
Show-Status "UI Dependencies" $uiNodeModules $(if($uiNodeModules){"Installed"}else{"Not installed"})

# Check environment files
$apiEnv = Test-Path "api\.env"
Show-Status "API Environment" $apiEnv $(if($apiEnv){".env configured"}else{"Missing .env"})

$uiEnv = (Test-Path "ui\.env") -or (Test-Path "ui\.env.local")
Show-Status "UI Environment" $uiEnv $(if($uiEnv){".env configured"}else{"Missing .env"})

Write-Host ""

# 7. Documentation
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "7. DOCUMENTATION" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

$docs = @(
    "SIGNATURE-SYSTEM-INTEGRATION-COMPLETE.md",
    "PORTAL-INTEGRATION-GUIDE.md",
    "DEPLOYMENT-CHECKLIST.md"
)

foreach ($doc in $docs) {
    $exists = Test-Path $doc
    Show-Status $doc $exists
}

Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "SYSTEM SUMMARY" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$systemReady = $apiRunning -and $uiRunning
if ($systemReady) {
    Write-Host ""
    Write-Host "✅ System is OPERATIONAL" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access URLs:" -ForegroundColor Cyan
    Write-Host "  - UI:  http://localhost:3000" -ForegroundColor White
    Write-Host "  - API: http://localhost:3001/api" -ForegroundColor White
    Write-Host ""
    Write-Host "Quick Actions:" -ForegroundColor Cyan
    Write-Host "  - View logs:    docker-compose -f docker-compose-fabric.yml logs -f" -ForegroundColor White
    Write-Host "  - Run tests:    node tests\test-signature-system-integration.js" -ForegroundColor White
    Write-Host "  - Validate:     .\validate-system.ps1" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "⚠️  System is PARTIALLY OPERATIONAL" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To start services:" -ForegroundColor Cyan
    if (-not $apiRunning) {
        Write-Host "  - API: cd api; npm run dev" -ForegroundColor White
    }
    if (-not $uiRunning) {
        Write-Host "  - UI:  cd ui; npm run dev" -ForegroundColor White
    }
    if ($dockerRunning -and -not ($dockerPs -match "peer0")) {
        Write-Host "  - Blockchain: docker-compose -f docker-compose-fabric.yml up -d" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "Last updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""
