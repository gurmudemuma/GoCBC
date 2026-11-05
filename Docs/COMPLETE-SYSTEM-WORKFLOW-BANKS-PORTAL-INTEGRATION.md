# 🌐 COMPLETE SYSTEM WORKFLOW - BANKS PORTAL INTEGRATION

## ✅ DEFINITIVE LC STATUS FLOW ACROSS ALL PORTALS

**Date:** September 18, 2026  
**Analysis:** Complete multi-portal LC lifecycle from chaincode to UI  
**Source:** Blockchain chaincode validation + All portal implementations

---

## 📊 LC STATUS OWNERSHIP BY PORTAL

### **Valid LC Statuses (From Chaincode - banking.go:519-523)**
```go
validStatuses := map[string]bool{
    "REQUESTED": true,       // Exporter creates → Bank reviews
    "APPROVED": true,        // Bank approves → Ready for issuance
    "ISSUED": true,          // Bank issues → Ready for forex
    "FOREX_ALLOCATED": true, // Forex allocated → Ready for shipment
    "UTILIZED": true,        // Docs verified → Ready for payment
    "PAYMENT_RELEASED": true,// Payment released → Ready for settlement
    "SETTLED": true,         // Settlement complete → FINAL STATE
    "EXPIRED": true,         // Manual expiration
}
```

---

## 🔄 COMPLETE MULTI-PORTAL WORKFLOW

