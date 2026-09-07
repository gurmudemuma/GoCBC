# Banks Portal - Workflow Clarification

**Date:** September 1, 2026  
**Purpose:** Clarify the relationship between tabs and workflow stages

---

## 📊 Banks Portal Tabs Overview

The Banks Portal has **9 tabs** representing different stages of the LC and export workflow:

| Tab | Name | Stage | Works With | Status Expected |
|-----|------|-------|------------|-----------------|
| 0 | Payment Methods | LC Creation | New LCs | - |
| 1 | Forex Allocations | Forex Management | Approved LCs | - |
| 2 | SWIFT Messages | Communication | All LCs | - |
| 3 | **Document Examination** | **Pre-Shipment** | **LCs with submitted docs** | **DOCUMENTS_SUBMITTED** |
| 4 | **Payment Release** | **Pre-Delivery** | **LCs with verified docs** | **READY_FOR_PAYMENT** |
| 5 | Analytics | Reporting | All data | - |
| 6 | User Management | Administration | Users | - |
| 7 | Audit Trail | Compliance | All activities | - |
| 8 | **LC Settlements** | **Post-Delivery** | **Delivered shipments** | **DELIVERED** |

---

## 🔄 Complete LC Lifecycle Workflow

### Phase 1: LC Setup (Tabs 0-2)
```
Tab 0: Payment Methods → Create LC
  ↓ (LC status: REQUESTED → APPROVED → ISSUED)
Tab 1: Forex Allocations → Allocate forex for LC
  ↓
Tab 2: SWIFT Messages → Send MT700 (LC issuance)
```

### Phase 2: Pre-Shipment (Tab 3)
```
Tab 3: Document Examination
  ↓
  Input: LCs with status = DOCUMENTS_SUBMITTED
  Action: Bank examines export documents
  Documents: Invoice, Bill of Lading, Certificate of Origin, Quality Certificates
  ↓
  Output: LC status = UTILIZED (documents verified)
```

**What Tab 3 Expects:**
- ✅ LC must exist (created in Tab 0)
- ✅ Exporter has submitted shipping documents
- ✅ LC status = `DOCUMENTS_SUBMITTED` or `PENDING_EXAMINATION`
- ✅ Documents attached to LC (invoice, BL, COO, etc.)

**Tab 3 Does NOT Work With Delivered Shipments!**
- ❌ Tab 3 is for **pre-delivery** document verification
- ❌ NOT for post-delivery settlement

### Phase 3: Payment Before Delivery (Tab 4)
```
Tab 4: Payment Release
  ↓
  Input: LCs with status = READY_FOR_PAYMENT (documents verified)
  Action: Bank releases payment to exporter
  ↓
  Output: LC status = PAYMENT_RELEASED
  ↓
  Shipment proceeds to delivery
```

**What Tab 4 Expects:**
- ✅ Documents must be verified (Tab 3 completed)
- ✅ LC status = `READY_FOR_PAYMENT` or `UTILIZED`
- ✅ Compliance checks passed
- ✅ No discrepancies in documents

**Tab 4 Does NOT Work With Delivered Shipments!**
- ❌ Tab 4 is for **initial payment release** before/during shipping
- ❌ NOT for post-delivery settlements

### Phase 4: Shipment & Delivery (External)
```
(Shipping Portal) → Ship goods
  ↓
(Customs Portal) → Clear customs
  ↓
(Shipping Portal) → Mark as DELIVERED
  ↓
  Shipment status = DELIVERED
```

### Phase 5: Post-Delivery Settlement (Tab 8) ⭐ NEW
```
Tab 8: LC Settlements
  ↓
  Input: Shipments with status = DELIVERED
  Action: Track post-delivery processes
  
  Step 1: Record Payment (Bank) ← Payment RECEIVED from buyer
  Step 2: Record Forex Repatriation (NBE) ← 70% repatriated
  Step 3: Record LC Settlement (Bank) ← Settle LC with correspondent bank
  Step 4: Complete ECTA Audit (ECTA) ← Final compliance audit
  Step 5: Close Contract (Admin) ← Complete the cycle
  ↓
  Output: Contract CLOSED, workflow 100% complete
```

