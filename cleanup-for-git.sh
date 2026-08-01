#!/bin/bash
# Cleanup unnecessary files before git push

set -e

echo "🧹 Cleaning up unnecessary files for git..."
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Files to remove
echo -e "${BLUE}Removing temporary and duplicate documentation files...${NC}"

# Temporary test scripts
rm -f check-exporter-shipments.js
rm -f check-forex-blockchain.js
rm -f check-shipment-data.js
rm -f check-specific-shipment.js
rm -f find-shipment-by-lc.js
rm -f fix-empty-shipments.js
rm -f fix-lc-approval.js
rm -f test-blockchain-connection.js
rm -f test-blockchain-data.sh
rm -f test-direct-blockchain.js
rm -f test-duplicate-prevention.js
rm -f test-find-shipment.js
rm -f test-forex-allocation.js
rm -f test-lc-query.js
rm -f test-query-shipment.js
rm -f test-query-shipments.sh
rm -f test-shipment-lc-link.js
rm -f test-shipment-workflow.js
rm -f automated-forex-test.sh

# Temporary output files
rm -f test-output.log
rm -f CgoCBCscriptscc-status.txt
rm -f nul
rm -f IMPROVEMENTS-SUMMARY.txt

# Old/duplicate docker compose files
rm -f docker-compose-complete.yml
rm -f docker-compose-fabric.yml.bak
rm -f docker-compose.db.yml

# Old deployment scripts (keep newer ones)
rm -f deploy-v125.sh
rm -f deploy-to-coffeex-cbe.sh
rm -f chaincode.sh
rm -f cleanup-unnecessary.sh
rm -f organize-codebase.bat
rm -f organize-codebase.sh
rm -f restart-fabric-network.sh

