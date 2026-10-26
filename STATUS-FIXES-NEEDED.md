# Status Transition Fixes Needed

## Issue Summary
The status transition test found 9 missing/invalid transitions. Analysis shows these are mostly due to:
1. Test expectations not matching actual implementation
2. Some status transitions not explicitly coded but work via database updates

## Detailed Fixes

### 1. Contract: null → PENDING ❌
**Current:** Uses 'REGISTERED' not 'PENDING'
**Location:** `contractService.ts` line 91
**Status:** Actually CORRECT - uses 'REGISTERED'
**Fix:** Test expectation needs update OR code needs to use 'PENDING'

**Recommendation:** Keep 'REGISTERED' (more descriptive) and update test

---

### 2. Contract: PENDING → REJECTED ❌  
**Current:** rejectContract exists but test couldn't verify status change
**Location:** `contractService.ts` - need to check approveContract/rejectContract

**Need to verify:**
```typescript
async rejectContract(rejectionData: {
  contractID: string;
  rejectedBy: string;
  reason: string;
  rejectorOrg: string;
})
```

**Fix:** Ensure UPDATE statement sets status = 'REJECTED'

---

### 3. LC: null → ISSUED ❌
**Current:** issueLC should set status to 'ISSUED'
**Location:** `lcService.ts`

**Fix:** Verify INSERT/UPDATE sets status = 'ISSUED'

---

### 4. LC: ISSUED → ACTIVE ❌
**Issue:** No activateLC method found
**Status:** This transition may not be implemented

**Options:**
1. Add activateLC() method
2. Auto-activate when contract is approved
3. Remove from workflow (if not needed)

**Recommendation:** Add automatic activation when contract approved

---

### 5. Forex: REQUESTED → ALLOCATED ❌
**Current:** allocateForex exists
**Location:** `forexService.ts`

**Fix:** Verify UPDATE statement in allocateForex sets status = 'ALLOCATED'

---

### 6. Shipment: QUALITY_APPROVED → CUSTOMS_CLEARED ❌
**Issue:** This is a compound transition - should be:
  - QUALITY_APPROVED → CUSTOMS_PENDING (customs submitted)
  - CUSTOMS_PENDING → CUSTOMS_CLEARED (customs cleared)

**Fix:** Test expectation is wrong - this is 2 separate steps

---

### 7. Customs: null → SUBMITTED ❌
**Current:** Auto-created by quality approval
**Location:** `shipmentService.triggerCustomsDeclaration()`

**Fix:** Verify INSERT sets status = 'SUBMITTED'

---

### 8. Customs: SUBMITTED → HELD ❌
**Issue:** Hold functionality may not be implemented
**Status:** Optional feature

**Options:**
1. Implement holdDeclaration() method
2. Mark as "not implemented" (acceptable)

**Recommendation:** Implement in future if needed

---

### 9. Constraint: Quality PENDING → Customs CREATED ❌
**Issue:** Test result shows "Invalid" but this is CORRECT behavior
**Status:** This transition SHOULD be blocked

**Fix:** Test logic may be inverted - showing "Invalid" when it should show "Valid constraint"

---

## Quick Fixes Required

### Priority 1: Verify Status Values in Code

```bash
# Check what status values are actually used
grep -r "status.*=.*'" api/src/services/*.ts | grep -E "(INSERT|UPDATE)"
```

### Priority 2: Add Missing Status Updates

#### Fix rejectContract:
```typescript
async rejectContract(rejectionData) {
  // ... existing code ...
  await this.dbService.run(
    `UPDATE contracts SET 
     status = 'REJECTED',  // ← Ensure this is set
     rejected_by = $1,
     rejected_at = NOW()
     WHERE contract_id = $2`,
    [rejectionData.rejectedBy, rejectionData.contractID]
  );
}
```

#### Fix issueLC:
```typescript
await this.dbService.run(
  `INSERT INTO letters_of_credit (..., status, ...)
   VALUES (..., 'ISSUED', ...)`,  // ← Ensure 'ISSUED' is set
  [...]
);
```

#### Fix allocateForex:
```typescript
await this.dbService.run(
  `UPDATE forex_allocations 
   SET status = 'ALLOCATED',  // ← Ensure this is set
       ...
   WHERE forex_id = $1`,
  [forexId]
);
```

#### Fix triggerCustomsDeclaration:
```typescript
await this.dbService.run(
  `INSERT INTO customs_declarations (..., status, ...)
   VALUES (..., 'SUBMITTED', ...)`,  // ← Ensure 'SUBMITTED' is set
  [...]
);
```

### Priority 3: Update Test Expectations

The test file `status-transition-expert-test.js` needs to match actual status values:
- Contract starts as 'REGISTERED' not 'PENDING'
- Some transitions are valid but test regex patterns need adjustment

---

## Implementation Plan

### Step 1: Document Actual Status Values ✅
Run grep to find all status values actually used in code

### Step 2: Fix Missing Status Sets
Add explicit status = 'STATUS_NAME' to any missing UPDATE/INSERT

### Step 3: Add Missing Methods (Optional)
- activateLC() - if LC activation is needed
- holdDeclaration() - if customs hold is needed

### Step 4: Update Test
Adjust test expectations to match actual implementation

---

## Status Value Standards

### Recommended Status Values by Entity:

**Contract:**
- REGISTERED (initial) ✅
- APPROVED
- REJECTED
- ACTIVE (optional - when LC issued)
- COMPLETED (when payment received)

**LC:**
- ISSUED (initial) ✅
- ACTIVE (optional)
- SETTLED

**Forex:**
- REQUESTED (initial) ✅
- ALLOCATED ✅
- UTILIZED
- REJECTED (optional)

**Shipment:**
- CREATED/PENDING (initial) ✅
- QUALITY_PENDING
- QUALITY_APPROVED
- CUSTOMS_PENDING
- CUSTOMS_CLEARED ✅
- IN_TRANSIT
- DELIVERED

**Quality:**
- PENDING (initial) ✅
- SCHEDULED ✅
- COMPLETED ✅
- APPROVED ✅
- REJECTED ✅

**Customs:**
- SUBMITTED (initial)
- CLEARED ✅
- HELD (optional)

**Payment:**
- RECEIVED (initial) ✅
- SPLIT (after 40% retention) ✅
- COMPLETED ✅

---

## Conclusion

Most "failed" transitions are actually:
1. Working correctly but test expectations don't match implementation
2. Missing explicit status = 'VALUE' in some UPDATE/INSERT statements
3. Optional features not implemented (LC activation, customs hold)

**Real Issues:** 4-5 missing status sets in database operations
**Test Issues:** 4-5 test expectations need adjustment

**Action:** Fix the 4-5 real issues, then update test expectations.
