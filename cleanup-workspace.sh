#!/bin/bash
# Cleanup script to organize documentation and remove temporary files

echo "=== CECBS Workspace Cleanup ==="
echo ""

# Create organized documentation folders
mkdir -p Docs/guides
mkdir -p Docs/fixes
mkdir -p Docs/implementation
mkdir -p Docs/audit-trail
mkdir -p Docs/admin
mkdir -p Docs/quick-reference
mkdir -p Docs/archived

echo "✓ Created documentation folders"

# Move documentation files to appropriate folders
echo ""
echo "Moving documentation files..."

# Guides
mv -f *-GUIDE.md Docs/guides/ 2>/dev/null
mv -f QUICK-START*.md Docs/guides/ 2>/dev/null
mv -f TROUBLESHOOTING.md Docs/guides/ 2>/dev/null
mv -f START-HERE.md Docs/guides/ 2>/dev/null

# Quick References
mv -f *-QUICK-REFERENCE.md Docs/quick-reference/ 2>/dev/null
mv -f *-QUICKSTART.md Docs/quick-reference/ 2>/dev/null

# Audit Trail docs
mv -f AUDIT-TRAIL*.md Docs/audit-trail/ 2>/dev/null

# Admin docs
mv -f ADMIN-*.md Docs/admin/ 2>/dev/null
mv -f USER-MANAGEMENT*.md Docs/admin/ 2>/dev/null
mv -f PORTAL-*.md Docs/admin/ 2>/dev/null
mv -f ROLE-*.md Docs/admin/ 2>/dev/null

# Implementation docs
mv -f IMPLEMENTATION*.md Docs/implementation/ 2>/dev/null
mv -f *-IMPLEMENTATION*.md Docs/implementation/ 2>/dev/null
mv -f *-COMPLETE.md Docs/implementation/ 2>/dev/null
mv -f SYSTEM-*.md Docs/implementation/ 2>/dev/null
mv -f COMPLETE-*.md Docs/implementation/ 2>/dev/null

# Fix documentation
mv -f *-FIX*.md Docs/fixes/ 2>/dev/null
mv -f BUGFIX*.md Docs/fixes/ 2>/dev/null
mv -f FIXES-*.md Docs/fixes/ 2>/dev/null

# Main documentation (keep these visible)
mv -f README*.md Docs/ 2>/dev/null
mv -f DOCUMENTATION-INDEX.md Docs/ 2>/dev/null
mv -f SHARE-WITH-TEAM.md Docs/ 2>/dev/null

# Archive remaining status/summary docs
mv -f *-SUMMARY.md Docs/archived/ 2>/dev/null
mv -f *-STATUS.md Docs/archived/ 2>/dev/null
mv -f SESSION-*.md Docs/archived/ 2>/dev/null
mv -f VERIFICATION-*.md Docs/archived/ 2>/dev/null

echo "✓ Documentation organized"

# Remove temporary test files
echo ""
echo "Removing temporary files..."

rm -f check-contract-bank-fields.js 2>/dev/null
rm -f check-contracts-data.js 2>/dev/null
rm -f check-lc-bank-fields.js 2>/dev/null
rm -f test-*.json 2>/dev/null
rm -f token.json 2>/dev/null
rm -f audit-trail-response.json 2>/dev/null
rm -f compliance-report.json 2>/dev/null
rm -f nul 2>/dev/null
rm -f code.tar.gz 2>/dev/null

# Remove temporary log files
rm -f chaincode-deploy.log 2>/dev/null
rm -f deploy-log.txt 2>/dev/null
rm -f deploy-output.log 2>/dev/null
rm -f CgoCBCscriptscc-status.txt 2>/dev/null

# Remove old chaincode packages
rm -f coffee_*.tgz 2>/dev/null

echo "✓ Temporary files removed"

# Remove old/duplicate scripts
echo ""
echo "Cleaning up duplicate scripts..."

# Keep only the primary start/stop scripts
rm -f start-all.sh 2>/dev/null  # Keep start-all.ps1 and START-SYSTEM.bat
rm -f stop-all.sh 2>/dev/null   # Keep stop-all.ps1 and STOP-SYSTEM.bat
rm -f start-safe.sh 2>/dev/null
rm -f start-minimal.sh 2>/dev/null
rm -f start-debug.sh 2>/dev/null
rm -f restart-data-safe.sh 2>/dev/null

echo "✓ Duplicate scripts removed"

echo ""
echo "=== Cleanup Complete ==="
echo ""
echo "Documentation organized in:"
echo "  - Docs/guides/          User and setup guides"
echo "  - Docs/quick-reference/ Quick reference docs"
echo "  - Docs/audit-trail/     Audit trail documentation"
echo "  - Docs/admin/           Admin and user management docs"
echo "  - Docs/implementation/  Implementation details"
echo "  - Docs/fixes/           Bug fix documentation"
echo "  - Docs/archived/        Archived status files"
echo ""
echo "Temporary files and logs cleaned up"
echo "Duplicate scripts removed"
