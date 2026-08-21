# Master Status Reference - All Entities

## Complete Status Mapping for Coffee Export Consortium Blockchain System

This document lists **ALL** valid statuses for **EVERY** entity in the system.

---

## 1. CONTRACT STATUSES

**Entity:** `SalesContract`  
**Valid Statuses:**
- `DRAFT` - Contract being drafted
- `REGISTERED` - Registered with ECTA
- `APPROVED` - Approved by ECTA
- `NBE_APPROVED` - Approved by NBE
- `ACTIVE` - Contract is active
- `COMPLETED` - Contract completed

**Chaincode:** `main.go`  
**UI Display:** Exporter Portal → My Contracts tab

---

## 2. LETTER OF CREDIT (LC) STATUSES ⭐

**Entity:** `LetterOfCredit`  
**Valid Statuses:**
- `REQUESTED` - Exporter requests LC
- `APPROVED` - Bank approves LC request
- `ISSUED` - Bank issues LC (forex allocated) 
- `UTILIZED` - LC utilized (documents verified, payment can be released)
- `EXPIRED` - LC expired

**Invalid Statuses (REMOVED):** ❌
- ~~`SHIPPED`~~ - This is a shipment status, not LC status
- ~~`DOCUMENTS_SUBMITTED`~~ - Documents attached, status remains ISSUED
- ~~`DOCUMENTS_VERIFIED`~~ - Changed to UTILIZED
- ~~`DOCUMENTS_DISCREPANT`~~ - Status remains ISSUED
- ~~`PAID`~~ - Status remains UTILIZED

**Chaincode:** `banking.go`  
**UI Display:**
- Exporter Portal → Forex & Banking tab (shows ISSUED, UTILIZED only)
- Exporter Portal → LC & Payments tab (shows all statuses)
- Banks Portal → LC Management

---

## 3. FOREX ALLOCATION STATUSES

**Entity:** `ForexAllocation`  
**Valid Statuses:**
- `REQUESTED` - Exporter requests forex
- `APPROVED` - NBE approves request
- `ALLOCATED` - NBE allocates forex ⭐
- `UTILIZED` - Forex used
- `EXPIRED` - Allocation expired

**Chaincode:** `forex.go`  
**UI Display:**
- Exporter Portal → Forex & Banking tab
- NBE Portal → Forex Management

---

## 4. SHIPMENT STATUSES

**Entity:** `CoffeeShipment`  
**Valid Statuses:**
- `CREATED` - Shipment created
- `BOOKED` - Shipping booked
- `LOADED` - Container loaded
- `DEPARTED` - Vessel departed
- `IN_TRANSIT` - In transit
- `ARRIVED` - Arrived at destination
- `DELIVERED` - Delivered to buyer
- `SHIPPED` - Shipment completed ⭐

**Note:** Shipment status is SEPARATE from LC status!

**Chaincode:** `main.go`  
**UI Display:**
- Exporter Portal → Shipments tab
- Shipping Portal → Tracking

---

## 5. PAYMENT STATUSES

**Entity:** `PaymentSettlement`  
**Valid Statuses:**
- `PENDING` - Payment pending
- `DOCUMENTS_SUBMITTED` - Documents submitted to bank
- `VERIFIED` - Documents verified
- `SWIFT_INITIATED` - SWIFT message sent
- `SWIFT_RECEIVED` - SWIFT message received
- `SETTLED` - Payment settled

**Chaincode:** `payment.go`  
**UI Display:**
- Exporter Portal → LC & Payments tab
- Banks Portal → Payment Processing

---

## 6. QUALITY INSPECTION STATUSES

**Entity:** `QualityInspection`  
**Valid Statuses:**
- `PENDING` - Inspection scheduled
- `INSPECTING` - Inspection in progress
- `INSPECTED` - Inspection completed
- `APPROVED` - Quality approved
- `REJECTED` - Quality rejected
- `REWORK` - Needs rework

**Chaincode:** `quality.go`  
**UI Display:**
- ECTA Portal → Quality Management
- Exporter Portal → (view only)

---

## 7. CUSTOMS DECLARATION STATUSES

