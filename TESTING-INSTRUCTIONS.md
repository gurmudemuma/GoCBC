# 🧪 Testing Instructions - Inline Blockchain Verification

## ⚠️ Important: Browser Cache Issue

The changes have been built and deployed, but your browser may be showing **cached old JavaScript**. You MUST do a **hard refresh**.

---

## 🔄 How to Hard Refresh (Clear Cache)

### Windows/Linux:
- **Chrome/Edge**: Press `Ctrl + Shift + R`
- **Firefox**: Press `Ctrl + F5` or `Ctrl + Shift + R`

### Mac:
- **Chrome/Safari/Firefox**: Press `Cmd + Shift + R`

### Alternative Method:
1. Open browser in **Incognito/Private Mode** (Ctrl+Shift+N in Chrome)
2. Navigate to http://localhost:3000
3. This bypasses all cache

---

## 📋 Step-by-Step Testing Guide

### Test 1: Banks Portal - Forex Allocations (Reference Implementation)
1. Navigate to: http://localhost:3000/portals/banks
2. Hard refresh: `Ctrl + Shift + R`
3. Login with bank user credentials
4. Click on **"Forex Allocations"** tab
5. Click **"View Details"** on any forex allocation
6. **Expected Result:**
   - Dialog opens with allocation details
   - Scroll down to see **"🔐 Cryptographic Signatures & Blockchain Verification"** section
   - Should show:
     - ✅ Multi-organization endorsements (BanksMSP, NBEMSP, ECTAMSP)
     - ✅ X.509 certificate details for each:
       - CN (Common Name) - e.g., "peer0.banks"
       - O (Organization) - e.g., "BanksMSP"
       - OU (Org Unit) - e.g., "peer"
       - C (Country) - "ET"
       - Issuer - e.g., "ca.banks"
       - Serial Number - Certificate serial
       - Fingerprint - SHA-256 hash
     - ✅ Transaction IDs and timestamps
     - ✅ **NO "N/A" or "undefined" values**

---

### Test 2: Banks Portal - Letter of Credit Details
1. Stay in Banks Portal
2. Click on **"Letters of Credit"** tab
3. Click **"View Details"** on any LC
4. **Expected Result:**
   - LC Details dialog opens
   - Inline blockchain verification section visible (same as Forex)
   - Entity Type: `LETTER_OF_CREDIT`

---

### Test 3: Banks Portal - Contract Details
1. Stay in Banks Portal
2. Click on **"Contracts"** tab
3. Click on any contract row
4. **Expected Result:**
   - Contract Details dialog opens
   - Inline blockchain verification section visible
   - Entity Type: `CONTRACT`

---

### Test 4: Banks Portal - Payment Details
1. Stay in Banks Portal
2. Click on **"Payments"** tab
3. Click **"View Details"** on any payment
4. **Expected Result:**
   - Payment Details dialog opens
   - Inline blockchain verification section visible
   - Entity Type: `PAYMENT`

---

### Test 5: ECX Portal - Coffee Lot Details
1. Navigate to: http://localhost:3000/portals/ecx
2. Hard refresh: `Ctrl + Shift + R`
3. Login with ECX user
4. Click on **"Coffee Lots"** tab
5. Click **"View Details"** on any coffee lot
6. **Expected Result:**
   - Coffee Lot Details dialog opens
   - **NEW**: Inline blockchain verification section visible
   - Entity Type: `COFFEE_LOT`
   - Shows warehouse, grading, assignment, release signatures

---

### Test 6: ECTA Portal - Application Details
1. Navigate to: http://localhost:3000/portals/ecta
2. Hard refresh: `Ctrl + Shift + R`
3. Login with ECTA user
4. Click on **"Applications"** tab
5. Click **"View Details"** on any application
6. **Expected Result:**
   - Application Details dialog opens
   - Inline blockchain verification section visible
   - Entity Type: `EXPORTER_APPLICATION`
   - Shows ECTAMSP, NBEMSP endorsements

---

### Test 7: ECTA Portal - Contract Details
1. Stay in ECTA Portal
2. Click on **"Contracts"** tab
3. Click **"View Details"** on any contract
4. **Expected Result:**
   - Contract Details dialog opens
   - Inline blockchain verification section visible
   - Entity Type: `CONTRACT`

---

### Test 8: Customs Portal - Declaration Details
1. Navigate to: http://localhost:3000/portals/customs
2. Hard refresh: `Ctrl + Shift + R`
3. Login with customs user
4. Click on **"Declarations"** tab
5. Click **"View Details"** on any declaration
6. **Expected Result:**
   - Customs Declaration Details dialog opens
   - Inline blockchain verification section visible
   - Entity Type: `CUSTOMS_DECLARATION`
   - Shows CustomsMSP, NBEMSP endorsements

---

### Test 9: Shipping Portal - Shipment Details
1. Navigate to: http://localhost:3000/portals/shipping
2. Hard refresh: `Ctrl + Shift + R`
3. Login with shipping user
4. Click on **"Shipments"** tab
5. Click **"View Details"** on any shipment
6. **Expected Result:**
   - Shipment Details dialog opens
   - Inline blockchain verification section visible
   - Entity Type: `SHIPMENT`
   - Shows ShippingMSP, CustomsMSP endorsements

---

### Test 10: Exporter Portal - Contract & Shipment
1. Navigate to: http://localhost:3000/portals/exporter
2. Hard refresh: `Ctrl + Shift + R`
3. Login with exporter user
4. Click on **"My Contracts"** tab
5. Click **"View Details"** on any contract
6. **Expected Result:**
   - Contract Details dialog opens
   - Inline blockchain verification section visible
