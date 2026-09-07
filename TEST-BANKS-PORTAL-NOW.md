# 🧪 Banks Portal - Complete Workflow Test

**Execute this test NOW to verify all functionality**  
**Duration:** 15-20 minutes  
**Status:** Ready to execute

---

## ✅ Pre-Test Checklist

Before starting, verify:
- [ ] System is running (`START-SYSTEM.bat` executed)
- [ ] API is healthy: http://localhost:3001/health
- [ ] UI is accessible: http://localhost:3000
- [ ] Browser ready (Chrome/Firefox/Edge)
- [ ] This document open for reference

---

## 🎯 Complete Workflow Test

### Phase 1: System Verification (2 minutes)

#### Test 1.1: API Health
```bash
curl http://localhost:3001/api/v1/health
```

**Expected:**
```json
{
  "status": "healthy",
  "services": {
    "database": true,
    "blockchain": true
  }
}
```

✅ **Pass:** Both database and blockchain connected  
❌ **Fail:** Run `START-SYSTEM.bat`

#### Test 1.2: UI Accessibility
Open browser: **http://localhost:3000**

✅ **Pass:** Login page loads  
❌ **Fail:** Check if UI is running

---

### Phase 2: Authentication & Portal Access (2 minutes)

#### Test 2.1: Login as Bank Admin
1. Navigate to: http://localhost:3000
2. Enter credentials:
   - Username: `bank_admin`
   - Password: `Bank@2024`
3. Click "Login"

✅ **Pass:** Redirected to Banks Portal  
❌ **Fail:** Check credentials or user exists

#### Test 2.2: Verify Portal Loads
After login, check:
- [ ] Banks Portal displays
- [ ] Purple/gold theme visible
- [ ] User name shows: "Bank Administrator"
- [ ] No errors in console (F12)

---

### Phase 3: Tab 0 - Payment Methods (3 minutes)

#### Test 3.1: Tab Loads
Click on **"Payment Methods"** tab (first tab)

**Verify:**
- [ ] Tab content loads
- [ ] KPI cards visible (Total LCs, Active LCs, etc.)
- [ ] Data grid or table displays
- [ ] No console errors

#### Test 3.2: View Existing LCs
**Check:**
- [ ] Can see list of existing LCs
- [ ] LC details visible (LC Number, Amount, Status)
- [ ] Actions buttons present (View, Audit Trail, etc.)

**Count LCs:** _____ LCs visible

#### Test 3.3: LC Creation (Optional)
If "Create LC" or "New LC" button exists:
1. Click button
2. Fill form (if opens):
   - LC Number: `LC-TEST-${current_date}`
   - Amount: `100000`
   - Currency: `USD`
   - Contract: Select from dropdown
3. Submit

✅ **Pass:** LC created successfully  
⚠️  **Skip:** If button not available (may require contract first)

---

### Phase 4: Tab 3 - Document Examination (3 minutes)

#### Test 4.1: Navigate to Tab 3
Click **"Document Examination"** tab

**Verify:**
- [ ] Tab switches correctly
- [ ] Content loads
- [ ] Info alert explains tab purpose
- [ ] No console errors

#### Test 4.2: Check LCs Pending Examination
**Look for:**
- [ ] List of LCs with status "DOCUMENTS_SUBMITTED"
- [ ] Columns: LC ID, Exporter, Amount, Status, Date
- [ ] Action buttons: View Details, Audit Trail, Examine

**Count:** _____ LCs pending examination

#### Test 4.3: Document Examination Flow
If LCs are available:
1. Click "View Details" on an LC
2. Review documents (if dialog opens)
3. Check examination workflow

✅ **Pass:** Can view and examine documents  
⚠️  **Expected:** May be empty if no documents submitted

**Key Point:** Tab 3 works with LCs that have submitted documents (PRE-delivery)

---

### Phase 5: Tab 4 - Payment Release (3 minutes)

#### Test 5.1: Navigate to Tab 4
Click **"Payment Release"** tab

**Verify:**
- [ ] Tab switches correctly
- [ ] Content loads
- [ ] Info alert explains payment release
- [ ] No console errors

#### Test 5.2: Check LCs Ready for Payment
**Look for:**
- [ ] List of LCs with status "READY_FOR_PAYMENT" or "UTILIZED"
- [ ] Amount and exporter details visible
- [ ] "Release Payment" action buttons

**Count:** _____ LCs ready for payment

#### Test 5.3: Payment Release Flow
If LCs are available:
1. Click "Release Payment" button
2. Review payment details (if dialog opens)
3. Check authorization workflow

✅ **Pass:** Can release payments  
⚠️  **Expected:** May be empty if documents not examined yet

**Key Point:** Tab 4 releases initial payment to exporter (BEFORE delivery)

---

### Phase 6: Tab 8 - LC Settlements ⭐ (5 minutes)

This is the NEW tab we're testing!

#### Test 6.1: Navigate to Tab 8
Click **"LC Settlements"** tab (last tab)

