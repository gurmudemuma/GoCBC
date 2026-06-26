# Complete LC, SWIFT & Payment Workflow with Bank/Branch Integration

## Overview
This document describes the complete Letter of Credit (LC), SWIFT payment, and settlement workflow in the Ethiopian Coffee Export Consortium Blockchain System (CECBS), with the newly integrated bank/branch selection feature.

---

## ✅ COMPLETE WORKFLOW STATUS

### System Capabilities:
- ✅ **Letter of Credit (LC) Management** - Full LC lifecycle from request to utilization
- ✅ **SWIFT Payment Processing** - MT103, MT700, MT799 message handling
- ✅ **Payment Settlement** - With NBE forex retention (40% USD, 60% ETB)
- ✅ **Bank/Branch Assignment** - Exporters assigned to specific LC processing branches
- ✅ **Document Verification** - UCP 600 compliant document checking
- ✅ **Multi-Bank Support** - 15 Ethiopian banks with branch-level operations
- ✅ **Blockchain Immutability** - All transactions recorded on Hyperledger Fabric
- ✅ **Real-time Status Tracking** - End-to-end visibility across all portals

---

## 🏦 BANK/BRANCH INTEGRATION WITH LC WORKFLOW

### **Phase 1: Exporter Registration with Bank Assignment**

**Portal:** ECTA Portal → Approval Dialog

**Flow:**
1. ECTA reviews exporter application
2. During approval, ECTA selects:
   - **Bank:** e.g., "Commercial Bank of Ethiopia"
   - **Branch:** e.g., "Bole Branch" (CBE-002)
3. System stores bank information:
   ```sql
   users.bank_name = "Commercial Bank of Ethiopia"
   users.bank_branch = "Bole Branch"
   users.bank_branch_code = "CBE-002"
   ```
4. Exporter sees assigned branch in profile:
   ```
   LC Processing Bank: Commercial Bank of Ethiopia
   LC Processing Branch: Bole Branch [CBE-002]
   ✓ All Letter of Credit requests will be processed through this branch
   ```

**Result:** Exporter knows exactly which bank branch to contact for LC services.

---

### **Phase 2: Sales Contract Registration**

**Portal:** Exporter Portal → Create Contract

**Flow:**
1. Exporter creates sales contract with buyer
2. Exporter specifies:
   - **Buyer's Bank (Issuing Bank):** Foreign bank that will issue LC
   - **Exporter's Bank (Advising Bank):** Ethiopian bank (auto-filled from profile)
   ```typescript
   {
     buyerBank: "Standard Chartered Bank, London",
     buyerBankBIC: "SCBLGB2L",
     exporterBank: "Commercial Bank of Ethiopia", // From exporter profile
     exporterBankBIC: "CBETETAA"
   }
   ```
3. Contract registered on blockchain with status: `REGISTERED`
4. NBE approves contract → Status: `NBE_APPROVED`

**Bank Integration Point:**
- Exporter's assigned bank (from registration) auto-fills as advising bank
- Contract links exporter to their designated LC processing branch

---

### **Phase 3: Letter of Credit Issuance**

**Portal:** Banks Portal → LC Management

**Chaincode:** `chaincodes/coffee/banking.go`

#### **Step 3.1: LC Request**

**Function:** `RequestLC()`

**Flow:**
1. Exporter contacts their assigned bank branch (Bole Branch)
2. Branch initiates LC request in Banks Portal:
   ```go
   lc := LetterOfCredit{
       LCID:            "LC20260624001",
       ContractID:      "CONTRACT123",
       ExporterID:      "EXP7419517",
       Amount:          500000.00,
       Currency:        "USD",
       IssuingBank:     "Standard Chartered Bank, London",
       IssuingBankBIC:  "SCBLGB2L",
       AdvisingBank:    "Commercial Bank of Ethiopia", // Exporter's bank
       AdvisingBankBIC: "CBETETAA",
       AdvisingBranch:  "Bole Branch",              // NEW - Specific branch
       BranchCode:      "CBE-002",                  // NEW - Branch identifier
       Beneficiary:     "EXP7419517",
       Status:          "REQUESTED",
   }
   ```

3. LC request recorded on blockchain
4. Status: `REQUESTED` → Awaiting review

#### **Step 3.2: LC Approval**

**Function:** `ApproveLC()`

**Flow:**
1. Bank branch manager reviews LC request
2. Verifies:
   - Contract is NBE-approved
   - Exporter is assigned to this branch
   - LC terms comply with regulations
