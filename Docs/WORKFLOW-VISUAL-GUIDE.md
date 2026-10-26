# Visual Workflow Guide - Coffee Export Process

## 🎯 Quick Reference: Where Are You Now?

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOU ARE HERE ✅                               │
│                Contract Approved & Signed                        │
│              Documents: ✓ Signed by ECTA                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    WHAT'S NEXT? ⏭️
```

---

## 🗺️ Complete Journey Map

```
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 1: CONTRACT APPROVAL (✅ COMPLETED)                            │
├──────────────────────────────────────────────────────────────────────┤
│ Actor: ECTA Officer                                                   │
│ Action: Review & approve contract                                    │
│ Output: ✓ Signed contract documents                                 │
│ Status: APPROVED                                                     │
│ Duration: 1-3 days                                                   │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 2: SHIPMENT CREATION (⏭️ NEXT)                                │
├──────────────────────────────────────────────────────────────────────┤
│ Actor: Exporter                                                      │
│ Action: Create shipment with details                                 │
│ Portal: Exporter Portal → Shipments → Create New                    │
│ Required:                                                            │
│   • Quantity (bags)                                                  │
│   • Origin (Yirgacheffe, Sidamo, etc.)                             │
│   • Destination                                                      │
│   • EUDR compliance (for EU)                                        │
│ Upload:                                                              │
│   • Packing list                                                     │
│   • Sample details                                                   │
│   • EUDR documents (if EU)                                          │
│ Output: Shipment registered on blockchain                            │
│ Status: CREATED                                                      │
│ Duration: 1 day                                                      │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 3: QUALITY INSPECTION 🔬                                      │
├──────────────────────────────────────────────────────────────────────┤
│ Actor: ECTA Quality Inspector                                        │
│ Action: Physical coffee inspection                                   │
│ Portal: ECTA Portal → Quality Tab                                   │
│ Tests:                                                               │
│   • Visual examination                                               │
│   • Moisture content                                                 │
│   • Defect count                                                     │
│   • Screen size                                                      │
│   • Cup tasting (optional)                                          │
│ Output: ✓ Signed quality certificate                                │
│ Status: QUALITY_APPROVED or REJECTED                                │
│ Duration: 1-2 days                                                   │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 4: EXPORT PERMIT 📜                                           │
├──────────────────────────────────────────────────────────────────────┤
│ Actor: ECTA Officer                                                  │
│ Action: Issue export permit                                          │
│ Based on: Quality certificate                                        │
│ Output: ✓ Signed export permit                                      │
│ Valid: 30-60 days                                                    │
│ Status: PERMIT_ISSUED                                                │
│ Duration: 1 day                                                      │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 5: CUSTOMS DECLARATION 🛃                                     │
├──────────────────────────────────────────────────────────────────────┤
│ Actor: Exporter                                                      │
│ Action: Submit customs declaration                                   │
│ Portal: Exporter Portal → Customs                                   │
│ Required Docs (ALL must be ✓ Signed):                              │
│   • Export permit ✓                                                 │
│   • Quality certificate ✓                                           │
│   • Commercial invoice                                               │
│   • Packing list                                                     │
│   • EUDR declaration (EU)                                           │
│ Output: Declaration submitted                                        │
│ Status: SUBMITTED                                                    │
│ Duration: 1 day                                                      │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 6: CUSTOMS CLEARANCE ✅                                       │
├──────────────────────────────────────────────────────────────────────┤
│ Actor: ECC Customs Officer                                           │
│ Action: Review & clear shipment                                      │
│ Portal: Customs Portal                                               │
│ Checks:                                                              │
│   • All documents present?                                           │
│   • All signatures verified? (✓ badges)                             │
│   • Values correct?                                                  │
│   • Risk assessment                                                  │
│ May Require: Physical inspection                                     │
│ Output: ✓ Signed customs clearance                                 │
│ Status: CLEARED                                                      │
│ Duration: 1-3 days                                                   │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 7A: LETTER OF CREDIT (LC) 💰 [If LC Payment]                 │
├──────────────────────────────────────────────────────────────────────┤
│ Actor: Bank Officer                                                  │
│ Action: Process LC documents                                         │
│ Portal: Banks Portal → LC Tab                                       │
│ Review:                                                              │
│   • Bill of Lading                                                   │
│   • Commercial Invoice                                               │
│   • Export permit ✓                                                 │
│   • Quality certificate ✓                                           │
│   • All docs match LC terms?                                        │
│   • All signatures verified? (✓ badges)                             │
│ Approve: ✓ Sign LC documents                                        │
│ Action: Initiate SWIFT payment                                       │
│ Status: DOCUMENTS_SUBMITTED → SWIFT_INITIATED                        │
│ Duration: 3-7 days                                                   │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 7B: OTHER PAYMENT METHODS                                      │
├──────────────────────────────────────────────────────────────────────┤
│ CAD (Cash Against Documents):                                        │
│   • Present docs to bank                                             │
│   • Bank sends to buyer's bank                                       │
│   • Buyer pays to release docs                                       │
│   • Duration: 5-10 days                                              │
│                                                                       │
│ TT Advance:                                                          │
│   • Buyer pays BEFORE shipping                                       │
│   • Exporter ships after payment                                     │
│   • Duration: 1-3 days                                               │
│                                                                       │
│ TT Post-Shipment:                                                    │
│   • Ship goods first                                                 │
│   • Buyer pays after receipt                                         │
│   • Duration: 7-14 days                                              │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 8: SHIPPING & DELIVERY 🚢                                     │
├──────────────────────────────────────────────────────────────────────┤
│ Actor: Shipping Line / Freight Forwarder                             │
│ Action: Transport coffee to destination                              │
│ Portal: Shipping Portal (tracking)                                   │
│ Process:                                                             │
│   • Cargo booking                                                    │
│   • Container loading                                                │
│   • Bill of Lading issuance                                         │
│   • Vessel departure                                                 │
│   • Transit                                                          │
│   • Arrival                                                          │
│   • Delivery to buyer                                                │
│ Status: SHIPPED → IN_TRANSIT → ARRIVED → DELIVERED                  │
│ Duration: 15-45 days (depends on destination)                        │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 9: FOREX SETTLEMENT 💱                                         │
├──────────────────────────────────────────────────────────────────────┤
│ Actor: NBE Officer                                                   │
│ Action: Convert foreign currency to ETB                              │
│ Portal: NBE Portal → Forex Tab                                      │
│ Process:                                                             │
│   • Receive export proceeds (USD/EUR/etc.)                          │
│   • Apply current NBE exchange rate                                  │
│   • Calculate retention (if any)                                     │
│   • Convert to Ethiopian Birr                                        │
│   • Release funds to exporter                                        │
│ Output: ✓ Signed payment authorization                              │
│ Example:                                                             │
│   $100,000 × 115.50 ETB/USD = 11,550,000 ETB                        │
│   Retention (30%): 3,465,000 ETB                                     │
│   Net to Exporter: 8,085,000 ETB                                     │
│ Status: FOREX_ALLOCATED → CONVERTED → SETTLED                       │
│ Duration: 1-2 days                                                   │
└──────────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│ STAGE 10: PAYMENT COMPLETED ✅                                       │
├──────────────────────────────────────────────────────────────────────┤
│ Final Status: COMPLETED                                              │
│ All Documents Signed: ✓✓✓✓✓✓✓                                      │
│ Blockchain Records: Complete                                         │
│ Exporter Paid: ✅                                                    │
│ Transaction Closed: ✅                                               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Decision Points

