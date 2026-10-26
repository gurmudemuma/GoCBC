# Portal Document Signing - Quick Reference Guide

**Version:** 1.0  
**Date:** September 28, 2026  
**Purpose:** Quick lookup for who signs what documents in each portal

---

## 📋 Quick Lookup Table

| Portal | Documents to Sign | Approval Type | When |
|--------|------------------|---------------|------|
| **Banks** | COMMERCIAL_INVOICE, BILL_OF_LADING, PACKING_LIST | Sequential (2), Single (1) | Payment Release |
| **Exporter** | SALES_CONTRACT, PROFORMA_INVOICE, COMMERCIAL_INVOICE, PACKING_LIST | Single | Before Submission |
| **ECTA** | QUALITY_CERTIFICATE, CERTIFICATE_OF_ORIGIN, EXPORT_PERMIT | Sequential (2) | After Inspection |
| **Shipping** | BILL_OF_LADING, SHIPPING_MANIFEST, CONTAINER_SEAL | Single, Parallel (2) | After Loading |
| **Customs** | CUSTOMS_DECLARATION, DUTY_ASSESSMENT, EXPORT_PERMIT | Sequential (2) | Before Clearance |

---

## 🏦 Banks Portal

**Who:** Bank Officer, Senior Bank Officer

### Documents (3 only):
1. **COMMERCIAL_INVOICE** → Bank Officer → Senior Bank Officer (Sequential)
2. **BILL_OF_LADING** → Bank Officer → Senior Bank Officer (Sequential)
3. **PACKING_LIST** → Bank Officer (Single)

**Critical:** ALL 3 must be fully signed before payment release

---

## 📦 Exporter Portal

**Who:** Exporter

### Documents (4):
1. **SALES_CONTRACT** → Exporter (Single)
2. **PROFORMA_INVOICE** → Exporter (Single)
3. **COMMERCIAL_INVOICE** → Exporter (Single, then Banks)
4. **PACKING_LIST** → Exporter (Single, then Banks)

**Note:** Sign before submitting to bank for LC

---

## ☕ ECTA Portal

**Who:** ECTA Inspector, ECTA Supervisor

### Documents (3):
1. **QUALITY_CERTIFICATE** → Inspector → Supervisor (Sequential)
2. **CERTIFICATE_OF_ORIGIN** → Inspector → Supervisor (Sequential)
3. **EXPORT_PERMIT** → Inspector → Supervisor (Sequential)

**Order:** Inspector MUST sign first, then Supervisor

---

## 🚢 Shipping Portal

**Who:** Shipping Agent

### Documents (3):
1. **BILL_OF_LADING** → Shipping Agent (Single, then Banks)
2. **SHIPPING_MANIFEST** → Shipping Agent (Single)
3. **CONTAINER_SEAL** → Shipping Agent + Customs Officer (Parallel)

**Note:** BILL_OF_LADING confirms goods loaded on board

---

## 🛃 Customs Portal

**Who:** Customs Officer, Senior Customs Officer

### Documents (3):
1. **CUSTOMS_DECLARATION** → Customs Officer → Senior Officer (Sequential)
2. **DUTY_ASSESSMENT** → Customs Officer → Senior Officer (Sequential)
3. **EXPORT_PERMIT** → Customs Officer → Senior Officer (Sequential)

**Order:** Customs Officer MUST sign first, then Senior Officer

---

## 🔐 Signature Types

### APPROVE
- **All portals use this**
- Confirms document approval
- Advances workflow (1/2 → 2/2)
- Recorded on blockchain

### Sequential (2 approvers)
- First approver signs → 1/2
- Second approver signs → 2/2 ✅
- Second cannot sign before first

### Single (1 approver)
- Any authorized user signs → 1/1 ✅
- Immediate approval

### Parallel (2 approvers)
- Either can sign first
- Both must sign for completion
- Order doesn't matter

---

## ✅ Payment Release Checklist

For banks to release payment via SWIFT:

