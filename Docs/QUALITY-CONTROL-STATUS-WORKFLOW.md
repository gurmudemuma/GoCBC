# Quality Control Status Workflow - Correct Statuses

## Current Status Confusion

You're seeing shipments created and shown under Quality Control tab with inconsistent statuses. Let me clarify the **correct workflow**.

---

## The Problem: Mixed Status Terminology

### What's Currently Happening

**Database uses 2 statuses:**
```sql
SELECT DISTINCT status FROM quality_inspections;
┌──────────┐
│ pending  │  ← Inspection scheduled, not yet performed
│ completed│  ← Inspection done (passed/failed)
└──────────┘
```

**UI expects 5 statuses:**
```typescript
// Line 181 in ECTAPortal.tsx
'PENDING' | 'SCHEDULED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
```

**Workflow logic expects 4 statuses:**
```typescript
// Lines 2687-2715 in ECTAPortal.tsx
if (status === 'REQUESTED') { showButton('Inspect'); }
else if (status === 'INSPECTED') { showButton('Approve/Reject'); }
else if (status === 'APPROVED') { showButton('Issue Permit'); }
```

**Result:** 🔴 **Mismatch between database, UI display, and workflow logic**

---

## Correct Quality Control Workflow

###  Professional 5-Stage Workflow

```
┌────────────────────────────────────────────────────────────────────┐
│                   QUALITY CONTROL PIPELINE                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  STAGE 1: PENDING (Awaiting Schedule)                             │
│  ├─ Shipment created by exporter                                  │
│  ├─ Status: PENDING (no inspection record yet)                    │
│  ├─ Action: ECTA clicks "Schedule" button                         │
│  └─ Next: REQUESTED                                               │
│                                                                    │
│  STAGE 2: REQUESTED (Scheduled, Awaiting Inspection)              │
│  ├─ Inspection scheduled, date assigned                           │
│  ├─ Status: REQUESTED (database: 'pending')                       │
│  ├─ Action: Inspector clicks "Inspect" button                     │
│  └─ Next: INSPECTED                                               │
│                                                                    │
│  STAGE 3: INSPECTED (Awaiting Approval)                           │
│  ├─ Physical inspection performed, results recorded               │
│  ├─ Status: INSPECTED (database: needs new status)                │
│  ├─ Action: Quality Director clicks "Approve" or "Reject"         │
│  └─ Next: APPROVED or REJECTED                                    │
│                                                                    │
│  STAGE 4: APPROVED (Ready for Export Permit)                      │
│  ├─ Quality inspection passed                                     │
│  ├─ Status: APPROVED (database: 'completed' + passed=true)        │
│  ├─ Action: ECTA clicks "Issue Permit"                            │
│  └─ Next: PERMIT_ISSUED                                           │
│                                                                    │
│  STAGE 5: REJECTED (Failed Quality)                               │
│  ├─ Quality inspection failed                                     │
│  ├─ Status: REJECTED (database: 'completed' + passed=false)       │
│  ├─ Action: None (shipment cannot be exported)                    │
│  └─ Next: END (exporter must address issues)                      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Current vs. Required Database Statuses

### Current (Simplified, 2 statuses)
```sql
CREATE TABLE quality_inspections (
  status VARCHAR(20),  -- 'pending' or 'completed'
  passed BOOLEAN,      -- null, true, or false
  ...
);
```

**Problem:**
- `'pending'` covers both "scheduled" and "inspecting"
- `'completed'` covers both "approved" and "rejected"
- No way to show "inspected, awaiting approval"

### Required (Professional, 5 statuses)
```sql
CREATE TABLE quality_inspections (
  status VARCHAR(20),  -- 'requested', 'inspected', 'approved', 'rejected', 'permit_issued'
  passed BOOLEAN,      -- true or false (only set after inspection)
  ...
);
```

**Benefits:**
- Clear workflow stages
- Each status has specific actions
- UI can show appropriate buttons

---

## Status Mapping: Database vs. UI vs. Workflow

| Stage | UI Display | Database Status | Database `passed` | Workflow Button |
|-------|------------|-----------------|-------------------|-----------------|
| **1** | PENDING | (no record) | N/A | "Schedule" |
| **2** | REQUESTED | `'requested'` or `'pending'` | `null` | "Inspect" |
| **3** | INSPECTED | `'inspected'` | `null` | "Approve" / "Reject" |
| **4** | APPROVED | `'approved'` or `'completed'` | `true` | "Issue Permit" |
| **5** | REJECTED | `'rejected'` or `'completed'` | `false` | (none) |

---

## What Needs to be Fixed

### Issue 1: Database Only Has 2 Statuses

**Current API (Line 99 in quality.ts):**
```typescript
await postgresDb.run(
  `INSERT INTO quality_inspections (..., status) VALUES (..., $9)`,
  [..., 'pending']  // ❌ Always 'pending'
);
```

**Should Be:**
```typescript
await postgresDb.run(
  `INSERT INTO quality_inspections (..., status) VALUES (..., $9)`,
  [..., 'requested']  // ✅ Explicitly 'requested' (scheduled)
);
```

### Issue 2: No 'inspected' Status in Database

**Current API (perform inspection endpoint):**
```typescript
// After performing inspection, status should be 'inspected'
await postgresDb.run(
  `UPDATE quality_inspections SET ... WHERE inspection_id = $1`,
  // ❌ No status update!
);
```

**Should Be:**
```typescript
await postgresDb.run(
  `UPDATE quality_inspections 
   SET status = 'inspected', inspection_date = $2, ... 
   WHERE inspection_id = $1`,
  [inspectionID, new Date().toISOString(), ...]
);
```

### Issue 3: 'completed' Covers Both Approved and Rejected

**Current API (approve endpoint):**
```typescript
await postgresDb.run(
  `UPDATE quality_inspections SET status = 'completed', passed = true ...`
  // ❌ 'completed' is ambiguous
);
```

**Should Be:**
```typescript
await postgresDb.run(
  `UPDATE quality_inspections SET status = 'approved', passed = true ...`
  // ✅ 'approved' is explicit
);
```

---

## The Fix: Standardize Status Values

### Step 1: Update Database Schema (Add Valid Statuses)

```sql
-- Option A: Add CHECK constraint to enforce valid statuses
ALTER TABLE quality_inspections 
DROP CONSTRAINT IF EXISTS quality_inspections_status_check;

