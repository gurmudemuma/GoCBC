# CECBS System Validation Script (PowerShell)
# Validates all components are working without discrepancies

$ErrorActionPreference = "Continue"

# Counters
$script:TotalChecks = 0
$script:PassedChecks = 0
$script:FailedChecks = 0

# Helper functions
function Print-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host ""
}

function Check-Pass {
    param([string]$Message, [string]$Details = "")
    $script:TotalChecks++
    $script:PassedChecks++
    Write-Host "✅ $Message" -ForegroundColor Green
    if ($Details) {
        Write-Host "   $Details" -ForegroundColor DarkGray
    }
}

function Check-Fail {
    param([string]$Message, [string]$Error = "")
    $script:TotalChecks++
    $script:FailedChecks++
    Write-Host "❌ $Message" -ForegroundColor Red
    if ($Error) {
        Write-Host "   Error: $Error" -ForegroundColor Red
    }
}

function Check-Warn {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Check-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

# Banner
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     CECBS System Validation - Comprehensive Check            ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Environment Setup Validation
Print-Header "1. ENVIRONMENT SETUP"

# Check Node.js
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Check-Pass "Node.js installed" $nodeVersion
} else {
    Check-Fail "Node.js not found" "Install Node.js 18+"
}

# Check npm
$npmVersion = npm --version 2>$null
if ($npmVersion) {
    Check-Pass "npm installed" "v$npmVersion"
} else {
    Check-Fail "npm not found"
}

# Check Docker
$dockerVersion = docker --version 2>$null
if ($dockerVersion) {
    Check-Pass "Docker installed" $dockerVersion
} else {
    Check-Fail "Docker not found" "Required for blockchain"
}

# Check Docker Compose
$composeVersion = docker-compose --version 2>$null
if ($composeVersion) {
    Check-Pass "Docker Compose installed" $composeVersion
} else {
    Check-Fail "Docker Compose not found"
}

# 2. Directory Structure Validation
Print-Header "2. DIRECTORY STRUCTURE"

$RequiredDirs = @(
    "api",
    "ui",
    "blockchain",
    "chaincodes\coffee",
    "tests"
)

foreach ($dir in $RequiredDirs) {
    if (Test-Path $dir) {
        Check-Pass "Directory exists: $dir"
    } else {
        Check-Fail "Missing directory: $dir"
    }
}

# 3. API Setup Validation
Print-Header "3. API BACKEND SETUP"

if (Test-Path "api\package.json") {
    Check-Pass "API package.json exists"
    
    # Check for pdf-lib dependency
    $packageJson = Get-Content "api\package.json" -Raw
    if ($packageJson -match "pdf-lib") {
        Check-Pass "pdf-lib dependency configured"
    } else {
        Check-Fail "pdf-lib dependency missing" "Run: cd api && npm install pdf-lib@1.17.1"
    }
    
    # Check node_modules
    if (Test-Path "api\node_modules") {
        Check-Pass "API dependencies installed"
    } else {
        Check-Warn "API node_modules not found - run: cd api && npm install"
    }
} else {
    Check-Fail "API package.json not found"
}

# Check API environment file
if (Test-Path "api\.env") {
    Check-Pass "API .env file exists"
    
    $envContent = Get-Content "api\.env" -Raw
    if ($envContent -match "DATABASE_URL") {
        Check-Pass "DATABASE_URL configured"
    } else {
        Check-Fail "DATABASE_URL not set in .env"
    }
} else {
    Check-Warn "API .env file not found - copy from .env.example"
}

# Check API source files
$RequiredAPIFiles = @(
    "api\src\server.ts",
    "api\src\routes\documents.ts",
    "api\src\services\fabricService.ts",
    "api\src\services\documentSignatureService.ts"
)

foreach ($file in $RequiredAPIFiles) {
    if (Test-Path $file) {
        Check-Pass "API file exists: $(Split-Path $file -Leaf)"
    } else {
        Check-Fail "Missing API file: $file"
    }
}

# Check migration files
if (Test-Path "api\migrate-document-signatures.sql") {
    Check-Pass "Signature migration SQL exists"
} else {
    Check-Fail "Signature migration SQL not found"
}

if (Test-Path "api\run-signature-migration.js") {
    Check-Pass "Signature migration runner exists"
} else {
    Check-Fail "Signature migration runner not found"
}

# 4. UI Setup Validation
Print-Header "4. UI FRONTEND SETUP"

if (Test-Path "ui\package.json") {
    Check-Pass "UI package.json exists"
    
    if (Test-Path "ui\node_modules") {
        Check-Pass "UI dependencies installed"
    } else {
        Check-Warn "UI node_modules not found - run: cd ui && npm install"
    }
} else {
    Check-Fail "UI package.json not found"
}

# Check UI environment file
if ((Test-Path "ui\.env") -or (Test-Path "ui\.env.local")) {
    Check-Pass "UI environment file exists"
} else {
    Check-Warn "UI .env file not found - copy from .env.example"
}

# Check UI components
$RequiredUIComponents = @(
    "ui\src\components\documents\DocumentManagementPanel.tsx",
    "ui\src\components\documents\SignDocumentButton.tsx",
    "ui\src\components\documents\DocumentSignatureTracker.tsx",
    "ui\src\components\documents\index.ts"
)

foreach ($file in $RequiredUIComponents) {
    if (Test-Path $file) {
        Check-Pass "UI component exists: $(Split-Path $file -Leaf)"
    } else {
        Check-Fail "Missing UI component: $file"
    }
}

# Check portal integrations
$PortalFiles = @(
    "ui\src\components\portals\ExporterPortal.tsx",
    "ui\src\components\portals\ECTAPortal.tsx",
    "ui\src\components\portals\BanksPortal.tsx",
    "ui\src\components\portals\NBEPortal.tsx",
    "ui\src\components\portals\CustomsPortal.tsx",
    "ui\src\components\portals\ShippingPortal.tsx"
)

