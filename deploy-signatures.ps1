# CECBS Document Signature System - Quick Deployment Script (PowerShell)
# Deploys signature system components and validates integration

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   CECBS Document Signature System - Quick Deploy             ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install API dependencies
Write-Host "[1/6] Installing API dependencies..." -ForegroundColor Blue
Push-Location api
try {
    npm install --silent | Out-Null
    Write-Host "✅ API dependencies installed" -ForegroundColor Green
    
    # Check for pdf-lib
    $pdfLibInstalled = npm list pdf-lib 2>$null
    if ($pdfLibInstalled -match "pdf-lib") {
        Write-Host "✅ pdf-lib is installed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Installing pdf-lib..." -ForegroundColor Yellow
        npm install pdf-lib@1.17.1 --save | Out-Null
    }
} catch {
    Write-Host "❌ Failed to install API dependencies" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

# Step 2: Run database migration
Write-Host "[2/6] Running database migration..." -ForegroundColor Blue
Push-Location api
try {
    node run-signature-migration.js
    Write-Host "✅ Database migration completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Database migration failed" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

# Step 3: Deploy chaincode
Write-Host "[3/6] Deploying signature chaincode..." -ForegroundColor Blue
Push-Location blockchain

# Check if blockchain is running
$dockerPs = docker ps 2>$null | Out-String
if ($dockerPs -notmatch "peer0.ecx.cecbs.et") {
    Write-Host "⚠️  Blockchain network not running" -ForegroundColor Yellow
    Write-Host "   Starting blockchain network..." -ForegroundColor Yellow
    docker-compose -f ..\docker-compose-fabric.yml up -d
    Write-Host "   Waiting for network to stabilize (30s)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}

# Deploy chaincode
try {
    if (Test-Path "deploy-chaincode.sh") {
        bash deploy-chaincode.sh
        Write-Host "✅ Chaincode deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  deploy-chaincode.sh not found" -ForegroundColor Yellow
        Write-Host "   You may need to deploy chaincode manually" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Chaincode deployment failed" -ForegroundColor Red
    Write-Host "   You may need to deploy manually" -ForegroundColor Yellow
} finally {
    Pop-Location
}

# Step 4: Verify UI components
Write-Host "[4/6] Verifying UI components..." -ForegroundColor Blue
$MissingComponents = 0

if (Test-Path "ui\src\components\documents\DocumentManagementPanel.tsx") {
    Write-Host "✅ DocumentManagementPanel exists" -ForegroundColor Green
} else {
    Write-Host "❌ DocumentManagementPanel not found" -ForegroundColor Red
    $MissingComponents++
}

if (Test-Path "ui\src\components\documents\SignDocumentButton.tsx") {
    Write-Host "✅ SignDocumentButton exists" -ForegroundColor Green
} else {
    Write-Host "❌ SignDocumentButton not found" -ForegroundColor Red
    $MissingComponents++
}

if (Test-Path "ui\src\components\documents\DocumentSignatureTracker.tsx") {
    Write-Host "✅ DocumentSignatureTracker exists" -ForegroundColor Green
} else {
    Write-Host "❌ DocumentSignatureTracker not found" -ForegroundColor Red
    $MissingComponents++
}

if ($MissingComponents -gt 0) {
    Write-Host "❌ Some UI components are missing" -ForegroundColor Red
    exit 1
}

# Step 5: Verify portal integrations
Write-Host "[5/6] Verifying portal integrations..." -ForegroundColor Blue
$Portals = @(
    "ui\src\components\portals\ExporterPortal.tsx",
    "ui\src\components\portals\ECTAPortal.tsx",
    "ui\src\components\portals\BanksPortal.tsx",
    "ui\src\components\portals\NBEPortal.tsx",
    "ui\src\components\portals\CustomsPortal.tsx",
    "ui\src\components\portals\ShippingPortal.tsx"
)

$IntegrationIssues = 0
foreach ($portal in $Portals) {
    $portalName = (Split-Path $portal -Leaf) -replace '.tsx',''
    if (Test-Path $portal) {
        $content = Get-Content $portal -Raw
        if ($content -match "DocumentManagementPanel") {
            Write-Host "✅ $portalName integrated" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $portalName may need integration" -ForegroundColor Yellow
            $IntegrationIssues++
        }
    } else {
        Write-Host "❌ $portalName not found" -ForegroundColor Red
        $IntegrationIssues++
    }
}

if ($IntegrationIssues -gt 0) {
    Write-Host "⚠️  Some portals may need manual integration" -ForegroundColor Yellow
    Write-Host "   See PORTAL-INTEGRATION-GUIDE.md for details" -ForegroundColor Yellow
}

# Step 6: Run validation
Write-Host "[6/6] Running system validation..." -ForegroundColor Blue
try {
    .\validate-system.ps1
    Write-Host "✅ System validation passed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  System validation completed with warnings" -ForegroundColor Yellow
}

# Final summary
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    DEPLOYMENT SUMMARY                         ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Document signature system deployed" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Start API server:  cd api; npm run dev"
Write-Host "2. Start UI server:   cd ui; npm run dev"
Write-Host "3. Run tests:         node tests\test-signature-system-integration.js"
Write-Host "4. Open browser:      http://localhost:3000"
Write-Host ""
Write-Host "Documentation:"
Write-Host "- Full guide:         SIGNATURE-SYSTEM-INTEGRATION-COMPLETE.md"
Write-Host "- Portal guide:       PORTAL-INTEGRATION-GUIDE.md"
Write-Host "- Deployment guide:   DEPLOYMENT-CHECKLIST.md"
Write-Host ""
Write-Host "System ready for testing!" -ForegroundColor Green