### After Contract Approval:

```
                  Contract Approved ✅
                         |
                         ↓
              Does shipment exist yet?
                    /        \
                  No          Yes
                 /              \
    CREATE SHIPMENT ←         Already created
    (Exporter Portal)         Continue to quality
         ↓
    Quality Inspection
```

### Payment Method Decision Tree:

```
              Payment Method?
                    |
        ┌───────────┼───────────┬──────────┐
        |           |           |          |
       LC          CAD      TT-Advance  TT-Post
        |           |           |          |
    Bank Exam    Bank Proc   Pay First  Ship First
    (3-7 days)   (5-10 days) (1-3 days) (7-14 days)
        |           |           |          |
        └───────────┴───────────┴──────────┘
                    |
              SWIFT Payment
                    |
              NBE Conversion
```

---

## 📋 Checklist: Contract to Delivery

### Phase 1: Pre-Shipment ✅ (YOU ARE HERE)
- [x] Contract created
- [x] Contract approved by ECTA
- [x] Contract documents signed ✓
- [ ] **Shipment created ← NEXT STEP**
- [ ] Quality inspection passed
- [ ] Export permit issued

### Phase 2: Export Preparation
- [ ] Customs declaration submitted
- [ ] All documents verified & signed
- [ ] Customs clearance obtained
- [ ] Goods ready for shipping

