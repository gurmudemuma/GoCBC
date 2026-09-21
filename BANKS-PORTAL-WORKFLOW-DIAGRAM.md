# Banks Portal Workflow Diagram

**Visual representation of the complete LC lifecycle with status transitions**

## Complete System Workflow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         COFFEE EXPORT LC WORKFLOW                          │
│                    Blockchain-Powered Signature Chain                      │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: LC Request Creation                                            │
│  Portal: 📤 EXPORTER                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│  Status: null → REQUESTED                                                │
│  Actions:                                                                │
│    • Exporter creates LC request                                         │
│    • Uploads 12 required documents                                       │
│    • Submits for bank review                                             │
│  Blockchain: CreateLCRequest chaincode                                   │
└──────────────────────────────────────────────────────────────────────────┘
                                   ↓
                    [LC Status: REQUESTED]
                                   ↓
┌──────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: LC Review & Approval                                           │
│  Portal: 🏦 BANKS (Tab 0: Payment Methods & LC Review)                   │
├──────────────────────────────────────────────────────────────────────────┤
│  Status: REQUESTED → APPROVED → ISSUED                                   │
│  Actions:                                                                │
│    • Bank reviews LC request                                             │
│    • Verifies exporter eligibility                                       │
│    • Approves LC ──────────────────────► 📝 Blockchain Signature #1     │
│    • Issues LC to exporter ────────────► 📝 Blockchain Signature #2     │
│  Blockchain: ApproveLCRequest, IssueLCRequest chaincodes                 │
│  Filter: lc.status === 'REQUESTED' || lc.status === 'APPROVED'          │
└──────────────────────────────────────────────────────────────────────────┘
                                   ↓
                    [LC Status: ISSUED]
                                   ↓
┌──────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: Forex Allocation                                               │
│  Portal: 🏦 BANKS (Tab 1: Forex Allocation)                              │
│  Monitoring: 🏛️ NBE (Real-time forex tracking)                          │
├──────────────────────────────────────────────────────────────────────────┤
│  Status: ISSUED → FOREX_ALLOCATED                                        │
│  Actions:                                                                │
│    • Check NBE forex availability                                        │
│    • Allocate forex from bank's pool ──► 📝 Blockchain Signature #3     │
│    • Deduct from NBE forex pool                                          │
│  Blockchain: AllocateForex chaincode                                     │
│  Filter: lc.status === 'ISSUED' || lc.status === 'FOREX_ALLOCATED'      │
│  NBE Sees: Allocation in real-time with amount and timestamp             │
└──────────────────────────────────────────────────────────────────────────┘
                                   ↓
                 [LC Status: FOREX_ALLOCATED]
                                   ↓
┌──────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: Document Examination ✅ FIXED                                  │
│  Portal: 🏦 BANKS (Tab 2: Document Examination)                          │
│  Visibility: 📤 EXPORTER (Sees verification status real-time)           │
├──────────────────────────────────────────────────────────────────────────┤
│  Status: FOREX_ALLOCATED → UTILIZED                                      │
│  Filter: ['FOREX_ALLOCATED', 'UTILIZED'].includes(lc.status)             │
│  Actions:                                                                │
│    • Examine Bill of Lading ───────────► 📝 Blockchain Signature #4     │
│    • Examine Commercial Invoice ───────► 📝 Blockchain Signature #5     │
│    • Examine Packing List ─────────────► 📝 Blockchain Signature #6     │
│    • Examine Certificate of Origin ────► 📝 Blockchain Signature #7     │
│    • Examine Insurance Certificate ────► 📝 Blockchain Signature #8     │
│    • Examine Quality Certificate ──────► 📝 Blockchain Signature #9     │
│    • Examine Phytosanitary Certificate ► 📝 Blockchain Signature #10    │
│    • Examine Weight Certificate ───────► 📝 Blockchain Signature #11    │
│    • Examine Fumigation Certificate ───► 📝 Blockchain Signature #12    │
│    • Examine ICO Certificate ──────────► 📝 Blockchain Signature #13    │
│    • Examine EUR1 Certificate ─────────► 📝 Blockchain Signature #14    │
│    • Examine Customs Declaration ──────► 📝 Blockchain Signature #15    │
│  Blockchain: ExamineLCDocuments chaincode (12 signatures)                │
│  Validation: Chaincode checks status == "FOREX_ALLOCATED"                │
│  Optimistic UI: Buttons show loading state immediately                   │
│  Exporter Sees: Each document status updated in real-time                │
└──────────────────────────────────────────────────────────────────────────┘
                                   ↓
                   [LC Status: UTILIZED]
                  (All docs verified)
                                   ↓
