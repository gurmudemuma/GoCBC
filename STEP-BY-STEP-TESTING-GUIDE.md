# GoCBC Step-by-Step Workflow Testing Guide

## Overview

This guide shows how to test the complete coffee export workflow step-by-step, with detailed explanations of what happens at each stage and how triggers work.

---

## Prerequisites

### 1. Start Required Services

```bash
# Terminal 1: PostgreSQL (if not running as service)
# Check if running: pg_isready
# If not, start it according to your system

# Terminal 2: Hyperledger Fabric Network
# Navigate to fabric network directory and start
cd /path/to/fabric/network
./network.sh up

# Terminal 3: API Server
cd /home/guda/GoCBC/api
npm run dev
# API should start on http://localhost:3001
```

### 2. Verify Services

```bash
# Check API
curl http://localhost:3001/api/health

# Check Database
psql -d gocbc -c "SELECT 1"

# Check Fabric (if you have peer commands configured)
# peer channel list
```

---

## Running the Step-by-Step Test

### Option 1: Automated Test with Detailed Output

```bash
cd /home/guda/GoCBC/api
node tests/step-by-step-workflow-test.js
```

**What you'll see:**
- Each step explained before execution
- API request and response details
- Database verification after each step
- Workflow triggers highlighted with 🔥
- Retention calculations shown in detail
- Success/failure status for each step

---

## The Complete Workflow - Step by Step

### STEP 1: Register Contract

**Who:** Exporter  
**What Happens:**
1. Exporter submits contract details (buyer, coffee type, quantity, price)
2. System validates all required fields (17 fields total)
3. Contract saved to blockchain (immutable record)
4. Contract saved to PostgreSQL (queryable)
5. Status set to "PENDING" awaiting ECTA approval

**Expected Output:**
```
✅ Contract registered successfully
📊 Contract ID: TEST-CONTRACT-xxx
📊 Status: PENDING
📊 Blockchain TX: tx_xxx
✅ Database: Contract found with status "PENDING"
ℹ️  Ready for approval by ECTA
```

**What Gets Created:**
- `contracts` table: New row with status "PENDING"
- Blockchain: Contract asset created
- `audit_logs` table: "CREATE" action recorded

**Next Step:** ECTA reviews and approves contract

---

### STEP 2: Approve Contract

**Who:** ECTA (Ethiopian Coffee and Tea Authority)  
**What Happens:**
1. ECTA officer reviews contract for compliance
2. Approves contract with reason
3. Status changed from "PENDING" to "APPROVED"
4. Approval recorded on blockchain
5. Timestamp and approver recorded

**Expected Output:**
```
✅ Contract approved by ECTA
📊 Approved by: ecta_officer
📊 Blockchain TX: tx_xxx
✅ Database: Status = "APPROVED"
✅ Approved by: ecta_officer at 2024-12-xx
ℹ️  Contract is now active and ready for LC issuance
```

**What Gets Updated:**
- `contracts` table: status → "APPROVED", approved_by, approved_at
- Blockchain: Contract status updated
- `audit_logs` table: "APPROVE" action recorded

**Next Step:** Bank issues Letter of Credit

---

### STEP 3: Issue Letter of Credit (LC)

**Who:** Issuing Bank (Commercial Bank of Ethiopia)  
**What Happens:**
1. Bank creates LC with 19 fields (amount, terms, ports, dates, etc.)
2. LC recorded on blockchain
3. LC saved to database
4. **🔥 AUTOMATIC TRIGGER:** Forex request is auto-created!
5. System links LC to contract

**Expected Output:**
```
✅ LC issued successfully
📊 LC ID: TEST-LC-xxx
📊 LC Number: LC-2024-xxx
📊 Blockchain TX: tx_xxx
🔥 WORKFLOW TRIGGER: Forex request automatically created!
📊 Forex ID: FOREX-xxx
✅ Database: LC found with status "ISSUED"
🔥 Forex request created: FOREX-xxx
✅ Database: Forex status = "REQUESTED"
ℹ️  Next: Bank can allocate forex with 40% NBE retention
```

**What Gets Created:**
- `letters_of_credit` table: New LC with status "ISSUED"
- `forex_allocations` table: **Auto-created** with status "REQUESTED"
- Blockchain: LC asset and Forex request created
- `audit_logs` table: Actions recorded

