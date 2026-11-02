# Inspect Button 500 Error - Investigation & Fix

## Current Situation

✅ **Fixed Issues:**
1. Data loading works - inspection shows in table
2. All columns display data correctly
3. "Inspect" button appears and is clickable
4. Button calls API correctly: `POST /api/v1/quality/inspections/QI-TEST-1793365775/perform`

❌ **Current Issue:**
- API returns **500 Internal Server Error** when clicking "Inspect"

## Error Details

**Request:**
```
POST http://localhost:3000/api/v1/quality/inspections/QI-TEST-1793365775/perform
```

**Response:** 500 Internal Server Error

## Possible Root Causes

### 1. Inspection Status Mismatch
The API `/perform` endpoint requires inspection status to be `'pending'` or `'requested'`:
```typescript
if (inspection.status !== 'pending' && inspection.status !== 'requested') {
  return res.status(400).json({
    error: { message: `Cannot perform inspection. Current status: ${inspection.status}` }
  });
}
```

**Current Status:** `'pending'` (from UI display)
**Expected:** Should work, but might be different case in database

### 2. Blockchain Connection Issue
The API tries to call blockchain chaincode:
```typescript
await fabricService.invokeChaincode('PerformInspection', [...])
```

If blockchain is not connected or chaincode fails, it returns 500.

### 3. Database Column Mismatch
API might be looking for different column names than what exists.

## Quick Diagnostic Steps

### Step 1: Check Inspection Status in Database
```sql
SELECT inspection_id, status, shipment_id, exporter_id, created_at 
FROM quality_inspections 
WHERE inspection_id = 'QI-TEST-1793365775';
```

### Step 2: Check API Logs
```bash
cd /home/guda/GoCBC
pm2 logs api --lines 50
# or
tail -50 ~/.pm2/logs/*api*error*.log
```

### Step 3: Check Blockchain Connection
```bash
cd /home/guda/GoCBC
docker ps | grep peer
# Should show running peer containers
```

## Recommended Fixes

### Fix 1: Add Better Error Logging (API Side)
Modify `/api/src/routes/quality.ts` line ~300 to add try-catch logging:
```typescript
} catch (error: any) {
  logger.error('Quality inspection perform error:', error);
  logger.error('Stack:', error.stack);
  res.status(500).json({
    success: false,
    error: { 
      code: 'SERVER_ERROR', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    timestamp: new Date().toISOString()
  });
}
```

### Fix 2: Make Blockchain Optional (Temporary)
Wrap blockchain call in try-catch to allow inspection without blockchain:
```typescript
let blockchain_tx_id = null;
try {
  const blockchainResult = await fabricService.invokeChaincode(...);
  blockchain_tx_id = blockchainResult?.txId || null;
} catch (blockchainError) {
  logger.warn('Blockchain call failed, continuing without it:', blockchainError.message);
}
```

### Fix 3: Check Inspection Exists and Has Correct Status
Add detailed logging before status check:
```typescript
const inspection = await postgresDb.get(
  'SELECT id, status, shipment_id, exporter_id FROM quality_inspections WHERE inspection_id = $1',
  [inspectionID]
);

logger.info(`Found inspection: ${inspectionID}, status: ${inspection?.status}`);

if (!inspection) {
  logger.error(`Inspection not found: ${inspectionID}`);
  return res.status(404).json({...});
}
```

## Immediate Workaround

Since we can't see the actual error without logs, let's add a frontend error display:

**Current Frontend Code:**
```javascript
} catch (error: any) {
  showError('Inspection Failed', error.response?.data?.error?.message || error.message);
}
```

**This should already show the error message in the UI.**

## Next Steps

1. **Check browser console** for the full error response body
2. **Check API logs** for the actual error
3. **Verify blockchain is running**: `docker ps | grep peer`
4. **Check database** for the inspection record status

## Status

🔍 **INVESTIGATING**
- Frontend button works and calls API ✅
- API returns 500 (need to see error details) ❌
- Need to check: API logs, blockchain status, database status

**Action Required:** Check browser console Network tab for full 500 error response body.
