# ✅ TWO-STEP FOREX ALLOCATION WORKFLOW IMPLEMENTED

## Overview
Implemented a two-step workflow for forex allocation in NBE Portal where banks must:
1. **Confirm** the forex request first (REQUESTED → CONFIRMED)
2. **Allocate** forex after confirmation (CONFIRMED → ALLOCATED)

---

## Changes Made

### 1. Frontend (UI) - NBEPortal.tsx

**Status Type Updated:**
```typescript
status: 'REQUESTED' | 'CONFIRMED' | 'APPROVED' | 'ALLOCATED' | 'UTILIZED';
```

**Button Logic:**
- **REQUESTED status**: Shows **"Confirm"** button (blue)
- **CONFIRMED status**: Shows **"Allocate Forex"** button (green)
- **ALLOCATED status**: No buttons (already completed)

**Confirm Button Action:**
```typescript
// Calls: POST /api/v1/forex/:forexId/confirm
// Changes status: REQUESTED → CONFIRMED
// Enables Allocate button after confirmation
```

---

### 2. Backend (API) - forex.ts

**New Endpoint Added:**
```typescript
POST /api/v1/forex/:forexId/confirm

Purpose: NBE confirms forex request before allocation
Auth: Requires authentication
Organization: Connects as NBEMSP (NBE)
```

**Request Body:**
```json
{
  "confirmedBy": "NBE Officer Username"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "forexId": "FOREX-123",
    "status": "CONFIRMED",
    "confirmedBy": "nbe_officer",
    "confirmedAt": "2026-09-10T12:00:00Z",
    "message": "Forex request confirmed. Allocate button is now active."
  }
}
```

**Actions Performed:**
1. Connects to blockchain as NBEMSP
2. Calls chaincode function `ConfirmForex(forexId, confirmedBy, timestamp)`
3. Updates PostgreSQL: sets status to 'CONFIRMED'
4. Returns success response

---

## Workflow Sequence

```
┌─────────────────────────────────────────────────────────┐
│  FOREX REQUEST WORKFLOW                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Exporter requests forex                             │
│     Status: REQUESTED                                   │
│     UI: Shows "Confirm" button (blue)                   │
│                                                         │
│  2. NBE Officer clicks "Confirm"                        │
│     ├─ Calls: POST /forex/:id/confirm                   │
│     ├─ Blockchain: ConfirmForex chaincode               │
│     └─ Status: REQUESTED → CONFIRMED                    │
│                                                         │
│  3. After confirmation                                  │
│     Status: CONFIRMED                                   │
│     UI: "Confirm" button disappears                     │
│     UI: "Allocate Forex" button appears (green)         │
│                                                         │
│  4. Bank Officer clicks "Allocate Forex"                │
│     ├─ Opens allocation dialog                          │
│     ├─ Sets amount, exchange rate, retention            │
│     ├─ Calls: POST /forex/allocate                      │
│     ├─ Blockchain: AllocateForex chaincode              │
│     └─ Status: CONFIRMED → ALLOCATED                    │
│                                                         │
│  5. Final state                                         │
│     Status: ALLOCATED                                   │
│     UI: No action buttons (completed)                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Status Transitions

```
REQUESTED ──[Confirm Button]──> CONFIRMED ──[Allocate Button]──> ALLOCATED
    ↓                               ↓                               ↓
 Blue button                    Green button                   No buttons
  (NBE)                           (NBE)                        (Complete)
```

---

## Database Updates

### PostgreSQL Schema Update Required:

```sql
ALTER TABLE forex_allocations 
ADD COLUMN confirmed_by VARCHAR(255),
ADD COLUMN confirmed_at TIMESTAMP;