**What Tab 8 Expects:**
- ✅ Shipment must have status = `DELIVERED`
- ✅ Goods have been physically delivered to buyer
- ✅ Payment Release already happened (in Tab 4)
- ✅ Now tracking final settlement and closure

---

## 🎯 Key Differences: Tab 4 vs Tab 8

### Tab 4: Payment Release (Pre-Delivery)
**Purpose:** Release initial payment to exporter so goods can ship  
**Timing:** BEFORE or DURING shipment  
**Status:** LC status = `READY_FOR_PAYMENT`  
**Action:** Bank pays exporter based on document compliance  
**Result:** Goods can be shipped

**Example:**
1. Exporter submits docs (Invoice: $100,000)
2. Bank examines docs (Tab 3) ✓
3. Bank releases $100,000 to exporter (Tab 4) ✓
4. Exporter ships goods →
5. Goods delivered →

### Tab 8: LC Settlements (Post-Delivery)
**Purpose:** Track post-delivery settlement and closure  
**Timing:** AFTER delivery complete  
**Status:** Shipment status = `DELIVERED`  
**Action:** Bank records payment received from BUYER  
**Result:** LC settled, contract can close

**Example:**
1. Goods delivered ✓
2. Buyer pays bank $100,000 (Tab 8: Step 1) ✓
3. NBE handles forex (30% retention, 70% repatriation) (Tab 8: Step 2) ✓
4. Bank settles LC with correspondent bank (Tab 8: Step 3) ✓
5. ECTA completes final audit (Tab 8: Step 4) ✓
6. Contract closed (Tab 8: Step 5) ✓

---

## 💰 Payment Flow Clarification

### Two Types of Payments:

#### 1. Payment to Exporter (Tab 4)
```
Bank → Exporter
Amount: LC Amount (e.g., $100,000)
Timing: Before/during shipment
Purpose: Finance the export
Tab: 4 (Payment Release)
```

#### 2. Payment from Buyer (Tab 8)
```
Buyer → Bank
Amount: LC Amount + fees (e.g., $100,000)
Timing: After delivery
Purpose: Settle the LC
Tab: 8 (LC Settlements)
```

### Complete Flow:
```
1. Bank pays Exporter $100k (Tab 4)
   └─ Exporter ships goods

2. Goods delivered to Buyer
   └─ Shipment status = DELIVERED

3. Buyer pays Bank $100k (Tab 8, Step 1)
   └─ Bank records payment received

4. NBE handles forex 70% repatriation (Tab 8, Step 2)
   └─ Foreign exchange settled

5. Bank settles LC with correspondent bank (Tab 8, Step 3)
   └─ LC formally closed

6. ECTA audit (Tab 8, Step 4)
   └─ Compliance verified

7. Contract closed (Tab 8, Step 5)
   └─ Complete!
```

---

## 📋 Data Structure Expectations

### Tab 3: Document Examination
**Works with:** `letterOfCredits` array  
**Filters for:**
```javascript
const lcsForExamination = letterOfCredits.filter(lc => 
  lc.status === 'DOCUMENTS_SUBMITTED' || 
  lc.status === 'PENDING_EXAMINATION'
);
```

**Expected LC Object:**
```javascript
{
  lcId: "LC123456",
  exporterId: "EXP001",
  amount: 100000,
  currency: "USD",
  status: "DOCUMENTS_SUBMITTED",  // ← Key field
  documents: [
    { type: "INVOICE", url: "..." },
    { type: "BILL_OF_LADING", url: "..." },
    { type: "COO", url: "..." }
  ]
}
```

