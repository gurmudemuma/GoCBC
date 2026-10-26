# Letter of Credit (LC) Workflow with Forex Allocation
## Ethiopian Coffee Export Consortium Blockchain System (CECBS)

### Overview
This document outlines the complete Letter of Credit workflow as implemented in CECBS, including the mandatory Forex Allocation step required by Ethiopian National Bank (NBE) regulations.

---

## Workflow Participants

| Participant | Role | System Entity |
|------------|------|---------------|
| **Buyer/Applicant** | International coffee buyer | Foreign Entity |
| **Seller/Beneficiary** | Ethiopian coffee exporter | Exporter (EXPxxxxxx) |
| **Issuing Bank** | Buyer's bank (issues LC) | Foreign Bank |
| **Advising Bank** | Seller's bank in Ethiopia | CBE/Bank (CBEMSP) |
| **NBE** | National Bank of Ethiopia | Regulator (NBEMSP) |
| **ECTA** | Ethiopian Coffee & Tea Authority | Regulator (ECTAMSP) |

---

## Complete Workflow Steps

### Phase 1: Contract & LC Application

#### **Step 1: Sales Contract**
- **Actors:** Buyer ↔ Seller
- **Action:** Parties negotiate and sign sales contract
- **Details:**
  - Coffee type, quantity, price per kg
  - Incoterms (FOB, CIF, etc.)
  - Delivery timeline
- **System:** Contract registered in blockchain by ECTA
- **Status:** `NBE_APPROVED` (after NBE approval)

#### **Step 2: LC Application**
- **Actors:** Buyer → Issuing Bank
- **Action:** Buyer applies for Letter of Credit
- **Details:**
  - LC application referencing sales contract
  - Credit amount and terms
  - Expiry date, shipping deadlines
- **System:** Exporter can see LC request in system
- **Status:** `REQUESTED`

---

### Phase 2: LC Issuance & Forex Allocation (CRITICAL)

#### **Step 3: LC Issuance**
- **Actors:** Issuing Bank → Advising Bank
- **Action:** Issuing Bank issues irrevocable LC
- **Details:**
  - LC terms per UCP 600 (Uniform Customs and Practice)
  - Documentary requirements
  - Payment terms (sight, usance, etc.)
- **System:** LC created in blockchain
- **Status:** `ISSUED`
- **API Endpoint:** `POST /api/v1/banking/lc/:lcID/issue`

#### **Step 4: LC Advising**
- **Actors:** Advising Bank → Seller
- **Action:** Advising bank notifies seller of LC
- **Details:**
  - LC authentication and verification
  - Terms and conditions communicated
- **System:** Seller can view LC in Banks Portal
- **Status:** `ISSUED` (unchanged)

#### **Step 5: Forex Allocation ⭐ NEW**
> **🚨 CRITICAL STEP - NBE Regulation Compliance**

- **Actors:** Advising Bank → Forex System
- **Action:** Bank allocates foreign exchange for the transaction
- **NBE Requirements:**
  - **Retention Rate:** 30-50% of forex proceeds must be retained in Foreign Currency Account (FCY)
  - **Surrender Rate:** 50-70% must be converted to Ethiopian Birr (ETB)
  - **Exchange Rate:** NBE official rate applies
  - **Validity:** Forex allocation has expiry date
  
- **System Actions:**
  1. **Auto-Creation:** When LC is issued, system automatically creates forex request
     ```javascript
     // Auto-triggered after LC issuance
     forexId: FOREX_<LCID>_<timestamp>
     status: "REQUESTED"
     ```
  2. **Bank Allocation:** Bank reviews and allocates forex
     - Verifies LC validity
     - Sets exchange rate (per NBE rate)
     - Sets retention rate (typically 50%)
     - Sets expiry date
  3. **Blockchain Record:** All forex allocation details immutably recorded

- **Status Transitions:**
  - `REQUESTED` → `ALLOCATED` (after bank approval)
  - `ALLOCATED` → `UTILIZED` (after payment settlement)

- **API Endpoints:**
  - `GET /api/v1/forex` - View all forex allocations
  - `POST /api/v1/forex/allocate` - Allocate forex
  
- **Portal Location:** 
  - Banks Portal → Banking Operations Tab → Forex Allocation Sub-tab

---

### Phase 3: Shipment & Documentation

#### **Step 6: Shipment of Goods**
- **Actors:** Seller → Buyer
- **Action:** Seller ships coffee after receiving LC and forex allocation
- **Prerequisites:**
  - ✅ LC issued and advised
  - ✅ Forex allocated (NEW requirement)
  - ✅ Export permit obtained (ECTA)
  - ✅ Quality inspection passed (ECTA)
  - ✅ Phytosanitary certificate issued