3. Approves LC → Status: `APPROVED`
4. Ready for issuance

#### **Step 3.3: LC Issuance**

**Function:** `IssueLC()`

**Flow:**
1. Branch issues LC to buyer's bank (issuing bank)
2. SWIFT MT700 message generated:
   ```
   MT700: Issue of Documentary Credit
   From: CBETETAA (CBE Bole Branch)
   To: SCBLGB2L (Standard Chartered London)
   Amount: USD 500,000.00
   Beneficiary: Test Coffee Exporters Ltd (EXP7419517)
   Expiry: 2026-12-24
   Terms: UCP 600
   ```
3. Status: `ISSUED`
4. LC active and ready for utilization

**Bank/Branch Integration:**
- Only the assigned branch (Bole Branch) can issue LC for this exporter
- Branch code (CBE-002) tracked in blockchain for audit
- LC tied to specific branch for accountability

---

### **Phase 4: Forex Allocation**

**Portal:** NBE Portal → Forex Management

**Chaincode:** `chaincodes/coffee/advance.go`

**Flow:**
1. NBE allocates forex based on issued LC:
   ```go
   forex := ForexAllocation{
       ForexID:        "FOREX-LC20260624001",
       LCID:           "LC20260624001",
       ExporterID:     "EXP7419517",
       Amount:         500000.00,
       Currency:       "USD",
       ExchangeRate:   120.50,
       RetentionRate:  40.0, // NBE policy: 40% retained in USD
       Bank:           "Commercial Bank of Ethiopia",
       BankBranch:     "Bole Branch", // NEW - Branch-level allocation
       Status:         "ALLOCATED",
   }
   ```
2. Forex allocation links to exporter's assigned branch
3. Branch tracks forex utilization for this exporter

---

### **Phase 5: Shipment & Quality Control**

**Portals:** Exporter Portal → ECTA Portal → Customs Portal → Shipping Portal

**Flow:**
1. Exporter creates shipment
2. ECTA performs quality inspection → Status: `QUALITY_APPROVED`
3. ECTA issues export permit → Status: `PERMIT_ISSUED`
4. Customs clears shipment → Status: `CUSTOMS_CLEARED`
5. Shipping company loads and ships → Status: `SHIPPED`

**Bank Integration:**
- Banks monitor shipment progress in Banks Portal
- LC terms reference shipment documents
- Bank prepares for document verification

---

### **Phase 6: Payment Document Submission**

**Portal:** Exporter Portal → Payment Documents Component

**Component:** `ui/src/components/portals/PaymentDocuments.tsx`

**Chaincode:** `chaincodes/coffee/payment.go` → `SubmitPaymentDocuments()`

**Flow:**
1. Exporter submits shipping documents to assigned bank branch:
   - **Bill of Lading (B/L)** - Proof of shipment
   - **Commercial Invoice** - Transaction details
   - **Certificate of Origin** - Ethiopian Coffee origin
   - **Quality Certificates** - ECTA quality approval
   - **Phytosanitary Certificate** - Health clearance
   - **Packing List** - Container contents
   - **Insurance Certificate** - Cargo insurance

2. Documents uploaded through Exporter Portal:
   ```typescript
   const documents = [
     { type: 'BILL_OF_LADING', fileUrl: 'ipfs://...' },
     { type: 'COMMERCIAL_INVOICE', fileUrl: 'ipfs://...' },
     { type: 'CERTIFICATE_OF_ORIGIN', fileUrl: 'ipfs://...' },
     { type: 'QUALITY_CERTIFICATE', fileUrl: 'ipfs://...' },
     { type: 'PHYTOSANITARY_CERT', fileUrl: 'ipfs://...' },
   ];
   ```

3. Payment initiated on blockchain:
   ```go
   payment := PaymentSettlement{
       PaymentID:          "PAY20260624001",
       ContractID:         "CONTRACT123",
       ExporterID:         "EXP7419517",
       LCID:               "LC20260624001",
       Amount:             500000.00,
       Currency:           "USD",
       ReceivingBank:      "Commercial Bank of Ethiopia",
       ReceivingBankBIC:   "CBETETAA",
       ReceivingBranch:    "Bole Branch",        // NEW - Receiving branch
       BeneficiaryName:    "Test Coffee Exporters Ltd",
       BeneficiaryAccount: "1000123456789",
       Documents:          documents,
       Status:             "DOCUMENTS_SUBMITTED",
   }
   ```