**Automatic Trigger:** `LCService.triggerForexAutoRequest()`
- Runs after LC is saved
- Creates forex request automatically
- Links forex to LC and contract
- Non-blocking (continues even if fails)

**Next Step:** National Bank allocates forex

---

### STEP 4: Allocate Forex with 40% NBE Retention

**Who:** National Bank of Ethiopia (NBE)  
**What Happens:**
1. NBE officer reviews forex request
2. Allocates forex with exchange rate
3. **Applies 40% retention policy (NBE regulation)**
4. Calculates: $10,000 → $4,000 retained, $6,000 released
5. Records retention breakdown to blockchain and database

**Expected Output:**
```
✅ Forex allocated successfully
📊 Forex ID: FOREX-xxx

💰 RETENTION BREAKDOWN:
   Total Amount:    $10000 USD
   Retention (40%): $4000 USD
   Release (60%):   $6000 USD
   Exchange Rate:   115.5 ETB/USD

✅ ✓ 40% retention calculation CORRECT
✅ ✓ 60% release calculation CORRECT
✅ Database: Status = "ALLOCATED"
✅ Database: Retention = $4000, Release = $6000
ℹ️  Forex is allocated and ready for use
```

**What Gets Updated:**
- `forex_allocations` table: 
  - status → "ALLOCATED"
  - retention_rate → 40
  - retention_amount → $4000
  - release_amount → $6000
  - exchange_rate, officer, approval_ref
- Blockchain: Forex allocation with retention details
- `audit_logs` table: "ALLOCATE" action with retention metadata

**40% Retention Enforcement:**
```typescript
// In ForexService.allocateForex
const retentionAmount = allocatedAmount * (retentionRate / 100); // 40%
const releaseAmount = allocatedAmount - retentionAmount;         // 60%
```

**Next Step:** Exporter creates shipment

---

### STEP 5: Create Shipment

**Who:** Exporter  
**What Happens:**
1. Exporter creates shipment record (origin, quantity, grade, ICO number)
2. Shipment recorded on blockchain
3. Shipment saved to database
4. **🔥 AUTOMATIC TRIGGER:** Quality inspection task is auto-created!
5. System links shipment to contract

**Expected Output:**
```
✅ Shipment created successfully
📊 Shipment ID: TEST-SHIPMENT-xxx
📊 Status: PENDING
📊 Blockchain TX: tx_xxx
🔥 WORKFLOW TRIGGER: Quality inspection task should be auto-created!
🔥 Quality inspection task created: INS-xxx
✅ Database: Inspection status = "PENDING"
ℹ️  Next: ECTA can perform quality inspection
```

**What Gets Created:**
- `shipments` table: New shipment with status "CREATED"
- `quality_inspections` table: **Auto-created** with status "PENDING"
- Blockchain: Shipment asset created
- `audit_logs` table: Actions recorded

**Automatic Trigger:** `ShipmentService.createQualityInspectionTaskInternal()`
- Runs after shipment is created
- Creates quality inspection task
- Links inspection to shipment and exporter
- Sets initial status to "PENDING"

**Next Step:** ECTA performs quality inspection

---

### STEP 6: Approve Quality Inspection

**Who:** ECTA Quality Inspector  
**What Happens:**
1. Inspector performs physical inspection (cupping, grading, testing)
2. Approves inspection with certificate number
3. Status changed to "APPROVED"
4. **🔥 AUTOMATIC TRIGGER:** Customs declaration is auto-created!
5. Certificate issued

**Expected Output:**
```
✅ Quality inspection approved
📊 Certificate No: CERT-xxx
📊 Approved by: quality_director
🔥 WORKFLOW TRIGGER: Customs declaration should be auto-created!
🔥 Customs declaration created: DECL-xxx
✅ Database: Declaration status = "SUBMITTED"
ℹ️  Next: Customs can review and clear the shipment
```

**What Gets Updated:**
- `quality_inspections` table:
  - status → "APPROVED"
  - certificate_no, approved_by, approved_at
- `customs_declarations` table: **Auto-created** with status "SUBMITTED"
- Blockchain: Quality approval and customs declaration
- `audit_logs` table: Actions recorded

**Automatic Trigger:** `ShipmentService.triggerCustomsDeclaration()`
- Runs after quality is approved
- Gets shipment and contract details
- Creates customs declaration with all required fields
- Sets status to "SUBMITTED"
- Non-blocking operation

