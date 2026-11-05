# Complete Workflow Audit Trail Requirements

## Overview
This document specifies all audit log entries that MUST be captured for the complete business workflow from exporter license application to payment settlement.

## Complete Business Process Flow

### 1. Exporter License Application
**Entity Type:** `EXPORTER_APPLICATION` or `EXPORTER`
**Workflow:**
- ✅ **Application Submitted** → Status: PENDING (currently PostgreSQL only)
- ✅ **Application Approved** → Status: APPROVED
  - Chaincode: `RegisterExporter()` creates audit log with action `CREATE` for entity type `EXPORTER`
  - Location: `chaincodes/coffee/main.go` line 286
  - Actor: ECTAMSP (ECTA approves licenses)

**Missing:** Application submission audit log (only tracked in PostgreSQL, not blockchain)

---

### 2. Contract Registration & Approval
**Entity Type:** `CONTRACT`
**Workflow:**
- ✅ **Contract Registered** → Status: REGISTERED
  - Chaincode: `RegisterSalesContract()` and `RegisterSalesContractWithPaymentMethod()`
  - **NOW CREATES** audit log with action `REGISTER`
  - Location: `chaincodes/coffee/main.go` lines ~480 and ~670
  - Actor: ECTAMSP (ECTA registers contracts)
  
- ✅ **Contract Approved** → Status: APPROVED
  - Chaincode: `ApproveSalesContract()`
  - Creates audit log with action `APPROVE`
  - Location: `chaincodes/coffee/main.go` line 758
  - Actor: ECTAMSP (ECTA approves contracts)

---

### 3. Letter of Credit (LC) Lifecycle
**Entity Type:** `LC`
**Workflow:**
- ✅ **LC Requested** → Status: REQUESTED
  - Chaincode: `RequestLC()`
  - Creates audit log with action `CREATE`
  - Location: `chaincodes/coffee/banking.go` line 258
  - Actor: ECTAMSP (exporters not in consortium, ECTA facilitates)
  
- ✅ **LC Approved** → Status: APPROVED
  - Chaincode: `ApproveLCByBank()`
  - Creates audit log with action `APPROVE`
  - Location: `chaincodes/coffee/banking.go` line 375
  - **Expected Actor:** BanksMSP (banks approve LCs)
  
- ✅ **LC Issued** → Status: ISSUED
  - Chaincode: `IssueLCByBank()`
  - Creates audit log with action `ISSUE`
  - Location: `chaincodes/coffee/banking.go` line 460
  - **Expected Actor:** BanksMSP (banks issue LCs)

---

### 4. Forex Allocation
**Entity Type:** `FOREX`
**Workflow:**
- ✅ **Forex Requested** → Status: REQUESTED
  - Chaincode: `RequestForexAllocation()`
  - Creates audit log with action `REQUEST`
  - Location: `chaincodes/coffee/forex.go` line 160
  - Actor: ECTAMSP (exporters not in consortium)
  
- ✅ **Forex Allocated** → Status: ALLOCATED
  - Chaincode: `AllocateForex()`
  - Creates audit log with action `ALLOCATE`
  - Location: `chaincodes/coffee/forex.go` line 349
  - **Expected Actor:** NBEMSP or BanksMSP (NBE/banks allocate forex)

---

### 5. Shipment Tracking
**Entity Type:** `SHIPMENT`
**Workflow:**
- ✅ **Shipment Created** → Status: CREATED
  - Chaincode: `CreateShipment()`
  - Creates audit log with action `CREATE`
  - Location: `chaincodes/coffee/main.go` line 1468
  - Actor: ECTAMSP (exporters initiate shipments via ECTA)
  
- ✅ **Shipment Status Updates** → Various statuses
  - Chaincode: `UpdateShipmentStatus()`
  - Creates audit log with action `UPDATE`
  - Location: `chaincodes/coffee/main.go` line 1557
  - **Expected Actor:** ShippingMSP (shipping company handles logistics)
  
- ✅ **Delivery Confirmed** → Status: DELIVERED
  - Chaincode: `ConfirmDelivery()`
  - Creates audit log with action `DELIVERY_CONFIRMED`
  - Location: `chaincodes/coffee/main.go` line 2394
  - **Expected Actor:** ShippingMSP (shipping company confirms delivery)

---

### 6. Payment Settlement
**Entity Type:** `PAYMENT`
**Workflow:**
- ✅ **Payment Initiated** → Status: PENDING/INITIATED
  - Chaincode: `InitiatePayment()`
  - Creates audit log with action `CREATE`
  - Location: `chaincodes/coffee/payment.go` line 444
  - **Expected Actor:** BanksMSP (banks initiate payments)
  
- ✅ **Documents Submitted** → Status: DOCUMENTS_SUBMITTED
  - Chaincode: `SubmitPaymentDocuments()`
  - Creates audit log with action `SUBMIT`
  - Location: `chaincodes/coffee/payment.go` line 532
  - Actor: ECTAMSP (exporter via ECTA)
  
- ✅ **Documents Verified** → Status: VERIFIED
  - Chaincode: `VerifyPaymentDocuments()`
  - Creates audit log with action `VERIFY`
  - Location: `chaincodes/coffee/payment.go` line 628
  - **Expected Actor:** BanksMSP (banks verify documents)
  
- ✅ **Payment Settled** → Status: SETTLED
  - Chaincode: `SettlePayment()`
  - Creates audit log with action `SETTLE`
  - Location: `chaincodes/coffee/payment.go` line 821
  - **Expected Actor:** NBEMSP or BanksMSP (NBE settles forex repatriation)

---

## UI Timeline Display Requirements

The `BusinessActivityTimeline` component (`ui/src/components/documents/BusinessActivityTimeline.tsx`) MUST:

1. **Fetch all 6 entity types** when viewing an LC or Forex:
   - ✅ EXPORTER (exporter license)
   - ✅ CONTRACT (registration & approval)
   - ✅ LC (request, approval, issuance)
   - ✅ FOREX (request, allocation)
   - ✅ SHIPMENT (creation, tracking, delivery)
   - ✅ PAYMENT (initiation, verification, settlement)

2. **Display in chronological order** (earliest first)

3. **Show correct actor information:**
   - Actor name (e.g., "Admin@ecta.cecbs.et")
   - MSP organization (e.g., "ECTAMSP")
   - Role indicator (e.g., "admin")

4. **Indicate violations** when actual actor ≠ expected actor:
   - Simple chip: "Expected: BanksMSP"
   - One-time notice at top: "X action(s) performed by non-standard organization"
   - NO verbose violation boxes per item

5. **Show status transitions:**
   - Display old status → new status where applicable
   - Examples:
     - "REQUESTED → APPROVED"
     - "APPROVED → ISSUED"
     - "ALLOCATED"

6. **Action labels** must be user-friendly:
   - CREATE → "Created"
   - REGISTER → "Registered"
   - APPROVE → "Approved"
   - ALLOCATE → "Allocated"
   - etc.

---

## Recent Code Changes

### Chaincode Updates (v1.86)
1. ✅ **Added audit logs for contract registration**
   - File: `chaincodes/coffee/main.go`
   - Functions: `RegisterSalesContract()` and `RegisterSalesContractWithPaymentMethod()`
   - Action: `REGISTER`
   - Entity Type: `CONTRACT`

### UI Updates
1. ✅ **Expanded timeline to fetch all 6 entity types**
   - File: `ui/src/components/documents/BusinessActivityTimeline.tsx`
   - Fetches: EXPORTER, CONTRACT, LC, FOREX, SHIPMENT, PAYMENT

2. ✅ **Added expected organization logic for all entity types**
   - EXPORTER_APPLICATION: ECTAMSP
   - CONTRACT: ECTAMSP
   - LC: ECTAMSP (request), BanksMSP (approve/issue)
   - FOREX: ECTAMSP (request), NBEMSP/BanksMSP (allocate)
   - SHIPMENT: ECTAMSP (create), ShippingMSP (ship/deliver)
   - CUSTOMS_DECLARATION: CustomsMSP
   - PAYMENT: BanksMSP (initiate/verify), NBEMSP/BanksMSP (settle)

3. ✅ **Simplified violation display**
   - Removed verbose UCP 600 violation boxes
   - Simple chip: "Expected: BanksMSP"
   - One-time top notice

---

## Deployment Steps

1. **Deploy updated chaincode (v1.86):**
   ```bash
   ./deploy-chaincode.sh
   ```

2. **Rebuild and restart UI:**
   ```bash
   cd ui && npm run build
   # Restart UI server
   ```

3. **Test with existing data:**
   - View LC detail page
   - Verify timeline shows all workflow steps
   - Check violations are displayed correctly

4. **Create new test data with correct actors:**
   - Use proper blockchain identities (BanksMSP for bank operations)
   - Verify no violations appear
   - Confirm complete workflow is tracked

---

## Known Issues

### Historical Data Violations
- Existing test data shows ECTAMSP performing all operations
- This is immutable blockchain data (historical violations)
- Violations correctly identified with "Expected: BanksMSP" indicators
- RBAC now prevents future violations at API level

### Missing Coverage
- ❌ Exporter application submission not tracked on blockchain (only PostgreSQL)
  - Consider adding blockchain audit log when application is submitted
  - Currently only EXPORTER registration (approval) creates blockchain audit log

---

## Verification Checklist

When viewing LC or Forex detail page, the timeline MUST show:

- [ ] Exporter license creation (if available)
- [ ] Contract registration (REGISTER action)
- [ ] Contract approval (APPROVE action)
- [ ] LC request (CREATE/REQUEST action)
- [ ] LC approval (APPROVE action)
- [ ] LC issuance (ISSUE action)
- [ ] Forex request (REQUEST action, if applicable)
- [ ] Forex allocation (ALLOCATE action, if applicable)
- [ ] Shipment creation (CREATE action, if applicable)
- [ ] Shipment updates (UPDATE action, if applicable)
- [ ] Payment initiation (CREATE action, if applicable)
- [ ] Payment settlement (SETTLE action, if applicable)

Expected actors:
- [ ] ECTAMSP for: Exporter registration, Contract registration/approval, LC request, Forex request, Shipment creation
- [ ] BanksMSP for: LC approval/issuance, Payment initiation/verification
- [ ] NBEMSP for: Forex allocation, Payment settlement
- [ ] ShippingMSP for: Shipment tracking/delivery
- [ ] CustomsMSP for: Customs declarations

Violation indicators:
- [ ] Simple "Expected: [MSP]" chip on non-compliant actions
- [ ] Top-level notice showing count of non-compliant actions
- [ ] NO verbose UCP 600 violation boxes

Status transitions:
- [ ] Shows old status → new status (e.g., "REQUESTED → APPROVED")
- [ ] Timestamp displayed correctly
- [ ] Action labels are user-friendly

---

## Next Steps

1. ✅ Deploy chaincode v1.86 with contract registration audit logs
2. ⏳ Restart API and UI servers
3. ⏳ Test complete workflow display with existing data
4. ⏳ Create new test data with proper actors to demonstrate compliance
5. ⏳ Verify RBAC blocks unauthorized operations (HTTP 403)
6. 🔄 Consider adding EXPORTER_APPLICATION blockchain audit logs for completeness
