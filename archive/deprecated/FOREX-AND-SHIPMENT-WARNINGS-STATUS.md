# Forex Allocation & Bill of Lading Warnings - Status Report

**Date:** November 2, 2026  
**Test Run:** E2E Complete Workflow Test  
**Result:** ✅ All 9 stages passed, but 2 warnings persist

---

## Summary

The E2E test completes successfully with all stages passing, but two non-critical warnings appear:

1. **⚠️ WARNING: Forex allocation had issues**
2. **⚠️ WARNING: B/L recording had issues - shipment does not exist**

---

## Root Cause Analysis

### Issue 1: Forex Allocation Warning

**Problem:** When LC is issued, the API tries to auto-create a forex request but fails to sync it to the PostgreSQL database.

**Root Cause Chain:**
1. LC issuance endpoint at `/api/v1/banking/lc/:lcID/issue` calls `IssueLC` on blockchain ✅
2. After successful LC issuance, code tries to read LC data back using `ReadLC` ❌
3. `ReadLC` fails with schema validation error:
   ```
   Error: Value did not match schema:
   - documentRejectedBy is required
   - documentRejectedByMsp is required  
   - documentRejectionDate is required
   - documentRejectionReason is required
   - rejectedBy is required
   - rejectedByMsp is required
   - rejectionDate is required
   - rejectionReason is required
   ```
4. Payload extraction attempts to recover but gets 0 bytes ❌
5. Code never reaches the forex creation part
6. No forex request created on blockchain
7. No forex synced to PostgreSQL database

**Evidence from API logs:**
```
error: Transaction evaluation error for ReadLC: Error handling success response...
warn: Schema validation error for ReadLC, attempting to extract raw payload...
info: ✅ Successfully extracted raw payload as Buffer (0 bytes)
error: ❌ Extracted payload is empty for ReadLC
```

**My Fix Applied:**
Modified `/home/guda/GoCBC/api/src/routes/banking.ts` LC issuance endpoint to:
- Accept `contractID`, `exporterID`, `amount`, `currency` in request body
- Use these values directly instead of reading from blockchain
- Only fallback to blockchain ReadLC if data not provided

**Fix Location:** Lines 890-970 in `/home/guda/GoCBC/api/src/routes/banking.ts`

**Test Script Update Needed:**
The test script at `/home/guda/GoCBC/complete-e2e-test.sh` needs to pass LC data when issuing:
```bash
curl -X POST \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/banking/lc/$LC_NUMBER/issue" \
  -d "{
    \"terms\": \"...\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"amount\": 135000,
    \"currency\": \"USD\"
  }"
```

**Status:** ✅ Code fixed, ❌ Test script NOT updated yet

---

### Issue 2: Bill of Lading - Shipment Not Found

**Problem:** `RecordBillOfLading` fails because shipment doesn't exist on blockchain.

**Root Cause:**
- `CreateShipment` chaincode function has a prerequisite check: forex must be ALLOCATED before shipment can be created
- Since forex allocation fails (Issue 1), no forex exists
- When `CreateShipment` is called, it passes initial validation but blockchain rejects it
- Later when `RecordBillOfLading` is called, the shipment truly doesn't exist on blockchain

**Evidence from API logs:**
```
error: [SHIPPING] Failed to record B/L: No valid responses from any peers. Errors:
    peer=peer0.ecta.cecbs.et, status=500, message=shipment SHIP-E2E-1793625329 does not exist
    peer=peer0.ecx.cecbs.et, status=500, message=shipment SHIP-E2E-1793625329 does not exist
    ...all peers report same error
```

**Earlier in logs:**
```
error: ReadShipment: shipment SHIP-E2E-1793625329 does not exist
```

**Status:** ⏳ Will be automatically fixed once Issue 1 is resolved

---

## What Was Done

### Code Changes:
1. ✅ Modified `banking.ts` LC issuance to accept LC data in request body
2. ✅ Added forex sync code to INSERT into `forex_allocations` table
3. ✅ Fixed SQL placeholders (PostgreSQL uses `$1` not `?`)
4. ✅ Fixed audit_trail JSONB columns to use `JSON.stringify()`
5. ✅ Added missing payments table columns
6. ✅ Rebuilt API with `npm run build`

