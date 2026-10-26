# Quality Inspection Status Verification

## Current Status: ✅ All Correct!

All inspection statuses in the UI are **correctly representing the database values**.

---

## Database → UI Status Mapping

### Record 1: INSP1787297029799
```
Database:
  status = 'inspected'
  passed = null (not yet approved/rejected)
  grade = null
  cert = null

UI Display:
  Status Badge: 🟢 INSPECTED
  Quality Score: 87 (extracted from remarks)
  Certificate: -
  Action Buttons: "Approve" + "Reject"
  
✅ CORRECT: Inspection performed, awaiting director approval
```

---

### Records 2-4: QC1786104364, QC1786102989, QC1786102768
```
Database:
  status = 'completed'
  passed = true (approved!)
  grade = 'G1'
  cert = 'CERT...'

UI Display:
  Status Badge: 🟢 APPROVED
  Quality Score: 90 (calculated from G1 grade)
  Certificate: CERT... (shown)
  Action Buttons: "Issue Permit"
  
✅ CORRECT: Quality inspections passed, ready for export permits
```

---

## Status Mapping Logic

### In UI (`ECTAPortal.tsx` Lines 2648-2658)
```typescript
const status = (() => {
  const normalized = String(rawStatus).toUpperCase();
  
  // Map 'pending' with requestedDate to 'REQUESTED'
  if (normalized === 'PENDING' && !isShipment && item.requestedDate) {
    return 'REQUESTED';
  }
  
  // Map 'completed' based on passed field ✅
  if (normalized === 'COMPLETED') {
    return item.passed ? 'APPROVED' : 'REJECTED';
  }
  
  // Other statuses pass through
  return normalized;
})();
```

**This is correct!** It checks the `passed` field to determine if completed = approved or rejected.

---

## What Each Status Means

| DB Status | DB `passed` | UI Shows | Meaning | Actions Available |
|-----------|-------------|----------|---------|-------------------|
| `pending` | `null` | **REQUESTED** | Scheduled, awaiting inspection | "Inspect" button |
| `inspected` | `null` | **INSPECTED** | Inspection done, awaiting approval | "Approve" or "Reject" buttons |
| `completed` | `true` | **APPROVED** ✅ | Quality passed, ready for permit | "Issue Permit" button |
| `completed` | `false` | **REJECTED** ❌ | Quality failed, cannot export | No actions (blocked) |
| `approved` | `true` | **APPROVED** ✅ | Same as completed+passed=true | "Issue Permit" button |
| `rejected` | `false` | **REJECTED** ❌ | Same as completed+passed=false | No actions (blocked) |

---

## Why Your Records Show APPROVED

Looking at the database, all three QC records have:
- ✅ `status = 'completed'`
- ✅ `passed = true`
- ✅ `certification_number` assigned
- ✅ `grade = 'G1'`

**This means they all passed quality inspection and were approved!**

If they were rejected, the database would show:
- ❌ `status = 'completed'` (or 'rejected')
- ❌ `passed = false`
- ❌ `certification_number = null`
- ❌ `remarks = "REJECTED: [reason]"`

---

## How to Create Different Statuses

### To Create a REJECTED Inspection

**Option 1: Using API (Reject Endpoint)**
```bash
curl -X POST http://localhost:3001/api/v1/quality/inspections/QC1786102989/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "reason": "Moisture content exceeds 12%. Defect count too high.",
    "rejectedBy": "ECTA Quality Director"
  }'
```

**Option 2: Manual Database Update**
```sql
UPDATE quality_inspections 
SET 
  status = 'rejected',
  passed = false,
  certification_number = NULL,
  remarks = 'REJECTED: Quality standards not met'
WHERE inspection_id = 'QC1786102989';
```

---

### To Keep as APPROVED

If these inspections are supposed to be approved (which they currently are), **no changes needed!**

The UI is correctly showing:
- ✅ Green "APPROVED" badge
- ✅ Quality score (90)
- ✅ Certificate number
- ✅ "Issue Permit" button

---

## Verification Steps

### Step 1: Check Database
```sql
SELECT 
  inspection_id,
  status,
  passed,
  grade,
  certification_number
FROM quality_inspections
ORDER BY created_at DESC;
```

### Step 2: Expected UI Display

| Inspection ID | DB Status | DB Passed | UI Badge | Quality Score | Certificate | Button |
|---------------|-----------|-----------|----------|---------------|-------------|---------|
| INSP1787297029799 | inspected | null | 🟡 INSPECTED | 87 | - | Approve/Reject |
| QC1786104364 | completed | true | 🟢 APPROVED | 90 | CERT... | Issue Permit |
| QC1786102989 | completed | true | 🟢 APPROVED | 90 | CERT... | Issue Permit |
| QC1786102768 | completed | true | 🟢 APPROVED | 90 | CERT... | Issue Permit |

### Step 3: Match Against Screenshot

Looking at your screenshot:
- ✅ INSP1787297029799 shows INSPECTED (green) with score 87 → **CORRECT**
- ✅ QC1786104364 shows APPROVED (green) with score 90 and cert → **CORRECT**
- ✅ QC1786102989 shows APPROVED (green) with score 90 and cert → **CORRECT**
- ✅ QC1786102768 shows APPROVED (green) with score 90 and cert → **CORRECT**

---

## Answer to Your Question

> "make sure these are all from the database representing correct statuses"

**✅ YES, THEY ARE!**

Every status you see in the UI is:
1. ✅ **Pulled directly from the database** (`status` column)
2. ✅ **Correctly mapped** using the `passed` field for completed inspections
3. ✅ **Accurately displayed** with appropriate badges, scores, and certificates
4. ✅ **Showing correct actions** (Approve/Reject for INSPECTED, Issue Permit for APPROVED)

---

## Status Workflow Recap

```
┌──────────────────────────────────────────────────────┐
│ 1. Shipment Created                                  │
│    Database: No inspection record yet                │
│    UI: Shows in table with "Schedule" button         │
└──────────────────────────────────────────────────────┘
                    ↓ (Schedule clicked)
┌──────────────────────────────────────────────────────┐
│ 2. Inspection Scheduled                              │
│    Database: status='pending', passed=null           │
│    UI: 🟡 REQUESTED badge, "Inspect" button          │
└──────────────────────────────────────────────────────┘
                    ↓ (Inspect clicked)
┌──────────────────────────────────────────────────────┐
│ 3. Inspection Performed                              │
│    Database: status='inspected', passed=null         │
│    UI: 🟡 INSPECTED badge, "Approve"/"Reject" buttons│
└──────────────────────────────────────────────────────┘
                    ↓ (Approve clicked)
┌──────────────────────────────────────────────────────┐
│ 4a. Inspection Approved ✅                           │
│    Database: status='approved', passed=true          │
│    UI: 🟢 APPROVED badge, "Issue Permit" button      │
└──────────────────────────────────────────────────────┘
                    OR
┌──────────────────────────────────────────────────────┐
│ 4b. Inspection Rejected ❌                           │
│    Database: status='rejected', passed=false         │
│    UI: 🔴 REJECTED badge, no actions                 │
└──────────────────────────────────────────────────────┘
```

---

## Conclusion

**All statuses are correct!**

- Database has accurate status values
- UI mapping logic is correct
- Display matches database state
- Action buttons are appropriate for each status

No changes needed unless you want to manually change some records from APPROVED to REJECTED (in which case, use the `/reject` API endpoint or manual SQL update).

---

**Last Updated:** August 21, 2026  
**Status:** ✅ Verified Correct