```
┌─────────────────────────────────────────────────────────────────┐
│  EXPORTER PORTAL (ECTAPortal.tsx)                               │
│  ════════════════════════════════════════════════════════════   │
│  Role: LC REQUEST INITIATOR                                     │
└─────────────────────────────────────────────────────────────────┘
│
├─► 1. Exporter selects approved contract
│      Contract Status: NBE_APPROVED or APPROVED
│
├─► 2. System creates LC request
│      API: POST /api/v1/banking/lc/request
│      MSP: Connects as ECTAMSP (line 147 banking.ts)
│      Chaincode: RequestLC() (line 78 banking.go)
│      
│      ┌─────────────────────────────┐
│      │ LC STATUS: REQUESTED        │  ← CREATED BY EXPORTER
│      └─────────────────────────────┘
│
│      Auto-mapping:
│      - exporterID from contract
│      - amount & currency from contract
│      - issuingBank = contract.BuyerBank
│      - advisingBank = contract.ExporterBank
│
└──────► LC now visible in BANKS PORTAL

┌─────────────────────────────────────────────────────────────────┐
│  BANKS PORTAL - TAB 0: Payment Methods                          │
│  ════════════════════════════════════════════════════════════   │
│  Role: LC APPROVAL & ISSUANCE                                   │
└─────────────────────────────────────────────────────────────────┘
│
├─► 3. Bank reviews LC request
│      Current Status: REQUESTED
│      Filter: lc.status === 'REQUESTED'
│      UI: Shows in pending approval queue
│
├─► 4. Bank APPROVES LC
│      Button: "Approve LC"
│      API: POST /api/v1/banking/lc/:lcID/approve
│      MSP: Connects as BanksMSP (line 253 banking.ts)
│      Chaincode: ApproveLC() (line 270 banking.go)
│      Validation: Must be in REQUESTED status (line 298)
│      
│      ┌─────────────────────────────┐
│      │ LC STATUS: APPROVED         │  ← UPDATED BY BANK
│      └─────────────────────────────┘
│      
│      Records: ApprovedBy, ApprovedByMSP (X.509 cert)
│      Note: Does NOT auto-allocate forex (manual step)
│
├─► 5. Bank ISSUES LC
│      Button: "Issue LC"
│      API: POST /api/v1/banking/lc/:lcID/issue
│      MSP: BanksMSP
│      Chaincode: IssueLC() (line 386 banking.go)
│      Validation: Must be in APPROVED status (line 416)
│      
│      ┌─────────────────────────────┐
│      │ LC STATUS: ISSUED           │  ← UPDATED BY BANK
│      └─────────────────────────────┘
│      
│      Records: IssuedBy, IssuedByMSP (X.509 cert)
│      Side Effect: Auto-creates forex request on blockchain
│
└──────► LC moves to TAB 1: Forex Allocations

┌─────────────────────────────────────────────────────────────────┐
│  BANKS PORTAL - TAB 1: Forex Allocations                        │
│  ════════════════════════════════════════════════════════════   │
│  Role: FOREX ALLOCATION                                         │
└─────────────────────────────────────────────────────────────────┘
│
├─► 6. Bank allocates forex
│      Current Status: ISSUED
│      Filter: lc.status === 'ISSUED'
│      Button: "Allocate Forex"
│      Chaincode: AllocateForex() (forex.go:408)
│      Validation: Must be ISSUED or FOREX_REQUESTED (line 414)
│      
│      ┌─────────────────────────────┐
│      │ LC STATUS: FOREX_ALLOCATED  │  ← UPDATED BY BANK
│      └─────────────────────────────┘
│      
│      Side Effect: Automatically updates LC status
│      NBE Policy: 50% retention rate applied
│
└──────► Exporter can now create shipment

┌─────────────────────────────────────────────────────────────────┐
│  EXPORTER PORTAL - Shipment Creation                            │
│  ════════════════════════════════════════════════════────────   │
│  Role: SUBMIT SHIPPING DOCUMENTS                                │
└─────────────────────────────────────────────────────────────────┘
│
├─► 7. Exporter creates shipment
│      Current LC Status: FOREX_ALLOCATED
│      Uploads documents:
│      - Bill of Lading
│      - Packing List
│      - Phytosanitary Certificate
│      - Certificate of Origin
│      - Commercial Invoice
│      - Quality Certificate
│
│      Documents entity_type: 'SHIPMENT', 'LC', 'CONTRACT', 'CUSTOMS'
│      Document status: 'uploaded' or 'submitted'
│
└──────► Documents now visible in BANKS PORTAL TAB 2

┌─────────────────────────────────────────────────────────────────┐
│  BANKS PORTAL - TAB 2: Document Examination                     │
│  ════════════════════════════════════════════════════════════   │
│  Role: DOCUMENT VERIFICATION                                    │
└─────────────────────────────────────────────────────────────────┘
│
├─► 8. Bank examines ALL documents
│      Current Status: FOREX_ALLOCATED
│      Filter: lc.status in ['ISSUED', 'FOREX_ALLOCATED', 'DOCUMENTS_SUBMITTED']
│      UI: Shows LCs with uploaded documents
│
├─► 9. Bank verifies each document
│      Button: "Examine Documents" → Dialog opens
│      Shows ALL document types:
│      - LC Documents (2)
│      - Contract Documents (4)
│      - Shipment Documents (3)
│      - Customs Documents (3)
│
│      For each document:
│      Button: "Approve" or "Reject"
│      API: POST /api/v1/documents/:documentID/verify
│      Body: { verified: true/false, remarks: "..." }
│      Blockchain: SignDocument() creates cryptographic signature
│
│      Blockchain Signature Records:
│      - SignatureID: SIG_{docID}_{mspID}_{timestamp}
│      - Signer X.509 certificate hash
│      - Document hash (SHA-256)
│      - Signature type: VERIFY or REJECT
│      - Immutable audit trail
│
├─► 10. After ALL documents verified
│      Chaincode: ExamineLCDocuments() (line 940 banking.go)
│      Validation: Must be ISSUED or FOREX_ALLOCATED (line 966)
│      Condition: compliant == "true"
│      
│      ┌─────────────────────────────┐
│      │ LC STATUS: UTILIZED         │  ← UPDATED BY BANK
│      └─────────────────────────────┘
│      
│      Meaning: All documents verified and compliant
│      Ready for: Payment release
│
│      If discrepant:
│      - Status remains FOREX_ALLOCATED
│      - Exporter must resubmit documents
│
└──────► LC moves to TAB 3: Payment Release

┌─────────────────────────────────────────────────────────────────┐
│  BANKS PORTAL - TAB 3: Payment Release                          │
│  ════════════════════════════════════════════════════════════   │
│  Role: PAYMENT AUTHORIZATION                                    │
└─────────────────────────────────────────────────────────────────┘
│
├─► 11. Bank releases payment
│      Current Status: UTILIZED
│      Filter: lc.status in ['UTILIZED', 'DOCUMENTS_COMPLIANT', 'READY_FOR_PAYMENT']
│      UI: Shows LCs with all documents verified
│
├─► 12. Bank officer clicks "Release Payment"
│      Button: "Release Payment"
│      Confirmation dialog shown
│      API: POST /api/v1/banking/lc/:lcID/release-payment
│      MSP: BanksMSP
│      Chaincode: ReleaseLCPayment() (line 1009 banking.go)
│      Validation: Must be in UTILIZED status (line 1051)
│      
│      ┌─────────────────────────────┐
│      │ LC STATUS: PAYMENT_RELEASED │  ← UPDATED BY BANK
│      └─────────────────────────────┘
│      
│      Side Effects:
│      - Creates Payment entity: PAY_{lcID}
│      - Payment status: VERIFIED (docs already verified)
│      - Records releasedBy, releasedByMSP
│      - Blockchain signature created
│
└──────► LC moves to TAB 5: LC Settlements

┌─────────────────────────────────────────────────────────────────┐
│  SHIPPING/LOGISTICS - Shipment Delivery                         │
│  ════════════════════════════════════════════════════════════   │
│  Role: GOODS DELIVERY                                           │
└─────────────────────────────────────────────────────────────────┘
│
├─► 13. Shipment delivered
│      Shipment status: DELIVERED or COMPLETED
│      Customs clearance: Completed
│      Goods: Received by buyer
│
└──────► Ready for final settlement

┌─────────────────────────────────────────────────────────────────┐
│  BANKS PORTAL - TAB 5: LC Settlements                           │
│  ════════════════════════════════────────────────════════════   │
│  Role: FINAL SETTLEMENT                                         │
└─────────────────────────────────────────────────────────────────┘
│
├─► 14. Settlement processing
│      Current LC Status: PAYMENT_RELEASED
│      Current Shipment Status: DELIVERED
│      Filter: shipment.status === 'DELIVERED' AND lc.status === 'PAYMENT_RELEASED'
│      
│      UI: PostDeliveryWorkflowPanel
│      Actions:
│      - Update customs clearance
│      - Record payment settlement via SWIFT
│      - Complete LC settlement
│
├─► 15. Payment settled
│      API: POST /api/v1/payments/:paymentID/settle
│      Chaincode: SettlePayment() (payment.go:658)
│      Validation: Payment must be SWIFT_RECEIVED or VERIFIED (line 690)
│      
│      CASCADE TO LC:
│      Chaincode: payment.go:777-795
│      Condition: payment.LCID != "" AND lc.Status == "PAYMENT_RELEASED"
│      
│      ┌─────────────────────────────┐
│      │ LC STATUS: SETTLED          │  ← FINAL STATE
│      └─────────────────────────────┘
│      
│      LC Lifecycle: COMPLETE ✅
│
└──────► Transaction complete

┌─────────────────────────────────────────────────────────────────┐
│  NBE PORTAL (Monitoring Only)                                   │
│  ════════════════════════════════════════════════════════════   │
│  Role: FOREX MONITORING & COMPLIANCE                            │
└─────────────────────────────────────────────────────────────────┘
│
├─► NBE monitors LCs indirectly via:
│   - Forex allocation requests
│   - Contract approval (enables LC issuance)
│   - Exchange rate compliance
│   - 50% retention policy enforcement
│
└─► NBE does NOT update LC status directly
```

