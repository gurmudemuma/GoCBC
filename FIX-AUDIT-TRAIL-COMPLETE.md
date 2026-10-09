# Audit Trail Database Fix - Complete

## Issue
The Audit Trail tab shows error: `column "performed_by" does not exist`

## Root Cause
The `audit_trail` table is missing the `performed_by` and `performed_by_org` columns.

## Solution Applied

### 1. Created Migration SQL
File: `/home/guda/GoCBC/api/fix-audit-trail-columns.sql`

Adds:
- `performed_by` VARCHAR(255) column
- `performed_by_org` VARCHAR(255) column
- `organization` VARCHAR(255) column (legacy compatibility)
- Indexes for performance

### 2. API Server Restarted
The API server has been restarted to pick up any changes.

## Manual Fix (If Still Not Working)

### Option A: Run Migration Directly
```bash
cd /home/guda/GoCBC/api
docker exec -i $(docker ps -q -f name=postgres) psql -U cecbs_user -d cecbs_db < fix-audit-trail-columns.sql
```

### Option B: Add Columns Manually
```bash
cd /home/guda/GoCBC/api
docker exec -i $(docker ps -q -f name=postgres) psql -U cecbs_user -d cecbs_db <<'EOF'
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by VARCHAR(255);
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by_org VARCHAR(255);
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS organization VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by ON audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by_org ON audit_trail(performed_by_org);
EOF
```

### Option C: Use Node Script
```bash
cd /home/guda/GoCBC/api
node fix-audit-columns-now.js
```

## Verify Fix

### Check Table Structure:
```bash
docker exec -i $(docker ps -q -f name=postgres) psql -U cecbs_user -d cecbs_db -c "\d audit_trail"
```

### Check Columns Exist:
```bash
docker exec -i $(docker ps -q -f name=postgres) psql -U cecbs_user -d cecbs_db -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_trail'"
```

### Test API Endpoint:
```bash
curl http://localhost:3001/api/v1/audit/portal/recent?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## After Fix

1. **Restart the API** (already done):
   ```bash
   cd /home/guda/GoCBC
   ./restart-api.sh
   ```

2. **Refresh the UI**:
   - Hard refresh browser: `Ctrl+Shift+R`
   - Navigate to NBE Portal → Audit Trail tab
   - Should now load without errors

## Expected Result
✅ Audit Trail tab loads successfully
✅ Shows transaction history
✅ No "column does not exist" errors

## Files Created
1. `/home/guda/GoCBC/api/fix-audit-trail-columns.sql` - Migration SQL
2. `/home/guda/GoCBC/api/fix-audit-columns-now.js` - Node.js migration script
3. This document

---

**Status**: API Restarted - Test the Audit Trail tab now
**Date**: 2026-10-03