- **System:** Shipment tracking in blockchain
- **Status:** Shipment `IN_TRANSIT`

#### **Step 7: Document Submission**
- **Actors:** Seller → Advising Bank
- **Action:** Seller submits shipping documents
- **Required Documents:**
  - Commercial Invoice
  - Bill of Lading (B/L)
  - Packing List
  - Certificate of Origin
  - Insurance Certificate
  - Quality Certificate (ECTA)
  - Phytosanitary Certificate
  - Export Permit (ECTA)
- **System:** Documents uploaded and verified
- **Status:** `DOCUMENTS_SUBMITTED`

#### **Step 8: Document Verification**
- **Actors:** Advising Bank
- **Action:** Bank verifies documents comply with LC terms
- **Checks:**
  - Document completeness
  - Compliance with LC terms
  - No discrepancies
- **System:** Smart contract validation
- **Status:** `DOCUMENTS_VERIFIED` or `DISCREPANCY_FOUND`

#### **Step 9: Documents Forwarded**
- **Actors:** Advising Bank → Issuing Bank
- **Action:** Advising bank sends documents to issuing bank
- **Method:** SWIFT message (MT 700 series)
- **System:** SWIFT integration tracking
- **Status:** `DOCUMENTS_FORWARDED`

---

### Phase 4: Payment Settlement

#### **Step 10: Buyer Debit**
- **Actors:** Issuing Bank → Buyer
- **Action:** Issuing bank debits buyer's account
- **Details:**
  - Payment amount per LC terms
  - Buyer receives documents to claim goods
- **System:** Payment recorded
- **Status:** `BUYER_DEBITED`

#### **Step 11: Interbank Settlement**
- **Actors:** Issuing Bank → Advising Bank
- **Action:** Payment transferred between banks
- **Method:** SWIFT (MT 103, MT 202)
- **Details:**
  - International wire transfer
  - Correspondent banking
- **System:** SWIFT message tracking
- **Status:** `SWIFT_RECEIVED`

#### **Step 12: Forex Utilization & Retention**
> **🚨 NBE Compliance Checkpoint**

- **Actors:** Advising Bank → NBE System
- **Action:** Enforce forex retention policy
- **Process:**
  1. **Split Payment:**
     - 50% retained in seller's FCY account (USD)
     - 50% converted to ETB at NBE rate
  2. **Retention Verification:**
     - Blockchain records retention compliance
     - Automatic audit trail for NBE
  3. **Forex Utilization:**
     - Mark forex allocation as `UTILIZED`
     - Link to payment settlement

- **System Actions:**
  ```javascript
  // Update forex record
  status: "UTILIZED"
  utilizedAmount: <payment_amount>
  utilizationDate: <timestamp>
  retentionCompliance: true
  ```

- **API Endpoint:** `POST /api/v1/forex/utilize`

#### **Step 13: Seller Payment**
- **Actors:** Advising Bank → Seller
- **Action:** Final payment to exporter
- **Details:**
  - 50% paid in USD to FCY account
  - 50% paid in ETB to local account
  - Less any bank charges
- **System:** Payment settlement complete
- **Status:** `SETTLED`

---

## Status Flow Summary

```
CONTRACT: REGISTERED → NBE_APPROVED
LC: REQUESTED → APPROVED → ISSUED → UTILIZED
FOREX: REQUESTED → ALLOCATED → UTILIZED ⭐
SHIPMENT: PENDING → IN_TRANSIT → DELIVERED
DOCUMENTS: SUBMITTED → VERIFIED → FORWARDED
PAYMENT: INITIATED → SWIFT_RECEIVED → SETTLED
```

---

## Key Differences from Standard LC Workflow

### ⭐ **Forex Allocation Step (NEW)**
- **Why Added:** Ethiopian NBE requires forex allocation before shipment
- **When:** Immediately after LC issuance (Step 5)
- **Impact:** Seller cannot ship until forex is allocated
- **Compliance:** 30-50% retention requirement

### **Regulatory Oversight**
- **ECTA:** Contract approval, quality inspection, export permits
- **NBE:** Forex allocation, retention policy enforcement
- **Banks:** Execute LC per international standards + local regulations

### **Blockchain Benefits**
- **Transparency:** All parties see same information
- **Immutability:** Audit trail cannot be altered
- **Automation:** Smart contracts enforce rules
- **Compliance:** Automatic NBE reporting

---

## System Implementation

### **Frontend (Banks Portal)**

**Payment Methods Tab → Letter of Credit Sub-tab:**