┌──────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: Payment Release ✅ FIXED                                       │
│  Portal: 🏦 BANKS (Tab 3: Payment Release)                               │
│  Notification: 📤 EXPORTER (Payment notification)                        │
├──────────────────────────────────────────────────────────────────────────┤
│  Status: UTILIZED → PAYMENT_RELEASED                                     │
│  Filter: lc.status === 'UTILIZED' (strict check)                         │
│  Actions:                                                                │
│    • Verify all documents examined                                       │
│    • Review payment terms                                                │
│    • Release payment ──────────────────► 📝 Blockchain Signature #16    │
│    • Create Payment entity                                               │
│  Blockchain: ReleaseLCPayment chaincode + Payment entity                 │
│  Validation: Chaincode checks status == "UTILIZED"                       │
│  Payment Methods: SWIFT MT103, ACH, Wire Transfer                        │
│  Exporter Sees: Payment released notification with amount                │
└──────────────────────────────────────────────────────────────────────────┘
                                   ↓
                [LC Status: PAYMENT_RELEASED]
                                   ↓
┌──────────────────────────────────────────────────────────────────────────┐
│  PHASE 6: SWIFT Messages (Optional)                                      │
│  Portal: 🏦 BANKS (Tab 4: SWIFT MT700 Messages)                          │
├──────────────────────────────────────────────────────────────────────────┤
│  Status: Any status with SWIFT messages                                  │
│  Filter: lc.swiftMessages && lc.swiftMessages.length > 0                 │
│  Actions:                                                                │
│    • View SWIFT MT700 messages                                           │
│    • Send to correspondent banks                                         │
│    • Track message status                                                │
│  Blockchain: SWIFT message hashes stored                                 │
└──────────────────────────────────────────────────────────────────────────┘
                                   ↓
┌──────────────────────────────────────────────────────────────────────────┐
│  PHASE 7: LC Settlement                                                  │
│  Portal: 🏦 BANKS (Tab 5: LC Settlement)                                 │
│  Monitoring: 🏛️ NBE (Records completed transaction)                     │
│  Notification: 📤 EXPORTER (Settlement confirmation)                     │
├──────────────────────────────────────────────────────────────────────────┤
│  Status: PAYMENT_RELEASED → SETTLED                                      │
│  Filter: ['PAYMENT_RELEASED', 'SETTLED'].includes(lc.status)             │
│  Actions:                                                                │
│    • Verify payment received                                             │
│    • Complete SWIFT settlement                                           │
│    • Mark LC as SETTLED ───────────────► 📝 Blockchain Signature #17    │
│    • Update forex records                                                │
│  Blockchain: SettlePayment chaincode                                     │
│  Validation: Chaincode checks status == "PAYMENT_RELEASED"               │
│  NBE Sees: Completed transaction in compliance dashboard                 │
│  Exporter Sees: Final settlement confirmation with date                  │
└──────────────────────────────────────────────────────────────────────────┘
                                   ↓
                   [LC Status: SETTLED]
                    (Final State ✅)
```

---

## Status Transition Map

```
┌─────────────┐
│   null      │  Exporter Portal: LC not yet created
└──────┬──────┘
       │ CreateLCRequest
       ↓
