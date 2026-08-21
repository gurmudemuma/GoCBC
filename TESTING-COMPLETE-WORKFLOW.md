# Complete Workflow Testing Guide

**Date:** 2026-08-20  
**Chaincode Version:** v1.62 (Deployed ✅)  
**UI Version:** Built ✅  
**Status:** Ready for Testing

---

## ✅ Deployment Status

### Chaincode
- **Version:** 1.62
- **Sequence:** 8
- **Package ID:** coffee_1.62:49263e3a4f3119a588510711e736a969a58fdf6bedddf7ac6a0125176756df99
- **Status:** ✅ Deployed successfully to all 6 organizations
- **Approvals:** ECTA, ECX, Banks, NBE, Customs, Shipping

### UI
- **Build:** Next.js 14.2.35
- **Status:** ✅ Built successfully
- **Pages:** 57 static pages generated

### API
- **Status:** ✅ Running on port 3001
- **Note:** Authentication required for API testing

---

## Test Objectives

1. ✅ Verify LC status stays **ISSUED** (not SHIPPED) after shipment creation
2. ✅ Verify LC status stays **ISSUED** (not DOCUMENTS_SUBMITTED) after document submission
3. ✅ Verify LC status changes to **UTILIZED** (not DOCUMENTS_VERIFIED) after document verification
4. ✅ Verify LC status stays **UTILIZED** (not PAID) after payment release
5. ✅ Verify Exporter Portal → Forex & Banking tab shows **"Forex Allocated"** (not "Shipped")
6. ✅ Verify KPI count shows correct value (includes forex-related LCs)

---

## Manual UI Testing Steps

### Prerequisites
1. System is running (API + UI + Blockchain)
2. Browser open to http://localhost:3000
3. Login credentials ready

### Test 1: Check Existing LC Status in Forex & Banking Tab ⭐ PRIMARY TEST

**Steps:**
1. Login as **Exporter** user
2. Navigate to **Exporter Portal**
3. Click on **"Forex & Banking"** tab
4. Observe the LC with status

**Expected Results:**
- ✅ LC should display **"Forex Allocated"** label (NOT "Shipped")
- ✅ Status chip should show green with ALLOCATED status
- ✅ KPI card at top should show count = 1 (or more)
- ✅ Only forex-related LCs should appear (ISSUED, UTILIZED, FOREX_ALLOCATED, FOREX_BACKED)

**Failure Indicators:**
- ❌ Shows "Shipped" instead of "Forex Allocated"
- ❌ KPI count shows 0
- ❌ Wrong LCs displayed (e.g., REQUESTED status)

---

### Test 2: Complete LC Workflow - Create New LC

**Steps:**

#### Step 1: Request LC (Status: REQUESTED)
1. Login as **Exporter**
2. Navigate to **LC & Payments** tab
3. Click **"Request New LC"**
4. Fill in LC details:
   - Amount: $50,000
   - Currency: USD
   - Contract: Select existing contract
   - Beneficiary: Your company name
   - Issuing Bank: Commercial Bank of Ethiopia
   - Expiry Date: Future date
5. Click **"Submit Request"**
6. **Verify:** LC status = **REQUESTED** ✅

#### Step 2: Approve LC (Status: APPROVED)
1. Login as **Bank** user
2. Navigate to **Banks Portal** → **LC Management**
3. Find the new LC request
4. Click **"Approve"**
5. **Verify:** LC status = **APPROVED** ✅

#### Step 3: Issue LC (Status: ISSUED) ⭐ KEY STEP
1. Still in **Banks Portal**
2. Find the approved LC
3. Click **"Issue LC"**
4. Fill in MT700 details
5. Click **"Issue"**
6. **Verify:** LC status = **ISSUED** ✅
7. **Verify:** Forex is allocated at this step ✅

#### Step 4: Create Shipment (Status: Should Stay ISSUED) ⭐ CRITICAL
1. Login as **Exporter**
2. Navigate to **Shipments** tab
3. Click **"Create Shipment"**
4. Fill in shipment details
5. Link to the LC created above
6. Submit shipment
7. **Verify:** LC status remains **ISSUED** (NOT changed to SHIPPED) ✅
8. **Verify:** Shipment has its own status (CREATED) ✅

