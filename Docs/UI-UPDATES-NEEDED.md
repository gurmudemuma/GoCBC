# UI Updates Needed for Contract Approval Workflow

## Overview
After fixing the chaincode to correctly assign contract approval to ECTA (not NBE), the UI needs to be updated to reflect this change.

## Current State (INCORRECT)
- ❌ **NBE Portal** has "Contract Approvals" tab with approve button
- ❌ **ECTA Portal** has "Sales Contracts" tab but NO approve functionality
- ❌ Workflow doesn't match chaincode requirements

## Target State (CORRECT)
- ✅ **ECTA Portal** should have contract approval with approve button
- ✅ **NBE Portal** should focus only on forex allocation
- ✅ Workflow matches chaincode: ECTA approves → NBE allocates forex

## Required Changes

### 1. ECTA Portal (`ui/src/components/portals/ECTAPortal.tsx`)

#### Tab 2: "Sales Contracts" Enhancement
**Current**: Read-only table showing contracts
**Needed**: Add approval functionality

**Changes Required**:
```typescript
// Add state for approval dialog
const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
const [selectedContract, setSelectedContract] = useState<SalesContract | null>(null);

// Add approval handler
const handleApproveContract = async (contract: SalesContract) => {
  try {
    const result = await api.approveContract(contract.contractId);
    if (result.success) {
      showNotification('Success', 'Contract approved for export');
      loadContracts(); // Refresh list
    }
  } catch (error) {
    showNotification('Error', 'Failed to approve contract', 'error');
  }
};

// In the table, add Actions column:
<TableCell>Actions</TableCell>

// In the table body:
<TableCell>
  {contract.contractStatus === 'REGISTERED' && (
    <Button
      variant="contained"
      size="small"
      onClick={() => {
        setSelectedContract(contract);
        setApprovalDialogOpen(true);
      }}
    >
      Approve
    </Button>
  )}
  {contract.contractStatus === 'APPROVED' && (
    <Chip label="Approved" color="success" size="small" />
  )}
</TableCell>

// Add Approval Dialog (similar to NBE Portal's current dialog)
<Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)}>
  <DialogTitle>Approve Contract for Export</DialogTitle>
  <DialogContent>
    <Typography>
      Approve contract {selectedContract?.contractId} for export compliance?
    </Typography>
    <Alert severity="info" sx={{ mt: 2 }}>
      This will mark the contract as approved for export and allow NBE to allocate forex.
    </Alert>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
    <Button 
      variant="contained" 
      onClick={() => {
        handleApproveContract(selectedContract!);
        setApprovalDialogOpen(false);
      }}
    >
      Approve
    </Button>
  </DialogActions>
</Dialog>
```

**API Call**:
```typescript
// In ui/src/utils/api.ts
export const approveContract = async (contractId: string) => {
  return apiFetch(`/contracts/${contractId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
};
```

**Filters Needed**:
- Show REGISTERED contracts at top
- Highlight pending contracts requiring approval
- Add search/filter by exporter, buyer, status

### 2. NBE Portal (`ui/src/components/portals/NBEPortal.tsx`)

#### Remove or Rename Tab 0: "Contract Approvals"

**Option A: Remove Completely** (Recommended)
```typescript
// Remove Tab
<Tab label="Contract Approvals" /> // DELETE THIS LINE

// Remove TabPanel index 0
<TabPanel value={tabValue} index={0}> // DELETE THIS ENTIRE SECTION

// Update other tab indices:
// Forex Allocations: index 1 → index 0
// Exchange Rates: index 2 → index 1
// SWIFT Monitoring: index 3 → index 2
// Compliance: index 4 → index 3
// Analytics: index 5 → index 4
```

**Option B: Rename to "Approved Contracts" (Read-Only)**
```typescript
// Rename tab
<Tab label="Approved Contracts (Read-Only)" />

// Update the info alert
<Alert severity="info">
  <Typography variant="body2">
    <strong>ECTA Role:</strong> Contracts are approved by ECTA for export compliance.
    NBE's role is to allocate foreign exchange for approved contracts.
  </Typography>
</Alert>

// Remove all approval buttons and dialogs
// Keep the table read-only for reference
// Remove: setApprovalDialogOpen, approvalDialogOpen, handleApproveContract
```

#### Keep Tab 1: "Forex Allocations"
- ✅ No changes needed
- ✅ Already uses correct AllocateForex function
- ✅ Shows approved contracts for forex allocation

### 3. API Utils (`ui/src/utils/api.ts`)

**Add ECTA Contract Approval**:
```typescript
// Add this function
export const approveContract = async (contractId: string) => {
  return apiFetch(`/contracts/${contractId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
};

// Remove or deprecate this (currently used by NBE Portal)
export const approveContractForForex = async (contractId: string, approvedBy: string) => {
  // This endpoint is deprecated - NBE should not approve contracts
  console.warn('approveContractForForex is deprecated. Use forex allocation instead.');
  return { success: false, error: 'Endpoint deprecated' };
};
```

## Implementation Order

1. ✅ **Chaincode** - Already fixed (v1.32)
2. ✅ **API Backend** - Already fixed (routes updated)
3. ⏳ **UI - ECTA Portal** - Add contract approval functionality
4. ⏳ **UI - NBE Portal** - Remove contract approval tab/functionality
5. ⏳ **API Utils** - Add approveContract function
6. ⏳ **Testing** - Test with ECTA and NBE users

## User Impact

### ECTA Users
- ✅ Will now see "Approve" button on registered contracts
- ✅ Can approve contracts for export compliance
- ✅ Clear role: Export compliance and quality control

### NBE Users
- ❌ Will no longer see contract approval functionality
- ✅ Will focus on forex allocation for approved contracts
- ✅ Clear role: Foreign exchange management

### Exporter Users
- ℹ️ No change to their workflow
- ℹ️ Will see contracts approved by ECTA (not NBE)
- ℹ️ Same status flow: REGISTERED → APPROVED → [Forex Allocated]

## Testing Checklist

### ECTA Portal
- [ ] Login as ECTA user
- [ ] Navigate to "Sales Contracts" tab
- [ ] Verify registered contracts show "Approve" button
- [ ] Click approve on a registered contract
- [ ] Verify contract status changes to APPROVED
- [ ] Verify blockchain transaction succeeds
- [ ] Verify approved contracts show checkmark/chip instead of button

### NBE Portal
- [ ] Login as NBE user
- [ ] Verify "Contract Approvals" tab is removed (or read-only)
- [ ] Navigate to "Forex Allocations" tab
- [ ] Verify can see APPROVED contracts
- [ ] Verify can allocate forex for approved contracts
- [ ] Verify cannot approve contracts

### API
- [ ] ECTA user can POST to `/contracts/:id/approve` ✅
- [ ] NBE user cannot POST to `/contracts/:id/approve` (403 Forbidden) ✅
- [ ] NBE endpoint `/contracts/:id/nbe-approve` returns deprecation error ✅

## Documentation Updates

- [x] Create CONTRACT-APPROVAL-WORKFLOW.md
- [x] Create UI-UPDATES-NEEDED.md (this file)
- [ ] Update user training materials
- [ ] Update API documentation
- [ ] Update system architecture diagram

## Migration Notes

For existing deployments:
1. Communicate change to users before deployment
2. ECTA users need to be informed of new approval responsibility
3. NBE users need to understand their role is now forex allocation only
4. No data migration needed - workflow logic changed only
5. Existing contracts remain valid

---
**Status**: Pending Implementation  
**Priority**: High  
**Estimated Effort**: 4-6 hours  
**Last Updated**: 2026-07-13