# Duplicate/redundant documentation
rm -f ALL-WORK-COMPLETE-FINAL-SUMMARY.md
rm -f AUDIT-TRAIL-COMPLETE-VERIFICATION.md
rm -f AUDIT-TRAIL-FINAL-CONFIRMATION.md
rm -f AUDIT-TRAIL-SUMMARY.md
rm -f AUDIT-TRAIL-VISUAL-FLOW.md
rm -f BANKING-PORTAL-UI-IMPROVEMENTS.md
rm -f BANKING-UI-IMPLEMENTATION-COMPLETE.md
rm -f BANKING-UI-IMPROVEMENT-SUMMARY.md
rm -f BANKING-UI-QUICK-WINS.md
rm -f BANKING-UI-VISUAL-COMPARISON.md
rm -f BANKS-PORTAL-API-STATUS.md
rm -f BANKS-PORTAL-AUDIT-TRAIL-FIX.md
rm -f BANKS-PORTAL-CHANGES-SUMMARY.md
rm -f BANKS-PORTAL-COVERAGE-ANALYSIS.md
rm -f BANKS-PORTAL-FINAL-SUMMARY.md
rm -f BANKS-PORTAL-IMPLEMENTATION-COMPLETE.md
rm -f BANKS-PORTAL-IMPROVEMENTS-SUMMARY.md
rm -f BANKS-PORTAL-UI-CONSISTENCY-FIX.md
rm -f BANKS-PORTAL-WORKFLOW-REDESIGN.md
rm -f BANKS-WORKFLOW-FIXED.md
rm -f CHAINCODE-PORTAL-WORKFLOW-ANALYSIS.md
rm -f CLICKABLE-KPI-CARDS-FEATURE.md
rm -f COMPLETE-SYSTEM-WORKFLOW-STATUS.md
rm -f COMPREHENSIVE-CHAINCODE-ANALYSIS-COMPLETE.md
rm -f CRYPTOGRAPHIC-FIX-SUMMARY.md
rm -f CUSTOMS-AUTO-FILL-FIX.md
rm -f CUSTOMS-DATA-FLOW-FIXES-APPLIED.md
rm -f CUSTOMS-DATA-FLOW-ISSUE-ANALYSIS.md
rm -f CUSTOMS-DECLARATION-UX-IMPROVEMENTS.md
rm -f CUSTOMS-OFFICER-QUICK-REFERENCE.md
rm -f CUSTOMS-PORTAL-COMPLETE-IMPLEMENTATION-VERIFICATION.md
rm -f CUSTOMS-PORTAL-DIALOG-FORMS-FIX.md
rm -f CUSTOMS-PORTAL-IMPLEMENTATION-STATUS.md
rm -f CUSTOMS-PORTAL-QUICK-START.md
rm -f CUSTOMS-PORTAL-VISUAL-WORKFLOW.md
rm -f CUSTOMS-STATUS-WORKFLOW-DIAGNOSIS.md
rm -f CUSTOMS-TAB-ACTIONS-FIX.md
rm -f CUSTOMS-TAB-FILTERING-FIX.md
rm -f CUSTOMS-UI-STATUS-FIX.md
rm -f DATA-FLOW-DIAGRAM.md
rm -f DATA-FLOW-IMPROVEMENTS-FINAL-SUMMARY.md
rm -f DATA-FLOW-IMPROVEMENTS-PROGRESS.md
rm -f DATA-FLOW-IMPROVEMENTS-SUMMARY.md
rm -f DEPLOYMENT-READY-SUMMARY.md
rm -f DEVELOPER-QUICK-REFERENCE.md
rm -f DOCUMENT-SYSTEM-QUICK-START.md
rm -f DOCUMENT-UPLOAD-ERROR-FIX.md
rm -f DOCUMENT-UPLOAD-FIELD-NAME-FIX.md
rm -f DOCUMENT-WORKFLOW-IMPLEMENTATION.md
rm -f EASY-TEST-GUIDE.md
rm -f ECTA-CUSTOMS-WORKFLOW-INTEGRATION.md
rm -f ECTA-PORTAL-COMPLETE-SUMMARY.md
rm -f ECTA-PORTAL-KPI-FIX.md
rm -f ECTA-PORTAL-UI-CONSISTENCY-APPLIED.md
rm -f EXECUTIVE-BRIEFING.md
rm -f EXPERT-CONFIRMATION-REPORT.md
rm -f EXPERT-HONEST-ASSESSMENT.md
rm -f EXPERT-VERIFICATION-EVIDENCE.md
rm -f FINAL-VERIFICATION-COMPLETE.md
rm -f FIXES-SUMMARY.md
rm -f IMPLEMENTATION-COMPLETE-NBE-ROLE.md
rm -f IMPLEMENTATION-COMPLETE-SUMMARY.md
rm -f IMPLEMENTATION-SUMMARY.md
rm -f INDEX-ALL-DELIVERABLES.md
rm -f KPI-CARDS-NUMERIC-UPDATE.md
rm -f LC-WORKFLOW-FIX.md
rm -f PERMIT-READY-COUNT-FIX.md
rm -f PORTAL-AUDIT-TRAIL-STATUS.md
rm -f PORTAL-WORKFLOWS-IMPLEMENTATION.md
rm -f PROJECT-COMPLETION-SUMMARY.md
rm -f README-BANKS-PORTAL.md
rm -f README-DATA-FLOW-IMPROVEMENTS.md
rm -f README-WEEK5-DELIVERABLES.md
rm -f REJECTED-APPLICATION-RESUBMISSION-FEATURE.md
rm -f REJECTED-USER-ACCESS-CONTROL.md
rm -f SESSION-SUMMARY-COMPLETE.md
rm -f SESSION-SUMMARY-CUSTOMS-FIX.md
rm -f SHIPMENT-DATA-DEBUG-GUIDE.md
rm -f SHIPMENT-DATA-FLOW.md
rm -f SHIPMENT-WORKFLOW-VERIFICATION.md
rm -f SHIPMENTS-FIX-SUMMARY.md
rm -f SHIPMENTS-UI-IMPROVEMENTS.md
rm -f TABLE-HEADERS-CONSISTENCY-FIX.md
rm -f TEST-FOREX-INSTRUCTIONS.md
rm -f test-customs-workflow.md
rm -f UI-CONSISTENCY-IMPROVEMENTS-SUMMARY.md
rm -f UI-LC-WORKFLOW-GUIDE.md
rm -f VERIFICATION-CHECKLIST.md
rm -f WEEK3-DOCUMENT-DATABASE-COMPLETED.md
rm -f WEEK4-DOCUMENT-API-COMPLETED.md
rm -f WEEK5-INTEGRATION-COMPLETED.md
rm -f WEEK5-INTEGRATION-GUIDE.md
rm -f WEEK5-PHASE2-COMPLETED.md
rm -f WORK-COMPLETE-SUMMARY.md
rm -f WORKFLOW-STATUS-DIAGRAM.md