ALTER TABLE quality_inspections 
ADD CONSTRAINT quality_inspections_status_check 
CHECK (status IN ('requested', 'inspected', 'approved', 'rejected', 'permit_issued'));

-- Option B: Use ENUM type (PostgreSQL)
CREATE TYPE inspection_status AS ENUM (
  'requested',      -- Scheduled, awaiting inspection
  'inspected',      -- Inspection done, awaiting approval
  'approved',       -- Quality passed, ready for permit
  'rejected',       -- Quality failed, cannot export
  'permit_issued'   -- Export permit issued
);

ALTER TABLE quality_inspections 
ALTER COLUMN status TYPE inspection_status USING status::inspection_status;
```

### Step 2: Update Existing Records

```sql
-- Migrate old statuses to new statuses
UPDATE quality_inspections 
SET status = 'requested' 
WHERE status = 'pending';

UPDATE quality_inspections 
SET status = 'approved' 
WHERE status = 'completed' AND passed = true;

UPDATE quality_inspections 
SET status = 'rejected' 
WHERE status = 'completed' AND passed = false;

-- For records without inspection_date, assume they're still requested
UPDATE quality_inspections 
SET status = 'requested' 
WHERE inspection_date IS NULL;

-- For records with inspection_date but no approval, assume they're inspected
UPDATE quality_inspections 
SET status = 'inspected' 
WHERE inspection_date IS NOT NULL 
  AND certification_number IS NULL 
  AND passed IS NULL;