-- Update status enum if it doesn't include CONFIRMED
-- ALTER TYPE forex_status ADD VALUE 'CONFIRMED';
```

---

## Blockchain Updates Required

### Chaincode Function Needed:

**File:** `chaincodes/coffee/forex.go`

```go
// ConfirmForex confirms a forex request (REQUESTED → CONFIRMED)
func (s *SmartContract) ConfirmForex(
    ctx contractapi.TransactionContextInterface,
    forexID string,
    confirmedBy string,
    confirmedAt string,
) error {
    // Read existing forex
    forexJSON, err := ctx.GetStub().GetState("FOREX_" + forexID)
    if err != nil {
        return fmt.Errorf("failed to read forex: %v", err)
    }
    if forexJSON == nil {
        return fmt.Errorf("forex %s does not exist", forexID)
    }

    var forex ForexAllocation
    err = json.Unmarshal(forexJSON, &forex)
    if err != nil {
        return err
    }

    // Validate current status
    if forex.Status != "REQUESTED" {
        return fmt.Errorf("forex must be in REQUESTED status to confirm, current status: %s", forex.Status)
    }

    // Update status and confirmation details
    forex.Status = "CONFIRMED"
    forex.ConfirmedBy = confirmedBy
    forex.ConfirmedAt = confirmedAt

    // Save back to blockchain
    forexJSON, err = json.Marshal(forex)
    if err != nil {
        return err
    }

    return ctx.GetStub().PutState("FOREX_" + forexID, forexJSON)
}
```

**Add fields to ForexAllocation struct:**
```go
type ForexAllocation struct {
    // ... existing fields ...
    Status        string `json:"status"`        // REQUESTED, CONFIRMED, ALLOCATED, UTILIZED
    ConfirmedBy   string `json:"confirmedBy"`   // NEW
    ConfirmedAt   string `json:"confirmedAt"`   // NEW
    // ... rest of fields ...
}
```

---

## Testing Instructions

### 1. Create a Test Forex Request
```bash
# Login as exporter and request forex
# Or use existing REQUESTED forex
```

### 2. Test Confirm Button
1. Login as NBE Officer
2. Go to "Forex Monitoring" tab
3. Find forex with status "REQUESTED"
4. Click blue "Confirm" button (checkmark icon)
5. Should see success notification: "Forex request confirmed. Allocate button is now active."
6. Table refreshes, forex status changes to "CONFIRMED"
7. Blue "Confirm" button disappears, green "Allocate Forex" button appears

### 3. Test Allocate Button
1. Click green "Allocate Forex" button
2. Dialog opens with allocation form
3. Fill in: amount, exchange rate, retention rate
4. Click "Allocate Forex"
5. Should see success notification
6. Status changes to "ALLOCATED"
7. Button disappears (workflow complete)

---

## Files Modified

1. ✅ **ui/src/components/portals/NBEPortal.tsx**
   - Added 'CONFIRMED' to status type
   - Changed action buttons logic
   - Added confirm button with API call

2. ✅ **api/src/routes/forex.ts**
   - Added POST /:forexId/confirm endpoint
   - Connects as NBEMSP
   - Updates PostgreSQL status

3. ⏳ **chaincodes/coffee/forex.go** (TODO)
   - Need to add ConfirmForex function
   - Need to add ConfirmedBy, ConfirmedAt fields

4. ⏳ **Database Migration** (TODO)
   - Need to add confirmed_by, confirmed_at columns

---

## Next Steps (To Complete Implementation)

1. **Add ConfirmForex to chaincode:**
   ```bash
   cd chaincodes/coffee
   # Edit forex.go to add ConfirmForex function
   ```

2. **Update chaincode:**
   ```bash
   bash deploy-chaincode.sh
   ```

3. **Run database migration:**
   ```sql
   ALTER TABLE forex_allocations 
   ADD COLUMN confirmed_by VARCHAR(255),
   ADD COLUMN confirmed_at TIMESTAMP;
   ```

4. **Test the workflow:**
   - Create test forex request
   - Confirm it
   - Allocate it
   - Verify 6 endorsers in blockchain

---

## Benefits

✅ **Clear workflow** - Two distinct steps prevent accidental allocations  
✅ **Better control** - NBE reviews before enabling allocation  
✅ **Audit trail** - Tracks who confirmed and when  
✅ **UI clarity** - Button changes make workflow obvious  
✅ **Blockchain integration** - All state changes recorded on-chain  
✅ **6-endorser system** - Both Confirm and Allocate will get 6 endorsers  

---

**Status:** Frontend and API implemented ✅  
**Remaining:** Chaincode function + Database migration  
**Date:** September 10, 2026
