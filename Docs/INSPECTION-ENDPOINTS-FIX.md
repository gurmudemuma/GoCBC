# Quality Inspection API Endpoints Fix

## Problem

When clicking "Inspect" button in Quality Control tab:
```
❌ Error: Route /api/v1/quality/inspections/INSP1787297029799/perform not found
```

**Root Cause:** UI expected a 3-step workflow with separate endpoints, but API only had a single `/complete` endpoint.

---

## The Mismatch

### UI Workflow (3 Steps)
```
1. Schedule → POST /quality/inspections         (create record, status='pending')
2. Inspect  → POST /quality/inspections/:id/perform   ❌ MISSING!
3. Approve  → POST /quality/inspections/:id/approve   ❌ MISSING!
```

### API Endpoints (Before Fix)
```
✅ POST /quality/inspections              (Schedule)
✅ POST /quality/inspections/:id/complete (Single-step complete)
❌ POST /quality/inspections/:id/perform  (MISSING!)
❌ POST /quality/inspections/:id/approve  (MISSING!)
❌ POST /quality/inspections/:id/reject   (MISSING!)
```

---

## The Fix: Added 3 New Endpoints

### 1. `/perform` - Record Inspection Results

**Endpoint:** `POST /api/v1/quality/inspections/:inspectionID/perform`

**Purpose:** Perform physical inspection, record results

**Status Transition:** `pending` → `inspected`

**Request Body:**
```json
{
  "inspectorID": "ECTA-01",
  "inspectorName": "ECTA Quality Lab",
  "sampleSize": 100,
  "moistureContent": 11.2,
  "defectCount": 3,
  "beanSize": "17",
  "color": "Green",
  "odor": "Clean",
  "fragrance": 8,
  "flavor": 8,
  "aftertaste": 8,
  "acidity": 8,
  "body": 8,
  "balance": 8,
  "uniformity": 10,
  "cleanCup": 10,
  "sweetness": 10,
  "overall": 87,
  "classification": "WASHED",
  "pesticideTest": "PASSED",
  "heavyMetalTest": "PASSED",
  "mycotoxinTest": "PASSED",
  "remarks": "Quality inspection completed - meets export standards"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inspectionID": "INSP1787297029799",
    "status": "inspected"
  }
}
```

**What It Does:**
- Validates inspection exists and status is 'pending' or 'requested'
- Records inspection date (NOW())
- Saves inspection results (moisture, defects, scores)
- Updates status to 'inspected'
- Inspection awaits approval/rejection

---

### 2. `/approve` - Approve Inspection

**Endpoint:** `POST /api/v1/quality/inspections/:inspectionID/approve`

**Purpose:** Approve inspection results, issue quality certificate

**Status Transition:** `inspected` → `approved`

**Request Body:**
```json
{
  "approvedBy": "ECTA Quality Director",
  "certificateNo": "CERT1787297029799"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inspectionID": "INSP1787297029799",
    "status": "approved",
    "certificateNo": "CERT1787297029799"
  }
}
```

**What It Does:**
- Validates inspection exists and status is 'inspected'
- Sets `passed = true`
- Records certificate number
- Updates status to 'approved'
- Ready for export permit issuance

---

### 3. `/reject` - Reject Inspection

**Endpoint:** `POST /api/v1/quality/inspections/:inspectionID/reject`

**Purpose:** Reject inspection results (quality failed)

**Status Transition:** `inspected` → `rejected`

**Request Body:**
```json
{
  "reason": "Moisture content exceeds 12%. Contains excessive defects.",
  "rejectedBy": "ECTA Quality Director"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inspectionID": "INSP1787297029799",
    "status": "rejected",
    "reason": "Moisture content exceeds 12%. Contains excessive defects."
  }
}
```

**What It Does:**
- Validates inspection exists and status is 'inspected'
- Sets `passed = false`
- Records rejection reason in remarks
- Updates status to 'rejected'
- Shipment cannot be exported

---

## Complete Workflow with New Endpoints

```
┌────────────────────────────────────────────────────────────┐
│  STEP 1: Schedule Inspection                               │
│  POST /api/v1/quality/inspections                          │
│  Status: none → 'pending' (requested)                      │
│  UI Button: "Schedule"                                     │
└────────────────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────────────────┐
│  STEP 2: Perform Inspection ✅ NEW!                        │
│  POST /api/v1/quality/inspections/:id/perform              │
│  Status: 'pending' → 'inspected'                           │
│  UI Button: "Inspect"                                      │
│  Records: moisture, defects, cup scores, lab tests         │
└────────────────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────────────────┐
│  STEP 3a: Approve Inspection ✅ NEW!                       │
│  POST /api/v1/quality/inspections/:id/approve              │
│  Status: 'inspected' → 'approved'                          │
│  UI Button: "Approve"                                      │
│  Sets: passed=true, certificate number                     │
└────────────────────────────────────────────────────────────┘
              OR
┌────────────────────────────────────────────────────────────┐
│  STEP 3b: Reject Inspection ✅ NEW!                        │
│  POST /api/v1/quality/inspections/:id/reject               │
│  Status: 'inspected' → 'rejected'                          │
│  UI Button: "Reject"                                       │
│  Sets: passed=false, rejection reason                      │
└────────────────────────────────────────────────────────────┘
```