┌─────────────┐
│  REQUESTED  │  Banks Tab 0: Awaiting bank review
└──────┬──────┘
       │ ApproveLCRequest (Signature #1)
       ↓
┌─────────────┐
│  APPROVED   │  Banks Tab 0: Approved, awaiting issuance
└──────┬──────┘
       │ IssueLCRequest (Signature #2)
       ↓
┌─────────────┐
│   ISSUED    │  Banks Tab 1: Awaiting forex allocation
└──────┬──────┘
       │ AllocateForex (Signature #3)
       ↓
┌─────────────────┐
│ FOREX_ALLOCATED │  Banks Tab 2: Awaiting document examination
└──────┬──────────┘
       │ ExamineLCDocuments (Signatures #4-#15, 12 total)
       ↓
┌─────────────┐
│  UTILIZED   │  Banks Tab 3: Awaiting payment release
└──────┬──────┘
       │ ReleaseLCPayment (Signature #16)
       ↓
┌──────────────────┐
│ PAYMENT_RELEASED │  Banks Tab 5: Awaiting settlement
└──────┬───────────┘
       │ SettlePayment (Signature #17)
       ↓
┌─────────────┐
│   SETTLED   │  Final State ✅
└─────────────┘
```

---

## Tab Filter Logic (After Fix)

```
┌────────────────────────────────────────────────────────────────────┐
│ Tab 0: Payment Methods & LC Review                                 │
├────────────────────────────────────────────────────────────────────┤
│ Filter: lc.status === 'REQUESTED' || lc.status === 'APPROVED'     │
│ Shows: New LC requests awaiting approval or issuance               │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Tab 1: Forex Allocation                                            │
├────────────────────────────────────────────────────────────────────┤
│ Filter: lc.status === 'ISSUED' || lc.status === 'FOREX_ALLOCATED' │
│ Shows: Issued LCs needing forex OR already allocated (history)     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Tab 2: Document Examination ✅ FIXED                               │
├────────────────────────────────────────────────────────────────────┤
│ Filter: ['FOREX_ALLOCATED', 'UTILIZED'].includes(lc.status)        │
│ Shows: LCs with forex allocated needing doc exam OR examined       │
│ Keeps: UTILIZED for historical view of examined documents          │
│ Removed: DOCUMENTS_SUBMITTED, DOCUMENTS_COMPLIANT (invalid)        │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Tab 3: Payment Release ✅ FIXED                                    │
├────────────────────────────────────────────────────────────────────┤
│ Filter: lc.status === 'UTILIZED'                                   │
│ Shows: Only LCs with all documents examined (strict check)         │
│ Removed: DOCUMENTS_COMPLIANT, READY_FOR_PAYMENT (invalid)          │
│ Removed: FOREX_ALLOCATED (too early in workflow)                   │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Tab 4: SWIFT MT700 Messages                                        │
├────────────────────────────────────────────────────────────────────┤
│ Filter: lc.swiftMessages && lc.swiftMessages.length > 0            │
│ Shows: Any LC with SWIFT messages (cross-cutting view)             │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Tab 5: LC Settlement                                               │
├────────────────────────────────────────────────────────────────────┤
│ Filter: ['PAYMENT_RELEASED', 'SETTLED'].includes(lc.status)        │
│ Shows: LCs with payment released awaiting settlement OR settled    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Blockchain Signature Chain

```
┌──────────────────────────────────────────────────────────────────┐
│ LC: LC1787055024941                                              │
│ Exporter: Coffee Exporter ABC                                    │
│ Amount: $50,000 USD                                              │
│                                                                  │
│ Blockchain Signature Trail (17 total):                          │
├──────────────────────────────────────────────────────────────────┤
│ #1  │ LC Approval           │ bank1.cecbs.et │ 2026-09-18 09:00 │
│ #2  │ LC Issuance           │ bank1.cecbs.et │ 2026-09-18 09:05 │
│ #3  │ Forex Allocation      │ bank1.cecbs.et │ 2026-09-18 09:30 │
│ #4  │ Bill of Lading        │ bank1.cecbs.et │ 2026-09-18 10:00 │
│ #5  │ Commercial Invoice    │ bank1.cecbs.et │ 2026-09-18 10:02 │
│ #6  │ Packing List          │ bank1.cecbs.et │ 2026-09-18 10:04 │
│ #7  │ Certificate of Origin │ bank1.cecbs.et │ 2026-09-18 10:06 │
│ #8  │ Insurance Certificate │ bank1.cecbs.et │ 2026-09-18 10:08 │
│ #9  │ Quality Certificate   │ bank1.cecbs.et │ 2026-09-18 10:10 │
│ #10 │ Phytosan Certificate  │ bank1.cecbs.et │ 2026-09-18 10:12 │
│ #11 │ Weight Certificate    │ bank1.cecbs.et │ 2026-09-18 10:14 │
│ #12 │ Fumigation Cert       │ bank1.cecbs.et │ 2026-09-18 10:16 │
│ #13 │ ICO Certificate       │ bank1.cecbs.et │ 2026-09-18 10:18 │
│ #14 │ EUR1 Certificate      │ bank1.cecbs.et │ 2026-09-18 10:20 │
│ #15 │ Customs Declaration   │ bank1.cecbs.et │ 2026-09-18 10:22 │
│ #16 │ Payment Release       │ bank1.cecbs.et │ 2026-09-18 11:00 │
│ #17 │ Settlement Complete   │ bank1.cecbs.et │ 2026-09-18 14:00 │
└──────────────────────────────────────────────────────────────────┘

Each signature includes:
  • signatureId: SIG_{resource}_{mspId}_{timestamp}
  • X.509 Certificate of signer
  • Blockchain Transaction ID
  • Timestamp with millisecond precision
  • Action taken (APPROVE/REJECT/ISSUE/ALLOCATE/RELEASE/SETTLE)
  • Remarks/Comments from officer
```

---

## Cross-Portal Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    REAL-TIME DATA FLOW                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   EXPORTER  │◄───────►│    BANKS    │◄───────►│     NBE     │
│   PORTAL    │         │   PORTAL    │         │   PORTAL    │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │                       │
       │ Creates LC            │                       │
       ├──────────────────────►│                       │
       │ (REQUESTED)           │                       │
       │                       │                       │
       │                       │ Approves & Issues     │
       │◄──────────────────────┤                       │
       │ (Status: ISSUED)      │                       │
       │                       │                       │
       │                       │ Allocates Forex       │
       │                       ├──────────────────────►│
       │                       │                       │
       │                       │                  NBE monitors
       │                       │                  forex usage
       │                       │                       │
       │                       │ Examines Docs         │
       │◄──────────────────────┤ (12 signatures)       │
       │ (Each doc verified)   │                       │
       │                       │                       │
       │                       │ Releases Payment      │
       │◄──────────────────────┤                       │
       │ (Payment notification)│                       │
       │                       │                       │
       │                       │ Settles LC            │
       │◄──────────────────────┤──────────────────────►│
       │ (Settlement confirm)  │                  NBE records
       │                       │                  completion
       │                       │                       │
       ▼                       ▼                       ▼
   Sees complete         Creates 17             Compliance
   audit trail          blockchain              dashboard
   with timestamps      signatures              updated
```

---

## Before vs After Fix

### BEFORE (Broken) ❌

```
Tab 2 Filter:
┌─────────────────────────────────────────────────────────┐
│ if (!['ISSUED', 'FOREX_ALLOCATED',                      │
│       'DOCUMENTS_SUBMITTED',    ← INVALID (not in chaincode)
│       'UTILIZED',                                       │
│       'DOCUMENTS_COMPLIANT']    ← INVALID (not in chaincode)
│      .includes(lc.status))                              │
│   return false;                                         │
└─────────────────────────────────────────────────────────┘

Tab 3 Filter:
┌─────────────────────────────────────────────────────────┐
│ if (!['UTILIZED',                                       │
│       'DOCUMENTS_COMPLIANT',    ← INVALID (not in chaincode)
│       'READY_FOR_PAYMENT',      ← INVALID (not in chaincode)
│       'FOREX_ALLOCATED']        ← Too early in workflow
│      .includes(lc.status))                              │
│   return false;                                         │
└─────────────────────────────────────────────────────────┘

Problems:
  • Phantom statuses causing filter failures
  • LCs disappearing or appearing in wrong tabs
  • Mismatch with blockchain validation
  • Confusing user experience
```

### AFTER (Fixed) ✅

```
Tab 2 Filter:
┌─────────────────────────────────────────────────────────┐
│ // Valid statuses from chaincode:                      │
│ // FOREX_ALLOCATED → UTILIZED (after examination)      │
│ if (!['FOREX_ALLOCATED', 'UTILIZED']                   │
│      .includes(lc.status))                              │
│   return false;                                         │
└─────────────────────────────────────────────────────────┘

Tab 3 Filter:
┌─────────────────────────────────────────────────────────┐
│ // Valid chaincode workflow:                           │
│ // UTILIZED → PAYMENT_RELEASED (via ReleaseLCPayment)  │
│ if (lc.status !== 'UTILIZED')                          │
│   return false;                                         │
└─────────────────────────────────────────────────────────┘

Benefits:
  ✅ Only valid chaincode statuses used
  ✅ LCs appear in correct tabs
  ✅ Perfect match with blockchain validation
  ✅ Clean, predictable workflow
  ✅ Historical visibility maintained (Tab 2 keeps UTILIZED)
```

---

## Testing Workflow Visualization

```
START TEST
    │
    ├─► Create LC (Exporter Portal)
    │   Status: REQUESTED
    │   ✓ Verify: LC appears in Banks Tab 0
    │
    ├─► Approve LC (Banks Tab 0)
    │   Status: APPROVED
    │   ✓ Verify: Blockchain signature #1 created
    │
    ├─► Issue LC (Banks Tab 0)
    │   Status: ISSUED
    │   ✓ Verify: Blockchain signature #2 created
    │   ✓ Verify: LC appears in Banks Tab 1
    │
    ├─► Allocate Forex (Banks Tab 1)
    │   Status: FOREX_ALLOCATED
    │   ✓ Verify: Blockchain signature #3 created
    │   ✓ Verify: NBE Portal shows allocation
    │   ✓ Verify: LC appears in Banks Tab 2
    │
    ├─► Examine Documents (Banks Tab 2) ✅ CRITICAL TEST
    │   │
    │   ├─► Approve Bill of Lading
    │   │   ✓ Verify: Button shows loading immediately
    │   │   ✓ Verify: Blockchain signature #4 created
    │   │   ✓ Verify: Exporter sees "VERIFIED" status
    │   │
    │   ├─► Approve Commercial Invoice
    │   │   ✓ Verify: Blockchain signature #5 created
    │   │
    │   ├─► Approve remaining 10 documents
    │   │   ✓ Verify: Signatures #6-#15 created (10 total)
    │   │
    │   └─► After all 12 documents verified
    │       Status: UTILIZED
    │       ✓ Verify: LC remains visible in Tab 2 (historical)
    │       ✓ Verify: LC appears in Banks Tab 3
    │       ✓ Verify: Exporter sees all 12 docs VERIFIED
    │
    ├─► Release Payment (Banks Tab 3) ✅ CRITICAL TEST
    │   Status: PAYMENT_RELEASED
    │   ✓ Verify: Only UTILIZED LCs shown in list
    │   ✓ Verify: Blockchain signature #16 created
    │   ✓ Verify: Payment entity created
    │   ✓ Verify: Exporter receives payment notification
    │   ✓ Verify: LC appears in Banks Tab 5
    │
    ├─► Settle Payment (Banks Tab 5)
    │   Status: SETTLED
    │   ✓ Verify: Blockchain signature #17 created
    │   ✓ Verify: NBE records completed transaction
    │   ✓ Verify: Exporter sees settlement confirmation
    │
    └─► Query Blockchain Audit Trail
        ✓ Verify: 17 total signatures found
        ✓ Verify: All signatures have valid certificates
        ✓ Verify: Timestamp sequence correct
        ✓ Verify: All transaction IDs valid

END TEST ✅
```

---

## Key Improvements Summary

| Aspect                    | Before          | After           | Impact                |
|---------------------------|-----------------|-----------------|----------------------|
| Tab 2 Filter Statuses     | 5 (3 invalid)   | 2 (all valid)   | Clean, accurate      |
| Tab 3 Filter Statuses     | 4 (2 invalid)   | 1 (strict)      | Precise validation   |
| Blockchain Alignment      | Mismatched ❌   | Perfect ✅      | Trustworthy          |
| LC Visibility             | Inconsistent ❌ | Predictable ✅  | User confidence      |
| Status Transitions        | Unpredictable ❌| Validated ✅    | Reliable workflow    |
| Cross-Portal Integration  | Broken ❌       | Working ✅      | Seamless experience  |
| Audit Trail               | Incomplete ❌   | Complete ✅     | Full compliance      |

---

**Document Purpose:** Visual reference for Banks Portal workflow with blockchain signatures  
**Status:** ✅ Complete and accurate after status filter fixes  
**Last Updated:** 2026-09-18  
**Related:** BANKS-PORTAL-COMPLETE-FIX-SUMMARY.md, BANKS-PORTAL-TESTING-GUIDE.md
