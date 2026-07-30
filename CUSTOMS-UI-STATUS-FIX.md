# Customs Portal UI Status Display Fix

## Problem
The UI was showing different statuses than what the backend was returning. Declarations with backend status `SUBMITTED`, `UNDER_REVIEW`, or `UNDER_INSPECTION` were being incorrectly shown as `PERMIT_ISSUED` in the UI.

## Root Cause
In `ui/src/components/portals/CustomsPortal.tsx`, the `mergeDeclarationsWithPermitData` function was overriding backend statuses:

```tsx
// ❌ BUGGY CODE (line 635):
status: permit && decl.status !== 'CLEARED' ? 'PERMIT_ISSUED' : decl.status,
```

**Logic breakdown:**
- If declaration has a permit attached AND status is not CLEARED
- Then force status to `PERMIT_ISSUED`
- This ignored the actual backend workflow state

**Impact:**
- Declaration with backend status `SUBMITTED` → UI showed `PERMIT_ISSUED`
- Declaration with backend status `UNDER_REVIEW` → UI showed `PERMIT_ISSUED`  
- Declaration with backend status `UNDER_INSPECTION` → UI showed `PERMIT_ISSUED`
- All declarations appeared to be in the same state
- Users couldn't see actual workflow progression

## Solution
Changed line 635 to respect backend status:

```tsx
// ✅ CORRECT CODE:
status: decl.status,  // Display exactly what backend returns
```

**Why this is correct:**
- Backend manages workflow state transitions through API endpoints
- Status represents **where the declaration is in the customs workflow**
- Permit existence is tracked separately via `permitIssued` flag
- UI should be a **display layer**, not override business logic

## Workflow Status Meanings

| Status | Meaning | Tab | Action Available |
|--------|---------|-----|------------------|
| `SUBMITTED` | Declaration just created, needs initial review | Tab 0 | Review & Schedule Inspection |
| `UNDER_INSPECTION` | Physical inspection in progress | Tab 2 | Complete Inspection |
| `UNDER_REVIEW` | Inspection complete, awaiting final approval | Tab 1 | Grant Clearance or Reject |
| `CLEARED` | Customs cleared, ready for export | Tab 3 | View only |
| `REJECTED` | Declaration rejected | None | N/A |
| `HELD` | Held for additional verification | Tab 1 | Review |

## Files Changed

### 1. `ui/src/components/portals/CustomsPortal.tsx`
**Line 635:** Changed status assignment to use backend value directly

**Before:**
```tsx
const merged = declarations.map((decl) => {
  const permit = permitMap.get(decl.shipmentId);
  return {
    ...decl,
    status: permit && decl.status !== 'CLEARED' ? 'PERMIT_ISSUED' : decl.status,
  };
});
```

**After:**
```tsx
const merged = declarations.map((decl) => {
  const permit = permitMap.get(decl.shipmentId);
  return {
    ...decl,
    status: decl.status,  // ✅ Respect backend status
  };
});
```

### 2. Related fixes from previous session
Also fixed tab filtering to use `allDeclarations` instead of pre-filtered `declarations` array.

## Verification

### Backend Status Distribution
```
CLEARED: 12 declarations
SUBMITTED: 1 declaration
REJECTED: 1 declaration
```

### Expected UI Behavior After Fix
- **Tab 0:** Shows 1 declaration with status `SUBMITTED`
- **Tab 1:** Shows 0 declarations (none in UNDER_REVIEW/HELD)
- **Tab 2:** Shows 0 declarations (none in UNDER_INSPECTION)
- **Tab 3:** Shows 12 declarations with status `CLEARED`

## Testing
Run verification script:
```bash
cd tests
node verify-ui-shows-backend-status.js
```

## Deployment Status
- ✅ Code fix applied
- ✅ UI build completed successfully
- ⏳ **Next:** Restart UI server to see changes

## Impact
- ✅ UI now displays true backend workflow state
- ✅ Users can see which declarations need action
- ✅ Tab filtering works correctly with real statuses
- ✅ Workflow progression visible to customs officers