```

### Step 3: Update API to Use Correct Statuses

**File: `api/src/routes/quality.ts`**

```typescript
// POST /api/v1/quality/inspections (Line 99)
// Change status from 'pending' to 'requested'
await postgresDb.run(
  `INSERT INTO quality_inspections (
    inspection_id, exporter_id, contract_id, shipment_id, coffee_type,
    quantity, sample_size, requested_date, status
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
  [inspectionID, exporterID, contractID, shipmentID, coffeeType, 
   quantity, sampleSize, requestedDate, 'requested']  // ✅ Changed to 'requested'
);
```

```typescript
// POST /api/v1/quality/inspections/:inspectionID/perform (New endpoint)
router.post('/inspections/:inspectionID/perform',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { ...inspectionResults } = req.body;

      await postgresDb.run(
        `UPDATE quality_inspections 
         SET status = 'inspected',               -- ✅ Set to 'inspected'
             inspection_date = $2,
             inspector_name = $3,
             moisture_content = $4,
             defect_count = $5,
             grade = $6,
             remarks = $7,
             updated_at = NOW()
         WHERE inspection_id = $1`,
        [inspectionID, new Date(), inspectorName, moistureContent, ...]
      );

      res.json({ success: true, status: 'inspected' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
```

```typescript
// POST /api/v1/quality/inspections/:inspectionID/approve (New endpoint)
router.post('/inspections/:inspectionID/approve',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { certificateNo, approvedBy } = req.body;

      await postgresDb.run(
        `UPDATE quality_inspections 
         SET status = 'approved',                -- ✅ Set to 'approved'
             passed = true,
             certification_number = $2,
             approved_by = $3,
             approval_date = NOW(),
             updated_at = NOW()
         WHERE inspection_id = $1`,
        [inspectionID, certificateNo, approvedBy]
      );

      res.json({ success: true, status: 'approved' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
```

```typescript
// POST /api/v1/quality/inspections/:inspectionID/reject (New endpoint)
router.post('/inspections/:inspectionID/reject',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { inspectionID } = req.params;
      const { rejectionReason, rejectedBy } = req.body;

      await postgresDb.run(
        `UPDATE quality_inspections 
         SET status = 'rejected',                -- ✅ Set to 'rejected'
             passed = false,
             remarks = $2,
             rejected_by = $3,
             rejection_date = NOW(),
             updated_at = NOW()
         WHERE inspection_id = $1`,
        [inspectionID, rejectionReason, rejectedBy]
      );

      res.json({ success: true, status: 'rejected' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
```

### Step 4: Update UI to Match New Statuses

**File: `ui/src/components/portals/ECTAPortal.tsx`**

```typescript
// Line 2690: Update status display logic
<StatusChip
  status={
    status === 'PENDING' ? 'pending' :          // No inspection record
    status === 'REQUESTED' ? 'warning' :         // Scheduled, awaiting inspection
    status === 'INSPECTED' ? 'info' :           // Inspected, awaiting approval
    status === 'APPROVED' ? 'approved' :        // Approved, ready for permit
    status === 'REJECTED' ? 'rejected' :        // Rejected, cannot export
    'default'
  }
  label={status}
  brandColor={BRAND_COLOR}
/>
```

```typescript
// Line 2703: Update action buttons
{isShipment ? (
  // STAGE 1: No inspection yet - Schedule button
  <Button variant="contained" size="small" onClick={() => handleRequestInspection(item)}>
    Schedule
  </Button>
) : status === 'REQUESTED' ? (
  // STAGE 2: Scheduled - Inspect button
  <Button variant="contained" size="small" onClick={() => handlePerformInspection(item)}>
    Inspect
  </Button>
) : status === 'INSPECTED' ? (
  // STAGE 3: Inspected - Approve/Reject buttons
  <Box display="flex" gap={1}>
    <Button variant="contained" size="small" onClick={() => handleApproveInspection(item)}>
      Approve
    </Button>
    <Button variant="outlined" size="small" onClick={() => handleRejectInspection(item)}>
      Reject
    </Button>
  </Box>
) : status === 'APPROVED' ? (
  // STAGE 4: Approved - Issue Permit button
  <Button variant="contained" size="small" onClick={() => handleIssueExportPermit(item)}>
    Issue Permit
  </Button>
) : status === 'REJECTED' ? (
  // STAGE 5: Rejected - No actions
  <Chip label="Rejected" size="small" color="error" />
) : null}
```

---

## Summary: Before vs. After

### Before (Current - Confusing)
```
Shipment Created → Status: ??? (pending? requested?)
  ↓
Schedule Clicked → Status: 'pending' (database)
  ↓
Inspect Clicked → Status: ??? (still 'pending'? 'inspected'?)
  ↓
Approve Clicked → Status: 'completed' (ambiguous!)
```

### After (Professional - Clear)
```
Shipment Created → Status: PENDING (no inspection record)
  ↓
Schedule Clicked → Status: 'requested' (scheduled)
  ↓
Inspect Clicked → Status: 'inspected' (awaiting approval)
  ↓
Approve Clicked → Status: 'approved' (ready for permit)
```

---

## Migration Script

```sql
-- Step 1: Backup current data
CREATE TABLE quality_inspections_backup AS 
SELECT * FROM quality_inspections;

-- Step 2: Add new status values
UPDATE quality_inspections 
SET status = CASE
  WHEN status = 'pending' AND inspection_date IS NULL THEN 'requested'
  WHEN status = 'pending' AND inspection_date IS NOT NULL THEN 'inspected'
  WHEN status = 'completed' AND passed = true THEN 'approved'
  WHEN status = 'completed' AND passed = false THEN 'rejected'
  ELSE status
END;

-- Step 3: Add CHECK constraint
ALTER TABLE quality_inspections 
ADD CONSTRAINT quality_inspections_status_check 
CHECK (status IN ('requested', 'inspected', 'approved', 'rejected', 'permit_issued'));

-- Step 4: Verify migration
SELECT status, COUNT(*) 
FROM quality_inspections 
GROUP BY status;
```

---

## Testing Checklist

After implementing the fix:

- [ ] Database has 5 valid statuses: requested, inspected, approved, rejected, permit_issued
- [ ] API POST /inspections creates status='requested'
- [ ] API POST /inspections/:id/perform updates status='inspected'
- [ ] API POST /inspections/:id/approve updates status='approved'
- [ ] API POST /inspections/:id/reject updates status='rejected'
- [ ] UI shows correct button for each status
- [ ] UI status chips use correct colors
- [ ] Workflow progresses logically through all 5 stages

---

**Recommendation:** Implement this status standardization to make the quality control workflow professional and unambiguous.

---

**Last Updated:** August 21, 2026  
**Status:** 🔴 Requires Implementation