**Verify:**
- [ ] Tab exists and is visible
- [ ] Tab switches correctly
- [ ] Heading: "💰 LC Settlement Tracking"
- [ ] Description text visible
- [ ] **NO red error boxes**
- [ ] **NO JSON parsing errors**
- [ ] No console errors (F12 - check this!)

✅ **CRITICAL:** Tab loads without errors  
❌ **FAIL:** If error appears, auth token issue not fixed

#### Test 6.2: Check for Delivered Shipments
**Two scenarios:**

**Scenario A: Delivered Shipments Exist**
- [ ] Shipment cards display
- [ ] Each card shows shipment ID and contract ID
- [ ] Green "Delivered" badge visible
- [ ] PostDeliveryWorkflowPanel visible in each card

**Scenario B: No Delivered Shipments**
- [ ] Info message: "No delivered shipments requiring LC settlement"
- [ ] Message is blue/info style (not error)
- [ ] Tab still functions correctly

**Current status:** [ ] A (has shipments) [ ] B (no shipments)

#### Test 6.3: Verify PostDeliveryWorkflowPanel Component
If delivered shipments exist:

**Check panel displays:**
- [ ] Progress bar at top
- [ ] Progress percentage (e.g., "0%", "20%", "40%")
- [ ] 5 workflow steps listed:
  - Step 1: Payment Received
  - Step 2: Forex Repatriated
  - Step 3: LC Settlement
  - Step 4: ECTA Audit
  - Step 5: Contract Closed

**Check step icons:**
- [ ] ✅ Green checkmark for completed steps
- [ ] ⏳ Clock/pending for incomplete steps
- [ ] Timestamps for completed steps

✅ **Pass:** Workflow panel renders correctly  
❌ **Fail:** Component not visible or broken

#### Test 6.4: Verify Bank Role Permissions
**Should see (Bank role):**
- [ ] "Record Payment" button visible
- [ ] "Record LC Settlement" button visible (if payment done)

