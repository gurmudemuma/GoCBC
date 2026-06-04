# CECBS Codebase Cleanup Script
# Removes obsolete files and organizes the project structure
# Created: June 4, 2026

param(
    [switch]$DryRun,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "=== CECBS Codebase Cleanup ===" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN MODE - No files will be deleted" -ForegroundColor Yellow
    Write-Host ""
}

# Obsolete files to remove
$obsoleteFiles = @(
    # Old chaincode packages
    "coffee_1.1.tar.gz",
    "coffee_1.2.tar.gz",
    "coffee-1.3-caas.tar.gz",
    "coffee-1.3.tar.gz",
    "coffee.tar.gz",
    "chaincodes/coffee/coffee-external.tar.gz",
    "chaincodes/coffee/coffee-v14-external.tar.gz",
    "chaincodes/coffee/coffee-v14-external-fixed.tar.gz",
    "chaincodes/coffee/chaincode",
    "chaincodes/coffee/coffee.exe",
    "chaincodes/coffee/Dockerfile.v13",
    "chaincodes/coffee/metadata.json",
    
    # Temporary/debug files
    "Creating",
    "Endorser",
    "Error",
    "Generating",
    "Loaded",
    "Loading",
    "Writing",
    "orderer",
    "Orderer.EtcdRaft.Options",
    "debug-exporter-login.html",
    "EXPORTER-LOGIN-QUICK-FIX.md",
    "FIX-EXPORTER-LOGIN-NOW.md",
    "QUICK-START-V1.4.md",
    "cleanup-codebase.ps1",
    
    # Obsolete test scripts
    "test-2026-simple.ps1",
    "test-api-connection.ps1",
    "test-exporter-login.ps1",
    
    # Old TLS certificates (should be in blockchain/organizations)
    "banks-tls-ca.crt",
    "ecta-tls-ca.crt",
    "ecx-tls-ca.crt",
    "nbe-tls-ca.crt",
    "orderer-tls-ca.crt"
)

# Obsolete scripts
$obsoleteScripts = @(
    "approve-and-commit-v1.3-fixed.ps1",
    "approve-and-commit-v1.3.ps1",
    "approve-v1.2-all-peers.sh",
    "deploy-2026-compliant-chaincode.ps1",
    "deploy-caas-correct.ps1",
    "deploy-chaincode-caas.sh",
    "deploy-chaincode-docker.sh",
    "deploy-chaincode-production.sh",
    "deploy-chaincode-simple.sh",
    "deploy-chaincode.sh",
    "deploy-enhanced-v1.2.sh",
    "deploy-v1.2-dev-mode.sh",
    "deploy-v1.2-docker.ps1",
    "deploy-v1.3-caas.ps1",
    "deploy-v1.3-final.ps1",
    "deploy-v1.3-option2.ps1",
    "deploy-v1.3-simple.ps1",
    "deploy-v1.3.ps1",
    "deploy-v1.4-all.ps1",
    "deploy-v1.4-complete.ps1",
    "deploy-v1.4-external.ps1",
    "deploy-v1.4-external.sh",
    "deploy-v1.4-fixed.ps1",
    "diagnose-chaincode-v13.ps1",
    "fix-caas-deployment.ps1",
    "fix-chaincode-dev-mode.ps1",
    "fix-chaincode-final.ps1",
    "fix-line-endings.sh",
    "fix-peer-tls.sh",
    "install-external-v1.3.ps1",
    "install-v1.3-external.sh",
    "install-v1.4-direct.ps1",
    "install-v1.4-direct.sh",
    "package-external-v1.3.ps1",
    "revert-and-fix.ps1",
    "setup-multi-peer-endorsement-fixed.ps1",
    "setup-multi-peer-endorsement.ps1",
    "start-chaincode-client-mode.ps1",
    "start-chaincode-correct.ps1",
    "start-chaincode-v1.1.ps1",
    "start-chaincode-v1.1.sh",
    "test-2026-fixed.sh",
    "test-2026-workflow.ps1",
    "test-chaincode-query.sh",
    "test-chaincode-v1.1.sh",
    "test-chaincode.sh",
    "test-configtx.sh",
    "test-enhanced-v1.2.sh",
    "test-invoke.sh",
    "test-multi-peer-fixed.sh",
    "test-new-functions.sh",
    "test-query.sh",
    "test-single-peer-endorsement.ps1",
    "test-single-peer.sh",
    "test-timestamp-fix.ps1",
    "test-upgrade.sh",
    "test-v1.3-deployment.ps1",
    "test-with-multiple-endorsers.ps1",
    "upgrade-chaincode-caas.sh",
    "upgrade-chaincode-docker.sh",
    "upgrade-chaincode.sh",
    "upgrade-to-v1.2.ps1",
    "upgrade-to-v1.2.sh",
    "upgrade-to-v1.4-simple.ps1",
    "commit-v1.4-final.ps1",
    "create-caas-package.sh"
)

