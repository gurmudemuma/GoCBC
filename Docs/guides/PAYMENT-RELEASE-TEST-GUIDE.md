# 💰 PAYMENT RELEASE - FINAL STAGE TEST GUIDE

## Overview
This guide will help you test the **final critical stage** of the CECBS workflow: **Payment Release**.

We have **2 LCs ready** for payment totaling **$6,442,714 USD**.

---

## 🎯 PRE-TEST CHECKLIST

### System Status:
- [x] API Server Running (port 3001)
- [x] UI Server Running (port 3000)
- [x] Blockchain Network Running
- [x] CouchDB Accessible
- [x] 2 LCs with FOREX_ALLOCATED status
- [x] Forex allocations verified

### Ready LCs:
| LC ID | Amount | USD (40%) | ETB (60%) | Status |
|-------|--------|-----------|-----------|--------|
| LC-CONTRACT1788435011592-1788509695626 | $4,919,958 | $1,967,983 | 340,953,089 ETB | FOREX_ALLOCATED |
| LC1787055024941 | $1,522,756 | $609,102 | 105,526,991 ETB | FOREX_ALLOCATED |

---

## 📋 TEST PROCEDURE

### Step 1: Login to Banks Portal
1. Open browser: http://localhost:3000
2. Login credentials:
   - Username: `bankAdmin`
   - Password: `test123`
3. Navigate to **Banks Portal**

### Step 2: Navigate to Payment Release Tab
1. Click on **"Payment Release"** tab (Tab 3)
2. Verify you see the 2 LCs listed:
   - LC-CONTRACT1788435011592-1788509695626
   - LC1787055024941

### Step 3: Examine LC Details
Click **"View Details"** on LC1787055024941:

**Expected to See:**
```
LC Details:
- LC ID: LC1787055024941
- Exporter: EXP4792105
- Amount: $1,522,756 USD
- Status: FOREX_ALLOCATED
- Issuing Bank: JPMorgan Chase Bank
- Advising Bank: Commercial Bank of Ethiopia
- Buyer Name: USA Coffee Importers LLC
- Submitted Date: 8/18/2026

Forex Allocation:
- Forex ID: FOREX_LC1787055024941_1787123803827
- Status: ALLOCATED
- USD Retention (40%): $609,102.40
- ETB Conversion (60%): 105,526,990.80 ETB
- Exchange Rate: 115.5 ETB/USD

Documents:
- 12 documents across 4 entity types
- All documents verified ✅
```

### Step 4: Test Payment Release Button

**BEFORE clicking, verify:**
- [ ] Forex allocation exists
- [ ] Documents are verified
- [ ] LC status is FOREX_ALLOCATED
- [ ] Amount calculations are correct

**Click "Release Payment" button**

**Watch for:**
1. Loading indicator
2. Confirmation dialog (if implemented)
3. Success/Error message
4. Status change
5. Browser console logs (F12)

### Step 5: Verify Payment Transactions Created

**Check Browser Console (F12):**
```javascript
// Should see logs like:
Payment released for LC1787055024941
USD Payment: $609,102.40
ETB Payment: 105,526,990.80 ETB
SWIFT Message Created: SWIFT_xxx
```

**Expected API Calls:**
```bash
POST /api/v1/banking/letter-of-credits/LC1787055024941/release-payment
POST /api/v1/payments (USD payment)
POST /api/v1/payments (ETB payment)
POST /api/v1/swift/messages (SWIFT message)
PUT /api/v1/banking/letter-of-credits/LC1787055024941 (status update)
PUT /api/v1/forex/FOREX_LC1787055024941_1787123803827 (status update)
```

### Step 6: Verify Database Updates

**Check LC Status:**
```bash
curl -u admin:adminpw http://localhost:5984/coffeechannel_coffee/LC_LC1787055024941 | grep status
```
**Expected:** `"status":"PAYMENT_RELEASED"`

**Check Forex Status:**
```bash
curl -u admin:adminpw http://localhost:5984/coffeechannel_coffee/FOREX_LC1787055024941_1787123803827 | grep status
```
**Expected:** `"status":"DISBURSED"` or `"status":"UTILIZED"`

### Step 7: Verify Payment Records

**Check Payments Created:**
```bash
curl -u admin:adminpw http://localhost:5984/coffeechannel_coffee/_all_docs?startkey="PAYMENT_"&endkey="PAYMENT_\ufff0"&include_docs=true
```

**Expected 2 payment records:**
```json
{
  "_id": "PAYMENT_LC1787055024941_USD",
  "lcId": "LC1787055024941",
  "exporterId": "EXP4792105",
  "amount": 609102.40,
  "currency": "USD",
  "type": "RETENTION",
  "status": "DISBURSED"
}

{
  "_id": "PAYMENT_LC1787055024941_ETB",
  "lcId": "LC1787055024941",
  "exporterId": "EXP4792105",
  "amount": 105526990.80,
  "currency": "ETB",
  "type": "CONVERSION",
  "status": "DISBURSED"
}
```

### Step 8: Verify SWIFT Messages

