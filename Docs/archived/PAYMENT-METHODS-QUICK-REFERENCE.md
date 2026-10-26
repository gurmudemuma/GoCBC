# Payment Methods Quick Reference Guide

## Payment Method Selection Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│          Do you know and trust the buyer?                   │
└─────────────┬───────────────────────────────┬───────────────┘
              │ NO                            │ YES
              ▼                               ▼
     ┌────────────────┐              ┌────────────────┐
     │   Use LC       │              │  Consider CAD  │
     │  (Bank Guard)  │              │  or TT methods │
     └────────────────┘              └────────┬───────┘
                                               │
                     ┌─────────────────────────┴─────────────────┐
                     │                                           │
                     ▼                                           ▼
            ┌─────────────────┐                        ┌─────────────────┐
            │  Need cash flow │                        │ Trust completely│
            │  for sourcing?  │                        │   with buyer?   │
            └────────┬────────┘                        └────────┬────────┘
                     │                                          │
            YES ┌────┴────┐ NO                         YES ┌────┴────┐ NO
                ▼         ▼                                ▼         ▼
           TT_ADVANCE   CAD                            ADVANCE   TT_POST
```

## Quick Comparison Matrix

| Method      | Setup Time | Risk  | Cost | Cash Flow | Best For |
|-------------|-----------|-------|------|-----------|----------|
| **LC**      | 2-3 weeks | ⭐    | $$$  | After ship| New buyers |
| **CAD**     | 1 week    | ⭐⭐  | $$   | After ship| Known buyers |
| **TT_ADVANCE** | 3-5 days | ⭐   | $    | Before ship| Cash needs |
| **TT_POST** | 1-2 days  | ⭐⭐⭐⭐⭐| $  | After ship| Trusted only |
| **ADVANCE** | 1-2 days  | ⭐    | $    | Immediate | Special orders |

## API Call Sequences

### LC (Letter of Credit)
```javascript
// 1. Initiate
POST /api/v1/payments/initiate
{ paymentMethod: 'LC', lcID, ... }

// 2. Submit Documents
POST /api/v1/payments/:paymentID/documents
{ documents: [...] }

// 3. Verify
POST /api/v1/payments/:paymentID/verify
{ verifiedBy, comments }

// 4. Settle
POST /api/v1/payments/:paymentID/settle
{ exchangeRate, retentionRate, ... }
```

### CAD (Cash Against Documents)
```javascript
// 1. Initiate
POST /api/v1/payments/initiate
{ paymentMethod: 'CAD', ... }

// 2-8. Status Updates
POST /api/v1/payments/:paymentID/status
{ status: 'GOODS_SHIPPED' }
{ status: 'DOCUMENTS_SENT_TO_BANK' }
{ status: 'DOCUMENTS_FORWARDED' }
{ status: 'BUYER_NOTIFIED' }
{ status: 'PAYMENT_RECEIVED' }
{ status: 'DOCUMENTS_RELEASED' }
{ status: 'SETTLED' }
```

### TT_ADVANCE (Telegraphic Transfer Advance)
```javascript
// 1. Initiate
POST /api/v1/payments/initiate
{ paymentMethod: 'TT_ADVANCE', ... }

// 2. Receive Advance
POST /api/v1/payments/:paymentID/advance
{ advancePercentage: '30', amountReceived: '51000' }

// 3. Update Status
POST /api/v1/payments/:paymentID/status
{ status: 'GOODS_SHIPPED' }

// 4. Receive Balance
POST /api/v1/payments/:paymentID/balance
{ amountReceived: '119000' }

// 5. Settle
POST /api/v1/payments/:paymentID/status
{ status: 'SETTLED' }
```

### TT_POST (Telegraphic Transfer Post-Shipment)
```javascript
// 1. Initiate
POST /api/v1/payments/initiate
{ paymentMethod: 'TT_POST', ... }

