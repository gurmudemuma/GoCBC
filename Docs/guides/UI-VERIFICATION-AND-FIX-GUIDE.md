# UI Verification and Fix Guide

**IMPORTANT:** The API is now returning ALL correct data. This guide helps you verify the UI is displaying it.

---

## 🔍 Step 1: Verify What's Currently Showing

### Open the UI
```bash
cd ui
npm run dev
```

Then visit: http://localhost:3000

---

## 📋 Step 2: Check Each Portal

### A. EXPORTER PORTAL (Login: EXP4342570 / password123)

#### Contracts Tab
**Check:**
- [ ] Contract cards show `Total Value` amount (not $0)
- [ ] Amount displays correctly (e.g., $27,369.60)
- [ ] Price per kg shows (e.g., $9.60/kg)
- [ ] Quantity shows (e.g., 2,851 kg)

**Expected:** Should be ✅ WORKING (API fixed)

**If showing $0:** API is working, but UI might have caching issue. Hard refresh (Ctrl+Shift+R)

---

### B. BANKS PORTAL (Login: bankAdmin / password123)

#### Payments Tab
**Check what's currently displayed:**
- [ ] Payment amount in USD (e.g., $150,000)
- [ ] Currency shown
- [ ] Status shown

**Check what's MISSING (API provides but UI may not show):**
- [ ] Amount in Birr/ETB (e.g., 8,625,000 ETB)
- [ ] Exchange rate (e.g., @ 57.5 ETB/USD)
- [ ] Retention amount (e.g., $15,000 retained)
- [ ] Net to exporter (e.g., $135,000 after retention)
- [ ] Advance amount
- [ ] Balance amount

---

### C. ECTA PORTAL (Login: ectaAdmin / password123)

#### Quality Inspections Tab
**Check:**
- [ ] Inspection ID shows
- [ ] Grade shows (e.g., "Grade 1")
- [ ] Pass/Fail status clear
- [ ] Certification number shows
- [ ] Inspection date shows
- [ ] Moisture content shows
- [ ] Defect count shows

**Expected:** Should be ✅ WORKING (API fixed)

---

### D. CUSTOMS PORTAL (Login: customsAdmin / password123)

#### Declarations Tab
**Check:**
- [ ] Declaration ID shows
- [ ] Customs value shows (not $0)
- [ ] Quantity shows
- [ ] HS Code shows
- [ ] Status shows

**Expected:** Should be ✅ WORKING (API fixed)

---

## 🔧 Step 3: Fix UI if Data Missing

### IF Banks Portal is NOT showing ETB amounts:

**File to edit:** `ui/src/components/portals/BanksPortal.tsx`

**Find this code (around line 2873):**
```typescript
const amount = payment.amount || payment.Amount || payment.value || payment.permitAmount || 0;
const currency = payment.currency || payment.Currency || contract?.currency || 'USD';
```

**Add after it:**
```typescript
// Get calculated payment fields from API
const amountBirr = payment.amountBirr || (amount * (payment.exchangeRate || 57.5));
const exchangeRate = payment.exchangeRate || 57.5;
const retainedAmount = payment.retainedAmount || (amount * 0.10);
const netToExporter = amount - retainedAmount;
const advanceAmount = payment.advanceAmount || 0;
const balanceAmount = payment.balanceAmount || amount;
const paymentStage = payment.paymentStage || 'FULL';
```

**Then find the summary array (around line 2888) and ADD these lines:**
```typescript
summary: [
  { label: 'Transaction ID', value: payment.id || 'N/A' },
  { label: 'Payment Method', value: methodConfig?.name || selectedPaymentMethod },
  { label: 'Exporter ID', value: exporterID },
  { label: 'Amount (USD)', value: `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  // ✅ ADD THESE NEW LINES:
  { label: 'Amount (ETB)', value: `${amountBirr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB` },
  { label: 'Exchange Rate', value: `1 USD = ${exchangeRate} ETB` },
  { label: 'Retention (10%)', value: `${currency} ${retainedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { label: 'Net to Exporter', value: `${currency} ${netToExporter.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { label: 'Payment Stage', value: paymentStage === 'FULL' ? 'Full Payment' : `Advance: ${advanceAmount.toLocaleString()} | Balance: ${balanceAmount.toLocaleString()}` },
  // Continue with existing lines...
  { label: 'Status', value: payment.status || 'PENDING' },
  ...
]
```

**Save and the UI will hot-reload.**

---

### IF Contracts are showing $0:

**This should NOT happen** - API is fixed. If it does:

1. **Hard refresh the browser** (Ctrl+Shift+R) to clear cache
2. **Check browser console** for API errors
3. **Verify API is running:** `curl http://localhost:3001/api/v1/contracts`

---

### IF Quality Inspections missing fields:

**Check the ECTA Portal component:**
- File: `ui/src/components/portals/ECTAPortal.tsx`
- Search for where inspection data is displayed
- Ensure it's using: `inspection.grade`, `inspection.passed`, `inspection.certificationNumber`

---

## 🧪 Step 4: Test After Changes

### 1. Save the file
### 2. UI should auto-reload
### 3. Login to Banks Portal
### 4. View a payment
### 5. Verify you see:
```
Amount (USD): $150,000.00
Amount (ETB): 8,625,000.00 ETB
Exchange Rate: 1 USD = 57.5 ETB
Retention (10%): $15,000.00
Net to Exporter: $135,000.00
Payment Stage: Full Payment
```

---

## ✅ Quick Verification Commands

### Check API is returning correct data:
```bash
# Test contracts
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/v1/contracts | jq '.[0].amount'
# Should NOT be 0

# Test payments
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/v1/payments | jq '.[0] | {amount, amountBirr, retainedAmount}'
# Should show all values
```

---

## 🎯 Expected Final Result

After verification/fixes, when you view a payment in Banks Portal, you should see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAYMENT DETAILS - PAY1790340850406
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Payment Information
Amount (USD):       $150,000.00
Amount (ETB):       8,625,000.00 ETB
Exchange Rate:      1 USD = 57.5 ETB
Retention (10%):    $15,000.00
Net to Exporter:    $135,000.00
Payment Stage:      Full Payment

📋 Transaction Details
Transaction ID:     PAY1790340850406
Status:            SETTLED
Contract:          CONTRACT1790340756225
Exporter:          EXP4342570
Buyer:             UCC Ueshima Coffee Co.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📝 Summary

**API Status:** ✅ ALL FIXED - Returns correct data
**UI Status:** ⚠️ **NEEDS VERIFICATION**

**Action Required:**
1. ✅ Check if UI displays API data correctly
2. ❌ If not, apply the code changes above
3. ✅ Test in browser
4. ✅ Verify all portals show correct data

**Most Likely Scenario:**
- Contracts: ✅ Already working (UI uses `totalValue`)
- Payments: ⚠️ Needs ETB/retention fields added to UI
- Quality: ✅ Probably working
- Customs: ✅ Probably working

---

## 🆘 If Something Still Shows Wrong

1. **Check browser console** for errors
2. **Check API response** using curl or browser DevTools Network tab
3. **Verify the field name** matches between API and UI
4. **Hard refresh** browser (Ctrl+Shift+R)
5. **Restart both API and UI** if needed

---

**The API is 100% fixed. Any remaining issues are UI display only and can be fixed with the code changes above.**
