# Payment Workflow Visual Comparison
**CECBS - Current vs Required Implementation**

**Date**: June 26, 2026

---

## ❌ CURRENT IMPLEMENTATION (INCORRECT)

### All Payment Methods Follow Same Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ALL PAYMENT METHODS                              │
│  (LC, CAD, TT Advance, TT Post, Advance Payment)                   │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
                     ┌─────────────┐
                     │   PENDING   │
                     └─────────────┘
                            ↓
                  ┌──────────────────────┐
                  │ DOCUMENTS_SUBMITTED  │
                  └──────────────────────┘
                            ↓
                     ┌─────────────┐
                     │   VERIFIED  │
                     └─────────────┘
                            ↓
                  ┌──────────────────────┐
                  │  SWIFT_INITIATED     │
                  └──────────────────────┘
                            ↓
                  ┌──────────────────────┐
                  │  SWIFT_RECEIVED      │
                  └──────────────────────┘
                            ↓
                     ┌─────────────┐
                     │   SETTLED   │
                     └─────────────┘

❌ PROBLEM: Payment method stored but not used for workflow logic
❌ PROBLEM: No differentiation in document control
❌ PROBLEM: No validation of prerequisites (e.g., LC must be issued)
❌ PROBLEM: No staging for advance payments
```

---

## ✅ REQUIRED IMPLEMENTATION (CORRECT)

### Letter of Credit (LC) Workflow
```
Prerequisites: ✅ LC must be ISSUED before payment initiation

┌─────────────┐
│  LC_OPENED  │ ← Prerequisite check
└─────────────┘
       ↓
┌─────────────┐
│   PENDING   │
└─────────────┘
       ↓
┌──────────────────────┐
│ DOCUMENTS_SUBMITTED  │ ← Exporter submits 8 documents to bank
└──────────────────────┘
       ↓
┌──────────────────────┐
│ UNDER_VERIFICATION   │ ← Bank verifies against LC terms (UCP 600)
└──────────────────────┘
       ↓
┌──────────────────────┐     ┌──────────────────────┐
│ VERIFICATION_PASSED  │ OR  │ VERIFICATION_FAILED  │
└──────────────────────┘     └──────────────────────┘
       ↓                              ↓
┌──────────────────────┐          (Rejection)
│ PAYMENT_AUTHORIZED   │ ← Issuing bank approves
└──────────────────────┘
       ↓
┌──────────────────────┐
│  SWIFT_INITIATED     │ ← MT700/MT103 sent
└──────────────────────┘
       ↓
┌──────────────────────┐
│  SWIFT_RECEIVED      │ ← Ethiopian bank receives
└──────────────────────┘
       ↓
┌─────────────┐
│   SETTLED   │ ← NBE retention applied (100%)
└─────────────┘
       ↓
┌──────────────────────┐
│ DOCUMENTS_RELEASED   │ ← Bank releases documents to buyer
└──────────────────────┘

🛡️ Risk: LOW for exporter (bank guaranteed)
💰 Cost: HIGHEST (LC fees 0.5-1.5%)
⏱️  Time: 7-14 days
📋 Compliance: UCP 600 REQUIRED
```

---

### Cash Against Documents (CAD) Workflow
```
Prerequisites: ✅ Shipment must have Bill of Lading

┌─────────────┐
│   PENDING   │
└─────────────┘
       ↓
┌──────────────────────┐
│   GOODS_SHIPPED      │ ← Exporter ships WITHOUT prepayment
└──────────────────────┘
       ↓
┌──────────────────────┐
│ DOCUMENTS_SENT_TO_   │ ← Exporter sends docs to their bank
│        BANK          │
└──────────────────────┘
       ↓
┌──────────────────────┐
│ DOCUMENTS_FORWARDED  │ ← Bank forwards to buyer's bank
└──────────────────────┘
       ↓
┌──────────────────────┐
│   BUYER_NOTIFIED     │ ← Buyer told: "Pay to get documents"
└──────────────────────┘
       ↓
┌──────────────────────┐
│ ⚠️ PAYMENT_RECEIVED  │ ← CRITICAL: Buyer pays FIRST
└──────────────────────┘
       ↓
┌──────────────────────┐
│ ⚠️ DOCUMENTS_        │ ← ONLY AFTER payment, docs released
│     RELEASED         │
└──────────────────────┘
       ↓