---

## 📋 STATUS RESPONSIBILITY MATRIX

| LC Status | Created By | Updated By | Portal Tab | Chaincode Function | Validation |
|-----------|-----------|------------|------------|-------------------|------------|
| `REQUESTED` | **Exporter** (via ECTA) | - | - | RequestLC() | Contract must be approved |
| `APPROVED` | - | **Bank** | Tab 0: Payment Methods | ApproveLC() | Must be REQUESTED |
| `ISSUED` | - | **Bank** | Tab 0: Payment Methods | IssueLC() | Must be APPROVED |
| `FOREX_ALLOCATED` | - | **Bank** (automatic) | Tab 1: Forex Allocations | AllocateForex() | Must be ISSUED |
| `UTILIZED` | - | **Bank** | Tab 2: Document Examination | ExamineLCDocuments() | Must be ISSUED/FOREX_ALLOCATED |
| `PAYMENT_RELEASED` | - | **Bank** | Tab 3: Payment Release | ReleaseLCPayment() | Must be UTILIZED |
| `SETTLED` | - | **Bank** (automatic cascade) | Tab 5: LC Settlements | SettlePayment() | Must be PAYMENT_RELEASED |
| `EXPIRED` | - | **Bank** (manual) | Any tab | UpdateLCStatus() | Manual update |