#### Step 5: Check Forex & Banking Tab ⭐ PRIMARY VERIFICATION
1. Still logged in as **Exporter**
2. Navigate to **Forex & Banking** tab
3. **Verify:**
   - ✅ New LC appears in the list
   - ✅ Shows **"Forex Allocated"** label (NOT "Shipped")
   - ✅ KPI count includes this LC
   - ✅ Status chip shows ALLOCATED (green)

#### Step 6: Submit Documents (Status: Should Stay ISSUED)
1. In **LC & Payments** tab
2. Find the LC
3. Click **"Submit Documents"**
4. Upload/attach documents:
   - Bill of Lading
   - Commercial Invoice
   - Packing List
   - Certificate of Origin
5. Submit
6. **Verify:** LC status remains **ISSUED** (NOT changed to DOCUMENTS_SUBMITTED) ✅

#### Step 7: Examine Documents (Status: Should Change to UTILIZED) ⭐ KEY STEP
1. Login as **Bank** user
2. Navigate to **Banks Portal** → **Document Examination** tab
3. Find the LC with submitted documents
4. **Verify:** LC appears in "Pending Examination" list ✅
5. Click **"Examine Documents"**
6. Mark as **"Compliant"**
7. Submit examination
8. **Verify:** LC status changes to **UTILIZED** (NOT "DOCUMENTS_VERIFIED") ✅

#### Step 8: Release Payment (Status: Should Stay UTILIZED)
1. Still in **Banks Portal**
2. Navigate to **Payment Release** tab
3. Find the LC (status = UTILIZED)
4. **Verify:** LC appears in "Ready for Payment" list ✅
5. Click **"Release Payment"**
6. Fill in MT103 details
7. Submit payment
8. **Verify:** LC status remains **UTILIZED** (NOT changed to PAID) ✅
9. **Verify:** Payment entity has separate status (SETTLED) ✅

---

### Test 3: Document Rejection Workflow

**Steps:**
1. Create LC and issue it (Status: ISSUED)
2. Submit documents
3. Bank examines and marks as **"Discrepant"**
4. **Verify:** LC status remains **ISSUED** (NOT changed to invalid status) ✅
5. Exporter resubmits corrected documents
6. **Verify:** Resubmission works (LC still ISSUED) ✅
7. Bank re-examines and marks as **"Compliant"**
8. **Verify:** LC status changes to **UTILIZED** ✅

---

### Test 4: Banks Portal Filters

**Steps:**
1. Login as **Bank** user
2. Navigate to **Banks Portal**

#### Test Document Examination Tab
1. Click **"Document Examination"** tab
2. **Verify:** Shows only LCs with:
   - Status = ISSUED
   - Documents attached
3. **Verify:** Does NOT show LCs without documents ✅
4. **Verify:** Does NOT show UTILIZED LCs ✅

#### Test Payment Release Tab
1. Click **"Payment Release"** tab
2. **Verify:** Shows only LCs with status = UTILIZED ✅
3. **Verify:** Does NOT show ISSUED LCs ✅
4. **Verify:** KPI card shows correct count ✅

---

## Expected Status Transitions

### Correct Flow (After Fixes) ✅
```
Request LC      → REQUESTED
Approve LC      → APPROVED
Issue LC        → ISSUED (Forex Allocated) ⭐
Create Shipment → ISSUED (NO CHANGE) ⭐
Submit Docs     → ISSUED (NO CHANGE) ⭐
Examine Docs    → UTILIZED ⭐
Release Payment → UTILIZED (NO CHANGE) ⭐
```

### Old Flow (Before Fixes) ❌
```
Request LC      → REQUESTED
Approve LC      → APPROVED
Issue LC        → ISSUED
Create Shipment → SHIPPED ❌ WRONG!
Submit Docs     → DOCUMENTS_SUBMITTED ❌ WRONG!
Examine Docs    → DOCUMENTS_VERIFIED ❌ WRONG!
Release Payment → PAID ❌ WRONG!
```

---

## Verification Checklist

