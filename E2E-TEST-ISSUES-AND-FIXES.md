# E2E Test Issues and Fixes

## Summary
The E2E test fails because **CreateShipment cannot write to blockchain** due to Hyperledger Fabric **eventual consistency** issues. The LC status hasn't propagated from AllocateForex by the time CreateShipment tries to validate it.

---

## Root Causes Identified

### 1. ✅ FIXED: RequestLC Parameter Order
**Issue:** RequestLC API was sending parameters in wrong order  
**Error:** `strconv.ParseFloat: parsing "USD": invalid syntax`  
**Fix:** Corrected parameter order in `/home/guda/GoCBC/api/src/services/lcService.ts` line 61-68  
**Status:** Fixed and verified

### 2. ❌ CRITICAL: Blockchain State Propagation Delay
**Issue:** AllocateForex updates LC status to `FOREX_ALLOCATED`, but CreateShipment reads `REQUESTED`  
**Timeline:**
- T+0s: AllocateForex writes LC status = FOREX_ALLOCATED
- T+0.1s: CreateShipment validates LC, reads status = REQUESTED (stale read)
- Result: CreateShipment fails validation

**Root Cause:** Hyperledger Fabric eventual consistency
- Transaction commits to orderer
- Block created and distributed
- Peers update world state database
- **This takes 2-10 seconds**, but CreateShipment executes immediately

### 3. ❌ BLOCKING: ReadLC Schema Validation Failures
**Issue:** LC verification queries fail with schema errors  
**Error:** `rejectionReason is required, rejectedBy is required` (8 fields)  
**Cause:** LC struct has rejection fields with `omitempty` tag, but Fabric SDK requires all fields  
**Impact:** Cannot verify if LC status propagated, so retry logic doesn't work

### 4. ❌ CRITICAL: BlockchainSyncService False Success
**Issue:** Sync service reports "✅ Shipment synced successfully" when blockchain write actually FAILED  
**Evidence:** Log shows CreateShipment fails with LC error, but immediately logs success  
**Impact:** Shipment never writes to blockchain, remains only in PostgreSQL  
**Location:** `/home/guda/GoCBC/api/src/services/blockchainSyncService.ts`

---

## Attempted Fixes

### Fix #1: Add 5-Second Wait After Forex Allocation ✅
- **File:** `complete-e2e-test.sh` line 404
- **Logic:** Wait 5 seconds after forex allocation before creating shipment
- **Result:** Helped but insufficient - still fails

### Fix #2: Add CreateShipment Retry Logic in Routes ⚠️
- **File:** `/home/guda/GoCBC/api/src/routes/shipments.ts` lines 296-354
- **Logic:** Retry CreateShipment 3 times with 3-second delays if LC status error
- **Result:** Code added but NOT executing (sync service bypasses this)

### Fix #3: Add LC Status Verification ❌
- **File:** `/home/guda/GoCBC/api/src/services/forexService.ts` lines 309-344
- **Logic:** After AllocateForex, poll ReadLC to verify status propagated
- **Result:** FAILS - ReadLC has schema validation errors, returns empty buffer

---

## Required Fixes

### Priority 1: Fix BlockchainSyncService ⚠️ URGENT
**Problem:** Sync service incorrectly marks shipments as synced when they fail  
**Solution:** Add proper error handling and retry logic in BlockchainSyncService.syncShipment()

```typescript
// In blockchainSyncService.ts syncShipment()
// Current: Returns success even on failure
// Needed: Check result.success and retry on LC status errors
```

### Priority 2: Increase Blockchain Propagation Delays
**Locations:**
1. Test script: Increase wait from 5s to 10s after forex allocation
2. Sync service: Add 10-second delay before first sync attempt
3. Bill of Lading: Increase wait from 15s to 30s

### Priority 3: Fix ReadLC Schema Validation (Long-term)
**Options:**
1. Disable schema validation for ReadLC queries
2. Add default empty values for rejection fields in chaincode
3. Migrate all existing LCs to have rejection fields
4. Use direct CouchDB queries instead of ReadLC chaincode

---

## Current Test Status

✅ **Working Stages:**
1. Exporter Registration
2. Contract Creation & Approval  
3. LC Request, Approval, Issuance
4. Forex Allocation (with 5s wait)
5. Quality Inspection (4 steps)
6. Customs Declaration & Clearance

❌ **Failing Stages:**
4. **Shipment Creation** - Saves to PostgreSQL but NOT to blockchain
6. **Bill of Lading** - Fails because shipment doesn't exist on blockchain

---

## Next Steps

1. **Fix BlockchainSyncService** to properly handle LC status errors and retry
2. **Increase propagation delays** throughout the system  
3. **Test end-to-end** with proper delays
4. **Long-term:** Fix ReadLC schema validation issue

---

## Technical Details

**Blockchain Architecture:**
- 6 Hyperledger Fabric peers (ECTA, ECX, Banks, NBE, Customs, Shipping)
- 1 Orderer node (raft consensus)
- CouchDB state database per peer
- Block time: ~2 seconds
- State propagation: 2-10 seconds depending on network load

**Data Flow:**
```
API Write → Fabric SDK → Orderer → Create Block → 
Distribute to Peers → Update CouchDB → Available for Read
```

**Problem:** Read operations execute before "Update CouchDB" step completes

**Solution:** Retry reads with exponential backoff or wait for commit events