---

## 🔍 STATUS FILTERING BY TAB

### Tab 0: Payment Methods (LC Request & Approval)
**Shows:**
- `REQUESTED` - Pending approval
- `APPROVED` - Ready for issuance
- ALL statuses (for viewing history)

**Actions:**
- Approve LC: `REQUESTED` → `APPROVED`
- Issue LC: `APPROVED` → `ISSUED`

---

### Tab 1: Forex Allocations
**Shows:**
- `ISSUED` - Needs forex allocation
- `FOREX_ALLOCATED` - Forex already allocated

**Actions:**
- Allocate Forex: `ISSUED` → `FOREX_ALLOCATED` (automatic status update)

---

### Tab 2: Document Examination
**Shows:**
- `ISSUED` - Has uploaded documents, pending examination
- `FOREX_ALLOCATED` - Has uploaded documents, pending examination
- `DOCUMENTS_SUBMITTED` - (UI reference, not used in chaincode)
- `UTILIZED` - Documents already verified (historical view)
- `DOCUMENTS_COMPLIANT` - (UI reference, equivalent to UTILIZED)

**Actions:**
- Examine Documents: View all documents
- Approve/Reject Each Document: Creates blockchain signatures
- After all verified: `FOREX_ALLOCATED` → `UTILIZED` (automatic)

---

### Tab 3: Payment Release
**Shows:**
- `UTILIZED` - Documents verified, ready for payment
- `DOCUMENTS_COMPLIANT` - (UI reference, equivalent to UTILIZED)
- `READY_FOR_PAYMENT` - (UI reference, equivalent to UTILIZED)
- `FOREX_ALLOCATED` - IF all documents manually verified

**Actions:**
- Release Payment: `UTILIZED` → `PAYMENT_RELEASED`

---

### Tab 4: SWIFT Messages
**Shows:** ALL LCs (for SWIFT messaging)
**Actions:** Send SWIFT messages (MT700, MT710, MT740, MT760)

---

### Tab 5: LC Settlements
**Shows:**
- `PAYMENT_RELEASED` - Payment released, awaiting settlement
- `SETTLED` - Already settled (historical view)

**Condition:** BOTH of:
1. LC status: `PAYMENT_RELEASED` or `SETTLED`
2. Shipment status: `DELIVERED` or `COMPLETED`

**Actions:**
- Settlement processing via PostDeliveryWorkflowPanel
- After settlement: `PAYMENT_RELEASED` → `SETTLED` (automatic cascade)

---

## ⚠️ STATUS MISMATCHES RESOLVED

### Issue 1: DOCUMENTS_SUBMITTED Not Set By Chaincode
**UI Checks For:** `DOCUMENTS_SUBMITTED`  
**Chaincode Sets:** Keeps status as `ISSUED` or `FOREX_ALLOCATED`  
**Resolution:** Documents tracked via `lc.Documents` array, not status  
**Action:** UI should check for uploaded documents, not status

### Issue 2: DOCUMENTS_COMPLIANT Not in Valid Status List
**UI Checks For:** `DOCUMENTS_COMPLIANT`  
**Chaincode Uses:** `UTILIZED`  
**Resolution:** `UTILIZED` = documents compliant  
**Action:** UI should use `UTILIZED` instead of `DOCUMENTS_COMPLIANT`

### Issue 3: READY_FOR_PAYMENT Not Defined
**UI Checks For:** `READY_FOR_PAYMENT`  
**Chaincode Uses:** `UTILIZED`  
**Resolution:** `UTILIZED` = ready for payment  
**Action:** UI should use `UTILIZED` instead of `READY_FOR_PAYMENT`

---

## ✅ CORRECT BANKS PORTAL TAB FILTERS

### Current Implementation Issues:

