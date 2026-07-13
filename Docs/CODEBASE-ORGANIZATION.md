# 📁 CECBS Codebase Organization

**Purpose**: Clean and organize the codebase by moving documentation and testing files into proper folders

**Status**: Script ready to run

---

## 🎯 What This Script Does

The `organize-codebase.sh` script will create a clean folder structure and move all documentation and testing files accordingly:

### **New Folder Structure**

```
goCBC/
├── docs/
│   ├── business/           → Business case, executive briefings
│   ├── technical/          → Architecture, MSP flows, technical docs
│   ├── implementation/     → MSP implementation, phase reports
│   ├── deployment/         → Deployment guides, readiness checks
│   ├── user-guides/        → Portal user guides (6 organizations)
│   ├── swift/              → SWIFT integration documentation
│   └── archived/           → Old status files, fix reports, etc.
├── tests/                  → All test files (test-*.js, verify-*.js)
├── scripts/
│   └── utility/            → Utility scripts, old .bat/.ps1 files
├── api/                    → API server code (unchanged)
├── ui/                     → Frontend code (unchanged)
├── blockchain/             → Blockchain config (unchanged)
├── chaincodes/             → Chaincode source (unchanged)
└── (root)                  → Main scripts stay here
    ├── README.md
    ├── chaincode.sh
    ├── prepare-deployment.sh
    ├── deploy-to-coffeex-cbe.sh
    ├── docker-compose files
    └── package.json
```

---

## 🚀 How to Run

### **Option 1: Windows**

```cmd
organize-codebase.bat
```

### **Option 2: Linux/Mac/Git Bash**

```bash
bash organize-codebase.sh
```

### **Interactive Process**

1. Script shows what it will do
2. Asks for confirmation
3. Creates folder structure
4. Moves files to appropriate locations
5. Creates README.md files in each folder
6. Shows summary

---

## 📋 What Gets Moved

### **Business Documentation** → `docs/business/`
- WHY-BLOCKCHAIN-FOR-COFFEE-EXPORT.md
- EXECUTIVE-BRIEFING.md
- EXECUTIVE-SUMMARY-MSP-IMPLEMENTATION.md

### **Technical Documentation** → `docs/technical/`
- BLOCKCHAIN-POWERED-ARCHITECTURE.md
- FABRIC-SDK-MSP-FLOW.md
- MSP-IDENTITY-ENHANCEMENTS.md
- BLOCKCHAIN-FEATURES-VERIFICATION.md

### **Implementation Documentation** → `docs/implementation/`
- PROJECT-COMPLETE-SUMMARY.md
- MSP-IMPLEMENTATION-ROADMAP.md
- PHASE-1-COMPLETE.md
- PHASE-2-COMPLETE.md
- PHASE-3-COMPLETE-100-PERCENT.md
- VERIFICATION-COMPLETE-100-PERCENT.md
- All MSP implementation docs
- AWB implementation docs

### **Deployment Documentation** → `docs/deployment/`
- SYSTEM-READINESS-CHECK.md
- PRODUCTION-READY-SUMMARY.md
- DEPLOYMENT-SUCCESS-v1.30.md
- DEPLOYMENT-GUIDE-QUICK-START.md
- DEPLOY-README.md
- All deployment-related guides

### **User Guides** → `docs/user-guides/`
- PORTAL-DOCUMENTATION-INDEX.md
- EXPORTER-PORTAL-GUIDE.md
- ECTA-PORTAL-GUIDE.md
- NBE-PORTAL-GUIDE.md
- BANKS-PORTAL-GUIDE.md
- ECX-PORTAL-GUIDE.md
- CUSTOMS-PORTAL-GUIDE.md

### **SWIFT Documentation** → `docs/swift/`
- All SWIFT-*.md files
- SWIFT implementation guides
- SWIFT testing guides

### **Archived Documentation** → `docs/archived/`
- All old status files
- Fix reports (FIX-*.md)
- Old summaries
- Historical implementation docs
- ~40+ old markdown files

### **Test Files** → `tests/`
- test-*.js
- verify-*.js
- test-*.sh
- All validation scripts

### **Utility Scripts** → `scripts/utility/`
- Data migration scripts
- Utility .js files
- Old .bat/.ps1 files
- Old .sh helper scripts
- Old output .txt files

---

## 📚 Files That Stay in Root

These important files remain in the project root:

### **Essential Files**
- README.md (main project readme)
- package.json
- package-lock.json
- go.mod
- .gitignore
- .cleanupignore

### **Main Scripts**
- chaincode.sh
- prepare-deployment.sh
- prepare-deployment.bat
- deploy-to-coffeex-cbe.sh
- deploy-chaincode.sh
- organize-codebase.sh (this script)

### **Docker Configuration**
- docker-compose-fabric.yml
- docker-compose-complete.yml
- Dockerfile (if any)

### **Deployment Scripts**
- deploy-v125.sh
- deploy.ps1

---

## ✅ Benefits

**Before**:
- 100+ files in root directory
- Hard to find specific documentation
- Mix of old and new files
- Unclear what's important