**Next Step:** Customs reviews and clears declaration

---

### STEP 7: Clear Customs Declaration

**Who:** Customs Officer  
**What Happens:**
1. Customs officer reviews declaration and documents
2. Verifies HS code, value, quantity
3. Clears declaration for export
4. Updates shipment status to "CUSTOMS_CLEARED"
5. Issues clearance reference number

**Expected Output:**
```
✅ Customs declaration cleared
📊 Clearance Ref: CLR-xxx
📊 Cleared by: customs_officer_01
✅ Database: Status = "CLEARED"
ℹ️  Shipment is cleared and ready for export
ℹ️  Next: Buyer makes payment
```

**What Gets Updated:**
- `customs_declarations` table:
  - status → "CLEARED"
  - clearance_ref, cleared_by, cleared_at
- `shipments` table: status → "CUSTOMS_CLEARED"
- Blockchain: Customs clearance recorded
- `audit_logs` table: "CLEAR" action recorded

**Next Step:** Buyer makes payment

---

### STEP 8: Record Payment with 40% NBE Retention

**Who:** Buyer's Bank (via SWIFT)  
**What Happens:**
1. Buyer bank transfers payment via SWIFT
2. System records payment with SWIFT reference
3. **Applies 40% retention policy again (payment stage)**
4. Calculates: $10,000 → $4,000 retained, $6,000 released to exporter
5. Links payment to contract, shipment, LC, and forex
6. Contract status updated to "COMPLETED"

**Expected Output:**
```
✅ Payment recorded successfully
📊 Payment ID: TEST-PAY-xxx
📊 SWIFT Reference: SWIFT-xxx

💰 PAYMENT RETENTION BREAKDOWN:
   Total Amount:    $10000 USD
   Retention (40%): $4000 USD
   Release (60%):   $6000 USD
   Retention Rate:  40%

✅ ✓ 40% retention calculation CORRECT
✅ ✓ 60% release calculation CORRECT
✅ Database: Status = "RECEIVED"
✅ Database: Retention = $4000, Release = $6000
ℹ️  Contract final status: COMPLETED
```

**What Gets Created:**
- `payments` table: New payment with:
  - status → "RECEIVED"
  - retention_rate → 40
  - retention_amount → $4000
  - release_amount → $6000
  - SWIFT reference, dates, banks
- `contracts` table: status → "COMPLETED"
- Blockchain: Payment record with retention details
- `audit_logs` table: "RECORD_PAYMENT" action

**40% Retention Enforcement (Second Point):**
```typescript
// In PaymentService.recordPayment
const NBE_RETENTION_RATE = 40;
const retentionAmount = totalAmount * (NBE_RETENTION_RATE / 100); // 40%
const releaseAmount = totalAmount - retentionAmount;              // 60%
```

**Workflow Complete!** ✅

---

## Summary of Automatic Triggers

### Trigger 1: LC → Forex (STEP 3)
- **When:** LC is issued
- **What:** Forex request automatically created
- **How:** `LCService.triggerForexAutoRequest()`
- **Why:** Banks need forex allocation after LC issuance

### Trigger 2: Shipment → Quality (STEP 5)
- **When:** Shipment is created
- **What:** Quality inspection task automatically created
- **How:** `ShipmentService.createQualityInspectionTaskInternal()`
- **Why:** All shipments require quality inspection

### Trigger 3: Quality → Customs (STEP 6)
- **When:** Quality inspection is approved
- **What:** Customs declaration automatically created
- **How:** `ShipmentService.triggerCustomsDeclaration()`
- **Why:** Approved shipments need customs clearance

---

## 40% NBE Retention Policy Enforcement

### Enforcement Point 1: Forex Allocation (STEP 4)
**Location:** `ForexService.allocateForex()`
```typescript
const allocatedAmount = allocationData.amount;
const retentionRate = allocationData.retentionRate; // 40%
const retentionAmount = allocatedAmount * (retentionRate / 100);
const releaseAmount = allocatedAmount - retentionAmount;
```

**Database:** `forex_allocations`
- retention_rate: 40
- retention_amount: $4,000
- release_amount: $6,000

