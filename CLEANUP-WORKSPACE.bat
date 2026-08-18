@echo off
REM Cleanup script to organize documentation and remove temporary files

echo === CECBS Workspace Cleanup ===
echo.

REM Create organized documentation folders
if not exist "Docs\guides" mkdir "Docs\guides"
if not exist "Docs\fixes" mkdir "Docs\fixes"
if not exist "Docs\implementation" mkdir "Docs\implementation"
if not exist "Docs\audit-trail" mkdir "Docs\audit-trail"
if not exist "Docs\admin" mkdir "Docs\admin"
if not exist "Docs\quick-reference" mkdir "Docs\quick-reference"
if not exist "Docs\archived" mkdir "Docs\archived"

echo Created documentation folders
echo.

echo Moving documentation files...

REM Guides
move /Y *-GUIDE.md "Docs\guides\" >nul 2>&1
move /Y QUICK-START*.md "Docs\guides\" >nul 2>&1
move /Y TROUBLESHOOTING.md "Docs\guides\" >nul 2>&1
move /Y START-HERE.md "Docs\guides\" >nul 2>&1

REM Quick References
move /Y *-QUICK-REFERENCE.md "Docs\quick-reference\" >nul 2>&1
move /Y *-QUICKSTART.md "Docs\quick-reference\" >nul 2>&1

REM Audit Trail docs
move /Y AUDIT-TRAIL*.md "Docs\audit-trail\" >nul 2>&1

REM Admin docs
move /Y ADMIN-*.md "Docs\admin\" >nul 2>&1
move /Y USER-MANAGEMENT*.md "Docs\admin\" >nul 2>&1
move /Y PORTAL-*.md "Docs\admin\" >nul 2>&1
move /Y ROLE-*.md "Docs\admin\" >nul 2>&1

REM Implementation docs
move /Y IMPLEMENTATION*.md "Docs\implementation\" >nul 2>&1
move /Y *-IMPLEMENTATION*.md "Docs\implementation\" >nul 2>&1
move /Y *-COMPLETE.md "Docs\implementation\" >nul 2>&1
move /Y SYSTEM-*.md "Docs\implementation\" >nul 2>&1
move /Y COMPLETE-*.md "Docs\implementation\" >nul 2>&1

REM Fix documentation
move /Y *-FIX*.md "Docs\fixes\" >nul 2>&1
move /Y BUGFIX*.md "Docs\fixes\" >nul 2>&1
move /Y FIXES-*.md "Docs\fixes\" >nul 2>&1

REM Main documentation
move /Y README*.md "Docs\" >nul 2>&1
move /Y DOCUMENTATION-INDEX.md "Docs\" >nul 2>&1
move /Y SHARE-WITH-TEAM.md "Docs\" >nul 2>&1

REM Archive remaining status/summary docs
move /Y *-SUMMARY.md "Docs\archived\" >nul 2>&1
move /Y *-STATUS.md "Docs\archived\" >nul 2>&1
move /Y SESSION-*.md "Docs\archived\" >nul 2>&1
move /Y VERIFICATION-*.md "Docs\archived\" >nul 2>&1

echo Documentation organized
echo.

echo Removing temporary files...

REM Remove temporary test files
del /F /Q check-contract-bank-fields.js >nul 2>&1
del /F /Q check-contracts-data.js >nul 2>&1
del /F /Q check-lc-bank-fields.js >nul 2>&1
del /F /Q test-*.json >nul 2>&1
del /F /Q token.json >nul 2>&1
del /F /Q audit-trail-response.json >nul 2>&1
del /F /Q compliance-report.json >nul 2>&1
del /F /Q nul >nul 2>&1
del /F /Q code.tar.gz >nul 2>&1

REM Remove temporary log files
del /F /Q chaincode-deploy.log >nul 2>&1
del /F /Q deploy-log.txt >nul 2>&1
del /F /Q deploy-output.log >nul 2>&1
del /F /Q CgoCBCscriptscc-status.txt >nul 2>&1

REM Remove old chaincode packages
del /F /Q coffee_*.tgz >nul 2>&1

echo Temporary files removed
echo.

echo === Cleanup Complete ===
echo.
echo Documentation organized in:
echo   - Docs\guides\          User and setup guides
echo   - Docs\quick-reference\ Quick reference docs
echo   - Docs\audit-trail\     Audit trail documentation
echo   - Docs\admin\           Admin and user management docs
echo   - Docs\implementation\  Implementation details
echo   - Docs\fixes\           Bug fix documentation
echo   - Docs\archived\        Archived status files
echo.
echo Temporary files and logs cleaned up
echo.
pause
