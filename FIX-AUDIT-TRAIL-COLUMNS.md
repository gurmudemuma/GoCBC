# Fix Audit Trail "performed_by" Column Error

## Error
```
column "performed_by" does not exist
```

## Cause
The `audit_trail` table is missing required columns:
- `performed_by` (VARCHAR)
- `performed_by_org` (VARCHAR)  
- `organization` (VARCHAR)

## Solution

### Step 1: Start the system
```bash
cd /home/guda/GoCBC
./start-all.sh
```

Wait for all containers to start (about 2-3 minutes).

### Step 2: Fix the database columns

Run this command:
```bash
node fix-audit-columns-quick.js
```

This will:
- ✅ Add `performed_by` column
- ✅ Add `performed_by_org` column
- ✅ Add `organization` column
- ✅ Create indexes for performance
- ✅ Verify columns exist

### Alternative: Manual SQL Fix

If the script doesn't work, run this SQL directly:

```sql
-- Connect to database
docker exec -it postgres_container psql -U cecbs_user -d cecbs_db

-- Add columns
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by VARCHAR(255);
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by_org VARCHAR(255);
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS organization VARCHAR(255);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by ON audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_performed_by_org ON audit_trail(performed_by_org);
CREATE INDEX IF NOT EXISTS idx_audit_trail_organization ON audit_trail(organization);

-- Verify
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'audit_trail' 
AND column_name IN ('performed_by', 'performed_by_org', 'organization')
ORDER BY column_name;
```

## Why This Happened

The audit trail feature was enhanced to track:
- **WHO** performed the action (`performed_by`)
- **WHICH organization** they belong to (`performed_by_org`)
- **WHICH organization** was affected (`organization`)

But the database migration wasn't run to add these columns.

## After Fixing

Once the columns are added:
- ✅ Audit Trail tab will load without errors
- ✅ All audit logs will show who performed actions
- ✅ Portal will be fully functional

## Files Created

- `fix-audit-columns-quick.js` - Quick fix script (already created)

## Quick Steps

```bash
# 1. Start system
./start-all.sh

# 2. Wait for startup (2-3 minutes)

# 3. Fix columns
node fix-audit-columns-quick.js

# 4. Refresh browser
# The error will be gone!
```
