# Portal Data Accuracy Audit Report
**Date:** November 6, 2026  
**Status:** ✅ All endpoints returning HTTP 200, investigating data accuracy

---

## Summary

All 75 portal endpoints are functional (100% success rate), but some tabs show **0 records** when data exists in database. This audit identifies which zeros are **correct** (no data) vs **incorrect** (data exists but not returned).

---

## Issues Found & Fixed

### ✅ FIXED: ECTA Portal - Approved Exporters Tab

**Problem:** Showing 0 approved exporters when 21 exist in database

**Root Cause:** `/exporters?status=approved` was querying blockchain exporters and filtering by `licenseStatus` instead of querying applications by `status`

**Database Reality:**
- `exporter_applications` table: 39 total (18 pending, 21 approved, 0 rejected)
- `exporters` table (blockchain): 21 active exporters

**Fix Applied:**
- Modified `/api/src/routes/exporters.ts` line 1319
- When status = 'pending', 'approved', or 'rejected' → query `exporter_applications` table from PostgreSQL
- Otherwise → query exporters from blockchain
- **Result:** Now correctly shows 21 approved exporters ✅

**File:** `/home/guda/GoCBC/api/src/routes/exporters.ts`

---

## Data Source Analysis

### Understanding the Data Model

The system has **two sources** of exporter data:

1. **`exporter_applications`** (PostgreSQL) - Application workflow
   - Status: pending, approved, rejected
   - Used by: ECTA portal for reviewing applications

2. **`exporters`** (Blockchain) - Active/registered exporters  
   - licenseStatus: ACTIVE, SUSPENDED, EXPIRED
   - Used by: All portals for operational data

### Correct Behavior

| Tab | Should Query | Status Filter |
|-----|--------------|---------------|
| ECTA - Pending Applications | exporter_applications | status='pending' |
| ECTA - Approved Exporters | exporter_applications | status='approved' |
| ECTA - Active Exporters List | exporters (blockchain) | licenseStatus='ACTIVE' |
| Exporter Portal - Dashboard | exporters (blockchain) | user's own data |

---

## Tabs Requiring Investigation

### Tabs Showing 0 (Need Verification)

Based on the ECTA screenshot, these tabs show 0:

1. **ECTA Portal:**
   - ✅ Approved: 0 → **FIXED** (now shows 21)
   - ✅ Rejected: 0 → **CORRECT** (database has 0 rejected)

2. **Other Portals** (to be verified):
   - Forex allocations (`forex_allocations` table)
   - LC discrepancies
   - Post-delivery audits
   - SWIFT messages in some portals

---

## Recommended Next Steps

### 1. Verify Each "0" Tab

For each tab showing 0, check:
```sql
-- Example for forex
SELECT COUNT(*) FROM forex_allocations;
```

If count > 0 but API returns 0:
- Check query filters (status, exporter_id, date ranges)
- Check blockchain vs database source
- Check authentication/permission filtering

### 2. Common Patterns to Check

**Pattern 1: Wrong Table**
- Tab queries blockchain when data is in PostgreSQL
- **Solution:** Add database fallback like we did for exporters

**Pattern 2: Wrong Status Values**
- Filter uses 'PENDING' but database has 'pending'
- **Solution:** Case-insensitive comparison or normalize values

**Pattern 3: Over-filtering**
- Query filters by logged-in user when admin should see all
- **Solution:** Check role-based filtering logic

**Pattern 4: Empty Blockchain**
- Data exists in PostgreSQL mirror but not synced to blockchain
- **Solution:** Use database as primary source with blockchain fallback

---

## Testing Methodology

### Quick Verification Script

```bash
#!/bin/bash
# Test if data exists but isn't returned

TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

# Test endpoint
ENDPOINT="/exporters/forex"
API_COUNT=$(curl -s "http://localhost:5000/api/v1$ENDPOINT" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length')

# Check database
DB_COUNT=$(PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -t -A \
  -c "SELECT COUNT(*) FROM forex_allocations;")

echo "Endpoint: $ENDPOINT"
echo "API returns: $API_COUNT records"
echo "Database has: $DB_COUNT records"
if [ "$API_COUNT" != "$DB_COUNT" ]; then
  echo "⚠️  MISMATCH! Needs investigation"
else
  echo "✅ Correct"
fi
```

---

## Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| All 75 endpoints responding | ✅ 100% | No 404/500 errors |
| ECTA Approved Exporters | ✅ Fixed | Now shows 21 instead of 0 |
| ECTA Rejected Applications | ✅ Correct | Legitimately 0 in database |
| Other tabs showing 0 | 🔍 Investigating | Need to verify each one |

---

## Conclusion

**The core issue was a data source mismatch:** The API was querying blockchain when the UI expected database results.

**Solution pattern:** Check if status filter is for application workflow (pending/approved/rejected) → use database. Otherwise → use blockchain.

This same pattern may apply to other tabs. Each tab showing 0 needs individual verification.
