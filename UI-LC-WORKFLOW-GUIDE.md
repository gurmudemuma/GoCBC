# UI Letter of Credit Workflow Guide

## For Bank Users

### Option 1: Create and Issue LC (Automated Workflow)

**Location**: Banking Operations → LC Management → "Issue LC" button

**What Happens**:
1. Click "Issue LC" button
2. Fill in the LC form (terms, expiry days, banks)
3. Click "Submit"

**Behind the Scenes**:
```
User Action → Request LC → Auto-Approve LC → Issue LC → Success!
              (REQUESTED)    (APPROVED)        (ISSUED)
```

This is handled automatically by the `handleIssueLc` function which now properly:
- Creates the LC request
- Approves it immediately
- Issues it
- All in one seamless operation

### Option 2: Manual Two-Step Workflow

**Location**: Banking Operations → LC Management → LC Table

#### Step 1: Approve Requested LC
1. Find LC with status `REQUESTED`
2. Click "Approve" button
3. LC status changes to `APPROVED`

#### Step 2: Issue Approved LC
1. Find LC with status `APPROVED`
2. Click "Issue" button
3. Enter LC terms
4. LC status changes to `ISSUED`

### Option 3: Fix Existing Requested LC

If you have an LC stuck in `REQUESTED` status:

1. Go to **Banking Operations → LC Management**
2. Find the LC in the table
3. Click **"Approve"** button (status: REQUESTED → APPROVED)
4. Click **"Issue"** button (status: APPROVED → ISSUED)

**Or simply**:
- Click "Issue" on a REQUESTED LC
- The system will automatically approve it first, then issue it

## Status Indicators

| Status | Color | Meaning | Next Action |
|--------|-------|---------|-------------|
| `REQUESTED` | Yellow/Pending | LC has been requested | Click "Approve" |
| `APPROVED` | Green | LC approved by bank | Click "Issue" |
| `ISSUED` | Blue | LC is active | Proceed with forex allocation |

## UI Components

### Banks Portal (`BanksPortal.tsx`)

#### Key Functions:

1. **`handleIssueLc`** (Line ~1025)
   - Handles both new LC creation and issuing existing LCs
   - **Now includes automatic approval step**
   - Proper error handling for each step

2. **`handleApproveLC`** (Line ~1179)
   - Approves a REQUESTED LC
   - Changes status: REQUESTED → APPROVED
   - Can be called manually or automatically

3. **`handleBulkApproveLC`** (Line ~1362)
   - Approves multiple LCs at once
   - Useful for batch processing

### Buttons in LC Table

```tsx
{/* Approve Button - Only shows for REQUESTED status */}
{lc.status === 'REQUESTED' && (
  <Button
    variant="contained"
    startIcon={<CheckCircle />}
    onClick={() => handleApproveLC(lc.lcId, lc.exporterId)}
  >
    Approve
  </Button>
)}

{/* Issue Button - Shows for REQUESTED or APPROVED */}
{(lc.status === 'REQUESTED' || lc.status === 'APPROVED') && (
  <Button
    variant="contained"
    onClick={() => {
      setSelectedLC(lc);
      setIssueLcDialogOpen(true);
    }}
  >
    Issue
  </Button>
)}
```

## Error Messages

### "LC cannot be issued, current status: REQUESTED"
**Before Fix**: This error occurred when trying to issue without approving
**After Fix**: System automatically approves before issuing

### "LC Approval Failed"
- Check that the LC is in REQUESTED status
- Verify you have bank permissions
- Check blockchain connection

### "LC Issuance Failed"
- Verify LC is in APPROVED status (or REQUESTED for auto-approval)
- Ensure all required fields are filled
- Check that forex allocation hasn't already been done

## Workflow Steps Reference

### Full LC Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│                   LC Complete Workflow                  │
└─────────────────────────────────────────────────────────┘

1. REQUESTED
   ↓ (Bank: Approve LC)
   │ API: POST /banking/lc/{lcId}/approve
   │ Function: handleApproveLC()
   │
2. APPROVED
   ↓ (Bank: Issue LC)
   │ API: POST /banking/lc/{lcId}/issue
   │ Function: handleIssueLc()
   │
3. ISSUED
   ↓ (Bank: Allocate Forex)
   │ Done in separate "Forex Allocation" tab
   │
4. FOREX_ALLOCATED
   ↓ (Exporter: Ship Goods)
   │ Exporter submits shipping documents
   │
5. DOCUMENTS_SUBMITTED
   ↓ (Bank: Verify Documents)
   │ Bank examines documents per UCP 600
   │
6. DOCUMENTS_VERIFIED
   ↓ (Bank: Release Payment)
   │ Bank processes payment to exporter
   │
7. UTILIZED/PAID
   ↓ (Complete)
```

## Testing the Fix

### Test Case 1: Create New LC
```
1. Login as bank user
2. Go to Banking Operations → LC Management
3. Click "Issue LC" button
4. Fill form and submit
5. ✅ Expected: Success message, LC shows ISSUED status
6. ✅ No errors about "current status: REQUESTED"
```

### Test Case 2: Issue Existing REQUESTED LC
```
1. Login as bank user
2. Go to Banking Operations → LC Management
3. Find LC with status "REQUESTED"
4. Click "Issue" button
5. Fill terms and submit
6. ✅ Expected: System auto-approves, then issues
7. ✅ LC status changes to ISSUED
```

### Test Case 3: Manual Approve then Issue
```
1. Find LC with status "REQUESTED"
2. Click "Approve" button
3. ✅ Status changes to "APPROVED"
4. Click "Issue" button
5. Fill terms and submit
6. ✅ Status changes to "ISSUED"
```

## Developer Notes

### State Management
LCs are loaded from blockchain via:
```typescript
const loadBankingData = async () => {
  // Fetches all LCs
  const lcsResponse = await apiFetch('/banking/lc/all');
  // Updates local state
  setLetterOfCredits(lcsResponse.data);
};
```

### Automatic Approval Logic
The fix adds this logic to `handleIssueLc`:

```typescript
// Check if LC needs approval first
if (selectedLC.status === 'REQUESTED') {
  // Approve it first
  await apiFetch(`/banking/lc/${selectedLC.lcId}/approve`, { ... });
}

// Then issue it
await apiFetch(`/banking/lc/${selectedLC.lcId}/issue`, { ... });
```

### Error Handling Pattern
```typescript
const approveResult = await approveResponse.json();

if (!approveResult.success) {
  showError(
    'LC Approval Failed',
    approveResult.error?.message || 'Failed to approve LC',
    'The LC must be approved before it can be issued'
  );
  return; // Stop here, don't proceed to issue
}
```

## Related Documentation

- **LC Workflow Fix**: `LC-WORKFLOW-FIX.md`
- **Complete Workflow**: `COMPLETE-WORKFLOW-SEQUENCE.md`
- **Chaincode**: `chaincodes/coffee/banking.go`
- **API Routes**: `api/src/routes/banking.ts`

---

**Last Updated**: 2026-07-22
**Version**: 2.0 (Post-Fix)