**After**:
- Clean root directory (~15-20 files)
- Organized by purpose
- Easy to navigate
- Clear structure

---

## 🔍 Finding Files After Organization

### **I need deployment instructions**
→ Check `docs/deployment/DEPLOY-README.md`

### **I need business case**
→ Check `docs/business/WHY-BLOCKCHAIN-FOR-COFFEE-EXPORT.md`

### **I need user guide**
→ Check `docs/user-guides/PORTAL-DOCUMENTATION-INDEX.md`

### **I need technical details**
→ Check `docs/technical/`

### **I need to run tests**
→ Check `tests/`

### **I need old fix reports**
→ Check `docs/archived/`

---

## ⚠️ Important Notes

### **Safe Operation**
- Script only **moves** files (doesn't delete)
- All files are preserved
- Can be undone manually if needed

### **Git Consideration**
```bash
# After running, review changes
git status

# Add new structure
git add docs/ tests/ scripts/

# Commit
git commit -m "Organize codebase: move docs and tests to folders"
```

### **Path Updates**
If you have scripts with hardcoded paths to moved files, update them:

**Before**:
```bash
cat WHY-BLOCKCHAIN-FOR-COFFEE-EXPORT.md
```

**After**:
```bash
cat docs/business/WHY-BLOCKCHAIN-FOR-COFFEE-EXPORT.md
```

---

## 📖 README Files Created

The script creates README.md files in each folder:

- `docs/README.md` - Documentation index
- `tests/README.md` - Test files overview
- `scripts/README.md` - Utility scripts overview

Each README provides:
- Purpose of the folder
- List of files
- Usage instructions
- Links to key documents

---

## 🎯 Example: Before and After

### **Before** (Root Directory)
```
goCBC/
├── WHY-BLOCKCHAIN-FOR-COFFEE-EXPORT.md
├── EXECUTIVE-BRIEFING.md
├── SYSTEM-READINESS-CHECK.md
├── DEPLOYMENT-GUIDE-QUICK-START.md
├── PROJECT-COMPLETE-SUMMARY.md
├── EXPORTER-PORTAL-GUIDE.md
├── test-complete-workflow.js
├── verify-all-actions.js
├── fix-lab-certification.js
├── ALL-FIXES-COMPLETE.md
├── FIX-SUMMARY.md
├── ... 80+ more files ...
├── api/
├── ui/
└── blockchain/
```

### **After** (Root Directory)
```
goCBC/
├── README.md
├── chaincode.sh
├── prepare-deployment.sh
├── deploy-to-coffeex-cbe.sh
├── docker-compose-fabric.yml
├── package.json
├── docs/               ← All documentation
├── tests/              ← All test files
├── scripts/            ← Utility scripts
├── api/
├── ui/
└── blockchain/
```

**Much cleaner!** ✨

---

## 🚦 Step-by-Step Guide

### **1. Backup (Optional but Recommended)**
```bash
# Create backup
tar -czf cecbs-backup-$(date +%Y%m%d).tar.gz .

# Or with git
git commit -am "Backup before organization"
```

### **2. Run Organization Script**
```bash
# Windows
organize-codebase.bat

# Linux/Mac
bash organize-codebase.sh
```

### **3. Review Changes**
```bash
# Check new structure
ls -la docs/
ls -la tests/
ls -la scripts/

# Read the new README files
cat docs/README.md
```

### **4. Update Links (if needed)**
Check any scripts or documentation that reference moved files.

### **5. Commit to Git**
```bash
git add docs/ tests/ scripts/
git commit -m "Organize codebase into clean folder structure"
```

### **6. Update Team**
Inform your team about the new structure and where to find documents.

---

## ✅ Verification Checklist

After running the script, verify:

- [ ] Root directory is clean (~15-20 files)
- [ ] All docs in `docs/` subfolder
- [ ] All tests in `tests/` folder
- [ ] All utility scripts in `scripts/utility/`
- [ ] Main scripts still in root
- [ ] README.md files created in each folder
- [ ] No files were deleted
- [ ] Can find key documents easily

---

## 🔄 Undo If Needed

If you need to undo the organization:

```bash
# Move files back to root
mv docs/business/*.md .
mv docs/technical/*.md .
mv docs/deployment/*.md .
# ... etc

# Remove empty folders
rm -rf docs/ tests/ scripts/
```

Or restore from git:
```bash
git reset --hard HEAD~1  # If committed
# Or
git checkout -- .        # If not committed
```

---

## 📞 Need Help?

**Issues?**
- Check script output for errors
- Verify you have write permissions
- Ensure no files are open/locked

**Questions?**
- Review `docs/README.md` for navigation
- Check individual folder README files
- See main project README.md

---

## 🎉 Ready?

Run the script to organize your codebase!

```bash
bash organize-codebase.sh
```

**It's safe, reversible, and will make your project much cleaner!** ✨

---

**Document Version**: 1.0  
**Last Updated**: July 12, 2026  
**Script**: organize-codebase.sh
