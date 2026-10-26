# 📊 LC WORKFLOW - VISUAL GUIDE

## ✅ Document Examination BEFORE Payment Release

---

## 🔄 COMPLETE LC WORKFLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                    LETTER OF CREDIT WORKFLOW                     │
│              (UCP 600 Compliant - International Standard)        │
└─────────────────────────────────────────────────────────────────┘

STEP 1: REQUEST LC
┌──────────────────────────────────────┐
│ 👤 Exporter / ECTA                   │
│ • Contract approved                   │
│ • Applies for LC                      │
│ • Provides buyer details              │
└──────────────────────────────────────┘
              ↓
              
STEP 2: APPROVE LC
┌──────────────────────────────────────┐
│ 🏦 Bank (Documentary Credit Dept)    │
│ • Reviews application                 │
│ • Checks buyer bank                   │
│ • Approves LC request                 │
└──────────────────────────────────────┘
              ↓
              
STEP 3: ISSUE LC
┌──────────────────────────────────────┐
│ 🏦 Bank (Issuing Bank)               │
│ • Creates LC on blockchain            │
│ • Issues to advising bank             │
│ • Sends SWIFT MT700 message          │
│ STATUS: ISSUED                        │
└──────────────────────────────────────┘
              ↓
              
STEP 3B: FOREX ALLOCATION (AUTOMATIC)
┌──────────────────────────────────────┐
│ 🏛️  NBE / Bank                        │
│ • Allocates foreign exchange          │
│ • 40% USD retention                   │
│ • 60% ETB conversion @ 115.5 rate     │
│ STATUS: FOREX_ALLOCATED               │
└──────────────────────────────────────┘
              ↓
              
STEP 4: SHIP GOODS
┌──────────────────────────────────────┐
│ 🚢 Exporter / Shipping Company       │
│ • Ships coffee to buyer               │
│ • Creates Bill of Lading              │
│ • Obtains shipping documents          │
│ STATUS: SHIPMENT_DELIVERED            │
└──────────────────────────────────────┘
              ↓
              
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STEP 5: EXAMINE DOCUMENTS ⬅️ FIRST  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┌──────────────────────────────────────┐
│ 🏦 Bank (Documentary Credit Officer) │
│                                       │
│ REQUIRED DOCUMENTS:                   │
│ ✓ Bill of Lading                     │
│ ✓ Commercial Invoice                  │
│ ✓ Packing List                        │
│ ✓ Certificate of Origin               │
│ ✓ Quality Certificate                 │
│ ✓ Insurance Certificate               │
│ ✓ Customs Declaration                 │
│                                       │
│ EXAMINATION CHECKS:                   │
│ ✓ All documents present              │
│ ✓ Consistent information             │
│ ✓ Within LC terms                     │
│ ✓ Properly signed/dated              │
│ ✓ No discrepancies                    │
│                                       │
│ TIME: Max 5 banking days (UCP 600)   │
│ STATUS: DOCUMENTS_VERIFIED            │
└──────────────────────────────────────┘
              ↓
       ⚠️  CRITICAL CHECKPOINT ⚠️
       Documents MUST be verified
       before proceeding to payment
              ↓
              
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STEP 6: RELEASE PAYMENT ⬅️ AFTER    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┌──────────────────────────────────────┐
│ 🏦 Bank (Payment Officer)            │
│                                       │
│ PAYMENT CALCULATION:                  │
│ Total LC Amount: $1,522,756          │
│                                       │
│ Payment 1: USD RETENTION              │
│ • Amount: $609,102 (40%)             │
│ • To: Exporter's forex account       │
│                                       │
│ Payment 2: ETB CONVERSION             │
│ • Amount: 105,526,991 ETB (60%)      │
│ • Rate: 115.5 ETB/USD                │
│ • To: Exporter's local account       │
│                                       │
│ SWIFT MESSAGES:                       │
│ • MT700 (LC Issuance)                │
│ • MT720 (Transfer)                   │
│                                       │
│ STATUS: PAYMENT_RELEASED              │
└──────────────────────────────────────┘
              ↓
              