- [ ] COMMERCIAL_INVOICE signed by Bank Officer (1/2)
- [ ] COMMERCIAL_INVOICE signed by Senior Bank Officer (2/2) ✅
- [ ] BILL_OF_LADING signed by Bank Officer (1/2)
- [ ] BILL_OF_LADING signed by Senior Bank Officer (2/2) ✅
- [ ] PACKING_LIST signed by Bank Officer ✅
- [ ] All amounts match LC terms
- [ ] All dates within LC validity period

**→ Payment can now be released 💰**

---

## 🚫 Common Mistakes to Avoid

1. ❌ Banks signing supporting documents (origin, quality, permits)
   ✅ Only sign the 3 payment documents

2. ❌ Signing before previous sequential approver
   ✅ Wait for inspector/officer to sign first

3. ❌ Exporter forgetting to sign documents before submission
   ✅ Sign all 4 documents at Exporter Portal first

4. ❌ Trying to unsign a document
   ✅ Blockchain signatures are permanent (upload new version if needed)

5. ❌ Senior officer signing before junior officer (sequential)
   ✅ Follow the correct signing order

---

## 📱 UI Location Guide

### How to Sign Documents:

1. Navigate to your portal (Banks, Exporter, ECTA, Shipping, or Customs)
2. Select the entity (LC, Contract, Shipment, or Declaration)
3. Find the "Documents" or "Document Management" section
4. See alert message explaining your responsibilities
5. Click on document in list
6. Click "Sign" or "Approve" button
7. Confirm signature
8. Check blockchain transaction recorded

---

## 🔄 Document Flow Example

```
Step 1: Exporter Portal
  Exporter signs: SALES_CONTRACT, PROFORMA_INVOICE

Step 2: ECTA Portal
  Inspector signs: QUALITY_CERTIFICATE (1/2)
  Supervisor signs: QUALITY_CERTIFICATE (2/2) ✅
  Inspector signs: CERTIFICATE_OF_ORIGIN (1/2)
  Supervisor signs: CERTIFICATE_OF_ORIGIN (2/2) ✅

Step 3: Exporter Portal
  Exporter signs: COMMERCIAL_INVOICE, PACKING_LIST

Step 4: Shipping Portal
  Shipping Agent signs: BILL_OF_LADING, SHIPPING_MANIFEST

Step 5: Customs Portal
  Customs Officer signs: CUSTOMS_DECLARATION (1/2)
  Senior Officer signs: CUSTOMS_DECLARATION (2/2) ✅

Step 6: Banks Portal
  Bank Officer signs: COMMERCIAL_INVOICE (1/2)
  Senior Bank Officer signs: COMMERCIAL_INVOICE (2/2) ✅
  Bank Officer signs: BILL_OF_LADING (1/2)
  Senior Bank Officer signs: BILL_OF_LADING (2/2) ✅
  Bank Officer signs: PACKING_LIST ✅

Step 7: Payment Release 💰
```

---

## 📞 Support

**Issue:** "I don't see the document I need to sign"
**Solution:** Check if you're in the correct portal. Each portal shows only documents you're responsible for.

**Issue:** "Cannot sign - says approval denied"
**Solution:** Check if sequential approval requires another user to sign first (e.g., inspector before supervisor).

**Issue:** "Signed by mistake - want to unsign"
**Solution:** Blockchain signatures are immutable. Upload a corrected document as new version.

**Issue:** "Payment release button disabled"
**Solution:** Verify all 3 bank documents are fully signed (check approval counters: 2/2, 2/2, 1/1).

---

**Full Documentation:** See `CRITICAL-DOCUMENT-SIGNING-WORKFLOW.md` for complete details, workflows, and technical implementation.

**Modified Files:**
- `ui/src/components/portals/BanksPortal.tsx`
- `ui/src/components/portals/ExporterPortal.tsx`
- `ui/src/components/portals/ECTAPortal.tsx`
- `ui/src/components/portals/ShippingPortal.tsx`
- `ui/src/components/portals/CustomsPortal.tsx`
