# Letter of Credit (LC) Workflow - Status Fix Documentation

## Valid LC Statuses (Per UCP 600 & Chaincode Definition)
According to `banking.go` line 516-520, the ONLY valid LC statuses are:
- `REQUESTED` - Exporter requests LC
- `APPROVED` - ECTA/NBE approves the LC request
- `ISSUED` - Bank issues the LC  
- `UTILIZED` - LC is utilized (payment released)
- `EXPIRED` - LC has expired

## Invalid Statuses Currently in Code ❌

The following statuses are being set but are NOT in the valid list:
1. ❌ `SHIPPED` - (Line 1022) - **FIXED**
2. ❌ `DOCUMENTS_SUBMITTED` - (Line 1083)
3. ❌ `DOCUMENTS_VERIFIED` - (Line 873)
4. ❌ `DOCUMENTS_DISCREPANT` - (Line 876)
5. ❌ `PAID` - (Line 958)

## Correct LC Lifecycle Workflow

```
1. REQUESTED → Exporter requests LC for a contract
   ↓
2. APPROVED → ECTA/NBE approves the LC request  
   ↓
3. ISSUED → Bank issues the LC (forex allocated at this point)
   ↓
   [Shipment Created - LC status REMAINS "ISSUED"]
   ↓
   [Documents Submitted - Should move to "UTILIZED" not "DOCUMENTS_SUBMITTED"]
   ↓
   [Bank Examines Documents - Status REMAINS "ISSUED" if discrepant, or moves to "UTILIZED" if compliant]
   ↓
4. UTILIZED → Bank releases payment (LC is utilized)
   ↓
5. EXPIRED → If LC expires before utilization
```

## Required Fixes

### Fix 1: LinkShipmentToLC (Line 1022) ✅ DONE
**Status:** Keep as `ISSUED` (do not change)

### Fix 2: SubmitLCDocuments (Line 1083)  
**Current:** `lc.Status = "DOCUMENTS_SUBMITTED"`  
**Should be:** `lc.Status = "ISSUED"` (no change, or optionally add a documents field)

### Fix 3: ExamineLCDocuments (Lines 873, 876)
**Current:** `lc.Status = "DOCUMENTS_VERIFIED"` or `"DOCUMENTS_DISCREPANT"`  
**Should be:** 
- If compliant → `lc.Status = "UTILIZED"` (ready for payment)
- If discrepant → `lc.Status = "ISSUED"` (remains issued, waiting for correction)

### Fix 4: ReleaseLCPayment (Line 958)
**Current:** `lc.Status = "PAID"`  
**Should be:** `lc.Status = "UTILIZED"`

## Implementation Plan

1. Remove all invalid status assignments
2. Use only the 5 valid statuses
3. Track document submission/verification status in separate fields if needed (e.g., `documentStatus` field)
4. Update all validation checks that reference invalid statuses