STEP 7: SETTLEMENT COMPLETE
┌──────────────────────────────────────┐
│ ✅ Transaction Complete               │
│ • Exporter receives payment           │
│ • Bank debits buyer account           │
│ • All parties notified                │
│ STATUS: SETTLED                       │
└──────────────────────────────────────┘
```

---

## 🎯 KEY POINT: WHY EXAMINATION COMES FIRST

```
┌────────────────────────────────────────────────────────────┐
│  ❌ WRONG ORDER (Violates UCP 600)                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Release Payment First ❌                               │
│     ↓                                                      │
│  2. Then Examine Documents                                 │
│     ↓                                                      │
│  3. PROBLEM: Documents may be non-complying               │
│     • Bank already paid exporter                          │
│     • Buyer refuses reimbursement                         │
│     • Bank loses money                                    │
│     • Legal violations                                    │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  ✅ CORRECT ORDER (UCP 600 Compliant)                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Examine Documents First ✅                             │
│     ↓                                                      │
│  2. Verify Compliance                                      │
│     ↓                                                      │
│  3. If Complying → Release Payment                        │
│     If Non-Complying → Notify + Fix/Waive                │
│                                                            │
│  RESULT:                                                   │
│     ✓ Bank protected                                      │
│     ✓ Buyer protected                                     │
│     ✓ Seller gets paid for compliant docs                │
│     ✓ Legally compliant                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🏦 BANKS PORTAL TABS (CORRECT ORDER)

```
┌─────────────────────────────────────────────────────────────┐
│                      BANKS PORTAL                            │
└─────────────────────────────────────────────────────────────┘

TAB 1: Payment Methods
├─ View LC applications
├─ Issue new LCs
├─ Track LC status
└─ Forex allocation overview

TAB 2: Shipments
├─ Monitor deliveries
├─ Track shipment status
└─ View shipping documents

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ TAB 3: Document Examination ⬅️ STEP 5 (DO THIS FIRST)  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
├─ LCs with Status: FOREX_ALLOCATED
├─ View all transaction documents:
│  ├─ LC Documents (Application, Amendment)
│  ├─ Contract Documents (Sales Contract, Invoice)
│  ├─ Shipment Documents (B/L, Packing List, Insurance)
│  └─ Customs Documents (Declaration, Certificates)
├─ ACTION: "Examine Documents" button
├─ Review each document for compliance
└─ Approve → Status changes to DOCUMENTS_VERIFIED

              ↓ (Only after documents verified)

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ TAB 4: Payment Release ⬅️ STEP 6 (DO THIS AFTER)       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
├─ LCs with Status: DOCUMENTS_VERIFIED
├─ Shows only LCs that passed examination ✅
├─ View payment details:
│  ├─ 40% USD retention amount
│  ├─ 60% ETB conversion amount
│  └─ Forex allocation linked
├─ ACTION: "Release Payment" button
├─ Creates payment transactions
├─ Generates SWIFT messages
└─ Disburses: USD + ETB to exporter
```

---

## 📋 DOCUMENT EXAMINATION DETAILS

### What Bank Officer Does in Tab 3:

```
┌──────────────────────────────────────────────────────────┐
│  DOCUMENT EXAMINATION PROCESS                             │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  1. Select LC from list                                  │
│  2. Click "Examine Documents"                            │
│  3. Review documents by category:                        │
│                                                           │
│     📄 LC Documents (2 docs)                             │
│     ├─ LC Application                                    │
│     └─ LC Amendment (if any)                             │
│                                                           │
│     📄 Contract Documents (4 docs)                       │
│     ├─ Sales Contract (signed)                           │
│     ├─ Proforma Invoice                                  │
│     ├─ Export Permit                                     │
│     └─ Quality Certificate                               │
│                                                           │
│     📄 Shipment Documents (3 docs)                       │
│     ├─ Bill of Lading (B/L) ⭐                          │
│     ├─ Commercial Invoice                                │
│     └─ Packing List                                      │
│                                                           │
│     📄 Customs Documents (3 docs)                        │
│     ├─ Customs Declaration                               │
│     ├─ Certificate of Origin                             │
│     └─ Phytosanitary Certificate                         │
│                                                           │
│  4. For each document:                                    │
│     • Click "View Document" (opens PDF)                  │
│     • Verify authenticity                                │
│     • Check dates, signatures                            │
│     • Compare with LC terms                              │
│                                                           │
│  5. Make decision:                                        │
│     ✓ All compliant → Click "Approve Documents"         │
│     ✗ Discrepancies → Click "Request Corrections"       │
│                                                           │
│  6. Status updates:                                       │
│     FOREX_ALLOCATED → DOCUMENTS_VERIFIED                 │
│                                                           │
│  7. LC moves to Payment Release tab                      │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 💰 PAYMENT RELEASE DETAILS

### What Bank Officer Does in Tab 4:

```
┌──────────────────────────────────────────────────────────┐
│  PAYMENT RELEASE PROCESS                                  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ⚠️  PREREQUISITE: Documents MUST be verified ⚠️         │
│                                                           │
│  1. Select verified LC from list                         │
│  2. Verify LC details:                                    │
│     • LC Amount: $1,522,756                              │
│     • Exporter: EXP4792105                               │
│     • Status: DOCUMENTS_VERIFIED ✅                       │
│     • Forex: ALLOCATED ✅                                 │
│                                                           │
│  3. View payment breakdown:                              │
│     ┌──────────────────────────────────┐                │
│     │ USD RETENTION (40%)              │                │
│     │ Amount: $609,102.40              │                │
│     │ Account: Forex Account           │                │
│     │ Bank: Commercial Bank Ethiopia   │                │
│     └──────────────────────────────────┘                │
│     ┌──────────────────────────────────┐                │
│     │ ETB CONVERSION (60%)             │                │
│     │ Amount: 105,526,990.80 ETB       │                │
│     │ Rate: 115.5 ETB/USD              │                │
│     │ Account: Local ETB Account       │                │
│     └──────────────────────────────────┘                │
│                                                           │
│  4. Click "Release Payment" button                       │
│                                                           │
│  5. System actions:                                       │
│     ✓ Creates USD payment transaction                   │
│     ✓ Creates ETB payment transaction                   │
│     ✓ Generates SWIFT MT720 message                     │
│     ✓ Updates LC status → PAYMENT_RELEASED              │
│     ✓ Updates Forex status → DISBURSED                  │
│     ✓ Sends notification to exporter                    │
│                                                           │
│  6. Confirmation displayed:                              │
│     "Payment released successfully via SWIFT"            │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## ⚖️ UCP 600 COMPLIANCE

