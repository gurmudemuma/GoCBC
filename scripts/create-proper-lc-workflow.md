# How to Create Proper LC Workflow with Correct Actors

## Issue with Current Data

LC1788419907720 shows:
- ❌ Requested by: ECTA admin (WRONG - should be Exporter)
- ❌ Approved by: ECTA admin (WRONG - should be Bank)

This is test data created incorrectly.

## Correct Workflow

### Step 1: Exporter Requests LC
```bash
# Login as exporter (EXP4886039)
# POST /api/v1/banking/lc/request
{
  "contractId": "CONTRACT1786343272751",
  "amount": 1234000,
  "currency": "USD",
  "expiryDate": "2026-12-02"
}
```
**Expected Result:**
- Audit log shows: "Requested by EXP4886039 (ExportersMSP • exporter)"

### Step 2: Bank Approves LC
```bash
# Login as bank officer (e.g., bankAdmin or specific LC officer)
# POST /api/v1/banking/lc/{lcId}/approve
```
**Expected Result:**
- Audit log shows: "Approved by BankOfficer@banks.cecbs.et (BanksMSP • lc_officer)"

### Step 3: Bank Issues LC
```bash
# Login as bank officer
# POST /api/v1/banking/lc/{lcId}/issue
{
  "terms": "Payment against shipping documents as per UCP 600"
}
```
**Expected Result:**
- Audit log shows: "Issued by BankOfficer@banks.cecbs.et (BanksMSP • lc_officer)"

### Step 4: NBE Allocates Forex
```bash
# Login as NBE officer
# POST /api/v1/forex/allocate
{
  "lcId": "LC...",
  "amount": 617000,  // 50% retention per NBE policy
  "retentionAmount": 617000
}
```
**Expected Result:**
- Audit log shows: "Allocated by ForexOfficer@nbe.cecbs.et (NBEMSP • forex_officer)"

## Why Current Data is Wrong

The audit trail correctly shows that **ECTA admin** performed both REQUEST and APPROVE actions. This is wrong because:

1. **ECTA's Role**: Coffee & Tea Authority - regulator, NOT exporter or bank
2. **Exporter's Role**: Request LC for their own exports
3. **Bank's Role**: Approve LC after reviewing exporter's application

## RBAC Should Prevent This

The system should have role-based access control to ensure:
- ✅ Only Exporters can request LCs
- ✅ Only Banks can approve LCs
- ✅ Only NBE can allocate forex
- ✅ Only Customs can clear shipments
- ❌ ECTA admin should NOT be able to request/approve LCs

## How to Test Properly

1. **Create Exporter User**: 
   - Username: EXP4886039
   - Role: exporter
   - Organization: ExportersMSP

2. **Create Bank User**:
   - Username: bankOfficer1
   - Role: lc_officer
   - Organization: BanksMSP

3. **Test Workflow**:
   - Login as EXP4886039 → Request LC
   - Logout
   - Login as bankOfficer1 → Approve LC
   - Check audit trail → Should show correct actors

## Current System Status

✅ **Audit Trail**: Correctly captures WHO performed actions
✅ **Blockchain**: Immutably records all actions
✅ **Activity Timeline**: Displays actors clearly

❌ **RBAC**: Allows wrong users to perform actions (needs fixing)
❌ **Test Data**: Created with wrong actors (ECTA admin did everything)

## Recommendation

**For Production**:
1. Implement strict RBAC checks
2. Validate user organization matches action requirement
3. Add UI warnings if wrong user attempts wrong action

**For Testing**:
1. Create new LC with proper workflow
2. Use correct user accounts for each step
3. Verify audit trail shows correct actors

## The Audit Trail IS Working Correctly!

The audit trail shows exactly what happened:
- ECTA admin logged in and performed both REQUEST and APPROVE
- This is captured correctly on the blockchain
- The timeline displays this accurately

The issue is **business process violation**, not **audit trail failure**.
