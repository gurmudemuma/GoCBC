# Remaining Data Issues - Detailed Analysis

**Date:** September 25, 2026  
**Status:** 18 issues found across 7 endpoints

---

## 📊 Summary of Issues Found

| Endpoint | Issues | Severity |
|----------|--------|----------|
| Contracts | 2 issues | ⚠️ Medium |
| LCs | 0 issues | ✅ Clean |
| Shipments | 0 issues | ✅ Clean |
| Payments | 7 issues | 🔴 High |
| Quality Inspections | 1 issue | 🟢 Low (expected null) |
| Customs Declarations | 5 issues | 🟡 Medium (mostly expected nulls) |
| Customs Clearances | 3 issues | 🟡 Medium (expected nulls) |

**Total Issues:** 18

---

## 🔴 HIGH PRIORITY - Must Fix

### 1. PAYMENTS - Multiple 0 values and empty strings (7 issues)

**Endpoint:** `GET /api/v1/payments`

**Issues:**
```javascript
{
  amountBirr: 0,              // ❌ Should show actual Birr amount
  retainedAmount: 0,           // ❌ Should show retained amount
  convertedAmount: 0,          // ❌ Should show converted amount
  verifiedById: "",            // ❌ Should show verifier ID
  advanceAmount: 0,            // ❌ Should show advance amount
  balanceAmount: 0,            // ❌ Should show balance amount
  shipmentId: ""               // ❌ Should show shipment ID
}
```

**Root Cause:** Payment data is coming from blockchain but field names might not match the normalization mapping, or calculations are not being performed.

**Impact:** 🔴 HIGH - Banks portal will show incorrect payment information

---

## ⚠️ MEDIUM PRIORITY - Should Fix

### 2. CONTRACTS - Amount showing as 0 (2 issues)

**Endpoint:** `GET /api/v1/contracts`

**Issues:**
```javascript
{
  amount: 0,                   // ❌ Should show contract value
  approvalDate: null           // ⚠️ Expected if not approved yet
}
```

**Root Cause:** Blockchain contract data has field with different name (possibly `totalValue`, `value`, or `contractValue`) that's not being mapped to `amount`.

**Impact:** ⚠️ MEDIUM - Exporters portal won't show contract values correctly

---

## 🟡 LOW PRIORITY - Expected Nulls (But Verify)

### 3. CUSTOMS DECLARATIONS - Null values (5 issues)

**Endpoint:** `GET /api/v1/customs/declarations`

**Issues:**
```javascript
{
  contractId: null,            // ⚠️ May be expected (not all declarations link to contracts)
  contractID: null,            // ⚠️ Same as above
  dutyPaid: null,              // ⚠️ Expected if duty not paid yet
  clearanceDate: null,         // ⚠️ Expected if not cleared yet
  blockchainTxId: null         // ⚠️ Expected if not recorded on blockchain yet
}
```

**Status:** Verify if these are truly expected or if data should be populated

---

### 4. CUSTOMS CLEARANCES - Null values (3 issues)

**Endpoint:** `GET /api/v1/customs/clearances`

**Issues:**
```javascript
{
  exitPoint: null,             // ⚠️ Expected if not set yet
  remarks: null,               // ⚠️ Expected if no remarks
  blockchainTxId: null         // ⚠️ Expected if not recorded yet
}
```

**Status:** Verify if these are truly expected

---

### 5. QUALITY INSPECTIONS - Null blockchain ID (1 issue)

**Endpoint:** `GET /api/v1/quality/inspections`

**Issues:**
```javascript
{
  blockchainTxId: null         // ⚠️ Expected if not recorded yet
}
```

**Status:** This is expected behavior - blockchain IDs are populated when transactions are recorded

---

## 🔧 Recommended Fixes

### FIX 1: Payments Endpoint - Field Mapping

**File:** `api/src/routes/payments.ts` (around line 989)

**Problem:** Payment data from blockchain not properly mapped/calculated

**Solution:**
1. Check blockchain payment structure
2. Add proper field mapping for:
   - `amountBirr` (convert from USD using exchange rate)
   - `retainedAmount` (calculate retention %)
   - `convertedAmount` (same as amountBirr)
   - `verifiedById` (get from verifier field)
   - `advanceAmount` (from advance payment field)
   - `balanceAmount` (calculate: amount - advanceAmount)
   - `shipmentId` (map from ShipmentID or shipment_id)

### FIX 2: Contracts Endpoint - Amount Field

**File:** `api/src/routes/exporters.ts` (line 1969)

**Current Code:**
```typescript
amount: contract?.amount ?? contract?.Amount ?? 0,
```

**Problem:** Blockchain might use different field name

**Solution:** Add more field name variants:
```typescript
amount: contract?.amount ?? contract?.Amount ?? 
        contract?.totalValue ?? contract?.TotalValue ??
        contract?.contractValue ?? contract?.ContractValue ?? 0,
```

### FIX 3: Verify Null Values Are Expected

For customs declarations and clearances, verify:
1. Are these records incomplete (in-progress)?
2. Should blockchain IDs be populated from existing transactions?
3. Should contractId link be established?

---

## 📋 Action Plan

1. **IMMEDIATE:** Fix payments endpoint (7 critical issues)
2. **TODAY:** Fix contracts amount field (1 critical issue)
3. **VERIFY:** Check if null values in customs are expected
4. **OPTIONAL:** Backfill blockchain IDs if needed

---

## 🎯 Success Criteria

After fixes:
- ✅ Payments show correct amounts in Birr
- ✅ Payments show correct shipment links
- ✅ Contracts show correct total values
- ✅ All monetary values > 0 where data exists
- ✅ No empty strings in ID fields where data exists

---

## 📝 Testing

Run this test after fixes:
```bash
node test-all-portals-data.js
```

Expected output after fixes:
```
❌ Found 0-5 issues across all endpoints
```

(Remaining issues should only be expected nulls)