| Step | Button/Action | Status Display |
|------|---------------|----------------|
| 1 | View LC Request | "LC Requested" |
| 2 | "Approve Request" | "Approved" |
| 3 | "Issue LC" | "LC Issued" |
| 4 | ⏳ Awaiting: Forex Allocation | - |
| 5 | [Navigate to Forex Tab] | - |

**Banking Operations Tab → Forex Allocation Sub-tab:**

| Step | Button/Action | Status Display |
|------|---------------|----------------|
| 5 | "Allocate Forex" | Dialog: Set rate, retention |
| | Submit | "Forex Allocated" |

**Back to Payment Methods → Letter of Credit:**

| Step | Button/Action | Status Display |
|------|---------------|----------------|
| 6 | ⏳ Awaiting: Shipment | - |
| 7 | "Verify Documents" | "Documents Verified" |
| 8 | "Release Payment" | "Payment Released" |

### **Backend APIs**

```typescript
// LC Issuance (auto-creates forex request)
POST /api/v1/banking/lc/:lcID/issue
→ Creates FOREX_<LCID>_<timestamp> with status "REQUESTED"

// Forex Allocation
GET  /api/v1/forex
POST /api/v1/forex/allocate
POST /api/v1/forex/utilize

// Payment Settlement
POST /api/v1/payments/settle
```

### **Chaincode Functions**

```go
// Forex operations
RequestForex(forexID, contractID, exporterID, amount, currency)
AllocateForex(forexID, lcID, amount, exchangeRate, retentionRate, officer, approvalRef, expiryDate)
UtilizeForex(forexID, utilizedAmount)
QueryAllForex()
QueryForexByStatus(status)
```

---

## Compliance & Audit

### **NBE Requirements**
✅ Forex allocation mandatory before shipment  
✅ 30-50% retention in FCY enforced  
✅ NBE official exchange rate applied  
✅ Complete audit trail in blockchain  
✅ Automatic reporting to NBE  

### **International Standards**
✅ UCP 600 compliance  
✅ SWIFT messaging standards  
✅ Documentary credit best practices  

### **Blockchain Audit Trail**
- All steps immutably recorded
- Timestamps and actor identities captured
- MSP-based access control
- Cryptographic proof of transactions

---

## Workflow Diagram (Updated)

```
┌─────────────┐                           ┌─────────────┐
│   Buyer     │◄────(1) Contract ────────►│   Seller    │
│ (Applicant) │                           │(Beneficiary)│
└──────┬──────┘                           └──────▲──────┘
       │                                          │
       │(2) LC Application                        │(4) LC Advice
       ▼                                          │
┌──────────────┐         (3) LC Issuance  ┌──────┴──────┐
│Issuing Bank  │────────────────────────►│Advising Bank│
│  (Foreign)   │                          │    (CBE)    │
└──────┬───────┘                          └──────┬──────┘
       │                                          │
       │                          ⭐ (5) FOREX   │
       │                             ALLOCATION   │
       │                                  ┌───────▼───────┐
       │                                  │ Forex System  │
       │                                  │ (NBE Policy)  │
       │                                  └───────┬───────┘
       │                                          │
       │                                  (6) Shipment
       │                                          │
       │                          (7) Documents   │
       │                                          ▼
       │                                  ┌──────────────┐
       │◄───(9) Documents─────────────────┤ Document     │
       │                                  │ Submission   │
       │                                  └──────────────┘
       │
       │(10) Debit Buyer
       │
       ▼
┌──────────────┐
│Payment Flow  │
│              │
│ (11) Issuing→Advising Bank (SWIFT)
│ (12) Forex Utilization & Retention
│ (13) Advising→Seller (Split Payment)
│      • 50% USD (FCY Account)
│      • 50% ETB (Local Account)
└──────────────┘
```

---

## Error Scenarios & Resolutions

### **Forex Not Allocated**
- **Problem:** Seller tries to ship before forex allocation
- **System Response:** Blockchain validation prevents shipment creation
- **Resolution:** Bank must complete Step 5 before Step 6

### **Retention Non-Compliance**
- **Problem:** Bank attempts <30% or >50% retention
- **System Response:** Smart contract rejects transaction
- **Resolution:** Adjust retention rate to NBE-compliant range

### **LC Expired Before Forex**
- **Problem:** Forex allocation delayed past LC expiry
- **System Response:** Warning issued, LC renewal required
- **Resolution:** Amend LC expiry or expedite forex allocation

---

## References

- **UCP 600:** ICC Uniform Customs and Practice for Documentary Credits
- **NBE FXD/01/2024:** National Bank of Ethiopia Foreign Exchange Directive
- **CECBS Documentation:** See `/Docs` folder for technical specifications

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-15  
**Author:** CECBS Development Team  
**Status:** Active Implementation