### Phase 3: Payment & Shipping
- [ ] LC documents prepared (if LC)
- [ ] Bank approval received (if LC)
- [ ] Goods shipped
- [ ] Bill of Lading obtained

### Phase 4: Settlement
- [ ] Goods delivered
- [ ] Payment received
- [ ] Forex converted by NBE
- [ ] Funds in exporter account

---

## ⚡ Quick Action Guide

### Right NOW (Immediate Next Steps):

**For Exporter:**
```
1. Login → Exporter Portal
2. Navigate → Shipments Tab
3. Click → "Create New Shipment"
4. Select → Your approved contract
5. Fill → Shipment details form
6. Upload → Required documents
7. Submit → Shipment
```

**For ECTA Quality:**
```
Wait for shipment submission
Then:
1. Login → ECTA Portal
2. Navigate → Quality Tab
3. Review → Pending inspections
4. Conduct → Physical inspection
5. Submit → Inspection results
6. Issue → Quality certificate (auto-signed)
```

---

## 🔄 Status Transitions

### Contract Status Flow:
```
PENDING → REVIEWED → APPROVED → ACTIVE → COMPLETED
          (You are here: APPROVED)
```

### Shipment Status Flow:
```
CREATED → QUALITY_PENDING → QUALITY_APPROVED → 
PERMIT_ISSUED → CUSTOMS_PENDING → CLEARED → 
SHIPPED → IN_TRANSIT → ARRIVED → DELIVERED
(Next: CREATED)
```

### Payment Status Flow:
```
PENDING → DOCUMENTS_SUBMITTED → VERIFIED → 
SWIFT_INITIATED → SWIFT_RECEIVED → 
FOREX_CONVERTED → SETTLED
```

---

## 📞 Who to Contact at Each Stage

| Stage | Issue | Contact |
|-------|-------|---------|
| Contract | Not approved | ECTA Admin |
| Shipment | Can't create | System Admin |
| Quality | Failed inspection | ECTA Quality Director |
| Export Permit | Not issued | ECTA Licensing |
| Customs | Clearance delayed | ECC Customs |
| LC Processing | Document rejection | Bank Officer |
| SWIFT Payment | Not received | Bank + NBE |
| Forex | Conversion issue | NBE Officer |

---

## 🎓 Training Resources

- **Exporter Portal Guide**: `/Docs/EXPORTER-PORTAL-GUIDE.md`
- **ECTA Portal Guide**: `/Docs/ECTA-PORTAL-GUIDE.md`
- **Banks Portal Guide**: `/Docs/BANKS-PORTAL-GUIDE.md`
- **Complete Workflow**: `/Docs/COMPLETE-EXPORT-WORKFLOW.md`
- **Signature System**: `/Docs/CRYPTOGRAPHIC-DOCUMENT-SIGNING.md`

---

## ✅ Success Indicators

You'll know you're on track when you see:

1. ✅ Contract status: APPROVED
2. ✅ Contract documents: ✓ Signed (green badges)
3. ⏭️ Shipment created successfully
4. ⏭️ Quality inspection scheduled
5. ⏭️ Quality certificate issued: ✓ Signed
6. ⏭️ Export permit issued: ✓ Signed
7. ⏭️ Customs clearance granted: ✓ Signed
8. ⏭️ LC documents approved: ✓ Signed
9. ⏭️ Payment received
10. ⏭️ Transaction complete

---

**Your journey from contract to cash is just beginning!** 🚀

**NEXT ACTION: Create Shipment in Exporter Portal** ⏭️
