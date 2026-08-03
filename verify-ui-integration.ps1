# CECBS UI Integration Verification Script (PowerShell)
# Tests that blockchain identity management UI is properly integrated

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🔍 CECBS UI Integration Verification" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Track results
$checksPassed = 0
$checksFailed = 0

function Check-Pass {
    param([string]$message)
    Write-Host "✅ PASS: $message" -ForegroundColor Green
    $script:checksPassed++
}

function Check-Fail {
    param([string]$message)
    Write-Host "❌ FAIL: $message" -ForegroundColor Red
    $script:checksFailed++
}

function Check-Warn {
    param([string]$message)
    Write-Host "⚠️  WARN: $message" -ForegroundColor Yellow
}

# ============================================
# 1. Check Files Exist
# ============================================
Write-Host "1. Checking files exist..."

if (Test-Path "ui\src\components\admin\BlockchainIdentityPanel.tsx") {
    Check-Pass "BlockchainIdentityPanel.tsx exists"
} else {
    Check-Fail "BlockchainIdentityPanel.tsx NOT FOUND"
}

if (Test-Path "ui\src\components\admin\UserManagement.tsx") {
    Check-Pass "UserManagement.tsx exists"
} else {
    Check-Fail "UserManagement.tsx NOT FOUND"
}

Write-Host ""

# ============================================
# 2. Check Component Integration
# ============================================
Write-Host "2. Checking component integration..."

# Check if BlockchainIdentityPanel is imported in UserManagement
$userMgmtContent = Get-Content "ui\src\components\admin\UserManagement.tsx" -Raw
if ($userMgmtContent -match "import BlockchainIdentityPanel from './BlockchainIdentityPanel'") {
    Check-Pass "BlockchainIdentityPanel imported in UserManagement"
} else {
    Check-Fail "BlockchainIdentityPanel NOT imported"
}

# Check if BlockchainIdentityPanel is used in UserManagement
if ($userMgmtContent -match "<BlockchainIdentityPanel") {
    Check-Pass "BlockchainIdentityPanel component used in render"
} else {
    Check-Fail "BlockchainIdentityPanel NOT used in render"
}

# Check if Tabs are imported
if ($userMgmtContent -match "import.*Tabs.*from '@mui/material'") {
    Check-Pass "Tabs imported from Material-UI"
} else {
    Check-Fail "Tabs NOT imported"
}

# Check if TabPanel component is defined
if ($userMgmtContent -match "const TabPanel.*React\.FC.*TabPanelProps") {
    Check-Pass "TabPanel component defined"
} else {
    Check-Fail "TabPanel component NOT defined"
}

# Check if detailsTab state is defined
if ($userMgmtContent -match "detailsTab.*useState") {
    Check-Pass "detailsTab state defined"
} else {
    Check-Fail "detailsTab state NOT defined"
}

Write-Host ""

# ============================================
# 3. Check API Integration
# ============================================
Write-Host "3. Checking API integration..."

# Check BlockchainIdentityPanel API calls
$blockchainPanelContent = Get-Content "ui\src\components\admin\BlockchainIdentityPanel.tsx" -Raw
if ($blockchainPanelContent -match "api\.get.*crypto-users.*identity") {
    Check-Pass "GET identity endpoint used"
} else {
    Check-Fail "GET identity endpoint NOT found"
}

if ($blockchainPanelContent -match "api\.post.*crypto-users/enroll") {
    Check-Pass "POST enroll endpoint used"
} else {
    Check-Fail "POST enroll endpoint NOT found"
}

if ($blockchainPanelContent -match "api\.post.*revoke") {
    Check-Pass "POST revoke endpoint used"
} else {
    Check-Fail "POST revoke endpoint NOT found"
}

if ($blockchainPanelContent -match "api\.post.*renew-certificate") {
    Check-Pass "POST renew certificate endpoint used"
} else {
    Check-Fail "POST renew certificate endpoint NOT found"
}

Write-Host ""

# ============================================
# 4. Check Backend API Routes
# ============================================
Write-Host "4. Checking backend API routes..."

if (Test-Path "api\src\routes\crypto-users.ts") {
    Check-Pass "crypto-users.ts route file exists"
    
    # Check endpoints
    $cryptoUsersContent = Get-Content "api\src\routes\crypto-users.ts" -Raw
    
    if ($cryptoUsersContent -match "router\.get.*/:userId/identity") {
        Check-Pass "GET /:userId/identity endpoint defined"
    } else {
        Check-Fail "GET /:userId/identity endpoint NOT defined"
    }
    
    if ($cryptoUsersContent -match "router\.post.*/enroll") {
        Check-Pass "POST /enroll endpoint defined"
    } else {
        Check-Fail "POST /enroll endpoint NOT defined"
    }
    
    if ($cryptoUsersContent -match "router\.post.*/:userId/revoke") {
        Check-Pass "POST /:userId/revoke endpoint defined"
    } else {
        Check-Fail "POST /:userId/revoke endpoint NOT defined"
    }
    
    if ($cryptoUsersContent -match "router\.post.*/:userId/renew-certificate") {
        Check-Pass "POST /:userId/renew-certificate endpoint defined"
    } else {
        Check-Fail "POST /:userId/renew-certificate endpoint NOT defined"
    }
} else {
    Check-Fail "crypto-users.ts route file NOT FOUND"
}

Write-Host ""

# ============================================
# 5. Check TypeScript Compilation
# ============================================
Write-Host "5. Checking TypeScript compilation..."

if (Get-Command tsc -ErrorAction SilentlyContinue) {
    Push-Location ui
    $tscOutput = tsc --noEmit --skipLibCheck 2>&1 | Out-String
    Pop-Location
    
    if ($tscOutput -match "error TS") {
        Check-Fail "TypeScript compilation has errors"
    } else {
        Check-Pass "TypeScript compiles successfully"
    }
} else {
    Check-Warn "TypeScript compiler not found (skipping)"
}

Write-Host ""

# ============================================
# 6. Check Documentation
# ============================================
Write-Host "6. Checking documentation..."

if (Test-Path "UI-BLOCKCHAIN-INTEGRATION-COMPLETE.md") {
    Check-Pass "UI integration documentation exists"
} else {
    Check-Fail "UI integration documentation NOT FOUND"
}

if (Test-Path "UI-INTEGRATION-GUIDE.md") {
    Check-Pass "UI integration guide exists"
} else {
    Check-Fail "UI integration guide NOT FOUND"
}

if (Test-Path "PORTAL-ADMIN-FULL-CONTROL.md") {
    Check-Pass "Portal admin documentation exists"
} else {
    Check-Fail "Portal admin documentation NOT FOUND"
}

Write-Host ""

# ============================================
# Summary
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "📊 Verification Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Checks Passed: $checksPassed"
Write-Host "Checks Failed: $checksFailed"
Write-Host ""

if ($checksFailed -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 UI integration is COMPLETE and ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. cd ui && npm install"
    Write-Host "  2. npm start"
    Write-Host "  3. Open http://localhost:3000"
    Write-Host "  4. Login as admin and test User Management"
    Write-Host ""
    exit 0
} else {
    Write-Host "❌ SOME CHECKS FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the failed checks before proceeding."
    Write-Host ""
    exit 1
}