# Helper scripts that are no longer needed
rm -f verify-scripts.sh
rm -f setup-scripts.sh

# Keep STARTUP-SCRIPTS-SUMMARY.md as it's useful
# Keep DOCUMENTATION-INDEX.md as it's the master index

echo -e "${GREEN}✓ Removed temporary files${NC}"

# Clean up empty directories
echo ""
echo -e "${BLUE}Checking for empty directories...${NC}"
find . -type d -empty -not -path "./.git/*" 2>/dev/null | while read dir; do
    if [ "$dir" != "./.git" ]; then
        echo "  Removing empty directory: $dir"
        rmdir "$dir" 2>/dev/null || true
    fi
done

# Clean up node_modules in root (should only be in api/ and ui/)
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ Found node_modules in root directory (should only be in api/ and ui/)${NC}"
    echo "  To remove: rm -rf node_modules"
fi

# Clean up .venv (Python virtual environment - not needed for production)
if [ -d ".venv" ]; then
    echo -e "${YELLOW}⚠ Found .venv directory (Python virtual environment)${NC}"
    echo "  To remove: rm -rf .venv"
fi

# Clean up fabric-samples if it exists and is not needed
if [ -d "fabric-samples" ]; then
    echo -e "${YELLOW}⚠ Found fabric-samples directory (development only)${NC}"
    echo "  To remove: rm -rf fabric-samples"
fi

# Clean up kubo if it exists
if [ -d "kubo" ]; then
    echo -e "${YELLOW}⚠ Found kubo directory (IPFS - if not used)${NC}"
    echo "  To remove: rm -rf kubo"
fi

echo ""
echo -e "${GREEN}✓ Cleanup complete!${NC}"
echo ""
echo -e "${BLUE}Files kept (essential documentation):${NC}"
echo "  ✓ README.md - Project overview"
echo "  ✓ START-HERE.md - Landing page"
echo "  ✓ GETTING-STARTED.md - Beginner guide"
echo "  ✓ STARTUP-GUIDE.md - Complete reference"
echo "  ✓ SCRIPTS-OVERVIEW.md - Script guide"
echo "  ✓ DOCUMENTATION-INDEX.md - Master index"
echo "  ✓ STARTUP-SCRIPTS-SUMMARY.md - Script summary"
echo "  ✓ COMPLETE-WORKFLOW-SEQUENCE.md - Workflow guide"
echo "  ✓ WORKFLOW-VERIFICATION.md - Testing guide"
echo "  ✓ CUSTOMS-PORTAL-WORKFLOW-BUTTONS.md - Customs workflow"
echo "  ✓ AUDIT-TRAIL-IMPLEMENTATION-STATUS.md - Audit status"
echo "  ✓ BANKS-PORTAL-IMPLEMENTATION-PLAN.md - Banks features"
echo "  ✓ IMPLEMENTATION-ROADMAP.md - Feature roadmap"
echo "  ✓ EMAIL-NOTIFICATIONS-SETUP.md - Email config"
echo "  ✓ DEPLOYMENT-CHECKLIST.md - Deployment guide"
echo ""
echo -e "${BLUE}Startup scripts kept:${NC}"
echo "  ✓ start-all.sh / start-all.ps1"
echo "  ✓ stop-all.sh / stop-all.ps1"
echo "  ✓ restart-all.sh / restart-all.ps1"
echo "  ✓ status.sh / status.ps1"
echo "  ✓ dev-mode.sh / dev-mode.ps1"
echo "  ✓ START-SYSTEM.bat / STOP-SYSTEM.bat"
echo ""
echo -e "${GREEN}Ready for git commit!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review changes: git status"
echo "  2. Add files: git add ."
echo "  3. Commit: git commit -m 'Add comprehensive startup scripts and documentation'"
echo "  4. Push: git push origin features"
echo ""