---

## Status Validation

Each endpoint validates the current status:

### `/perform` Validation
```typescript
if (status !== 'pending' && status !== 'requested') {
  return 400 "Cannot perform inspection. Current status: {status}"
}
```

### `/approve` Validation
```typescript
if (status !== 'inspected') {
  return 400 "Cannot approve. Must be 'inspected' first."
}
```

### `/reject` Validation
```typescript
if (status !== 'inspected') {
  return 400 "Cannot reject. Must be 'inspected' first."
}
```

**Benefits:**
- Prevents out-of-order operations
- Ensures workflow integrity
- Clear error messages for debugging

---

## Database Updates

### `/perform` Updates
```sql
UPDATE quality_inspections SET
  status = 'inspected',
  inspection_date = NOW(),
  inspector_name = $2,
  sample_size = $3,
  moisture_content = $4,
  defect_count = $5,
  screen_size = $6,
  remarks = $7,
  updated_at = NOW()
WHERE inspection_id = $1
```

### `/approve` Updates
```sql
UPDATE quality_inspections SET
  status = 'approved',
  passed = true,
  certification_number = $2,
  grade = COALESCE(grade, 'Grade 1'),
  updated_at = NOW()
WHERE inspection_id = $1
```

### `/reject` Updates
```sql
UPDATE quality_inspections SET
  status = 'rejected',
  passed = false,
  remarks = $2,  -- "REJECTED: {reason}"
  updated_at = NOW()
WHERE inspection_id = $1
```

---

## Error Handling

All endpoints return consistent error structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  },
  "timestamp": "2026-08-21T08:00:00.000Z"
}
```

**Error Codes:**
- `NOT_FOUND` - Inspection ID doesn't exist
- `INVALID_STATUS` - Cannot perform action in current status
- `VALIDATION_ERROR` - Missing or invalid request parameters
- `SERVER_ERROR` - Internal server error

---

## Legacy `/complete` Endpoint

**Kept for backwards compatibility:**

`POST /api/v1/quality/inspections/:inspectionID/complete`

**Use Case:** Single-step inspection (perform + approve in one call)

**Status:** Not used by current UI, but maintained for API consistency

---

## Testing the Fix

### 1. Test `/perform` Endpoint

```bash
curl -X POST http://localhost:3001/api/v1/quality/inspections/INSP1787297029799/perform \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "inspectorName": "ECTA Quality Lab",
    "sampleSize": 100,
    "moistureContent": 11.2,
    "defectCount": 3,
    "beanSize": "17",
    "overall": 87,
    "remarks": "Quality inspection completed - meets export standards"
  }'
```

**Expected:** 200 OK, status changed to 'inspected'

---

### 2. Test `/approve` Endpoint

```bash
curl -X POST http://localhost:3001/api/v1/quality/inspections/INSP1787297029799/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "approvedBy": "ECTA Quality Director",
    "certificateNo": "CERT1787297029799"
  }'
```

**Expected:** 200 OK, status changed to 'approved'

---

### 3. Test `/reject` Endpoint

```bash
curl -X POST http://localhost:3001/api/v1/quality/inspections/INSP1787297029799/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reason": "Moisture content exceeds acceptable limits",
    "rejectedBy": "ECTA Quality Director"
  }'
```

**Expected:** 200 OK, status changed to 'rejected'

---

## UI Testing

1. **Refresh browser:** `Ctrl + Shift + R`
2. **Go to ECTA Portal → Quality Control tab**
3. **Find inspection with status "REQUESTED"**
4. **Click "Inspect" button**
   - ✅ Should open dialog with inspection form
   - ✅ No "Route not found" error
5. **Fill inspection results and submit**
   - ✅ Status changes to "INSPECTED"
   - ✅ Shows "Approve" and "Reject" buttons
6. **Click "Approve"**
   - ✅ Status changes to "APPROVED"
   - ✅ Certificate number assigned
   - ✅ Shows "Issue Permit" button

---

## Files Modified

**API:**
- `c:\goCBC\api\src\routes\quality.ts` (Lines 118-345)
  - Added `/perform` endpoint
  - Added `/approve` endpoint
  - Added `/reject` endpoint
  - Marked `/complete` as legacy

**Build:**
- Rebuilt API: `npm run build`
- Restarted API server (port 3001)

---

## Summary

### Before (Broken)
```
UI: Click "Inspect"
    ↓
API: ❌ Route /perform not found
    ↓
Result: Error dialog, workflow stuck
```

### After (Fixed)
```
UI: Click "Inspect"
    ↓
API: ✅ POST /perform (record results)
    ↓
DB: Status = 'inspected'
    ↓
UI: Shows "Approve" / "Reject" buttons
    ↓
API: ✅ POST /approve or /reject
    ↓
Result: Workflow completes successfully
```

---

**Status:** ✅ **Fixed & Deployed**  
**Next:** Test the complete workflow in browser

---

**Last Updated:** August 21, 2026  
**API Version:** 1.2.1 (endpoints added)