### Test Script Changes:
1. ✅ Added contract approval step
2. ✅ Added LC approval step (REQUESTED → APPROVED)
3. ✅ Added LC issuance with bank login
4. ✅ Fixed forex ID format to `FOREX_${LC_NUMBER}_REQUEST`
5. ❌ **NOT YET DONE:** Pass LC data (contractID, exporterID, amount, currency) in LC issuance request

---

## Next Steps to Fully Fix

### Step 1: Update Test Script
Edit `/home/guda/GoCBC/complete-e2e-test.sh` around line 295 to pass LC data:

**Current code:**
```bash
curl -s -X POST \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/banking/lc/$LC_NUMBER/issue" \
  -d "{
    \"terms\": \"Payment upon presentation...\",
    \"issuingBank\": \"Commercial Bank of Ethiopia\",
    \"issuingBankBIC\": \"CBETETAA\",
    \"advisingBank\": \"Deutsche Bank AG\",
    \"advisingBankBIC\": \"DEUTDEFF\"
  }"
```

**Updated code (add 4 fields):**
```bash
curl -s -X POST \
  -H "Authorization: Bearer $BANK_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_BASE/banking/lc/$LC_NUMBER/issue" \
  -d "{
    \"terms\": \"Payment upon presentation...\",
    \"issuingBank\": \"Commercial Bank of Ethiopia\",
    \"issuingBankBIC\": \"CBETETAA\",
    \"advisingBank\": \"Deutsche Bank AG\",
    \"advisingBankBIC\": \"DEUTDEFF\",
    \"contractID\": \"$CONTRACT_ID\",
    \"exporterID\": \"$EXPORTER_ID\",
    \"amount\": 135000,
    \"currency\": \"USD\"
  }"
```

### Step 2: Run Test Again
```bash
cd /home/guda/GoCBC && bash complete-e2e-test.sh
```

### Step 3: Verify Forex Sync
```sql
SELECT forex_id, lc_id, status, amount_usd 
FROM forex_allocations 
ORDER BY created_at DESC LIMIT 1;
```

Should show 1 row with status 'REQUESTED'

### Step 4: Verify Shipment Creation
After forex allocation succeeds in the test, shipment creation should work and B/L recording should succeed.

---

## Alternative: Fix Blockchain Schema

Instead of working around the ReadLC issue, we could fix the chaincode schema to make rejection fields optional:

**File:** `/home/guda/GoCBC/blockchain/chaincode/src/letterOfCredit.ts`

Make these fields optional in the LC interface:
```typescript
documentRejectedBy?: string;
documentRejectedByMsp?: string;
documentRejectionDate?: string;
documentRejectionReason?: string;
rejectedBy?: string;
rejectedByMsp?: string;
rejectionDate?: string;
rejectionReason?: string;
```

Then redeploy chaincode. However, this requires blockchain redeployment which is more complex.

---

## Why This Matters

These warnings block:
1. **Forex allocation workflow** - NBE cannot allocate forex for export
2. **Shipment documentation** - Bill of Lading cannot be recorded on blockchain
3. **Complete audit trail** - Missing blockchain records for forex and B/L
4. **Real-world usage** - System cannot function without forex allocation

While payments still work (because they use LC directly), the missing forex allocation breaks the complete compliance workflow.

---

## Verification Commands

Check if forex was created:
```bash
PGPASSWORD=cecbs123 psql -h localhost -U cecbs -d cecbs -c \
  "SELECT COUNT(*) FROM forex_allocations;"
```

Check test script has the fix:
```bash
grep -A 5 "contractID.*EXPORTER_ID" /home/guda/GoCBC/complete-e2e-test.sh
```

Check API code has the fix:
```bash
grep -n "lcContractID\|LC data from request" /home/guda/GoCBC/api/src/routes/banking.ts
```

---

**Status:** Ready for final fix - just need to update test script with 4 fields in LC issuance request.