### Tab 4: Payment Release
**Works with:** `letterOfCredits` array  
**Filters for:**
```javascript
const lcsForPaymentRelease = letterOfCredits.filter(lc => 
  lc.status === 'READY_FOR_PAYMENT' || 
  lc.status === 'UTILIZED'  // Documents verified
);
```

**Expected LC Object:**
```javascript
{
  lcId: "LC123456",
  exporterId: "EXP001",
  amount: 100000,
  currency: "USD",
  status: "READY_FOR_PAYMENT",  // ← Key field
  documentsVerified: true
}
```

### Tab 8: LC Settlements
**Works with:** `deliveredShipments` array (NOT letterOfCredits!)  
**Filters for:**
```javascript
const deliveredShipments = shipments.filter(s => 
  s.status === 'DELIVERED'
);
```

**Expected Shipment Object:**
```javascript
{
  shipmentId: "SHIP1786102768",
  contractId: "CONTRACT001",
  status: "DELIVERED",  // ← Key field
  deliveryDate: "2026-09-01",
  // Links back to LC via contractId
}
```

---

## ✅ Summary

### Tab 3 (Document Examination)
- ⏱️ **Timing:** Pre-shipment
- 📦 **Works with:** LCs with submitted documents
- 🎯 **Purpose:** Verify export documents comply with LC terms
- ✅ **Status needed:** `DOCUMENTS_SUBMITTED`
- ❌ **Does NOT use:** Delivered shipments

### Tab 4 (Payment Release)
- ⏱️ **Timing:** After doc verification, before delivery
- 📦 **Works with:** LCs with verified documents
- 🎯 **Purpose:** Release payment to exporter
- ✅ **Status needed:** `READY_FOR_PAYMENT` or `UTILIZED`
- ❌ **Does NOT use:** Delivered shipments

### Tab 8 (LC Settlements) ⭐
- ⏱️ **Timing:** Post-delivery
- 📦 **Works with:** Delivered shipments
- 🎯 **Purpose:** Track settlement and contract closure
- ✅ **Status needed:** Shipment status = `DELIVERED`
- ✅ **Uses:** PostDeliveryWorkflowPanel component

---

## 🔧 Technical Implementation

### Tab 3 & 4 Implementation
```typescript
// Filter LCs by status
const lcsForExamination = letterOfCredits.filter(lc => 
  lc.status === 'DOCUMENTS_SUBMITTED'
);

const lcsForPaymentRelease = letterOfCredits.filter(lc => 
  lc.status === 'READY_FOR_PAYMENT'
);
```

### Tab 8 Implementation
```typescript
// Filter SHIPMENTS (not LCs!) by delivery status
const deliveredShipments = await apiFetch('/shipments?status=DELIVERED');

// Then display PostDeliveryWorkflowPanel for each
deliveredShipments.map(shipment => (
  <PostDeliveryWorkflowPanel
    shipmentId={shipment.shipmentId}
    userRole="BANK"
    onRefresh={loadBankingData}
  />
));
```

---

## 🎓 Conclusion

**Tab 3 and Tab 4 are NOT related to Tab 8!**

- **Tabs 3 & 4:** Work with LCs in pre-delivery stages
  - Tab 3: Document examination (pre-shipment)
  - Tab 4: Initial payment release (pre-delivery)
  
- **Tab 8:** Works with delivered shipments for post-delivery settlement
  - Completely different data source (shipments vs LCs)
  - Different purpose (settlement vs initial payment)
  - Different stage (after delivery vs before delivery)

**The workflows are sequential but separate:**
```
Tab 0 → Tab 3 → Tab 4 → [Shipment] → [Delivery] → Tab 8
  ↓       ↓       ↓                                    ↓
Create  Verify  Release                           Settle &
  LC    Docs   Payment                            Close
```

---

**Last Updated:** September 1, 2026  
**Status:** Clarified - No conflicts between tabs