┌─────────────┐
│   SETTLED   │ ← NBE retention applied
└─────────────┘

🛡️ Risk: MEDIUM (no bank guarantee - if buyer doesn't pay, exporter stuck)
💰 Cost: MEDIUM (collection fees 0.25-0.75%)
⏱️  Time: 5-10 days
📋 Compliance: URC 522 (NOT UCP 600)

KEY DIFFERENCE: Documents held by bank until payment received
```

---

### Telegraphic Transfer - Advance (TT) Workflow
```
Prerequisites: ❌ None (no LC needed)

┌─────────────┐
│   PENDING   │
└─────────────┘
       ↓
┌──────────────────────┐
│ ADVANCE_REQUESTED    │ ← Exporter requests 30-100% upfront
└──────────────────────┘
       ↓
┌──────────────────────┐
│ ⚠️ ADVANCE_RECEIVED  │ ← CRITICAL: Payment BEFORE shipment
└──────────────────────┘
       ↓
┌──────────────────────┐
│   GOODS_SHIPPED      │ ← Can only ship after advance received
└──────────────────────┘
       ↓
┌──────────────────────┐
│ BALANCE_REQUESTED    │ ← If partial advance (e.g., 30%), request 70%
└──────────────────────┘
       ↓
┌──────────────────────┐
│ BALANCE_RECEIVED     │ ← Remaining payment
└──────────────────────┘
       ↓
┌─────────────┐
│   SETTLED   │ ← NBE retention applied to EACH payment
└─────────────┘

Documents sent DIRECTLY to buyer (not through bank)

🛡️ Risk: LOW for exporter (payment first), HIGH for buyer (trust needed)
💰 Cost: LOWEST (flat transfer fee)
⏱️  Time: 1-3 days (direct)
📋 Compliance: None (direct transfer)

KEY DIFFERENCE: Shipment blocked until advance received
```

---

### Advance Payment Workflow
```
Prerequisites: ❌ None (payment happens FIRST)

┌──────────────────────┐
│ PROFORMA_INVOICE_    │ ← Before any work
│      ISSUED          │
└──────────────────────┘
       ↓
┌──────────────────────┐
│ ⚠️ ADVANCE_PAYMENT_  │ ← CRITICAL: 30-100% paid BEFORE production
│      RECEIVED        │
└──────────────────────┘
       ↓
┌──────────────────────┐
│ CONTRACT_REGISTERED  │ ← Contract only registered AFTER payment
└──────────────────────┘
       ↓
┌──────────────────────┐
│  COFFEE_SOURCING     │ ← Exporter uses advance to buy coffee
└──────────────────────┘
       ↓
┌──────────────────────┐
│  QUALITY_INSPECTION  │ ← ECTA inspection
└──────────────────────┘
       ↓
┌──────────────────────┐
│   GOODS_SHIPPED      │
└──────────────────────┘
       ↓
┌──────────────────────┐
│ BALANCE_PAYMENT_     │ ← If partial advance (e.g., 30%)
│    REQUESTED         │
└──────────────────────┘
       ↓
┌──────────────────────┐
│ BALANCE_RECEIVED     │
└──────────────────────┘
       ↓
┌─────────────┐
│   SETTLED   │ ← NBE retention applied to EACH payment
└─────────────┘

Documents sent DIRECTLY to buyer

🛡️ Risk: LOWEST for exporter (cash upfront), HIGHEST for buyer
💰 Cost: LOWEST
⏱️  Time: FASTEST (immediate)
📋 Compliance: None

KEY DIFFERENCE: Payment happens EARLIEST - before production even starts
```

---

## Summary Table

| When Does Payment Happen? | LC | CAD | TT Advance | Advance |
|--------------------------|----|----|-----------|---------|
| **Payment Timing** | After document verification | After documents presented | Before shipment | Before production |
| **Shipment Timing** | After LC opened | Before payment | After advance | After advance |
| **Document Control** | Bank holds & verifies | Bank holds until payment | Direct to buyer | Direct to buyer |
| **Can ship without payment?** | ✅ YES (LC guarantees) | ✅ YES | ❌ NO | ❌ NO |

---

**Conclusion**: Each payment method has fundamentally different timing, risk, and document control requirements. Current CECBS treats them all the same, which is incorrect and must be fixed.