# Obsolete documentation
$obsoleteDocs = @(
    "DEPLOY-V1.3-GUIDE.md",
    "DEPLOY-V1.3-MANUAL.md",
    "CHAINCODE-V1.3-STATUS.md",
    "CHAINCODE-UPGRADE-STATUS.md",
    "SESSION-SUMMARY-JUNE-3-2026.md",
    "FINAL-SOLUTION.md",
    "SETUP.md",
    "WINDOWS-SETUP.md"
)

# Obsolete directories
$obsoleteDirs = @(
    "chaincodes/coffee/extracted",
    "chaincodes/coffee/package"
)

$totalRemoved = 0
$totalSize = 0

# Function to remove file/directory
function Remove-Item-Safe {
    param($Path, $Type = "File")
    
    if (Test-Path $Path) {
        $size = 0
        if ($Type -eq "File") {
            $size = (Get-Item $Path).Length
        } else {
            $size = (Get-ChildItem $Path -Recurse -File | Measure-Object -Property Length -Sum).Sum
        }
        
        $sizeMB = [math]::Round($size / 1MB, 2)
        
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would remove: $Path ($sizeMB MB)" -ForegroundColor Yellow
        } else {
            Remove-Item $Path -Recurse -Force
            Write-Host "  [OK] Removed: $Path ($sizeMB MB)" -ForegroundColor Green
        }
        
        $script:totalRemoved++
        $script:totalSize += $size
        return $true
    }
    return $false
}

# Confirm before proceeding
if (-not $Force -and -not $DryRun) {
    Write-Host "This will permanently delete obsolete files from your codebase." -ForegroundColor Yellow
    Write-Host "A backup is recommended before proceeding." -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Continue? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "Cleanup cancelled." -ForegroundColor Red
        exit 0
    }
    Write-Host ""
}

# Remove obsolete files from root
Write-Host "Step 1: Removing obsolete root files..." -ForegroundColor Cyan
foreach ($file in $obsoleteFiles) {
    Remove-Item-Safe $file "File" | Out-Null
}

# Remove obsolete scripts
Write-Host ""
Write-Host "Step 2: Removing obsolete scripts..." -ForegroundColor Cyan
foreach ($script in $obsoleteScripts) {
    Remove-Item-Safe "scripts/$script" "File" | Out-Null
}

# Remove obsolete documentation
Write-Host ""
Write-Host "Step 3: Removing obsolete documentation..." -ForegroundColor Cyan
foreach ($doc in $obsoleteDocs) {
    Remove-Item-Safe "Docs/$doc" "File" | Out-Null
}

# Remove obsolete directories
Write-Host ""
Write-Host "Step 4: Removing obsolete directories..." -ForegroundColor Cyan
foreach ($dir in $obsoleteDirs) {
    Remove-Item-Safe $dir "Directory" | Out-Null
}

# Create archive directory for old packages
if (-not $DryRun) {
    Write-Host ""
    Write-Host "Step 5: Creating archive structure..." -ForegroundColor Cyan
    
    $archiveDirs = @(
        "archive",
        "archive/packages",
        "archive/scripts",
        "archive/docs"
    )
    
    foreach ($dir in $archiveDirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "  [OK] Created: $dir" -ForegroundColor Green
        }
    }
}

# Summary
Write-Host ""
Write-Host "=== Cleanup Summary ===" -ForegroundColor Cyan
Write-Host "Items processed: $totalRemoved" -ForegroundColor Yellow
Write-Host "Space freed: $([math]::Round($totalSize / 1MB, 2)) MB" -ForegroundColor Yellow

if ($DryRun) {
    Write-Host ""
    Write-Host "This was a DRY RUN. Run without -DryRun to actually delete files." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "[OK] Codebase cleanup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Review the changes with: git status" -ForegroundColor White
    Write-Host "  2. Update .gitignore if needed" -ForegroundColor White
    Write-Host "  3. Commit the cleanup: git add . && git commit -m 'chore: cleanup obsolete files'" -ForegroundColor White
}