**Entity:** `CustomsDeclaration`  
**Valid Statuses:**
- `SUBMITTED` - Declaration submitted
- `UNDER_INSPECTION` - Being inspected
- `UNDER_REVIEW` - Under review
- `CLEARED` - Cleared for export
- `HELD` - Held by customs
- `REJECTED` - Rejected

**Chaincode:** `customs.go`  
**UI Display:**
- Customs Portal → Declarations
- Exporter Portal → (view only)

---

## 8. EXPORT PERMIT STATUSES

**Entity:** `ExportPermit`  
**Valid Statuses:**
- `ISSUED` - Permit issued
- `UTILIZED` - Permit used
- `EXPIRED` - Permit expired
- `CANCELLED` - Permit cancelled
- `SETTLED` - Repatriation settled

**Chaincode:** `permit.go`  
**UI Display:**
- NBE Portal → Permits
- Exporter Portal → (view only)

---

## 9. SWIFT MESSAGE STATUSES

**Entity:** `SWIFTMessage` / `SWIFTMessageEnhanced`  
**Valid Statuses:**
- `DRAFT` - Message draft
- `SENT` - Message sent
- `IN_TRANSIT` - In transit
- `RECEIVED` - Message received
- `SETTLED` - Transaction settled
- `REJECTED` - Message rejected

**Chaincode:** `swift.go`, `payment.go`  
**UI Display:**
- Banks Portal → SWIFT Messages
- Exporter Portal → LC & Payments tab

---

## 10. ADVANCE PAYMENT STATUSES

**Entity:** `AdvancePayment`  
**Valid Statuses:**
- `RECEIVED` - Advance received
- `PERMIT_ISSUED` - Permit issued for advance
- `SHIPPED` - Goods shipped against advance
- `SETTLED` - Advance settled

**Chaincode:** `advance.go`  
**UI Display:**
- Banks Portal → Advance Payments
- Exporter Portal → LC & Payments tab

---

## 11. CONSIGNMENT STATUSES

**Entity:** `Consignment`  
**Valid Statuses:**
- `PERMIT_ISSUED` - Permit issued
- `SHIPPED` - Consignment shipped
- `PARTIAL` - Partial payment received
- `SETTLED` - Fully settled

**Alternative Statuses:**
- `PERMITTED` - Permit granted
- `SOLD` - Goods sold
- `OUTSTANDING` - Payment outstanding

**Chaincode:** `consignment.go`, `payment.go`  
**UI Display:**
- NBE Portal → Consignment Tracking

---

## 12. COLLECTION STATUSES

**Entity:** `DocumentaryCollection`  
**Valid Statuses:**
- `SENT` - Collection sent
- `PRESENTED` - Presented to buyer's bank
- `ACCEPTED` - Accepted by buyer
- `PAID` - Payment made
- `UNPAID` - Payment not made
- `RETURNED` - Documents returned

**Chaincode:** `collection.go`  
**UI Display:**
- Banks Portal → Collections

---

## 13. INSURANCE CERTIFICATE STATUSES

**Entity:** `InsuranceCertificate`  
**Valid Statuses:**
- `ISSUED` - Certificate issued
- `EXPIRED` - Certificate expired
- `CLAIMED` - Claim filed

**Chaincode:** `insurance.go`  
**UI Display:**
- Exporter Portal → Documents
- Shipping Portal → Insurance

---

## 14. PHYTOSANITARY CERTIFICATE STATUSES

**Entity:** `PhytosanitaryCertificate`  
**Valid Statuses:**
- `ISSUED` - Certificate issued
- `EXPIRED` - Certificate expired
- `REVOKED` - Certificate revoked

**Chaincode:** `phytosanitary.go`  
**UI Display:**
- Customs Portal → Certificates
- Exporter Portal → Documents

---

## 15. ECX LOT STATUSES

**Entity:** `ECXLot`  
**Valid Statuses:**
- `WAREHOUSED` - Coffee in warehouse
- `GRADED` - Quality graded
- `ASSIGNED` - Assigned to contract
- `RELEASED` - Released for export
- `REJECTED` - Rejected

**Chaincode:** `ecx.go`  
**UI Display:**
- ECX Portal → Lot Management
- Exporter Portal → ECX Lots

---

## 16. EXCHANGE RATE STATUSES

