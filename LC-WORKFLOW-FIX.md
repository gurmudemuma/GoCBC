# Letter of Credit Workflow Fix

## Problem Identified

The UI was attempting to issue LCs directly from `REQUESTED` status, skipping the mandatory `APPROVED` status. This violates the blockchain chaincode requirements.

### Error Message
```
LC cannot be issued, current status: REQUESTED
```

## Root Cause

In `ui/src/components/portals/BanksPortal.tsx`, the `handleIssueLc` function had incorrect logic:

```typescript
// ❌ WRONG: Skipped the approval step
if (requestResult.success) {
  // LC has been requested, now issue it directly
  // Note: We skip the approve step because contracts are already approved by ECTA
  const issueResponse = await apiFetch(`/banking/lc/${lcId}/issue`, { ... });
}
```

The comment "We skip the approve step because contracts are already approved by ECTA" was **incorrect**. Contract approval by ECTA and LC approval by the bank are **separate workflow steps**.

## Correct LC Workflow

The chaincode enforces this state machine:

```
1. REQUESTED  →  (ApproveLC)  →  2. APPROVED  →  (IssueLC)  →  3. ISSUED
```

### Chaincode Validation
From `chaincodes/coffee/banking.go`:

```go
// ApproveLC function (line ~350)
if lc.Status != "REQUESTED" {
    return fmt.Errorf("LC cannot be approved, current status: %s", lc.Status)
}

// IssueLC function (line ~454)
if lc.Status != "APPROVED" {
    return fmt.Errorf("LC cannot be issued, current status: %s", lc.Status)
}
```

## Solution Implemented

### Changed Files
- `ui/src/components/portals/BanksPortal.tsx`

### Fix Details

#### SCENARIO 1: Issuing Existing LC
When issuing an existing LC that's in `REQUESTED` status, the code now:

1. **Checks the LC status**
2. **If REQUESTED**: Calls `/banking/lc/{lcId}/approve` first
3. **Then**: Calls `/banking/lc/{lcId}/issue`

```typescript
// ✅ CORRECT: Check status and approve if needed
if (selectedLC.status === 'REQUESTED') {
  console.log('⚠️ LC is REQUESTED, need to approve before issuing');
  
  // First approve the LC (REQUESTED → APPROVED)
  const approveResponse = await apiFetch(`/banking/lc/${selectedLC.lcId}/approve`, {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({
      beneficiary: selectedLC.exporterId,
    }),
  });

  if (!approveResult.success) {
    showError('LC Approval Failed', ...);
    return;
  }
}

// Now issue the LC (either already APPROVED or just approved above)
const issueResponse = await apiFetch(`/banking/lc/${selectedLC.lcId}/issue`, { ... });
```

#### SCENARIO 2: Creating New LC
When creating a new LC, the workflow now properly follows all three steps:

1. **Request**: `POST /banking/lc/request` → Status: `REQUESTED`
2. **Approve**: `POST /banking/lc/{lcId}/approve` → Status: `APPROVED`
3. **Issue**: `POST /banking/lc/{lcId}/issue` → Status: `ISSUED`

```typescript
// ✅ CORRECT: Request → Approve → Issue
if (requestResult.success) {
  console.log('✅ LC requested successfully, now approving...');
  
  // Step 1: Approve the requested LC
  const approveResponse = await apiFetch(`/banking/lc/${lcId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ beneficiary: selectedContract.exporterId }),
  });

  if (approveResult.success) {
    console.log('✅ LC approved successfully, now issuing...');
    
    // Step 2: Issue the approved LC
    const issueResponse = await apiFetch(`/banking/lc/${lcId}/issue`, {
      method: 'POST',
      body: JSON.stringify({ terms: lcForm.terms }),
    });
    
    // Handle success/error...
  }
}
```

## API Endpoints

### Request LC
```http
POST /api/v1/banking/lc/request
Content-Type: application/json

{
  "lcID": "LC1784719332565",
  "contractID": "CONTRACT1784719071277",
  "exporterID": "EXP8533658",
  "bankName": "Commercial Bank of Ethiopia",
  "amount": "282906",
  "currency": "USD",
  "expiryDate": "2026-10-20"
}

Response: Status → REQUESTED
```

### Approve LC
```http
POST /api/v1/banking/lc/{lcID}/approve
Content-Type: application/json

{
  "beneficiary": "EXP8533658"
}

Response: Status → APPROVED
```

### Issue LC
```http
POST /api/v1/banking/lc/{lcID}/issue
Content-Type: application/json

{
  "terms": "Payment against shipping documents as per UCP 600..."
}

Response: Status → ISSUED
```

## Testing

To verify the fix works:

1. **Start the application**:
   ```bash
   cd ui
   npm run dev
   ```

2. **Login as a bank user**

3. **Navigate to**: Banking Operations → LC Management

4. **Create a new LC** or **Select an existing REQUESTED LC**

5. **Click "Issue LC"** 

6. **Expected behavior**:
   - The system will automatically approve the LC first (if needed)
   - Then issue it
   - Success message should appear
   - LC status should show `ISSUED`

## Error Handling

The fix includes proper error handling:

- If approval fails, the user is notified and the issue step is skipped
- If issue fails after approval, the user is informed they can issue manually from LC Management
- Clear error messages guide users on next steps

## Benefits

1. ✅ **Compliance**: Now follows the blockchain state machine correctly
2. ✅ **Audit Trail**: Both approval and issuance are recorded on blockchain
3. ✅ **User Experience**: Seamless workflow with automatic approval when needed
4. ✅ **Error Prevention**: Proper status checking prevents invalid state transitions
5. ✅ **Flexibility**: Still allows manual approval/issuance from LC Management tab

## Related Files

- **Chaincode**: `chaincodes/coffee/banking.go`
  - `RequestLC` function (line ~90)
  - `ApproveLC` function (line ~300)
  - `IssueLC` function (line ~450)

- **API Routes**: `api/src/routes/banking.ts` / `api/dist/routes/banking.js`
  - Request endpoint (line ~100)
  - Approve endpoint (line ~155)
  - Issue endpoint (line ~390)

- **Frontend**: `ui/src/components/portals/BanksPortal.tsx`
  - `handleIssueLc` function (line ~1025)
  - `handleApproveLC` function (line ~1179)

## Future Improvements

Consider adding:
1. Visual workflow indicator showing current step (Requested → Approved → Issued)
2. Status badges with color coding for each state
3. Bulk approval + issue functionality for multiple LCs
4. Approval history with MSP identity tracking

---

**Date Fixed**: 2026-07-22
**Fixed By**: Kiro AI Assistant
**Issue**: LC issuance was skipping mandatory approval step
**Status**: ✅ Resolved
