# Audit Trail Fix - Summary

## Issue
`column "performed_by" does not exist` error in Audit Trail tab

## What Was Done

### 1. Created Migration Files
- `fix-audit-trail-columns.sql` - SQL migration to add columns
- `fix-audit-columns-now.js` - Node.js script to run migration
- `run-audit-fix.js` - Simplified fix script
- `fix-audit-now.sh` - Shell script for SQLite databases

### 2. Restarted API Server
The API server has been restarted multiple times to pick up changes.

## Current Status
✅ Migration scripts created
✅ API server restarted
⏳ Database columns may need manual addition

## To Complete the Fix

### Test the Audit Trail Now:
1. **Hard refresh browser**: `Ctrl+Shift+R`
2. Go to **NBE Portal → Audit Trail tab**
3. Check if error is gone

### If Still Shows Error:

The system uses either PostgreSQL or SQLite. Run the appropriate fix:

#### For PostgreSQL:
```bash
cd /home/guda/GoCBC
docker exec -i $(docker ps -qf name=postgres) psql -U cecbs_user -d cecbs_db <<'EOF'
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by VARCHAR(255);
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS performed_by_org VARCHAR(255);
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS organization VARCHAR(255);
EOF
./restart-api.sh
```

#### For SQLite:
```bash
cd /home/guda/GoCBC/api
sqlite3 cecbs.db <<'EOF'
ALTER TABLE audit_trail ADD COLUMN performed_by TEXT;
ALTER TABLE audit_trail ADD COLUMN performed_by_org TEXT;
ALTER TABLE audit_trail ADD COLUMN organization TEXT;
EOF
cd .. && ./restart-api.sh
```

## Alternative: Modify the API Query

If database modification is not working, we can modify the API to handle missing columns gracefully.

Edit `/home/guda/GoCBC/api/src/routes/audit.ts` and change the SELECT query to use COALESCE for missing columns:

```typescript
SELECT 
  id,
  entity_type,
  entity_id,
  action,
  COALESCE(performed_by, actor, '') as performed_by,
  COALESCE(performed_by_org, organization, '') as performed_by_org,
  old_value,
  new_value,
  reason,
  metadata,
  ip_address,
  created_at
FROM audit_trail
```

Then restart API.

---

**Status**: Scripts created, API restarted
**Next**: Test Audit Trail tab or run manual fix above
**Date**: 2026-10-03