// 2-5. Status Updates
POST /api/v1/payments/:paymentID/status
{ status: 'GOODS_SHIPPED' }
{ status: 'DOCUMENTS_SENT_DIRECTLY' }
{ status: 'PAYMENT_AWAITED' }
{ status: 'PAYMENT_RECEIVED' }
{ status: 'SETTLED' }
```

### ADVANCE (Advance Payment)
```javascript
// 1. Initiate (before contract)
POST /api/v1/payments/initiate
{ paymentMethod: 'ADVANCE', contractID: 'PENDING', ... }

// 2. Receive Full Advance
POST /api/v1/payments/:paymentID/advance
{ advancePercentage: '100', amountReceived: '170000' }

// 3-7. Status Updates (post-sourcing)
POST /api/v1/payments/:paymentID/status
{ status: 'CONTRACT_REGISTERED' }
{ status: 'COFFEE_SOURCING' }
{ status: 'QUALITY_INSPECTION' }
{ status: 'GOODS_SHIPPED' }
{ status: 'SETTLED' }
```

## NBE Retention Rates

```javascript
const NBE_RETENTION = {
  LC: 0.30,          // 30% - Bank guaranteed
  CAD: 0.40,         // 40% - Medium risk
  TT_ADVANCE: 0.30,  // 30% - Advance secured
  TT_POST: 0.50,     // 50% - High risk
  ADVANCE: 0.20      // 20% - Prepaid (lowest risk)
};
```

## Common Errors & Solutions

### Error: "Invalid status transition"
**Cause:** Trying to skip states in the state machine  
**Solution:** Follow the correct state sequence for your payment method

### Error: "LC must be ISSUED"
**Cause:** Trying to initiate LC payment before LC issuance  
**Solution:** Complete LC workflow: Request → Approve → **Issue** → Initiate Payment

### Error: "Payment cannot be settled"
**Cause:** Wrong status for settlement  
**Solution:** 
- LC: Must be in VERIFIED status
- Others: Use status update to SETTLED

### Error: "Documents cannot be submitted"
**Cause:** Wrong payment status for document submission  
**Solution:** LC must be in PENDING status before document submission

## Testing

### Run Single Method Test
```javascript
// Modify test-payment-methods.js to test only one method:
async function runAllTests() {
  const results = {
    LC: await testLC(),
    // CAD: await testCAD(),
    // ... comment out other methods
  };
}
```

### Run Full Test Suite
```bash
cd c:\goCBC
node test-payment-methods.js
```

### Expected Test Duration
- Per method: ~30-45 seconds
- All 5 methods: ~3-4 minutes

## Status Codes Quick Reference

| Status | Meaning | Next Steps |
|--------|---------|------------|
| PENDING | Just initiated | Submit documents (LC) or update status |
| DOCUMENTS_SUBMITTED | Docs with bank | Bank verification needed |
| VERIFIED | Docs approved | Ready for settlement |
| GOODS_SHIPPED | Cargo departed | Track shipment, await payment |
| ADVANCE_RECEIVED | Advance paid | Source coffee, prepare shipment |
| BALANCE_RECEIVED | Full payment in | Ready for settlement |
| PAYMENT_RECEIVED | Buyer paid | Release documents, settle |
| SETTLED | Complete | Export proceeds distributed |

## Integration Checklist

- [ ] Contract approved by NBE
- [ ] Shipment created (except ADVANCE method)
- [ ] LC issued (LC method only)
- [ ] Quality inspection passed
- [ ] Customs clearance obtained
- [ ] Bill of Lading issued
- [ ] Payment method selected
- [ ] Bank details verified
- [ ] Forex allocation confirmed
- [ ] NBE retention calculated

---

**Quick Start:** For most exports, use **LC method** for safety  
**Need cash flow?** Use **TT_ADVANCE** with 30-50% advance  
**Trusted buyer?** Consider **CAD** to save on bank fees  
**Last resort:** **TT_POST** only for long-term proven partners  
**Special cases:** **ADVANCE** when buyer finances your sourcing

---

**File:** `PAYMENT-METHODS-QUICK-REFERENCE.md`  
**Last Updated:** July 8, 2026