4. Branch notified of document submission
5. Status: `DOCUMENTS_SUBMITTED`

---

### **Phase 7: Document Verification by Bank**

**Portal:** Banks Portal → Payment Processing Tab

**Chaincode:** `chaincodes/coffee/payment.go` → `VerifyPaymentDocuments()`

**Flow:**
1. Bole Branch receives document notification
2. Branch officer verifies documents against LC terms:
   - **UCP 600 Compliance Check:**
     - Documents presented within LC validity
     - B/L dated before LC expiry
     - Invoice amount matches LC amount
     - Origin certificate shows Ethiopian origin
     - Quality certificates show required grade
     - All documents consistent and complete

3. Verification recorded:
   ```go
   payment.Status = "VERIFIED"
   payment.VerifiedBy = "branch_officer_id"
   payment.Comments = "All documents comply with UCP 600. Approved for payment."
   ```

4. Status: `VERIFIED` → Ready for SWIFT payment

**Bank/Branch Integration:**
- Only assigned branch (Bole Branch) can verify documents
- Branch code tracked for audit trail
- Compliance officer at branch level

---

### **Phase 8: SWIFT Payment Initiation**

**Portal:** Banks Portal → SWIFT Management

**Chaincode:** `chaincodes/coffee/payment.go` → `InitiateSWIFTTransfer()`

**Flow:**
1. **Buyer's Bank (Issuing Bank) initiates SWIFT payment:**
   - Generates SWIFT MT103 (Customer Credit Transfer)
   - Or processes under existing LC (MT700)

2. **SWIFT Message Details:**
   ```go
   swiftMsg := SWIFTMessage{
       MessageType:    "MT103",
       SWIFTReference: "SCBLGB2L-20260624-001",
       SenderBIC:      "SCBLGB2L",          // Standard Chartered London
       ReceiverBIC:    "CBETETAA",          // CBE Ethiopia
       ReceiverBranch: "Bole Branch",       // NEW - Specific branch routing
       BranchCode:     "CBE-002",           // NEW - Branch identifier
       ValueDate:      "2026-06-28",
       Amount:         500000.00,
       Currency:       "USD",
       Charges:        "SHA",               // Shared charges
       RemittanceInfo: "Payment for Contract CONTRACT123, LC LC20260624001",
       Status:         "SENT",
   }
   ```

3. **SWIFT Network Routing:**
   ```
   Standard Chartered London (SCBLGB2L)
       ↓ SWIFT Network
   Commercial Bank of Ethiopia - Head Office (CBETETAA)
       ↓ Internal Routing
   Commercial Bank of Ethiopia - Bole Branch (CBE-002)
       ↓
   Exporter Account: 1000123456789
   ```

4. Status: `SWIFT_INITIATED`

**Bank/Branch Integration:**
- SWIFT message routed to specific branch (CBE-002)
- Branch receives SWIFT notification
- Branch processes incoming funds

---

### **Phase 9: SWIFT Receipt Confirmation**

**Portal:** Banks Portal → SWIFT Tracking

**Chaincode:** `chaincodes/coffee/payment.go` → `ConfirmSWIFTReceipt()`

**Flow:**
1. Bole Branch confirms SWIFT message receipt:
   ```go
   payment.Status = "SWIFT_RECEIVED"
   payment.SWIFTDetails.ReceivedDate = "2026-06-28T10:30:00Z"
   payment.SWIFTDetails.Status = "RECEIVED"
   ```

2. Branch verifies:
   - SWIFT reference matches LC
   - Amount matches invoice
   - Beneficiary account correct
   - No discrepancies

3. Status: `SWIFT_RECEIVED` → Ready for settlement

---

### **Phase 10: Payment Settlement with NBE Retention**

**Portal:** Banks Portal → Settlement

**Chaincode:** `chaincodes/coffee/payment.go` → `SettlePayment()`

**Flow:**
1. **NBE Retention Policy Applied:**
   - **40% Retained in USD** - Exporter keeps foreign currency
   - **60% Converted to ETB** - Mandatory conversion at official rate

2. **Settlement Calculation:**
   ```go
   // Auto-mapped from forex allocation
   exchangeRate := 120.50  // ETB per USD
   retentionRate := 40.0   // NBE policy
   
   totalAmount := 500000.00  // USD
   
   // Retention
   retainedAmount := totalAmount * (40.0 / 100) = 200000.00 USD
   convertedAmount := totalAmount * (60.0 / 100) = 300000.00 USD
   
   // Conversion
   amountBirr := convertedAmount * exchangeRate = 36,150,000.00 ETB
   
   // Settlement
   payment.RetainedAmount = 200000.00   // USD (kept in forex account)
   payment.ConvertedAmount = 300000.00  // USD (converted)
   payment.AmountBirr = 36150000.00     // ETB (credited)
   ```