7. Click on **"Shipments"** tab
8. Click **"View Details"** on any shipment
9. **Expected Result:**
   - Shipment Details dialog opens
   - Inline blockchain verification section visible

---

### Test 11: NBE Portal - Forex & Contracts
1. Navigate to: http://localhost:3000/portals/nbe
2. Hard refresh: `Ctrl + Shift + R`
3. Login with NBE user
4. Click on **"Forex Allocations"** tab
5. Click **"View Details"** on any allocation
6. **Expected Result:**
   - Forex Details dialog opens
   - Inline blockchain verification section visible
7. Click on **"Contracts"** tab
8. Click **"View Details"** on any contract
9. **Expected Result:**
   - Contract Details dialog opens
   - Inline blockchain verification section visible

---

## ✅ What to Verify

For EVERY detail dialog above, verify:

1. **Blockchain section is visible inline** (not in a tab)
   - Should appear as a section with heading "🔐 Cryptographic Signatures & Blockchain Verification"
   - Should be immediately visible when dialog opens (scroll down if needed)

2. **Multi-organization endorsements shown**
   - Should show 2-4 organizations depending on transaction type
   - Each organization should have complete data

3. **X.509 Certificate details complete**
   - ✅ CN (Common Name) - NOT "undefined"
   - ✅ O (Organization) - e.g., "BanksMSP"
   - ✅ OU (Organizational Unit) - e.g., "peer"
   - ✅ C (Country) - "ET"
   - ✅ Issuer - CA organization
   - ✅ Serial Number - Certificate serial
   - ✅ Fingerprint - SHA-256 hash

4. **NO "N/A" or "undefined" values anywhere**
   - If you see these, clear browser cache completely and try again
   - Or use Incognito mode

5. **Transaction details**
   - Transaction ID should be visible
   - Timestamp should be formatted properly
   - Blockchain type: "Hyperledger Fabric"

---

## 🐛 Troubleshooting

### Issue: Still seeing "N/A" or "undefined"
**Solution:**
1. Clear browser cache completely:
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Firefox: Settings → Privacy → Clear Data → Cached Web Content
2. Or use Incognito/Private mode
3. Hard refresh: `Ctrl + Shift + R`

### Issue: Blockchain section not visible
**Solution:**
1. Verify you did a hard refresh (`Ctrl + Shift + R`)
2. Check browser console for JavaScript errors (F12)
3. Try a different browser

### Issue: "No blockchain signatures found"
**Solution:**
- This is OK if the entity hasn't been recorded to blockchain yet
- Test with entities that have been through the full workflow
- The forex allocations should definitely have signatures

### Issue: Dialog shows tabs instead of inline
**Solution:**
- This means old JavaScript is cached
- MUST do hard refresh: `Ctrl + Shift + R`
- Or clear browser cache completely

---

## 📸 Expected Screenshot Pattern

The blockchain verification should look like this (from Forex Allocations):

```
┌─────────────────────────────────────────────────────────────┐
│ Forex Allocation Details                                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ [Forex allocation details grid here...]                      │
│                                                               │
│ 🔐 Cryptographic Signatures & Blockchain Verification        │
│ ─────────────────────────────────────────────────────────── │
│                                                               │
│ Transaction #1: AllocateForex                                │
│ ├─ 🏢 BanksMSP                                              │
│ │  ├─ CN: peer0.banks                                       │
│ │  ├─ O: BanksMSP                                           │
│ │  ├─ OU: peer                                              │
│ │  ├─ C: ET                                                 │
│ │  ├─ Issuer: ca.banks                                      │
│ │  ├─ Serial: 12345...                                      │
│ │  └─ Fingerprint: A1B2C3...                                │
│ │                                                            │
│ ├─ 🏢 NBEMSP                                                │
│ │  ├─ CN: peer0.nbe                                         │
│ │  └─ ... [same fields]                                     │
│ │                                                            │
│ └─ 🏢 ECTAMSP                                               │
│    ├─ CN: peer0.ecta                                        │
│    └─ ... [same fields]                                     │
│                                                               │
│ [More transactions if applicable...]                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Success Criteria

✅ ALL 8 entity types show inline blockchain verification:
1. ✅ CONTRACT
2. ✅ FOREX_ALLOCATION
3. ✅ PAYMENT
4. ✅ LETTER_OF_CREDIT
5. ✅ EXPORTER_APPLICATION
6. ✅ CUSTOMS_DECLARATION
7. ✅ SHIPMENT
8. ✅ COFFEE_LOT

✅ ALL detail dialogs across ALL 6 portals:
1. ✅ Banks Portal (4 dialogs)
2. ✅ ECTA Portal (2 dialogs)
3. ✅ Customs Portal (1 dialog)
4. ✅ Shipping Portal (1 dialog)
5. ✅ Exporter Portal (2 dialogs)
6. ✅ ECX Portal (1 dialog)
7. ✅ NBE Portal (2 dialogs)

✅ NO "N/A" or "undefined" values
✅ Multi-org endorsements visible
✅ Complete X.509 certificates
✅ Inline display (not tabbed)

---

## 📞 Questions or Issues?

If you encounter any issues:
1. First try hard refresh (`Ctrl + Shift + R`)
2. Try Incognito mode
3. Check browser console (F12) for errors
4. Report what you see vs what's expected

---

*Last Updated: 2026-09-08*
*Build Status: ✅ Complete - UI rebuilt successfully*
*Services: ✅ UI Running on http://localhost:3000*
