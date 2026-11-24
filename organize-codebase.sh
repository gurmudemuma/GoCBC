#!/bin/bash
# ============================================================
# CECBS Codebase Organization Script
# Organizes documentation and testing files into clean folders
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${CYAN}→${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Ask confirmation
ask_confirm() {
    while true; do
        read -p "$1 (y/n): " -n 1 -r
        echo
        case $REPLY in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer y or n.";;
        esac
    done
}

print_header "CECBS Codebase Organization"

echo "This script will organize your codebase by moving files to:"
echo ""
echo "  ${CYAN}docs/${NC}          → All documentation (*.md files)"
echo "  ${CYAN}docs/archived/${NC} → Old/archived documentation"
echo "  ${CYAN}tests/${NC}         → All test files (test-*.js, *-test.js)"
echo "  ${CYAN}scripts/${NC}       → Utility scripts (*.js, *.py not in src)"
echo ""
echo "Core files (chaincode.sh, deploy scripts, etc.) stay in root."
echo ""

if ! ask_confirm "Do you want to proceed?"; then
    echo "Cancelled."
    exit 0
fi

echo ""
print_header "Step 1: Creating Directory Structure"

# Create directories
mkdir -p docs/business
mkdir -p docs/technical
mkdir -p docs/implementation
mkdir -p docs/deployment
mkdir -p docs/user-guides
mkdir -p docs/swift
mkdir -p docs/archived
mkdir -p tests
mkdir -p scripts/utility

print_success "Directory structure created"

echo ""
print_header "Step 2: Moving Documentation Files"

# Business Documentation
print_info "Moving business documentation..."
[ -f "WHY-BLOCKCHAIN-FOR-COFFEE-EXPORT.md" ] && mv "WHY-BLOCKCHAIN-FOR-COFFEE-EXPORT.md" "docs/business/" && print_success "WHY-BLOCKCHAIN-FOR-COFFEE-EXPORT.md"
[ -f "EXECUTIVE-BRIEFING.md" ] && mv "EXECUTIVE-BRIEFING.md" "docs/business/" && print_success "EXECUTIVE-BRIEFING.md"
[ -f "EXECUTIVE-SUMMARY-MSP-IMPLEMENTATION.md" ] && mv "EXECUTIVE-SUMMARY-MSP-IMPLEMENTATION.md" "docs/business/" && print_success "EXECUTIVE-SUMMARY-MSP-IMPLEMENTATION.md"

# Technical Documentation
print_info "Moving technical documentation..."
[ -f "BLOCKCHAIN-POWERED-ARCHITECTURE.md" ] && mv "BLOCKCHAIN-POWERED-ARCHITECTURE.md" "docs/technical/" && print_success "BLOCKCHAIN-POWERED-ARCHITECTURE.md"
[ -f "FABRIC-SDK-MSP-FLOW.md" ] && mv "FABRIC-SDK-MSP-FLOW.md" "docs/technical/" && print_success "FABRIC-SDK-MSP-FLOW.md"
[ -f "MSP-IDENTITY-ENHANCEMENTS.md" ] && mv "MSP-IDENTITY-ENHANCEMENTS.md" "docs/technical/" && print_success "MSP-IDENTITY-ENHANCEMENTS.md"
[ -f "BLOCKCHAIN-FEATURES-VERIFICATION.md" ] && mv "BLOCKCHAIN-FEATURES-VERIFICATION.md" "docs/technical/" && print_success "BLOCKCHAIN-FEATURES-VERIFICATION.md"

# Implementation Documentation
print_info "Moving implementation documentation..."
[ -f "PROJECT-COMPLETE-SUMMARY.md" ] && mv "PROJECT-COMPLETE-SUMMARY.md" "docs/implementation/" && print_success "PROJECT-COMPLETE-SUMMARY.md"
[ -f "COMPREHENSIVE-MSP-ASSESSMENT.md" ] && mv "COMPREHENSIVE-MSP-ASSESSMENT.md" "docs/implementation/" && print_success "COMPREHENSIVE-MSP-ASSESSMENT.md"
[ -f "MSP-IMPLEMENTATION-ROADMAP.md" ] && mv "MSP-IMPLEMENTATION-ROADMAP.md" "docs/implementation/" && print_success "MSP-IMPLEMENTATION-ROADMAP.md"
[ -f "MSP-IMPLEMENTATION-INDEX.md" ] && mv "MSP-IMPLEMENTATION-INDEX.md" "docs/implementation/" && print_success "MSP-IMPLEMENTATION-INDEX.md"
[ -f "PHASE-1-COMPLETE.md" ] && mv "PHASE-1-COMPLETE.md" "docs/implementation/" && print_success "PHASE-1-COMPLETE.md"
[ -f "PHASE-2-COMPLETE.md" ] && mv "PHASE-2-COMPLETE.md" "docs/implementation/" && print_success "PHASE-2-COMPLETE.md"
[ -f "PHASE-3-COMPLETE-100-PERCENT.md" ] && mv "PHASE-3-COMPLETE-100-PERCENT.md" "docs/implementation/" && print_success "PHASE-3-COMPLETE-100-PERCENT.md"
[ -f "VERIFICATION-COMPLETE-100-PERCENT.md" ] && mv "VERIFICATION-COMPLETE-100-PERCENT.md" "docs/implementation/" && print_success "VERIFICATION-COMPLETE-100-PERCENT.md"
[ -f "PATH-TO-100-PERCENT.md" ] && mv "PATH-TO-100-PERCENT.md" "docs/implementation/" && print_success "PATH-TO-100-PERCENT.md"
[ -f "AWB-IMPLEMENTATION.md" ] && mv "AWB-IMPLEMENTATION.md" "docs/implementation/" && print_success "AWB-IMPLEMENTATION.md"
[ -f "AWB-IMPLEMENTATION-COMPLETE.md" ] && mv "AWB-IMPLEMENTATION-COMPLETE.md" "docs/implementation/" && print_success "AWB-IMPLEMENTATION-COMPLETE.md"
[ -f "AWB-COMPLETE-SUMMARY.md" ] && mv "AWB-COMPLETE-SUMMARY.md" "docs/implementation/" && print_success "AWB-COMPLETE-SUMMARY.md"

# Deployment Documentation
print_info "Moving deployment documentation..."
[ -f "SYSTEM-READINESS-CHECK.md" ] && mv "SYSTEM-READINESS-CHECK.md" "docs/deployment/" && print_success "SYSTEM-READINESS-CHECK.md"
[ -f "PRODUCTION-READY-SUMMARY.md" ] && mv "PRODUCTION-READY-SUMMARY.md" "docs/deployment/" && print_success "PRODUCTION-READY-SUMMARY.md"
[ -f "DEPLOYMENT-SUCCESS-v1.30.md" ] && mv "DEPLOYMENT-SUCCESS-v1.30.md" "docs/deployment/" && print_success "DEPLOYMENT-SUCCESS-v1.30.md"
[ -f "DEPLOYMENT-GUIDE-QUICK-START.md" ] && mv "DEPLOYMENT-GUIDE-QUICK-START.md" "docs/deployment/" && print_success "DEPLOYMENT-GUIDE-QUICK-START.md"
[ -f "DEPLOY-README.md" ] && mv "DEPLOY-README.md" "docs/deployment/" && print_success "DEPLOY-README.md"
[ -f "DEPLOYMENT-READY.md" ] && mv "DEPLOYMENT-READY.md" "docs/deployment/" && print_success "DEPLOYMENT-READY.md"
[ -f "READY-TO-DEPLOY.md" ] && mv "READY-TO-DEPLOY.md" "docs/deployment/" && print_success "READY-TO-DEPLOY.md"
[ -f "PRODUCTION-DEPLOYMENT-10.3.15.7.md" ] && mv "PRODUCTION-DEPLOYMENT-10.3.15.7.md" "docs/deployment/" && print_success "PRODUCTION-DEPLOYMENT-10.3.15.7.md"
[ -f "PRODUCTION-DEPLOYMENT-COFFEEX.CBE.COM.ET.md" ] && mv "PRODUCTION-DEPLOYMENT-COFFEEX.CBE.COM.ET.md" "docs/deployment/" && print_success "PRODUCTION-DEPLOYMENT-COFFEEX.CBE.COM.ET.md"
[ -f "DOMAIN-CONFIGURATION-COMPLETE.md" ] && mv "DOMAIN-CONFIGURATION-COMPLETE.md" "docs/deployment/" && print_success "DOMAIN-CONFIGURATION-COMPLETE.md"
[ -f "ENVIRONMENT-SETUP-GUIDE.md" ] && mv "ENVIRONMENT-SETUP-GUIDE.md" "docs/deployment/" && print_success "ENVIRONMENT-SETUP-GUIDE.md"
[ -f "QUICK-DEPLOYMENT-CHECKLIST.md" ] && mv "QUICK-DEPLOYMENT-CHECKLIST.md" "docs/deployment/" && print_success "QUICK-DEPLOYMENT-CHECKLIST.md"
[ -f "QUICK-VERIFICATION-CHECKLIST.md" ] && mv "QUICK-VERIFICATION-CHECKLIST.md" "docs/deployment/" && print_success "QUICK-VERIFICATION-CHECKLIST.md"

# User Guides
print_info "Moving user guides..."
[ -f "PORTAL-DOCUMENTATION-INDEX.md" ] && mv "PORTAL-DOCUMENTATION-INDEX.md" "docs/user-guides/" && print_success "PORTAL-DOCUMENTATION-INDEX.md"
[ -f "EXPORTER-PORTAL-GUIDE.md" ] && mv "EXPORTER-PORTAL-GUIDE.md" "docs/user-guides/" && print_success "EXPORTER-PORTAL-GUIDE.md"
[ -f "ECTA-PORTAL-GUIDE.md" ] && mv "ECTA-PORTAL-GUIDE.md" "docs/user-guides/" && print_success "ECTA-PORTAL-GUIDE.md"
[ -f "NBE-PORTAL-GUIDE.md" ] && mv "NBE-PORTAL-GUIDE.md" "docs/user-guides/" && print_success "NBE-PORTAL-GUIDE.md"
[ -f "BANKS-PORTAL-GUIDE.md" ] && mv "BANKS-PORTAL-GUIDE.md" "docs/user-guides/" && print_success "BANKS-PORTAL-GUIDE.md"
[ -f "ECX-PORTAL-GUIDE.md" ] && mv "ECX-PORTAL-GUIDE.md" "docs/user-guides/" && print_success "ECX-PORTAL-GUIDE.md"
[ -f "CUSTOMS-PORTAL-GUIDE.md" ] && mv "CUSTOMS-PORTAL-GUIDE.md" "docs/user-guides/" && print_success "CUSTOMS-PORTAL-GUIDE.md"
[ -f "PORTAL-TASK-COVERAGE.md" ] && mv "PORTAL-TASK-COVERAGE.md" "docs/user-guides/" && print_success "PORTAL-TASK-COVERAGE.md"

# SWIFT Documentation
print_info "Moving SWIFT documentation..."
[ -f "SWIFT-SUMMARY.md" ] && mv "SWIFT-SUMMARY.md" "docs/swift/" && print_success "SWIFT-SUMMARY.md"
[ -f "SWIFT-FINAL-SUMMARY.md" ] && mv "SWIFT-FINAL-SUMMARY.md" "docs/swift/" && print_success "SWIFT-FINAL-SUMMARY.md"
[ -f "SWIFT-README.md" ] && mv "SWIFT-README.md" "docs/swift/" && print_success "SWIFT-README.md"
[ -f "SWIFT-QUICK-START.md" ] && mv "SWIFT-QUICK-START.md" "docs/swift/" && print_success "SWIFT-QUICK-START.md"
[ -f "SWIFT-IMPLEMENTATION-COMPLETE.md" ] && mv "SWIFT-IMPLEMENTATION-COMPLETE.md" "docs/swift/" && print_success "SWIFT-IMPLEMENTATION-COMPLETE.md"
[ -f "SWIFT-UI-IMPLEMENTATION-COMPLETE.md" ] && mv "SWIFT-UI-IMPLEMENTATION-COMPLETE.md" "docs/swift/" && print_success "SWIFT-UI-IMPLEMENTATION-COMPLETE.md"
[ -f "SWIFT-IMPLEMENTATION-GUIDE.md" ] && mv "SWIFT-IMPLEMENTATION-GUIDE.md" "docs/swift/" && print_success "SWIFT-IMPLEMENTATION-GUIDE.md"
[ -f "SWIFT-DEPLOYMENT-GUIDE.md" ] && mv "SWIFT-DEPLOYMENT-GUIDE.md" "docs/swift/" && print_success "SWIFT-DEPLOYMENT-GUIDE.md"
[ -f "SWIFT-TESTING-GUIDE.md" ] && mv "SWIFT-TESTING-GUIDE.md" "docs/swift/" && print_success "SWIFT-TESTING-GUIDE.md"
[ -f "SWIFT-HANDOVER-DOCUMENT.md" ] && mv "SWIFT-HANDOVER-DOCUMENT.md" "docs/swift/" && print_success "SWIFT-HANDOVER-DOCUMENT.md"
[ -f "SWIFT-INDEX.md" ] && mv "SWIFT-INDEX.md" "docs/swift/" && print_success "SWIFT-INDEX.md"
[ -f "SWIFT-INTEGRATION-ROLES.md" ] && mv "SWIFT-INTEGRATION-ROLES.md" "docs/swift/" && print_success "SWIFT-INTEGRATION-ROLES.md"
[ -f "SWIFT-MSP-TRACEABILITY.md" ] && mv "SWIFT-MSP-TRACEABILITY.md" "docs/swift/" && print_success "SWIFT-MSP-TRACEABILITY.md"

# Archived Documentation (old status files, fixes, etc.)
print_info "Moving archived documentation..."
[ -f "ACTION-REQUIRED-MSP-GAPS.md" ] && mv "ACTION-REQUIRED-MSP-GAPS.md" "docs/archived/" && print_success "ACTION-REQUIRED-MSP-GAPS.md"
[ -f "ALL-FIXES-COMPLETE.md" ] && mv "ALL-FIXES-COMPLETE.md" "docs/archived/" && print_success "ALL-FIXES-COMPLETE.md"
[ -f "ALL-TESTS-SUMMARY.md" ] && mv "ALL-TESTS-SUMMARY.md" "docs/archived/" && print_success "ALL-TESTS-SUMMARY.md"
[ -f "MSP-FIXES-EXECUTIVE-SUMMARY.md" ] && mv "MSP-FIXES-EXECUTIVE-SUMMARY.md" "docs/archived/" && print_success "MSP-FIXES-EXECUTIVE-SUMMARY.md"
[ -f "MSP-IDENTITY-GAPS-FOUND.md" ] && mv "MSP-IDENTITY-GAPS-FOUND.md" "docs/archived/" && print_success "MSP-IDENTITY-GAPS-FOUND.md"
[ -f "MSP-PHASE2-COMPLETE.md" ] && mv "MSP-PHASE2-COMPLETE.md" "docs/archived/" && print_success "MSP-PHASE2-COMPLETE.md"
[ -f "ASSESSMENT-EXECUTIVE-SUMMARY.md" ] && mv "ASSESSMENT-EXECUTIVE-SUMMARY.md" "docs/archived/" && print_success "ASSESSMENT-EXECUTIVE-SUMMARY.md"
[ -f "BEST-PRACTICES-APPLIED.md" ] && mv "BEST-PRACTICES-APPLIED.md" "docs/archived/" && print_success "BEST-PRACTICES-APPLIED.md"
[ -f "BLOCKCHAIN-TIMEOUT-FIX.md" ] && mv "BLOCKCHAIN-TIMEOUT-FIX.md" "docs/archived/" && print_success "BLOCKCHAIN-TIMEOUT-FIX.md"
[ -f "CHAINCODE-DEPLOYMENT-COMPLETE.md" ] && mv "CHAINCODE-DEPLOYMENT-COMPLETE.md" "docs/archived/" && print_success "CHAINCODE-DEPLOYMENT-COMPLETE.md"
[ -f "CHAINCODE-EXPERT-REVIEW.md" ] && mv "CHAINCODE-EXPERT-REVIEW.md" "docs/archived/" && print_success "CHAINCODE-EXPERT-REVIEW.md"
[ -f "CHAINCODE-FIX-SUMMARY.md" ] && mv "CHAINCODE-FIX-SUMMARY.md" "docs/archived/" && print_success "CHAINCODE-FIX-SUMMARY.md"
[ -f "CHAINCODE-IMPROVEMENTS-COMPLETE.md" ] && mv "CHAINCODE-IMPROVEMENTS-COMPLETE.md" "docs/archived/" && print_success "CHAINCODE-IMPROVEMENTS-COMPLETE.md"
[ -f "CLEANUP-AND-REVIEW-SUMMARY.md" ] && mv "CLEANUP-AND-REVIEW-SUMMARY.md" "docs/archived/" && print_success "CLEANUP-AND-REVIEW-SUMMARY.md"
[ -f "CODE-QUALITY-REFACTORING-GUIDE.md" ] && mv "CODE-QUALITY-REFACTORING-GUIDE.md" "docs/archived/" && print_success "CODE-QUALITY-REFACTORING-GUIDE.md"
[ -f "DOCUMENT-UPLOAD-FIX.md" ] && mv "DOCUMENT-UPLOAD-FIX.md" "docs/archived/" && print_success "DOCUMENT-UPLOAD-FIX.md"
[ -f "DOCUMENTATION-COMPLETE.md" ] && mv "DOCUMENTATION-COMPLETE.md" "docs/archived/" && print_success "DOCUMENTATION-COMPLETE.md"
[ -f "FINAL-FIX-STEPS.md" ] && mv "FINAL-FIX-STEPS.md" "docs/archived/" && print_success "FINAL-FIX-STEPS.md"
[ -f "FINAL-IMPLEMENTATION-STATUS.md" ] && mv "FINAL-IMPLEMENTATION-STATUS.md" "docs/archived/" && print_success "FINAL-IMPLEMENTATION-STATUS.md"
[ -f "FIX-401-ERROR.md" ] && mv "FIX-401-ERROR.md" "docs/archived/" && print_success "FIX-401-ERROR.md"
[ -f "FIX-SUMMARY.md" ] && mv "FIX-SUMMARY.md" "docs/archived/" && print_success "FIX-SUMMARY.md"
[ -f "fix-portal-actions.md" ] && mv "fix-portal-actions.md" "docs/archived/" && print_success "fix-portal-actions.md"
[ -f "refactor-urls.md" ] && mv "refactor-urls.md" "docs/archived/" && print_success "refactor-urls.md"
[ -f "IMPLEMENTATION-COMPLETE-SUMMARY.md" ] && mv "IMPLEMENTATION-COMPLETE-SUMMARY.md" "docs/archived/" && print_success "IMPLEMENTATION-COMPLETE-SUMMARY.md"
[ -f "IMPLEMENTATION-SUMMARY.md" ] && mv "IMPLEMENTATION-SUMMARY.md" "docs/archived/" && print_success "IMPLEMENTATION-SUMMARY.md"
[ -f "IPFS-SETUP-COMPLETE.md" ] && mv "IPFS-SETUP-COMPLETE.md" "docs/archived/" && print_success "IPFS-SETUP-COMPLETE.md"
[ -f "PAYMENT-METHODS-QUICK-REFERENCE.md" ] && mv "PAYMENT-METHODS-QUICK-REFERENCE.md" "docs/archived/" && print_success "PAYMENT-METHODS-QUICK-REFERENCE.md"
[ -f "PAYMENT-METHODS-TEST-COMPLETE.md" ] && mv "PAYMENT-METHODS-TEST-COMPLETE.md" "docs/archived/" && print_success "PAYMENT-METHODS-TEST-COMPLETE.md"
[ -f "REAL-DATA-DISPLAY-COMPLETE.md" ] && mv "REAL-DATA-DISPLAY-COMPLETE.md" "docs/archived/" && print_success "REAL-DATA-DISPLAY-COMPLETE.md"
[ -f "REAL-WORLD-ROLES-IMPLEMENTATION.md" ] && mv "REAL-WORLD-ROLES-IMPLEMENTATION.md" "docs/archived/" && print_success "REAL-WORLD-ROLES-IMPLEMENTATION.md"
[ -f "REAL-WORLD-WORKFLOW-ALIGNMENT.md" ] && mv "REAL-WORLD-WORKFLOW-ALIGNMENT.md" "docs/archived/" && print_success "REAL-WORLD-WORKFLOW-ALIGNMENT.md"
[ -f "REFACTORING-COMPLETE-SUMMARY.md" ] && mv "REFACTORING-COMPLETE-SUMMARY.md" "docs/archived/" && print_success "REFACTORING-COMPLETE-SUMMARY.md"
[ -f "REFRESH-BROWSER.md" ] && mv "REFRESH-BROWSER.md" "docs/archived/" && print_success "REFRESH-BROWSER.md"
[ -f "SCRIPT-REVIEW-REPORT.md" ] && mv "SCRIPT-REVIEW-REPORT.md" "docs/archived/" && print_success "SCRIPT-REVIEW-REPORT.md"
[ -f "SHIPPING-PORTAL-DIAGNOSIS.md" ] && mv "SHIPPING-PORTAL-DIAGNOSIS.md" "docs/archived/" && print_success "SHIPPING-PORTAL-DIAGNOSIS.md"
[ -f "SHIPPING-PORTAL-FIX.md" ] && mv "SHIPPING-PORTAL-FIX.md" "docs/archived/" && print_success "SHIPPING-PORTAL-FIX.md"
[ -f "SUPPRESS-IPFS-WARNINGS.md" ] && mv "SUPPRESS-IPFS-WARNINGS.md" "docs/archived/" && print_success "SUPPRESS-IPFS-WARNINGS.md"
[ -f "SYSTEM-INTEGRATION-VERIFIED.md" ] && mv "SYSTEM-INTEGRATION-VERIFIED.md" "docs/archived/" && print_success "SYSTEM-INTEGRATION-VERIFIED.md"
[ -f "SYSTEM-READINESS-REPORT.md" ] && mv "SYSTEM-READINESS-REPORT.md" "docs/archived/" && print_success "SYSTEM-READINESS-REPORT.md"
[ -f "TESTING-AND-DEPLOYMENT.md" ] && mv "TESTING-AND-DEPLOYMENT.md" "docs/archived/" && print_success "TESTING-AND-DEPLOYMENT.md"
[ -f "TRANSPORT-MODE-QUICK-REFERENCE.md" ] && mv "TRANSPORT-MODE-QUICK-REFERENCE.md" "docs/archived/" && print_success "TRANSPORT-MODE-QUICK-REFERENCE.md"
[ -f "TRUE-BLOCKCHAIN-COMPLETE.md" ] && mv "TRUE-BLOCKCHAIN-COMPLETE.md" "docs/archived/" && print_success "TRUE-BLOCKCHAIN-COMPLETE.md"
[ -f "VERIFICATION-COMPLETE-SUMMARY.md" ] && mv "VERIFICATION-COMPLETE-SUMMARY.md" "docs/archived/" && print_success "VERIFICATION-COMPLETE-SUMMARY.md"
[ -f "WORKFLOW-FIXES-COMPLETE.md" ] && mv "WORKFLOW-FIXES-COMPLETE.md" "docs/archived/" && print_success "WORKFLOW-FIXES-COMPLETE.md"
[ -f "WORKFLOW-TEST-RESULTS.md" ] && mv "WORKFLOW-TEST-RESULTS.md" "docs/archived/" && print_success "WORKFLOW-TEST-RESULTS.md"

echo ""
print_header "Step 3: Moving Test Files"

# Test files
print_info "Moving test files..."
[ -f "test-complete-workflow.js" ] && mv "test-complete-workflow.js" "tests/" && print_success "test-complete-workflow.js"
[ -f "test-blockchain-connection.sh" ] && mv "test-blockchain-connection.sh" "tests/" && print_success "test-blockchain-connection.sh"
[ -f "test-all-portals.sh" ] && mv "test-all-portals.sh" "tests/" && print_success "test-all-portals.sh"
[ -f "test-customs-data.js" ] && mv "test-customs-data.js" "tests/" && print_success "test-customs-data.js"
[ -f "test-document-display.js" ] && mv "test-document-display.js" "tests/" && print_success "test-document-display.js"
[ -f "test-document-flow.sh" ] && mv "test-document-flow.sh" "tests/" && print_success "test-document-flow.sh"
[ -f "test-payment-methods.js" ] && mv "test-payment-methods.js" "tests/" && print_success "test-payment-methods.js"
[ -f "validate-full-integration.js" ] && mv "validate-full-integration.js" "tests/" && print_success "validate-full-integration.js"
[ -f "verify-all-actions.js" ] && mv "verify-all-actions.js" "tests/" && print_success "verify-all-actions.js"
[ -f "verify-portal-actions.js" ] && mv "verify-portal-actions.js" "tests/" && print_success "verify-portal-actions.js"
[ -f "verify-swift-build.sh" ] && mv "verify-swift-build.sh" "tests/" && print_success "verify-swift-build.sh"
[ -f "quick-verify.js" ] && mv "quick-verify.js" "tests/" && print_success "quick-verify.js"
[ -f "final-actions-verification.js" ] && mv "final-actions-verification.js" "tests/" && print_success "final-actions-verification.js"
[ -f "detailed-action-audit.js" ] && mv "detailed-action-audit.js" "tests/" && print_success "detailed-action-audit.js"

echo ""
print_header "Step 4: Moving Utility Scripts"

# Utility scripts
print_info "Moving utility scripts..."
[ -f "analyze-portal-tables.js" ] && mv "analyze-portal-tables.js" "scripts/utility/" && print_success "analyze-portal-tables.js"
[ -f "check-inspection-data.js" ] && mv "check-inspection-data.js" "scripts/utility/" && print_success "check-inspection-data.js"
[ -f "check-shipping-data.js" ] && mv "check-shipping-data.js" "scripts/utility/" && print_success "check-shipping-data.js"
[ -f "complete-pending-inspections.js" ] && mv "complete-pending-inspections.js" "scripts/utility/" && print_success "complete-pending-inspections.js"
[ -f "create-missing-users.js" ] && mv "create-missing-users.js" "scripts/utility/" && print_success "create-missing-users.js"
[ -f "create-simple-test-data.js" ] && mv "create-simple-test-data.js" "scripts/utility/" && print_success "create-simple-test-data.js"
[ -f "create-test-shipping-data.js" ] && mv "create-test-shipping-data.js" "scripts/utility/" && print_success "create-test-shipping-data.js"
[ -f "diagnose-data-issue.js" ] && mv "diagnose-data-issue.js" "scripts/utility/" && print_success "diagnose-data-issue.js"
[ -f "fix-lab-certification.js" ] && mv "fix-lab-certification.js" "scripts/utility/" && print_success "fix-lab-certification.js"
[ -f "fix-shipment-data.js" ] && mv "fix-shipment-data.js" "scripts/utility/" && print_success "fix-shipment-data.js"
[ -f "migrate-db-columns.js" ] && mv "migrate-db-columns.js" "scripts/utility/" && print_success "migrate-db-columns.js"
[ -f "migrate-old-applications.js" ] && mv "migrate-old-applications.js" "scripts/utility/" && print_success "migrate-old-applications.js"
[ -f "populate-shipping-data.js" ] && mv "populate-shipping-data.js" "scripts/utility/" && print_success "populate-shipping-data.js"
[ -f "recreate-test-data.js" ] && mv "recreate-test-data.js" "scripts/utility/" && print_success "recreate-test-data.js"
[ -f "register-missing-exporters.js" ] && mv "register-missing-exporters.js" "scripts/utility/" && print_success "register-missing-exporters.js"
[ -f "approve-contracts.js" ] && mv "approve-contracts.js" "scripts/utility/" && print_success "approve-contracts.js"
[ -f "fix-remaining.py" ] && mv "fix-remaining.py" "scripts/utility/" && print_success "fix-remaining.py"
[ -f "fix-types.py" ] && mv "fix-types.py" "scripts/utility/" && print_success "fix-types.py"
[ -f "fix-urls.py" ] && mv "fix-urls.py" "scripts/utility/" && print_success "fix-urls.py"

echo ""
print_header "Step 5: Moving Old Batch/PowerShell Files"

# Old batch/ps1 files
print_info "Moving old Windows scripts..."
[ -f "CLEAR-AND-RESTART.ps1" ] && mv "CLEAR-AND-RESTART.ps1" "scripts/utility/" && print_success "CLEAR-AND-RESTART.ps1"
[ -f "complete-inspections.ps1" ] && mv "complete-inspections.ps1" "scripts/utility/" && print_success "complete-inspections.ps1"
[ -f "complete-one-inspection.bat" ] && mv "complete-one-inspection.bat" "scripts/utility/" && print_success "complete-one-inspection.bat"
[ -f "deploy.ps1" ] && mv "deploy.ps1" "scripts/utility/" && print_success "deploy.ps1"
[ -f "fix-chaincode-connection.bat" ] && mv "fix-chaincode-connection.bat" "scripts/utility/" && print_success "fix-chaincode-connection.bat"
[ -f "fix-chaincode-connection.sh" ] && mv "fix-chaincode-connection.sh" "scripts/utility/" && print_success "fix-chaincode-connection.sh"
[ -f "fix-chaincode-timeout.sh" ] && mv "fix-chaincode-timeout.sh" "scripts/utility/" && print_success "fix-chaincode-timeout.sh"
[ -f "install.ps1" ] && mv "install.ps1" "scripts/utility/" && print_success "install.ps1"
[ -f "install.sh" ] && mv "install.sh" "scripts/utility/" && print_success "install.sh"
[ -f "kill-api.bat" ] && mv "kill-api.bat" "scripts/utility/" && print_success "kill-api.bat"
[ -f "restart-api-with-ipfs.bat" ] && mv "restart-api-with-ipfs.bat" "scripts/utility/" && print_success "restart-api-with-ipfs.bat"
[ -f "restart-api.bat" ] && mv "restart-api.bat" "scripts/utility/" && print_success "restart-api.bat"
[ -f "restart-peers.bat" ] && mv "restart-peers.bat" "scripts/utility/" && print_success "restart-peers.bat"
[ -f "restart-ui.bat" ] && mv "restart-ui.bat" "scripts/utility/" && print_success "restart-ui.bat"
[ -f "start-services.ps1" ] && mv "start-services.ps1" "scripts/utility/" && print_success "start-services.ps1"
[ -f "stop-services.ps1" ] && mv "stop-services.ps1" "scripts/utility/" && print_success "stop-services.ps1"

echo ""
print_header "Step 6: Moving Old Text/Log Files"

# Old text/log files
print_info "Moving old output files..."
[ -f "payment-result.txt" ] && mv "payment-result.txt" "scripts/utility/" && print_success "payment-result.txt"
[ -f "portal-check.txt" ] && mv "portal-check.txt" "scripts/utility/" && print_success "portal-check.txt"
[ -f "test-doc.txt" ] && mv "test-doc.txt" "scripts/utility/" && print_success "test-doc.txt"
[ -f "test-upload.txt" ] && mv "test-upload.txt" "scripts/utility/" && print_success "test-upload.txt"
[ -f "workflow-result.txt" ] && mv "workflow-result.txt" "scripts/utility/" && print_success "workflow-result.txt"
[ -f "CgoCBCscriptscc-status.txt" ] && mv "CgoCBCscriptscc-status.txt" "scripts/utility/" && print_success "CgoCBCscriptscc-status.txt"

echo ""
print_header "Step 7: Creating Index Files"

# Create index in docs folder
cat > docs/README.md << 'EOF'
# CECBS Documentation

**Last Updated**: $(date +%Y-%m-%d)

## 📁 Directory Structure

```
docs/
├── business/           → Business case and executive documentation
├── technical/          → Technical architecture and design
├── implementation/     → MSP implementation and development progress
├── deployment/         → Deployment guides and readiness checks
├── user-guides/        → Portal user guides (6 organizations)
├── swift/              → SWIFT integration documentation
└── archived/           → Historical documentation and fix reports
```

## 🚀 Quick Start

**For Leadership**: Start with `business/EXECUTIVE-BRIEFING.md`

**For Deployment**: Start with `deployment/DEPLOY-README.md`

**For Users**: See portal guides in `user-guides/`

**For Developers**: See `technical/` and `implementation/`

## 📚 Key Documents

### Business & Strategy
- [WHY-BLOCKCHAIN-FOR-COFFEE-EXPORT.md](business/WHY-BLOCKCHAIN-FOR-COFFEE-EXPORT.md) - Complete business case
- [EXECUTIVE-BRIEFING.md](business/EXECUTIVE-BRIEFING.md) - Leadership summary
- [EXECUTIVE-SUMMARY-MSP-IMPLEMENTATION.md](business/EXECUTIVE-SUMMARY-MSP-IMPLEMENTATION.md) - MSP achievement overview

### Technical Architecture
- [BLOCKCHAIN-POWERED-ARCHITECTURE.md](technical/BLOCKCHAIN-POWERED-ARCHITECTURE.md) - System architecture
- [FABRIC-SDK-MSP-FLOW.md](technical/FABRIC-SDK-MSP-FLOW.md) - MSP identity flow
- [MSP-IDENTITY-ENHANCEMENTS.md](technical/MSP-IDENTITY-ENHANCEMENTS.md) - MSP enhancements

### Implementation
- [PROJECT-COMPLETE-SUMMARY.md](implementation/PROJECT-COMPLETE-SUMMARY.md) - Complete implementation summary
- [MSP-IMPLEMENTATION-INDEX.md](implementation/MSP-IMPLEMENTATION-INDEX.md) - MSP documentation index
- [VERIFICATION-COMPLETE-100-PERCENT.md](implementation/VERIFICATION-COMPLETE-100-PERCENT.md) - Verification report

### Deployment
- [DEPLOY-README.md](deployment/DEPLOY-README.md) - Quick deployment guide ⭐ START HERE
- [DEPLOYMENT-GUIDE-QUICK-START.md](deployment/DEPLOYMENT-GUIDE-QUICK-START.md) - Detailed walkthrough
- [SYSTEM-READINESS-CHECK.md](deployment/SYSTEM-READINESS-CHECK.md) - Complete readiness assessment
- [PRODUCTION-READY-SUMMARY.md](deployment/PRODUCTION-READY-SUMMARY.md) - Production deployment guide

### User Guides
- [PORTAL-DOCUMENTATION-INDEX.md](user-guides/PORTAL-DOCUMENTATION-INDEX.md) - Index of all portal guides
- Individual portal guides for 6 organizations (ECTA, NBE, Banks, ECX, Customs, Exporters)

### SWIFT Integration
- [SWIFT-FINAL-SUMMARY.md](swift/SWIFT-FINAL-SUMMARY.md) - SWIFT integration summary
- [SWIFT-QUICK-START.md](swift/SWIFT-QUICK-START.md) - SWIFT quick start guide

## 🔍 Finding Documents

**By Topic**:
- Business case → `business/`
- Deployment → `deployment/`
- User guides → `user-guides/`
- Technical details → `technical/`
- Implementation history → `implementation/` and `archived/`

**By Role**:
- CEO/Leadership → `business/EXECUTIVE-BRIEFING.md`
- DevOps/Deployment → `deployment/DEPLOY-README.md`
- End Users → `user-guides/PORTAL-DOCUMENTATION-INDEX.md`
- Developers → `technical/` and `implementation/`

---

**For latest updates, see the main README.md in project root**
EOF

print_success "Created docs/README.md"

# Create index in tests folder
cat > tests/README.md << 'EOF'
# CECBS Test Files

Test scripts and validation utilities for the Coffee Export Blockchain System.

## Test Files

- `test-complete-workflow.js` - End-to-end workflow testing
- `test-blockchain-connection.sh` - Blockchain connectivity test
- `test-all-portals.sh` - All portal functionality tests
- `test-customs-data.js` - Customs data validation
- `test-document-display.js` - Document upload/display tests
- `test-document-flow.sh` - Document flow testing
- `test-payment-methods.js` - Payment method tests
- `validate-full-integration.js` - Full integration validation
- `verify-all-actions.js` - All actions verification
- `verify-portal-actions.js` - Portal actions verification
- `verify-swift-build.sh` - SWIFT build verification
- `quick-verify.js` - Quick system verification
- `final-actions-verification.js` - Final actions audit
- `detailed-action-audit.js` - Detailed action audit

## Usage

Most tests require the system to be running. Start services first:

```bash
# Start blockchain
cd blockchain && docker-compose up -d

# Start API
cd api && npm start

# Start UI
cd ui && npm start

# Run tests
node tests/test-complete-workflow.js
```

---

For deployment testing, see `docs/deployment/` folder.
EOF

print_success "Created tests/README.md"

# Create index in scripts folder
cat > scripts/README.md << 'EOF'
# CECBS Utility Scripts

Utility scripts for data migration, testing, and system maintenance.

## Utility Scripts (`utility/`)

### Data Management
- `create-simple-test-data.js` - Create simple test data
- `create-test-shipping-data.js` - Create test shipping data
- `recreate-test-data.js` - Recreate all test data
- `populate-shipping-data.js` - Populate shipping data

### Data Migration
- `migrate-db-columns.js` - Migrate database columns
- `migrate-old-applications.js` - Migrate old applications
- `create-missing-users.js` - Create missing users
- `register-missing-exporters.js` - Register missing exporters

### Data Verification
- `analyze-portal-tables.js` - Analyze portal data tables
- `check-inspection-data.js` - Check inspection data
- `check-shipping-data.js` - Check shipping data
- `diagnose-data-issue.js` - Diagnose data issues

### Data Fixes
- `fix-lab-certification.js` - Fix lab certification issues
- `fix-shipment-data.js` - Fix shipment data
- `approve-contracts.js` - Approve pending contracts
- `complete-pending-inspections.js` - Complete pending inspections

### Old Windows Scripts
- Various `.bat`, `.ps1`, `.sh` files for quick operations
- Mostly for development, replaced by main scripts

## Usage

```bash
# Run utility scripts from project root
node scripts/utility/create-simple-test-data.js

# Or from scripts directory
cd scripts/utility
node create-simple-test-data.js
```

---

For main operations, use scripts in project root:
- `chaincode.sh` - Chaincode management
- `prepare-deployment.sh` - Deployment preparation
- `deploy-to-coffeex-cbe.sh` - Production deployment
EOF

print_success "Created scripts/README.md"

echo ""
print_header "Organization Complete!"

echo ""
print_success "Codebase organized successfully!"
echo ""
echo "Directory structure:"
echo "  ${CYAN}docs/business/${NC}       → Business documentation"
echo "  ${CYAN}docs/technical/${NC}      → Technical documentation"
echo "  ${CYAN}docs/implementation/${NC} → Implementation docs"
echo "  ${CYAN}docs/deployment/${NC}     → Deployment guides"
echo "  ${CYAN}docs/user-guides/${NC}    → User portal guides"
echo "  ${CYAN}docs/swift/${NC}          → SWIFT integration"
echo "  ${CYAN}docs/archived/${NC}       → Historical docs"
echo "  ${CYAN}tests/${NC}               → Test files"
echo "  ${CYAN}scripts/utility/${NC}     → Utility scripts"
echo ""
echo "Main files remain in root:"
echo "  • README.md"
echo "  • chaincode.sh"
echo "  • prepare-deployment.sh"
echo "  • deploy-to-coffeex-cbe.sh"
echo "  • docker-compose files"
echo "  • package.json"
echo ""
print_info "Next steps:"
echo "  1. Review organized structure"
echo "  2. Update any scripts with hardcoded paths"
echo "  3. Commit changes to git"
echo ""


echo ""
print_header "Step 8: Handling Unnecessary Files"

# Check for unnecessary files
CLEANUP_NEEDED=0

# Backup files
if [ -f "docker-compose-fabric.yml.bak" ]; then
    print_warning "Found backup file: docker-compose-fabric.yml.bak"
    ((CLEANUP_NEEDED++))
fi

# Zip files
if [ -f "ipfs-kubo.zip" ]; then
    print_warning "Found zip file: ipfs-kubo.zip (32MB - IPFS already installed)"
    ((CLEANUP_NEEDED++))
fi
if [ -f "UsersCBEDownloadsipfs-kubo.zip" ]; then
    print_warning "Found zip file: UsersCBEDownloadsipfs-kubo.zip (duplicate)"
    ((CLEANUP_NEEDED++))
fi

# Temporary output files
for file in payment-result.txt portal-check.txt test-doc.txt test-upload.txt workflow-result.txt CgoCBCscriptscc-status.txt; do
    if [ -f "$file" ]; then
        print_warning "Found temporary file: $file"
        ((CLEANUP_NEEDED++))
    fi
done

if [ $CLEANUP_NEEDED -gt 0 ]; then
    echo ""
    print_info "Found $CLEANUP_NEEDED unnecessary file(s)"
    print_info "Run 'bash cleanup-unnecessary.sh' to clean them up"
else
    print_success "No unnecessary files found"
fi

echo ""
print_info "Organization complete!"