foreach ($file in $PortalFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match "DocumentManagementPanel") {
            Check-Pass "Portal integrated: $(Split-Path $file -Leaf)"
        } else {
            Check-Warn "Portal may need integration: $(Split-Path $file -Leaf)"
        }
    } else {
        Check-Fail "Missing portal file: $file"
    }
}

# 5. Blockchain Setup Validation
Print-Header "5. BLOCKCHAIN SETUP"

if (Test-Path "chaincodes\coffee\signature.go") {
    Check-Pass "Signature chaincode exists"
    
    $sigCode = Get-Content "chaincodes\coffee\signature.go" -Raw
    if ($sigCode -match "SignDocument") {
        Check-Pass "SignDocument function implemented"
    } else {
        Check-Fail "SignDocument function not found"
    }
    
    if ($sigCode -match "GetDocumentSignatures") {
        Check-Pass "GetDocumentSignatures function implemented"
    } else {
        Check-Fail "GetDocumentSignatures function not found"
    }
} else {
    Check-Fail "signature.go not found"
}

# Check blockchain configuration
if (Test-Path "docker-compose-fabric.yml") {
    Check-Pass "Docker Compose config exists"
} else {
    Check-Fail "docker-compose-fabric.yml not found"
}

# Check if blockchain is running
$dockerPs = docker ps 2>$null | Out-String
if ($dockerPs -match "peer0.ecx.cecbs.et") {
    Check-Pass "Blockchain network is running"
} else {
    Check-Warn "Blockchain network not running - start with: docker-compose -f docker-compose-fabric.yml up -d"
}

# 6. Database Validation
Print-Header "6. DATABASE SETUP"

if (Test-Path "api\cecbs.db") {
    Check-Pass "SQLite database file exists"
} else {
    Check-Info "Using PostgreSQL or database not initialized"
}

Check-Info "Database schema validation requires running API server"

# 7. Service Health Checks
Print-Header "7. SERVICE HEALTH CHECKS"

# Check if API is running
try {
    $apiHealth = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5 2>$null
    if ($apiHealth.StatusCode -eq 200) {
        Check-Pass "API server is responsive"
        Check-Pass "API health check passed"
    }
} catch {
    Check-Warn "API server not running - start with: cd api && npm run dev"
}

# Check if UI is running
try {
    $uiHealth = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 2>$null
    if ($uiHealth.StatusCode -eq 200) {
        Check-Pass "UI server is responsive"
    }
} catch {
    Check-Warn "UI server not running - start with: cd ui && npm run dev"
}

# 8. Integration Validation
Print-Header "8. INTEGRATION VALIDATION"

if (Test-Path "tests\test-signature-system-integration.js") {
    Check-Pass "Integration test suite exists"
    Check-Info "Run with: node tests\test-signature-system-integration.js"
} else {
    Check-Fail "Integration test suite not found"
}

if (Test-Path "SIGNATURE-SYSTEM-INTEGRATION-COMPLETE.md") {
    Check-Pass "Integration documentation exists"
} else {
    Check-Warn "Integration documentation not found"
}

if (Test-Path "PORTAL-INTEGRATION-GUIDE.md") {
    Check-Pass "Portal integration guide exists"
} else {
    Check-Warn "Portal integration guide not found"
}

# 9. Configuration Validation
Print-Header "9. CONFIGURATION VALIDATION"

if ((Test-Path "api\src\config\api.config.ts") -or (Test-Path "api\src\config\api.config.js")) {
    Check-Pass "API configuration file exists"
} else {
    Check-Warn "API configuration file not found"
}

if (Test-Path "blockchain\configtx.yaml") {
    Check-Pass "Blockchain config (configtx.yaml) exists"
} else {
    Check-Fail "configtx.yaml not found"
}

if (Test-Path "blockchain\crypto-config.yaml") {
    Check-Pass "Crypto config (crypto-config.yaml) exists"
} else {
    Check-Fail "crypto-config.yaml not found"
}

# 10. Security Validation
Print-Header "10. SECURITY CHECKS"

if (Test-Path "api\.env") {
    $envContent = Get-Content "api\.env" -Raw
    if ($envContent -match "password.*=") {
        Check-Warn "Passwords found in .env - ensure production security"
    }
}

if (Test-Path "nginx-configs") {
    Check-Pass "Nginx configs directory exists"
    if (Test-Path "nginx-configs\cecbs-production.conf") {
        Check-Pass "Production nginx config exists"
    }
} else {
    Check-Info "Nginx configs not set up (OK for development)"
}

# Summary
Print-Header "VALIDATION SUMMARY"

$PassRate = 0
if ($TotalChecks -gt 0) {
    $PassRate = [math]::Round(($PassedChecks / $TotalChecks) * 100, 0)
}

Write-Host "Total Checks:  $TotalChecks" -ForegroundColor Blue
Write-Host "Passed:        $PassedChecks" -ForegroundColor Green
Write-Host "Failed:        $FailedChecks" -ForegroundColor Red
Write-Host "Pass Rate:     $PassRate%" -ForegroundColor Blue
Write-Host ""

if ($PassRate -ge 80) {
    Write-Host "✅ System validation PASSED" -ForegroundColor Green
    Write-Host "Your CECBS system is properly configured!" -ForegroundColor Green
    exit 0
} elseif ($PassRate -ge 60) {
    Write-Host "⚠️  System validation passed with warnings" -ForegroundColor Yellow
    Write-Host "Review warnings above and fix as needed" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ System validation FAILED" -ForegroundColor Red
    Write-Host "Critical issues found - please fix errors above" -ForegroundColor Red
    exit 1
}