### Enforcement Point 2: Payment Recording (STEP 8)
**Location:** `PaymentService.recordPayment()`
```typescript
const NBE_RETENTION_RATE = 40;
const totalAmount = paymentData.amountUSD;
const retentionAmount = totalAmount * (NBE_RETENTION_RATE / 100);
const releaseAmount = totalAmount - retentionAmount;
```

**Database:** `payments`
- retention_rate: 40
- retention_amount: $4,000
- release_amount: $6,000

### Why Two Retention Points?
1. **Forex Stage:** NBE retains 40% of allocated forex
2. **Payment Stage:** NBE retains 40% of incoming payment
3. Both enforce the same policy at different workflow stages
4. Provides double verification and audit trail

---

## Verification Checklist

After running the test, verify:

### ✅ Database Records
```sql
-- Check contract
SELECT contract_id, status, approved_by FROM contracts WHERE contract_id = 'TEST-CONTRACT-xxx';

-- Check LC
SELECT lc_id, status, amount FROM letters_of_credit WHERE lc_id = 'TEST-LC-xxx';

-- Check forex with retention
SELECT forex_id, status, retention_amount, release_amount 
FROM forex_allocations WHERE forex_id = 'FOREX-xxx';

-- Check shipment
SELECT shipment_id, status FROM shipments WHERE shipment_id = 'TEST-SHIPMENT-xxx';

-- Check quality inspection (auto-created)
SELECT inspection_id, status FROM quality_inspections WHERE shipment_id = 'TEST-SHIPMENT-xxx';

-- Check customs declaration (auto-created)
SELECT declaration_id, status FROM customs_declarations WHERE shipment_id = 'TEST-SHIPMENT-xxx';

-- Check payment with retention
SELECT payment_id, status, retention_amount, release_amount 
FROM payments WHERE payment_id = 'TEST-PAY-xxx';
```

### ✅ Blockchain Records
- All entities should have `blockchain_tx_id`
- All status changes recorded immutably
- Retention details stored on blockchain

### ✅ Automatic Triggers
- Forex request created after LC ✅
- Quality task created after Shipment ✅
- Customs declaration created after Quality approval ✅

### ✅ 40% Retention
- Forex: $10,000 → $4,000 + $6,000 ✅
- Payment: $10,000 → $4,000 + $6,000 ✅

---

## Troubleshooting

### Test Fails at Step 1 (Register Contract)
- Check API server is running: `curl http://localhost:3001/api/health`
- Check database connection
- Check blockchain network status

### Test Fails at Step 3 (Forex Not Created)
- Check LCService logs for trigger execution
- Verify `triggerForexAutoRequest()` is called
- Check `forex_allocations` table for REQUESTED status

### Test Fails at Step 5 (Quality Task Not Created)
- Check ShipmentService logs
- Verify `createQualityInspectionTaskInternal()` is called
- Check `quality_inspections` table

### Test Fails at Step 6 (Customs Not Created)
- Check quality route logs for trigger
- Verify `triggerCustomsDeclaration()` is called
- Check `customs_declarations` table

### Retention Calculation Wrong
- Verify `retentionRate` parameter is 40
- Check service code for calculation logic
- Verify database columns: retention_amount, release_amount

---

## Manual Testing Alternative

If automated test fails, test manually:

```bash
# Step 1: Register Contract
curl -X POST http://localhost:3001/api/contracts/register \
  -H "Content-Type: application/json" \
  -d '{"contractID":"MANUAL-001", "exporterID":"EXP001", ...}'

# Step 2: Approve Contract
curl -X POST http://localhost:3001/api/contracts/MANUAL-001/approve \
  -H "Content-Type: application/json" \
  -d '{"approvedBy":"ecta_officer", "reason":"OK"}'

# Continue with remaining steps...
```

---

## Success Criteria

### ✅ All 8 Steps Pass
- Contract: Registered → Approved
- LC: Issued → Forex auto-created
- Forex: Allocated with 40% retention
- Shipment: Created → Quality auto-created
- Quality: Approved → Customs auto-created
- Customs: Cleared
- Payment: Recorded with 40% retention

### ✅ All Triggers Fire
- LC → Forex ✅
- Shipment → Quality ✅
- Quality → Customs ✅

### ✅ Retention Enforced
- Forex: 40% retained ✅
- Payment: 40% retained ✅

---

**Ready to test? Run:**
```bash
cd /home/guda/GoCBC/api
node tests/step-by-step-workflow-test.js
```

Good luck! 🚀