**Should NOT see (other roles):**
- [ ] NO "Record Forex" button (that's NBE only)
- [ ] NO "Complete Audit" button (that's ECTA only)
- [ ] NO "Close Contract" button (that's Admin only)

✅ **Pass:** Only Bank-specific buttons visible  
❌ **Fail:** Seeing buttons for other roles

#### Test 6.5: Test Record Payment Functionality
If "Record Payment" button is visible:

1. Click **"Record Payment"** button
2. **Verify dialog opens:**
   - [ ] Form displays
   - [ ] Amount field
   - [ ] Currency dropdown
   - [ ] SWIFT Reference field
   - [ ] Payment Date picker

3. **Fill form:**
   - Amount: `95000`
   - Currency: `USD`
   - SWIFT Reference: `SWIFT-TEST-${today}`
   - Date: Select today

4. Click **"Record"** or **"Submit"**

5. **Verify result:**
   - [ ] Success message appears
   - [ ] Dialog closes
   - [ ] Step 1 shows ✅ checkmark
   - [ ] Progress bar updates (20% or higher)
   - [ ] No errors in console

✅ **Pass:** Payment recorded successfully  
❌ **Fail:** Error or no update

#### Test 6.6: Test Record LC Settlement Functionality
**Prerequisites:** Payment must be recorded first (Test 6.5)

If "Record LC Settlement" button is visible:

1. Click **"Record LC Settlement"** button
2. **Verify dialog opens:**
   - [ ] Form displays
   - [ ] LC Number field (may be pre-filled)
   - [ ] Settlement Date picker
   - [ ] Notes/Comments field

3. **Fill form:**
   - LC Number: (use existing or check pre-filled)
   - Settlement Date: Select today
   - Notes: `Test LC settlement - ${today}`

4. Click **"Record Settlement"**

5. **Verify result:**
   - [ ] Success message appears
   - [ ] Dialog closes
   - [ ] Step 3 shows ✅ checkmark
   - [ ] Progress bar updates to 60% (3/5 steps)
   - [ ] No errors in console

✅ **Pass:** LC settlement recorded successfully  
❌ **Fail:** Error or validation issue

#### Test 6.7: Progress Calculation Verification
After recording payment and settlement:

**Check progress bar:**
- After payment (Step 1): Should show **20%** (1/5)
- After forex (Step 2): Should show **40%** (2/5)
- After LC settlement (Step 3): Should show **60%** (3/5)
- After audit (Step 4): Should show **80%** (4/5)
- After closure (Step 5): Should show **100%** (5/5)

**Current progress:** _____% 

✅ **Pass:** Progress calculates correctly  
❌ **Fail:** Progress stuck or incorrect

#### Test 6.8: Browser Console Check
Press **F12** to open Developer Tools, go to Console tab

**Check for:**
- [ ] No red errors
- [ ] No JSON parsing errors
- [ ] No "Unexpected token" errors
- [ ] No 401 unauthorized errors
- [ ] No 404 not found errors

**Warnings (yellow) are OK**, but errors (red) need fixing!

✅ **Pass:** Console is clean  
❌ **Fail:** Errors present

---

### Phase 7: Cross-Tab Navigation (2 minutes)

#### Test 7.1: Navigate Through All Tabs
Test tab switching works smoothly:

1. Tab 0: Payment Methods → ✅ Loads
2. Tab 1: Forex Allocations → ✅ Loads
3. Tab 2: SWIFT Messages → ✅ Loads
4. Tab 3: Document Examination → ✅ Loads
5. Tab 4: Payment Release → ✅ Loads
6. Tab 5: Analytics → ✅ Loads
7. Tab 6: User Management → ✅ Loads
8. Tab 7: Audit Trail → ✅ Loads
9. **Tab 8: LC Settlements** → ✅ Loads

**Total tabs visible:** _____  
**Expected:** 9 tabs (indices 0-8)

✅ **Pass:** All tabs navigate correctly  
❌ **Fail:** Tab switching broken or tabs missing

#### Test 7.2: Data Persistence
1. Go to Tab 8
2. Note the current state
3. Switch to Tab 0
4. Switch back to Tab 8
5. Verify state is preserved

✅ **Pass:** Data persists across navigation  
❌ **Fail:** Data lost or reset

---

### Phase 8: Integration Test (Optional, 10 minutes)

If you have time, test the complete LC lifecycle:

1. **Tab 0:** Create new LC
2. **(Exporter Portal):** Submit documents
3. **Tab 3:** Examine and approve documents
4. **Tab 4:** Release payment to exporter
5. **(Shipping Portal):** Mark shipment as DELIVERED
6. **Tab 8:** Record payment from buyer
7. **(NBE Portal):** Record forex repatriation
8. **Tab 8:** Record LC settlement
9. **(ECTA Portal):** Complete audit
10. **(Admin):** Close contract

**Result:** Workflow 100% complete ✅

---

## 📊 Test Results Summary

### Critical Tests (Must Pass)
- [ ] Test 1.1: API Health ✅
- [ ] Test 2.1: Bank Login ✅
- [ ] Test 6.1: Tab 8 Loads Without Errors ✅ ⭐
- [ ] Test 6.3: PostDeliveryWorkflowPanel Renders ✅ ⭐
- [ ] Test 6.8: No Console Errors ✅ ⭐

### Important Tests (Should Pass)
- [ ] Test 6.4: Role Permissions Correct ✅
- [ ] Test 6.5: Record Payment Works ✅
- [ ] Test 6.6: Record LC Settlement Works ✅
- [ ] Test 6.7: Progress Calculates Correctly ✅
- [ ] Test 7.1: All Tabs Navigate ✅

### Optional Tests (Nice to Have)
- [ ] Test 3.3: LC Creation
- [ ] Test 4.3: Document Examination
- [ ] Test 5.3: Payment Release
- [ ] Test 8: Complete Integration

---

## ✅ Success Criteria

**Minimum to approve:**
- ✅ Tab 8 loads without JSON errors
- ✅ PostDeliveryWorkflowPanel displays
- ✅ Can record payment
- ✅ Can record LC settlement
- ✅ Progress bar updates
- ✅ No console errors

**All 6 critical criteria met?** → ✅ **APPROVED FOR PRODUCTION**

---

## 🐛 If Tests Fail

### Issue: Tab 8 shows JSON error
**Fix:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Logout and login again
4. Check if fix was applied to PostDeliveryWorkflowPanel.tsx

### Issue: No delivered shipments
**Solution:**
```bash
# Create test delivered shipment
node tests/test-complete-workflow.js
```

### Issue: Buttons disabled
**Reason:**
- Payment button: Needs delivered shipment
- LC Settlement button: Needs payment recorded first
- Forex button: Wrong role (you're Bank, not NBE)

### Issue: Console errors
**Check:**
1. Is API running? `curl http://localhost:3001/health`
2. Are you logged in? Check localStorage.authToken
3. Network tab (F12) - any 401/404 errors?

---

## 📸 Screenshots to Take

For documentation:
1. [ ] Banks Portal with all 9 tabs visible
2. [ ] Tab 8 content (LC Settlement Tracking)
3. [ ] PostDeliveryWorkflowPanel with progress
4. [ ] Record Payment dialog
5. [ ] Success message after payment
6. [ ] Updated progress bar (60%)
7. [ ] Clean browser console (F12)

---

## 🎉 Test Completion

**Tester:** _____________________  
**Date:** _____________________  
**Duration:** _____ minutes  

**Overall Result:**
- [ ] ✅ PASS - All critical tests passed
- [ ] ⚠️  PASS WITH WARNINGS - Minor issues
- [ ] ❌ FAIL - Critical issues found

**Notes:**
_________________________________________________________
_________________________________________________________
_________________________________________________________

**Sign-off:** _____________________

---

## 📞 Need Help?

1. Check: `FIX-APPLIED-AUTH-TOKEN.md` (auth token fix)
2. Check: `BANKS-PORTAL-WORKFLOW-CLARIFICATION.md` (workflow explanation)
3. Check: `TESTING-EXECUTION-GUIDE.md` (detailed guide)
4. Run: `node tests/quick-integration-test.js` (automated validation)

---

**Status:** ✅ Ready to Test  
**Last Updated:** September 1, 2026  
**Priority:** HIGH - Tab 8 functionality validation