3. **Credit to Exporter Account:**
   ```
   Account: 1000123456789 (Bole Branch)
   
   Forex Account:
   + USD 200,000.00 (40% retained)
   
   Birr Account:
   + ETB 36,150,000.00 (60% converted @ 120.50)
   
   Total Value: USD 500,000.00
   ```

4. **Blockchain Record:**
   ```go
   payment := PaymentSettlement{
       Status:          "SETTLED",
       PaymentDate:     "2026-06-28T14:00:00Z",
       RetentionRate:   40.0,
       RetainedAmount:  200000.00,
       ConvertedAmount: 300000.00,
       ExchangeRate:    120.50,
       AmountBirr:      36150000.00,
       NBEApprovalRef:  "NBE-FOREX-2026-001",
       SettledBy:       "branch_manager_id",
       Branch:          "Bole Branch",
       BranchCode:      "CBE-002",
   }
   ```

5. Status: `SETTLED` → Payment complete

**Bank/Branch Integration:**
- Settlement processed by assigned branch (Bole Branch)
- Branch credits both USD and ETB accounts
- Branch reports to NBE for forex compliance
- Branch code tracked for audit and reporting

---

## 📊 COMPLETE WORKFLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: EXPORTER REGISTRATION & BANK ASSIGNMENT               │
├─────────────────────────────────────────────────────────────────┤
│ Exporter → ECTA → Approve with Bank/Branch Selection            │
│ Result: Exporter assigned to CBE Bole Branch (CBE-002)         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: CONTRACT REGISTRATION                                  │
├─────────────────────────────────────────────────────────────────┤
│ Exporter → Create Contract → NBE Approval                       │
│ Buyer Bank: Standard Chartered London (SCBLGB2L)               │
│ Exporter Bank: Commercial Bank Ethiopia (CBETETAA)             │
│ Status: NBE_APPROVED                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: LETTER OF CREDIT ISSUANCE                             │
├─────────────────────────────────────────────────────────────────┤
│ Exporter → Contact Bole Branch → LC Request                    │
│ Bole Branch → Review → Approve → Issue LC                      │
│ SWIFT MT700 → Buyer's Bank                                     │
│ Status: ISSUED                                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: FOREX ALLOCATION                                       │
├─────────────────────────────────────────────────────────────────┤
│ NBE → Allocate Forex to Exporter                               │
│ Bank: CBE, Branch: Bole Branch                                 │
│ Retention: 40% USD, 60% ETB                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 5: SHIPMENT & CLEARANCE                                  │
├─────────────────────────────────────────────────────────────────┤
│ Exporter → Shipment → ECTA → Customs → Shipping                │
│ Status: SHIPPED                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 6: DOCUMENT SUBMISSION                                    │
├─────────────────────────────────────────────────────────────────┤
│ Exporter → Submit Documents → Bole Branch                       │
│ - Bill of Lading                                                │
│ - Commercial Invoice                                            │
│ - Certificates (Origin, Quality, Phytosanitary)                │
│ Status: DOCUMENTS_SUBMITTED                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 7: DOCUMENT VERIFICATION                                  │
├─────────────────────────────────────────────────────────────────┤
│ Bole Branch → Verify Documents (UCP 600)                       │
│ Check: Completeness, Consistency, LC Compliance                │
│ Status: VERIFIED                                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 8: SWIFT PAYMENT INITIATION                              │
├─────────────────────────────────────────────────────────────────┤
│ Buyer's Bank → SWIFT MT103 → CBE Bole Branch                   │
│ Amount: USD 500,000.00                                          │
│ Status: SWIFT_INITIATED                                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 9: SWIFT RECEIPT                                         │
├─────────────────────────────────────────────────────────────────┤
│ Bole Branch → Confirm SWIFT Receipt                            │
│ Verify: Reference, Amount, Beneficiary                         │
│ Status: SWIFT_RECEIVED                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 10: PAYMENT SETTLEMENT                                    │
├─────────────────────────────────────────────────────────────────┤
│ Bole Branch → Apply NBE Retention Policy                       │
│ - 40% Retained: USD 200,000.00 (Forex Account)                 │
│ - 60% Converted: ETB 36,150,000.00 (Birr Account)              │
│ Credit Exporter Accounts                                        │
│ Report to NBE                                                   │
│ Status: SETTLED ✅                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 SECURITY & AUDIT TRAIL