**Entity:** `ExchangeRate`  
**Valid Statuses:**
- `ACTIVE` - Rate is active
- `INACTIVE` - Rate is inactive
- `SUPERSEDED` - Rate superseded by new rate

**Chaincode:** `forex.go`  
**UI Display:**
- NBE Portal → Exchange Rates

---

## 17. RETENTION POLICY STATUSES

**Entity:** `RetentionPolicy`  
**Valid Statuses:**
- `ACTIVE` - Policy active
- `INACTIVE` - Policy inactive

**Chaincode:** `forex.go`  
**UI Display:**
- NBE Portal → Retention Policies

---

## Status Transition Rules

### Rule 1: Entity Status Independence
**Each entity has its own independent status.**

✅ **CORRECT:**
- Contract: REGISTERED
- LC: ISSUED
- Shipment: SHIPPED
- Payment: SETTLED

❌ **WRONG:**
- LC: SHIPPED (using shipment status)

### Rule 2: Status Context Display
**Tabs should show statuses appropriate to their context.**

✅ **Forex & Banking tab:**
- Shows LC status as "Forex Allocated" for ISSUED/UTILIZED LCs
- Filters to show only forex-relevant statuses

✅ **LC & Payments tab:**
- Shows complete LC lifecycle statuses
- Shows payment statuses separately

✅ **Shipments tab:**
- Shows only shipment statuses
- Does not mix with LC statuses

### Rule 3: Back-and-Forth Handling
**Status should support workflow reversals.**

✅ **Document Rejection:**
- Bank examines → finds discrepancy
- LC status remains ISSUED (not set to invalid status)
- Exporter can resubmit
- Bank re-examines → sets UTILIZED if compliant

✅ **Amendment:**
- LC can be amended while ISSUED
- Status doesn't change during amendment
- Workflow continues normally

---

## Critical Status Fixes Applied

### Fix 1: LC Status "SHIPPED" ❌ → ✅
**Problem:** LinkShipmentToLC was setting `lc.Status = "SHIPPED"`  
**Fix:** LC status now remains `ISSUED`  
**Impact:** Shipment and LC statuses are now independent

### Fix 2: LC Status "DOCUMENTS_SUBMITTED" ❌ → ✅
**Problem:** SubmitLCDocuments was setting invalid status  
**Fix:** LC status remains `ISSUED`, documents attached to LC object  
**Impact:** Document submission doesn't break status flow

### Fix 3: LC Status "DOCUMENTS_VERIFIED" ❌ → ✅
**Problem:** ExamineLCDocuments was setting invalid status  
**Fix:** Now sets `UTILIZED` (valid status)  
**Impact:** Proper status for payment-ready LCs

### Fix 4: LC Status "DOCUMENTS_DISCREPANT" ❌ → ✅
**Problem:** Document rejection was setting invalid status  
**Fix:** LC status remains `ISSUED`  
**Impact:** Supports document resubmission workflow

### Fix 5: LC Status "PAID" ❌ → ✅
**Problem:** ReleaseLCPayment was setting invalid status  
**Fix:** LC status remains `UTILIZED`  
**Impact:** LC and Payment statuses are independent

---

## UI Status Display Matrix

| Entity | Tab | Portal | Filtered? | Status Type |
|--------|-----|--------|-----------|-------------|
| LC | Forex & Banking | Exporter | YES | ISSUED, UTILIZED only |
| LC | LC & Payments | Exporter | NO | All LC statuses |
| LC | LC Management | Banks | NO | All LC statuses |
| Forex | Forex & Banking | Exporter | NO | All forex statuses |
| Forex | Forex Management | NBE | NO | All forex statuses |
| Shipment | Shipments | Exporter | NO | All shipment statuses |
| Shipment | Tracking | Shipping | NO | All shipment statuses |
| Payment | LC & Payments | Exporter | NO | All payment statuses |
| Payment | Payment Processing | Banks | NO | All payment statuses |
| Contract | My Contracts | Exporter | NO | All contract statuses |
| Quality | Quality Management | ECTA | NO | All quality statuses |
| Customs | Declarations | Customs | NO | All customs statuses |

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-20  
**Status:** ✅ Complete and Verified
