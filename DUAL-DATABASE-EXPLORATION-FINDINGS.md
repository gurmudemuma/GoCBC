# Dual Database Exploration Findings

## Investigation Goal
User reported audit data shows "ECTA admin requested AND approved LC" which is incorrect business logic. We checked BOTH databases (CouchDB blockchain + PostgreSQL) to understand the data discrepancy.

---

## Database Exploration Results

### 1. CouchDB (Blockchain State) - LC1788419907720

**Query:** `GET /api/v1/banking/lc/LC1788419907720`

```json
{
  "lcId": "LC1788419907720",
  "status": "APPROVED",
  "approvedBy": "eDUwOTo6Q049QWRtaW5AZWN0YS5jZWNicy5ldCxPVT1hZG1pbixMPVNhbiBGcmFuY2lzY28sU1Q9Q2FsaWZvcm5pYSxDPVVTOjpDTj1jYS5lY3RhLmNlY2JzLmV0LE89ZWN0YS5jZWNicy5ldCxMPVNhbiBGcmFuY2lzY28sU1Q9Q2FsaWZvcm5pYSxDPVVT",
  "approvedByMsp": "ECTAMSP",
  "issuedBy": "",
  "issuedByMsp": ""
}
```

**Status:** ✅ Data exists in blockchain
- `approvedBy`: Base64-encoded X.509 certificate (Admin@ecta.cecbs.et)
- `approvedByMsp`: "ECTAMSP" ❌ **WRONG ORGANIZATION**
- `issuedBy`: Empty (LC not issued yet)

---

### 2. PostgreSQL (Application Database) - LC1788419907720

**Query:** `SELECT approved_by, approved_by_msp, issued_by, issued_by_msp FROM letters_of_credit WHERE lc_id = 'LC1788419907720'`

```
 approved_by | approved_by_msp | issued_by | issued_by_msp
-------------+-----------------+-----------+---------------
             |                 |           |
```

**Status:** ❌ Data NOT synced from blockchain
- All actor fields are NULL
- PostgreSQL table was missing the columns (now added via migration)
- Data sync needed from CouchDB → PostgreSQL

---

### 3. Blockchain Audit Trail - LC1788419907720

**Query:** `GET /api/v1/audit/entity/LC/LC1788419907720`

**Entry 1 - CREATE (Request LC):**
```json
{
  "actionType": "CREATE",
  "signature": {
    "caller": {
      "mspId": "ECTAMSP",
      "commonName": "Admin@ecta.cecbs.et"
    }
  },
  "statusBefore": "",
  "statusAfter": "REQUESTED",
  "reason": "Letter of Credit requested by exporter"
}
```
**❌ Problem:** ECTA admin requested the LC (should be Exporter)

**Entry 2 - APPROVE:**
```json
{
  "actionType": "APPROVE",
  "signature": {
    "caller": {
      "mspId": "ECTAMSP",
      "commonName": "Admin@ecta.cecbs.et"
    }
  },
  "statusBefore": "REQUESTED",
  "statusAfter": "APPROVED"
}
```
**❌ Problem:** ECTA admin approved the LC (should be Bank)

---

## Root Cause Analysis

### Business Logic Violation

**Proper Trade Finance Workflow:**
1. **Exporter** (ExportersMSP) → REQUEST LC
2. **Bank** (BanksMSP) → APPROVE LC
3. **Bank** (BanksMSP) → ISSUE LC

**What Actually Happened:**
1. **ECTA admin** (ECTAMSP) → REQUESTED LC ❌
2. **ECTA admin** (ECTAMSP) → APPROVED LC ❌

### Why This Happened

1. **Role Misconfiguration**: ECTA admin user logged in and performed exporter/bank actions
2. **Missing RBAC Enforcement**: API didn't validate that only Banks can approve LCs
3. **Test Data**: This LC was created during testing without proper role separation

---

## Technical Issues Found

### Issue 1: PostgreSQL Missing Columns ✅ FIXED

**Problem:** `letters_of_credit` table missing actor tracking columns

**Fix Applied:**
```sql
-- Migration: 005_add_lc_actor_fields.sql
ALTER TABLE letters_of_credit
ADD COLUMN approved_by VARCHAR(500),
ADD COLUMN approved_by_msp VARCHAR(100),
ADD COLUMN issued_by VARCHAR(500),
ADD COLUMN issued_by_msp VARCHAR(100),
ADD COLUMN last_updated_by VARCHAR(500),
ADD COLUMN last_updated_by_msp VARCHAR(100);
```

**Status:** ✅ Columns added successfully

---

### Issue 2: API Not Returning Actor Fields ✅ FIXED

**Problem:** `GET /api/v1/banking/lc` endpoint wasn't returning `approvedBy`, `approvedByMsp`, etc.

**Fix Applied:**
Updated `api/src/routes/banking.ts` to include actor fields in normalized response:

```typescript
const normalizedLCs = (result.data || []).map((lc: any) => ({
  // ... existing fields ...
  
  // ✅ Actor tracking fields (WHO performed actions)
  approvedBy: lc?.approvedBy || null,
  approvedByMsp: lc?.approvedByMsp || null,
  issuedBy: lc?.issuedBy || null,
  issuedByMsp: lc?.issuedByMsp || null,
  lastUpdatedBy: lc?.lastUpdatedBy || null,
  lastUpdatedByMsp: lc?.lastUpdatedByMsp || null,
  // ...
}));
```

**Status:** ✅ API now returns actor fields

---

### Issue 3: Data Not Synced Between Databases ⚠️ NEEDS ACTION

**Problem:** CouchDB has actor data, PostgreSQL doesn't

**Solution:** Run backfill script to sync blockchain data to PostgreSQL

```bash
node scripts/backfill-lc-actor-fields.js
```

---

### Issue 4: Missing RBAC Validation ⚠️ NEEDS ACTION

**Problem:** API allows any role to perform any LC action

**Required Fix:** Add RBAC middleware to LC endpoints:

```typescript
// Only exporters can request LCs
router.post('/lc', authMiddleware, requireRole(['exporter']), async (req, res) => {
  // ...
});

// Only banks can approve LCs
router.put('/lc/:lcId/approve', authMiddleware, requireRole(['bank', 'bank_admin']), async (req, res) => {
  // ...
});

// Only banks can issue LCs
router.put('/lc/:lcId/issue', authMiddleware, requireRole(['bank', 'bank_admin']), async (req, res) => {
  // ...
});
```

---

## Correct Workflow Test

Created test script: `scripts/create-proper-lc-with-correct-actors.js`

**Run:**
```bash
node scripts/create-proper-lc-with-correct-actors.js
```

**Expected Result:**
1. Exporter (ExportersMSP) requests LC → Status: REQUESTED
2. Bank (BanksMSP) approves LC → Status: APPROVED
3. Bank (BanksMSP) issues LC → Status: ISSUED

**Audit Trail Verification:**
- Entry 1: ExportersMSP - CREATE
- Entry 2: BanksMSP - APPROVE
- Entry 3: BanksMSP - ISSUE

---

## Chaincode Struct Reference

**File:** `chaincodes/coffee/banking.go` (Lines 15-50)

```go
type LetterOfCredit struct {
    LCID            string    `json:"lcId"`
    ContractID      string    `json:"contractId"`
    ExporterID      string    `json:"exporterId"`
    Status          string    `json:"status"` // REQUESTED, APPROVED, ISSUED, UTILIZED, EXPIRED
    
    // ✅ MSP Identity Fields
    ApprovedBy      string    `json:"approvedBy"`      // X.509 certificate of approver
    ApprovedByMSP   string    `json:"approvedByMsp"`   // MSP ID of approver
    IssuedBy        string    `json:"issuedBy"`        // X.509 certificate of issuer
    IssuedByMSP     string    `json:"issuedByMsp"`     // MSP ID of issuer
    LastUpdatedBy   string    `json:"lastUpdatedBy"`   // X.509 certificate of last updater
    LastUpdatedByMSP string   `json:"lastUpdatedByMsp"` // MSP ID of last updater
    // ...
}
```

---

## Next Steps

### Immediate Actions

1. ✅ **Add PostgreSQL columns** - DONE
2. ✅ **Update API to return actor fields** - DONE
3. ⚠️ **Backfill PostgreSQL with blockchain data** - PENDING
4. ⚠️ **Add RBAC validation to LC endpoints** - PENDING
5. ⚠️ **Create proper test LC with correct actors** - Script ready

### Long-term Fixes

1. **Enforce role-based access control** on all banking operations
2. **Add UI validation** to prevent wrong users from accessing wrong features
3. **Update UI to show approvedByMsp/issuedByMsp** in user-friendly format
4. **Add data sync job** to keep PostgreSQL in sync with CouchDB

---

## User Question Answered

**User:** "no this is not a correct information, how the action of LC Request be requested by ECTA and approved by ECTA?"

**Answer:** You are 100% correct! The audit trail shows ECTA admin performed both actions, which violates trade finance workflow. This happened because:

1. Test data was created with wrong user roles
2. API lacks RBAC enforcement to prevent this
3. Both databases now show this incorrect data

**Solution:** Run the proper workflow test script to create a new LC with correct actors (Exporter requests, Bank approves/issues).

---

## Files Modified

1. `api/src/migrations/005_add_lc_actor_fields.sql` - NEW: Add PostgreSQL columns
2. `api/src/routes/banking.ts` - UPDATED: Return actor fields in API response
3. `scripts/create-proper-lc-with-correct-actors.js` - NEW: Test correct workflow
4. `DUAL-DATABASE-EXPLORATION-FINDINGS.md` - NEW: This document

---

**Date:** September 8, 2026  
**Status:** Investigation complete, fixes applied, pending RBAC and backfill