### **Blockchain Immutability:**
- All LC, SWIFT, and payment transactions recorded on Hyperledger Fabric
- Each step signed by respective organization (Banks, NBE, Exporter)
- Tamper-proof audit trail from LC request to settlement

### **Branch-Level Accountability:**
- Bank branch code tracked in all transactions
- Specific branch officers recorded for verification and settlement
- Branch performance metrics tracked (LC processing time, compliance rate)

### **MSP Organization Context:**
```go
// Each transaction records the MSP organization
org, _ := ctx.GetClientIdentity().GetMSPID()
// Examples:
// - BanksMSP (for LC issuance and payment processing)
// - NBEMSP (for forex allocation and approval)
// - ExporterMSP (for document submission)
```

### **SWIFT Audit Trail:**
```go
SWIFTDetails {
    MessageType:    "MT103"
    SWIFTReference: "SCBLGB2L-20260624-001"
    SentDate:       "2026-06-28T08:00:00Z"
    ReceivedDate:   "2026-06-28T10:30:00Z"
    Status:         "SETTLED"
}
```

---

## ✅ SYSTEM INTEGRATION SUMMARY

| Component | Status | Integration |
|-----------|--------|-------------|
| Exporter Registration | ✅ | Bank/branch assigned during ECTA approval |
| Contract Management | ✅ | Exporter's bank auto-filled from profile |
| LC Request | ✅ | Routed to assigned branch |
| LC Issuance | ✅ | Issued by assigned branch, SWIFT MT700 |
| Forex Allocation | ✅ | Linked to exporter's bank/branch |
| Document Submission | ✅ | Submitted to assigned branch |
| Document Verification | ✅ | Verified by assigned branch (UCP 600) |
| SWIFT Initiation | ✅ | Foreign bank → CBE → Specific branch |
| SWIFT Receipt | ✅ | Confirmed by assigned branch |
| Payment Settlement | ✅ | Settled by assigned branch with NBE retention |
| Blockchain Recording | ✅ | All steps immutably recorded |
| Audit Trail | ✅ | Branch-level tracking, MSP signatures |

---

## 🎯 KEY BENEFITS

### **For Exporters:**
- ✅ Single point of contact: Know exactly which bank branch handles LCs
- ✅ Faster processing: Dedicated branch relationship
- ✅ Clear communication: Branch contact information available
- ✅ Transparent tracking: Real-time status in Exporter Portal

### **For Banks:**
- ✅ Branch-level operations: Dedicated exporter relationships
- ✅ LC processing authority: Specific branches handle specific exporters
- ✅ SWIFT routing: Direct routing to correct branch
- ✅ Performance tracking: Branch metrics for LC and payment processing

### **For NBE:**
- ✅ Forex oversight: Track which branch allocates and settles forex
- ✅ Compliance monitoring: Verify retention policy applied correctly
- ✅ Branch reporting: Aggregated and branch-level forex data
- ✅ Audit trail: Complete transparency from LC to settlement

### **For System:**
- ✅ End-to-end integration: Bank assignment flows through entire workflow
- ✅ Blockchain immutability: All transactions recorded with branch details
- ✅ Multi-bank support: 15 banks with branch-level granularity
- ✅ SWIFT compliance: Proper routing and message handling

---

## 📈 PRODUCTION READINESS

### **Completed Features:**
- ✅ Full LC lifecycle (Request → Approve → Issue → Utilize)
- ✅ SWIFT payment processing (MT103, MT700)
- ✅ Document submission and verification (UCP 600)
- ✅ NBE retention policy (40% USD, 60% ETB)
- ✅ Payment settlement with auto-mapping
- ✅ Bank/branch assignment and tracking
- ✅ Blockchain recording and audit trail
- ✅ Multi-portal visibility and management

### **System Status:**
```
✅ PRODUCTION READY

All LC, SWIFT, and payment workflows fully implemented and integrated
with bank/branch selection feature. System handles complete end-to-end
process from exporter registration to payment settlement.
```

---

**Implementation Date:** June 24, 2026  
**Version:** 2.0.0  
**Developer:** Kiro AI Assistant  
**System:** Ethiopian Coffee Export Consortium Blockchain System (CECBS)