### Chaincode Fixes
- [✅] Line 1022: SHIPPED removed
- [✅] Line 1083: DOCUMENTS_SUBMITTED removed
- [✅] Line 873: UTILIZED used instead of DOCUMENTS_VERIFIED
- [✅] Line 876: DOCUMENTS_DISCREPANT removed
- [✅] Line 958: PAID removed

### UI Fixes - Exporter Portal
- [✅] Line 816: Filters forex-related LCs
- [✅] Line 2307: KPI count formula correct
- [✅] Line 3462: Tab filters LCs correctly
- [✅] Line 3476: Shows "Forex Allocated" label

### UI Fixes - Banks Portal
- [✅] Line 540: Document examination filter uses ISSUED + has documents
- [✅] Line 547: Payment release filter uses UTILIZED
- [✅] Line 1927: Display filter uses UTILIZED
- [✅] Line 2277: KPI count uses UTILIZED

### Build Status
- [✅] Chaincode v1.62 deployed
- [✅] UI built successfully
- [✅] API running

---

## Quick Visual Test (5 minutes)

**Fastest way to verify the main fix:**

1. Open browser → http://localhost:3000
2. Login as Exporter
3. Go to **Forex & Banking** tab
4. Look at the LC status display

**Expected:** Shows **"Forex Allocated"** in green chip  
**Before Fix:** Showed **"Shipped"**

**If you see "Forex Allocated"** → ✅ **FIX WORKING!**  
**If you see "Shipped"** → ❌ Need to check deployment

---

## Troubleshooting

### Issue 1: Still showing "Shipped"
**Solution:**
1. Clear browser cache (Ctrl+Shift+R)
2. Verify UI build is latest: `cd ui && npm run build`
3. Check browser console for errors

### Issue 2: KPI count shows 0
**Solution:**
1. Check if LC has forex-related status (ISSUED, UTILIZED, FOREX_ALLOCATED, FOREX_BACKED)
2. Verify LC is not in REQUESTED or APPROVED status
3. Check browser console for filter logic errors

### Issue 3: LC status not changing
**Solution:**
1. Check chaincode logs: `docker logs coffee-chaincode`
2. Verify chaincode v1.62 is running
3. Check API logs for errors

### Issue 4: Cannot see Document Examination tab
**Solution:**
1. Verify logged in as Bank user
2. Check if there are LCs with documents submitted
3. Verify LC status is ISSUED

---

## Success Criteria

### ✅ All Tests Pass If:

1. **Forex & Banking tab shows "Forex Allocated"** (not "Shipped")
2. **KPI count is correct** (not 0)
3. **LC status stays ISSUED** after shipment creation
4. **LC status stays ISSUED** after document submission
5. **LC status changes to UTILIZED** after document verification
6. **LC status stays UTILIZED** after payment release
7. **Banks Portal filters work correctly**
8. **Document rejection workflow works**
9. **All entity statuses are independent**
10. **No invalid statuses in UI or chaincode**

---

## Test Result Template

```
Date: _______________
Tester: _______________

[ ] Test 1: Forex & Banking tab shows "Forex Allocated" - PASS/FAIL
[ ] Test 2: KPI count correct - PASS/FAIL
[ ] Test 3: LC status ISSUED after shipment - PASS/FAIL
[ ] Test 4: LC status ISSUED after docs - PASS/FAIL
[ ] Test 5: LC status UTILIZED after verification - PASS/FAIL
[ ] Test 6: LC status UTILIZED after payment - PASS/FAIL
[ ] Test 7: Banks Portal filters work - PASS/FAIL
[ ] Test 8: Document rejection works - PASS/FAIL

Overall Result: PASS / FAIL
Notes: ______________________________________
```

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Mark as production-ready
2. Deploy to staging environment
3. Conduct UAT (User Acceptance Testing)
4. Deploy to production

### If Tests Fail ❌
1. Document failing test
2. Check browser console errors
3. Check chaincode logs
4. Review code changes
5. Fix and re-test

---

**Test Guide Version:** 1.0  
**Last Updated:** 2026-08-20  
**Status:** Ready for Testing