**Check SWIFT Messages:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/swift/messages?lcId=LC1787055024941
```

**Expected SWIFT message types:**
- MT700 (LC Issuance/Advice)
- MT720 (Transfer/Assignment)
- MT799 (Free Format - Payment Confirmation)

---

## 🔍 WHAT TO CHECK

### Success Indicators:
✅ Payment release button works without errors  
✅ LC status changes: FOREX_ALLOCATED → PAYMENT_RELEASED  
✅ Forex status changes: ALLOCATED → DISBURSED  
✅ 2 payment records created (USD + ETB)  
✅ SWIFT messages generated  
✅ Exporter notification sent (email/SMS)  
✅ LC removed from "Payment Release" tab  
✅ No console errors

### Failure Indicators:
❌ 401 Unauthorized error  
❌ 404 Not Found error  
❌ 500 Internal Server Error  
❌ No status change  
❌ No payment records created  
❌ SWIFT message missing  
❌ Console errors visible

---

## 🐛 TROUBLESHOOTING

### Issue: "Payment Release button disabled"
**Cause:** LC doesn't meet payment release criteria  
**Check:**
- LC status must be FOREX_ALLOCATED or DOCUMENTS_VERIFIED
- Forex allocation must exist and be ALLOCATED
- Documents must be verified

**Fix:**
```javascript
// In BanksPortal.tsx, check payment release criteria
const canReleasePayment = (lc) => {
  const hasForex = forexAllocations.find(f => f.lcId === lc.lcId && f.status === 'ALLOCATED');
  const hasCorrectStatus = ['FOREX_ALLOCATED', 'DOCUMENTS_VERIFIED', 'READY_FOR_PAYMENT'].includes(lc.status);
  const documentsVerified = lc.documents?.every(d => d.verification_status === 'VERIFIED');
  
  return hasForex && hasCorrectStatus && documentsVerified;
};
```

### Issue: "401 Unauthorized"
**Cause:** Missing or expired Bearer token  
**Fix:**
1. Check localStorage has valid token: `localStorage.getItem('token')`
2. Re-login if token expired
3. Verify API endpoint has auth middleware

### Issue: "Forex allocation not found"
**Cause:** LC doesn't have linked forex  
**Fix:**
```bash
# Manually create forex allocation
cd c:/goCBC/api
node -e "
const forexService = require('./src/services/forexService');
forexService.createForexAllocation({
  lcId: 'LC1787055024941',
  amount: 1522756,
  exchangeRate: 115.5
});
"
```

### Issue: "Payment amount calculation wrong"
**Cause:** Exchange rate not applied correctly  
**Check calculation:**
```javascript
const lcAmount = 1522756;
const exchangeRate = 115.5;

const usdRetention = lcAmount * 0.40; // = 609,102.40
const etbConversion = lcAmount * 0.60 * exchangeRate; // = 105,526,990.80

console.log('USD:', usdRetention);
console.log('ETB:', etbConversion);
```

---

## 📊 EXPECTED RESULTS

### After Successful Payment Release:

#### Exporter Receives:
1. **USD Payment:** $609,102.40
   - Deposited to: Foreign currency account
   - Bank: Commercial Bank of Ethiopia
   - Account Type: USD retention account

2. **ETB Payment:** 105,526,990.80 ETB
   - Deposited to: Local ETB account
   - Bank: Commercial Bank of Ethiopia
   - Account Type: Business checking account

#### System Updates:
```
LC Status: FOREX_ALLOCATED → PAYMENT_RELEASED ✅
Forex Status: ALLOCATED → DISBURSED ✅
Payment Records: 2 created ✅
SWIFT Messages: Generated ✅
Notification: Sent to exporter ✅
Audit Trail: Updated ✅
Blockchain: Transaction recorded ✅
```

#### Banks Portal Display:
- LC moves from "Payment Release" tab to "Completed Transactions"
- Status badge shows "PAYMENT_RELEASED" in green
- Payment date recorded
- Transaction summary available

---

## 📝 TEST REPORT TEMPLATE

### Payment Release Test Report
**Date:** ___________  
**Tester:** ___________  
**LC Tested:** LC1787055024941

**Test Results:**
- [ ] Payment release button clicked successfully
- [ ] LC status updated to PAYMENT_RELEASED
- [ ] Forex status updated to DISBURSED
- [ ] USD payment record created ($609,102.40)
- [ ] ETB payment record created (105,526,990.80 ETB)
- [ ] SWIFT messages generated
- [ ] No console errors
- [ ] Exporter notification sent

**Issues Found:**
_______________________________________
_______________________________________

**Overall Result:** ✅ PASS / ❌ FAIL

**Notes:**
_______________________________________
_______________________________________

---

## 🎯 ACCEPTANCE CRITERIA

For payment release to be considered **FULLY FUNCTIONAL**, all of these must work:

1. ✅ **Button Functionality**
   - Button visible for eligible LCs
   - Button disabled for ineligible LCs
   - Click triggers payment release process

2. ✅ **Payment Calculation**
   - 40% USD calculated correctly
   - 60% ETB calculated correctly
   - Exchange rate applied properly

3. ✅ **Database Updates**
   - LC status updated
   - Forex status updated
   - Payment records created
   - SWIFT messages created

4. ✅ **Blockchain Integration**
   - Transaction recorded on Fabric
   - Audit trail updated
   - Actor signatures captured

5. ✅ **User Feedback**
   - Success message displayed
   - Error handling for failures
   - Loading states shown

6. ✅ **Notifications**
   - Exporter email sent
   - SMS notification (if enabled)
   - Dashboard alert

---

## 🚀 AFTER SUCCESSFUL TEST

Once payment release works end-to-end:

1. ✅ **Mark system as PRODUCTION READY**
2. ✅ **Document the complete workflow**
3. ✅ **Train users on payment release**
4. ✅ **Set up monitoring and alerts**
5. ✅ **Schedule pilot transactions**
6. ✅ **Plan production deployment**

---

**Test Priority:** 🔥 **CRITICAL**  
**Estimated Time:** 30 minutes  
**Prerequisites:** System running, 2 LCs ready  
**Success Rate Expected:** 100%

**Good luck with the final integration test!** 🎉