```
┌────────────────────────────────────────────────────────────┐
│  UCP 600 - Uniform Customs and Practice for Documentary   │
│            Credits (ICC Publication No. 600)               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Article 14: Standard for Examination of Documents         │
│  ─────────────────────────────────────────────────────────│
│                                                            │
│  "A nominated bank acting on its nomination, a            │
│   confirming bank, if any, and the issuing bank           │
│   MUST examine a presentation to determine,               │
│   on the basis of the documents alone, whether            │
│   or not the documents appear on their face               │
│   to constitute a complying presentation."                │
│                                                            │
│  Maximum time: 5 banking days to examine                  │
│                                                            │
│  ─────────────────────────────────────────────────────────│
│                                                            │
│  Article 15: Complying Presentation                        │
│  ─────────────────────────────────────────────────────────│
│                                                            │
│  "When a nominated bank determines that a                 │
│   presentation is complying, it must forward              │
│   the documents to the issuing bank..."                   │
│                                                            │
│  "When an issuing bank determines that a                  │
│   presentation is complying, it must honour."             │
│                                                            │
│  HONOUR = PAY THE EXPORTER                                │
│                                                            │
│  ─────────────────────────────────────────────────────────│
│                                                            │
│  CONCLUSION: Payment ONLY after documents examined        │
│              and found to be complying ✅                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## ✅ CECBS SYSTEM VERIFICATION

```
System Component: CORRECT ✅
───────────────────────────

Frontend (BanksPortal.tsx):
  Line 422: steps: [...'Examine Documents', 'Release Payment']
  Status: ✅ Correct order

Backend (banking.ts):
  Line 2652: POST /lc/:lcID/release-payment
  Checks: Document verification before payment
  Status: ✅ Enforces sequence

Blockchain (banking.go):
  Line 1009: func ReleaseLCPayment()
  Requires: lc.Status == "UTILIZED" (documents verified)
  Status: ✅ Cannot bypass examination

UI Tabs:
  Tab 3: Document Examination (FIRST)
  Tab 4: Payment Release (AFTER)
  Status: ✅ Correct visual order

Workflow Enforcement:
  Payment Release tab filters: status === 'DOCUMENTS_VERIFIED'
  Status: ✅ Only shows verified LCs
```

---

## 🎓 SUMMARY

### ❓ Question:
**Which step comes first - Document Examination or LC Settlement?**

### ✅ Answer:
**DOCUMENT EXAMINATION (Step 5) comes BEFORE Payment/Settlement (Step 6)**

### 📊 Your System:
**✅ CORRECTLY IMPLEMENTED** - Follows UCP 600 international standards

### 🔒 Enforcement:
- ✅ Workflow steps defined in correct order
- ✅ UI tabs arranged correctly (Tab 3 before Tab 4)
- ✅ Backend validates document verification
- ✅ Blockchain enforces status requirements
- ✅ Cannot bypass document examination

### 🎯 Conclusion:
**NO CHANGES NEEDED** - System is already correct!

---

**Document Created:** September 17, 2026  
**Standard Reference:** UCP 600 (ICC Publication No. 600)  
**System Status:** ✅ UCP 600 Compliant  
**Workflow:** ✅ Correctly Implemented