**Tab 2 Filter (Line 659):**
```typescript
// CURRENT (Has extra statuses not in chaincode)
if (!['ISSUED', 'FOREX_ALLOCATED', 'DOCUMENTS_SUBMITTED', 'UTILIZED', 'DOCUMENTS_COMPLIANT'].includes(lc.status))

// SHOULD BE (Only chaincode-valid statuses)
if (!['ISSUED', 'FOREX_ALLOCATED', 'UTILIZED'].includes(lc.status))
```

**Tab 3 Filter (Line 666):**
```typescript
// CURRENT (Has extra statuses)
if (!['UTILIZED', 'DOCUMENTS_COMPLIANT', 'READY_FOR_PAYMENT', 'FOREX_ALLOCATED'].includes(lc.status))

// SHOULD BE (Simplified)
if (!['UTILIZED'].includes(lc.status))
// Note: FOREX_ALLOCATED can be included IF all docs manually verified
```

**Tab 5 Filter (Line 597):**
```typescript
// CURRENT (Correct! ✅)
return lc && (lc.status === 'PAYMENT_RELEASED' || lc.status === 'SETTLED');
```

---

## 🎯 RECOMMENDED FIXES

### Fix 1: Remove Invalid Status References
Replace all UI references to non-existent statuses:
- `DOCUMENTS_SUBMITTED` → Check for `lc.documents.length > 0`
- `DOCUMENTS_COMPLIANT` → Use `UTILIZED`
- `READY_FOR_PAYMENT` → Use `UTILIZED`

### Fix 2: Simplify Tab 2 Filter
```typescript
const forExam = lcs.filter((lc: any) => {
  if (!lc.documents || lc.documents.length === 0) return false;
  
  // Show LCs in examination stages
  if (!['ISSUED', 'FOREX_ALLOCATED', 'UTILIZED'].includes(lc.status)) return false;
  
  return true;
});
```

### Fix 3: Simplify Tab 3 Filter
```typescript
const forPayment = lcs.filter((lc: any) => {
  if (!lc.documents || lc.documents.length === 0) return false;
  
  // Only UTILIZED LCs are ready for payment
  if (lc.status !== 'UTILIZED') return false;
  
  // All documents must be verified
  const allDocsVerified = lc.documents.every((d: any) => 
    d.verificationStatus === 'verified' || d.status === 'verified'
  );
  
  return allDocsVerified;
});
```

---

## 📚 BLOCKCHAIN STATUS AUDIT TRAIL

Every status transition creates:

**Audit Log Fields:**
- `entityType`: "LC"
- `entityId`: LC ID
- `actionType`: "APPROVE", "ISSUE", "UTILIZE", etc.
- `oldStatus`: Previous status
- `newStatus`: New status
- `changes`: Array of field changes
- `actor`: X.509 certificate of user
- `actorMSP`: Organization MSP ID
- `timestamp`: Blockchain timestamp
- `txId`: Blockchain transaction ID
- `compliance`: Metadata (ECTA, NBE, UCP600, EUDR, ICO)

---

## ✅ SUMMARY

**Banks Portal Handles:**
- ✅ Tab 0: `REQUESTED` → `APPROVED` → `ISSUED`
- ✅ Tab 1: `ISSUED` → `FOREX_ALLOCATED`
- ✅ Tab 2: `FOREX_ALLOCATED` → `UTILIZED` (after doc verification)
- ✅ Tab 3: `UTILIZED` → `PAYMENT_RELEASED`
- ✅ Tab 5: `PAYMENT_RELEASED` → `SETTLED`

**Exporter Portal Handles:**
- ✅ Creates: `REQUESTED` status
- ✅ Submits: Documents for examination
- ✅ Views: Contract approval status

**NBE Portal Handles:**
- ✅ Monitors: Forex allocations linked to LCs
- ✅ Approves: Contracts (prerequisite for LC)
- ❌ Does NOT: Update LC status directly

**Chaincode Enforces:**
- ✅ 8 valid LC statuses
- ✅ Strict state transitions
- ✅ Status validation before updates
- ✅ X.509 certificate identity tracking
- ✅ Complete audit trail with compliance metadata

---

**Analysis Date:** September 18, 2026  
**Status:** ✅ **COMPLETE - Full System Integration Documented**  
**Blockchain Consensus:** All status transitions signed by consortium  
**Audit Trail:** 100% traceable with X.509 certificates
