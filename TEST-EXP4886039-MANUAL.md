# 🧪 Banks Portal Workflow Test - EXP4886039

**Complete manual testing for exporter EXP4886039**  
**Duration:** 20-30 minutes  
**Tester:** __________________  
**Date:** __________________

---

## 📋 Test Objective

Test the complete Banks Portal workflow for exporter **EXP4886039**, covering:
- Tab 0: Payment Methods (LC Management)
- Tab 3: Document Examination
- Tab 4: Payment Release
- Tab 8: LC Settlements (Post-Delivery)

---

## ✅ Pre-Test Setup

### Step 1: System Check
```bash
# Check API
curl http://localhost:3001/api/v1/health

# Expected: {"status":"healthy",...}
```

- [ ] API is running
- [ ] UI is accessible at http://localhost:3000
- [ ] Browser ready (Chrome/Firefox/Edge)

### Step 2: Login
1. Open: **http://localhost:3000**
2. Login as: **bank_admin / Bank@2024**
3. Verify: Redirected to Banks Portal

- [ ] Login successful
- [ ] Banks Portal displays
- [ ] No console errors (F12)

---

## 📊 PHASE 1: Data Discovery for EXP4886039

### Test 1.1: Check Contracts for EXP4886039

**Navigate to:** Banks Portal → Any tab with data

**Search/Filter for:** EXP4886039

**Record findings:**
```
Contracts found for EXP4886039:
1. Contract ID: __________________ | Value: __________
2. Contract ID: __________________ | Value: __________
3. Contract ID: __________________ | Value: __________

Total contracts: _____
```

**Notes:**
- [ ] Contracts exist for this exporter
- [ ] Contract IDs are visible and valid
- [ ] Can access contract details

---

## 💰 PHASE 2: Tab 0 - Payment Methods (LCs)

### Test 2.1: View LCs for EXP4886039

**Navigate to:** Tab 0 (Payment Methods)

**Look for:** LCs related to EXP4886039 (check by exporter ID or beneficiary)

**Record LCs found:**
```
Letter of Credits for EXP4886039:
1. LC ID: __________________ | Status: __________ | Amount: __________
2. LC ID: __________________ | Status: __________ | Amount: __________
3. LC ID: __________________ | Status: __________ | Amount: __________

Total LCs: _____
```

**Verify:**
- [ ] LC list displays correctly
- [ ] Can see LC details
- [ ] Status indicators visible
- [ ] Amount and currency correct

### Test 2.2: LC Details Inspection

**Select one LC and click "View Details"**

**LC Selected:** __________________

**Check displays:**
- [ ] LC Number
- [ ] Beneficiary (should be EXP4886039)
- [ ] Amount and currency
- [ ] Issue date and expiry date
- [ ] Status
- [ ] Terms and conditions

**Screenshot:** [ ] Taken

---

## 📄 PHASE 3: Tab 3 - Document Examination

### Test 3.1: Navigate to Document Examination

**Click:** Tab 3 (Document Examination)

**Verify:**
- [ ] Tab switches correctly
- [ ] Page loads without errors
- [ ] Info alert explains purpose

### Test 3.2: Find LCs Pending Examination

**Filter for:** EXP4886039 or use search

**Look for LCs with status:**
- DOCUMENTS_SUBMITTED
- PENDING_EXAMINATION
- ISSUED (may need documents)

**Record findings:**
```
LCs pending examination for EXP4886039:
1. LC ID: __________________ | Status: __________
2. LC ID: __________________ | Status: __________

Total pending: _____
```

**If NO LCs pending:**
- [ ] Check if documents need to be submitted (Exporter Portal action)
- [ ] Note: This is expected if no documents submitted yet

**If LCs ARE pending:**
- [ ] Select one LC
- [ ] Click "View Documents" or "Examine"
- [ ] Review submitted documents
- [ ] Check document types (Invoice, BL, COO, etc.)

### Test 3.3: Document Examination Actions

**For a pending LC:**

**LC Selected:** __________________

**Actions available:**
- [ ] View Documents button
- [ ] Examine Documents button
- [ ] Approve button
- [ ] Reject button
- [ ] Audit Trail button

**Test Examine:**
1. Click "Examine Documents"
2. Dialog/page opens
3. Documents list visible
4. Can download/view each document

**Result:**
- [ ] ✅ Can examine documents
- [ ] ❌ Cannot examine (note reason)

**Screenshot:** [ ] Taken

---

## 💵 PHASE 4: Tab 4 - Payment Release

### Test 4.1: Navigate to Payment Release

**Click:** Tab 4 (Payment Release)

**Verify:**
- [ ] Tab switches correctly
- [ ] Page loads without errors
- [ ] Info alert explains payment release

### Test 4.2: Find LCs Ready for Payment

**Filter for:** EXP4886039

**Look for LCs with status:**
- READY_FOR_PAYMENT
- UTILIZED
- DOCUMENTS_VERIFIED

**Record findings:**
```
LCs ready for payment for EXP4886039:
1. LC ID: __________________ | Status: __________ | Amount: __________
2. LC ID: __________________ | Status: __________ | Amount: __________

Total ready: _____
```

**If NO LCs ready:**
- [ ] Documents need to be examined first (Tab 3)
- [ ] Note: This is expected workflow sequence

**If LCs ARE ready:**
- [ ] LCs display in payment release section
- [ ] Amount clearly visible
- [ ] Exporter name shown
- [ ] "Release Payment" button visible

### Test 4.3: Payment Release Actions

**For a ready LC:**

**LC Selected:** __________________

**Actions available:**
- [ ] Release Payment button
- [ ] View Details button
- [ ] Audit Trail button

**Test Release Payment:**
1. Click "Release Payment"
2. Confirmation dialog appears
3. Review payment details
4. Authorization fields present (if required)

**Payment Details:**
- Amount: __________
- Currency: __________
- Beneficiary: EXP4886039
- Account: __________

**Result:**
- [ ] ✅ Can release payment
- [ ] ⚠️  Authorization required
- [ ] ❌ Cannot release (note reason)

**Screenshot:** [ ] Taken

**Important Note:**
> Payment released here is TO the exporter (EXP4886039) so they can ship goods.
> This is BEFORE delivery. This is NOT the post-delivery settlement!

---

## 🚢 PHASE 5: Check Shipments

### Test 5.1: Find Shipments for EXP4886039

**Method 1: Check contracts in Tab 0, note contract IDs**
**Method 2: Check another portal (Shipping/Admin) if accessible**

**Record shipments:**
```
Shipments for EXP4886039's contracts:
1. Shipment ID: __________________ | Status: __________ | Contract: __________
2. Shipment ID: __________________ | Status: __________ | Contract: __________
3. Shipment ID: __________________ | Status: __________ | Contract: __________

Total shipments: _____
Delivered shipments: _____
```

**Shipment statuses to look for:**
- CREATED
- IN_TRANSIT
- CUSTOMS_CLEARANCE
- **DELIVERED** ← This is what Tab 8 needs!

---

## 🎯 PHASE 6: Tab 8 - LC Settlements (Post-Delivery) ⭐

### Test 6.1: Navigate to LC Settlements

**Click:** Tab 8 (LC Settlements) - **LAST TAB**

**Critical Checks:**
- [ ] Tab exists and is visible
- [ ] Tab label: "LC Settlements" or "LC Settlements (X)"
- [ ] Tab switches successfully
- [ ] Page loads without errors
- [ ] Heading: "💰 LC Settlement Tracking"
- [ ] **NO JSON parsing errors** (check console F12)
- [ ] **NO red error boxes**

**If errors appear:**
- [ ] Take screenshot
- [ ] Check browser console (F12)
- [ ] Note exact error message
- [ ] Auth token fix may not be applied

**Result:**
- [ ] ✅ Tab 8 loads perfectly
- [ ] ❌ Tab 8 has errors (stop and report)

### Test 6.2: Check Delivered Shipments for EXP4886039

**What you should see:**

**Scenario A: Delivered shipments exist**
- [ ] One or more shipment cards display
- [ ] Each card shows shipment ID
- [ ] Green "Delivered" badge visible
- [ ] Contract ID shown
- [ ] LC number shown (if applicable)

**Scenario B: No delivered shipments**
- [ ] Info message: "No delivered shipments requiring LC settlement"
- [ ] Message is styled as info (blue), not error (red)
- [ ] Tab still functions correctly

**Your scenario:** [ ] A [ ] B

**If Scenario B (no delivered shipments):**
```
This is NORMAL if:
- Shipments are still in transit
- Shipments not yet marked as DELIVERED
- No completed shipments for this exporter yet

Tab 8 is working correctly, just no data to display.
```

**If Scenario A (has delivered shipments):**

**Record delivered shipments:**
```
Delivered shipments for EXP4886039:
1. Shipment ID: __________________ | Contract: __________ | LC: __________
2. Shipment ID: __________________ | Contract: __________ | LC: __________

Total delivered: _____
```

### Test 6.3: PostDeliveryWorkflowPanel Inspection

**For EACH delivered shipment card:**

**Shipment ID:** __________________

**Check workflow panel displays:**
- [ ] Panel visible inside shipment card
- [ ] Progress bar at top
- [ ] Progress percentage shown (e.g., "0%", "20%", "60%")
- [ ] 5 workflow steps visible

**Verify 5 steps display:**
```
Step 1: Payment Received       [ ] Visible  Icon: ___
Step 2: Forex Repatriated      [ ] Visible  Icon: ___
Step 3: LC Settlement          [ ] Visible  Icon: ___
Step 4: ECTA Audit             [ ] Visible  Icon: ___
Step 5: Contract Closed        [ ] Visible  Icon: ___
```

**Icon types:**
- ✅ = Completed step (green checkmark)
- ⏳ = Pending step (clock or gray icon)
- 🔄 = In progress (loading icon)

**Check step details for completed steps:**
- [ ] Timestamp shown (date/time)
- [ ] User who completed action
- [ ] Additional details (amounts, references)

**Progress bar check:**
- Progress: _____% 
- Color: [ ] Green [ ] Yellow [ ] Blue
- Smooth animation: [ ] Yes [ ] No

**Screenshot:** [ ] Taken

### Test 6.4: Bank Role Permissions Check

**Buttons that SHOULD be visible (Bank role):**
- [ ] "Record Payment" button
  - Enabled if: Payment not yet recorded
  - Disabled if: Payment already recorded
  
- [ ] "Record LC Settlement" button
  - Enabled if: Payment AND Forex both completed
  - Disabled if: Prerequisites not met

**Buttons that should NOT be visible:**
- [ ] NO "Record Forex" button (that's NBE only)
- [ ] NO "Complete Audit" button (that's ECTA only)
- [ ] NO "Close Contract" button (that's Admin only)

**Result:**
- [ ] ✅ Correct buttons for Bank role
- [ ] ❌ Seeing wrong buttons (report this)

### Test 6.5: Record Payment Action

**Shipment ID:** __________________

**Prerequisites:**
- [ ] Delivered shipment exists
- [ ] Payment not yet recorded (Step 1 not checked)
- [ ] "Record Payment" button visible

**Test steps:**
1. Click "Record Payment" button
2. Dialog opens

**Dialog displays:**
- [ ] Title: "Record Payment" or similar
- [ ] Amount field (input)
- [ ] Currency dropdown
- [ ] SWIFT Reference field
- [ ] Payment Date picker
- [ ] Submit/Record button
- [ ] Cancel button

3. **Fill form:**
```
Amount: 95000
Currency: USD
SWIFT Reference: SWIFT-TEST-EXP4886039-${TODAY}
Payment Date: ${TODAY}
```

4. Click "Submit" or "Record"

**Expected results:**
- [ ] Success message appears (green alert/toast)
- [ ] Dialog closes automatically
- [ ] Workflow panel updates
- [ ] Step 1 now shows ✅ checkmark
- [ ] Progress bar increases to ~20%
- [ ] Timestamp appears on Step 1
- [ ] No console errors

**Actual results:**
- [ ] ✅ Payment recorded successfully
- [ ] ⚠️  Validation error (note message)
- [ ] ❌ Failed with error (note error)

**Error message (if any):** ___________________________

**Screenshot:** [ ] Taken (before and after)

### Test 6.6: Verify Payment Recorded

After recording payment:

**Check Step 1 (Payment Received):**
- Status: [ ] ✅ Complete [ ] ⏳ Pending
- Amount shown: __________
- Currency: __________
- SWIFT Reference: __________
- Date: __________
- Recorded by: __________

**Check overall progress:**
- Progress increased: [ ] Yes [ ] No
- New percentage: _____%
- Expected: 20% (1 of 5 steps)

### Test 6.7: Record LC Settlement Action

**Prerequisites:**
- [ ] Payment recorded (Step 1 ✅)
- [ ] Forex repatriated (Step 2 ✅) - Done by NBE, not Bank
- [ ] "Record LC Settlement" button enabled

**If button is disabled:**
- Reason: Step 2 (Forex) not yet completed
- This is NORMAL - NBE must complete forex first
- Skip this test and note: "Waiting for NBE forex repatriation"

**If button is enabled:**

1. Click "Record LC Settlement" button
2. Dialog opens

**Dialog displays:**
- [ ] Title: "Record LC Settlement" or similar
- [ ] LC Number field (may be pre-filled)
- [ ] Settlement Date picker
- [ ] Notes/Comments field
- [ ] Submit/Record button
- [ ] Cancel button

3. **Fill form:**
```
LC Number: ${LC_NUMBER_FROM_DATA}
Settlement Date: ${TODAY}
Notes: LC settlement for EXP4886039 - ${TODAY}
```

4. Click "Record Settlement"

**Expected results:**
- [ ] Success message appears
- [ ] Dialog closes
- [ ] Workflow panel updates
- [ ] Step 3 now shows ✅ checkmark
- [ ] Progress bar increases to ~60%
- [ ] Timestamp appears on Step 3
- [ ] No console errors

**Actual results:**
- [ ] ✅ LC settlement recorded successfully
- [ ] ⚠️  Validation error (note message)
- [ ] ❌ Failed with error (note error)

**Screenshot:** [ ] Taken

### Test 6.8: Final Workflow State

**After all Bank actions (Payment + LC Settlement):**

**Workflow completion:**
```
Step 1: Payment Received       [✅] 20%  - Bank completed
Step 2: Forex Repatriated      [ ]  40%  - NBE action
Step 3: LC Settlement          [✅] 60%  - Bank completed  
Step 4: ECTA Audit             [ ]  80%  - ECTA action
Step 5: Contract Closed        [ ]  100% - Admin action
```

**Current progress:** _____%

**Bank's contribution:** [ ] Complete [ ] Partial [ ] Not started

**Next steps in workflow:**
- [ ] NBE needs to record forex (Step 2)
- [ ] ECTA needs to complete audit (Step 4)
- [ ] Admin needs to close contract (Step 5)

---

## 📊 SUMMARY: EXP4886039 Test Results

### Data Found
```
Exporter: EXP4886039
Contracts: _____ 
LCs: _____
Shipments: _____
Delivered Shipments: _____
```

### Tab Test Results
```
Tab 0 (Payment Methods):     [ ] ✅ [ ] ⚠️  [ ] ❌
Tab 3 (Document Examination): [ ] ✅ [ ] ⚠️  [ ] ❌
Tab 4 (Payment Release):      [ ] ✅ [ ] ⚠️  [ ] ❌
Tab 8 (LC Settlements):       [ ] ✅ [ ] ⚠️  [ ] ❌
```

### Tab 8 Specific Results
```
Tab 8 loads without errors:           [ ] ✅ [ ] ❌
PostDeliveryWorkflowPanel renders:     [ ] ✅ [ ] ❌
Record Payment works:                  [ ] ✅ [ ] ⚠️  [ ] ❌
Record LC Settlement works:            [ ] ✅ [ ] ⚠️  [ ] ❌
Progress calculation correct:          [ ] ✅ [ ] ❌
Role permissions enforced:             [ ] ✅ [ ] ❌
No console errors:                     [ ] ✅ [ ] ❌
```

### Overall Assessment
```
Testing Duration: _____ minutes
Critical Issues: _____ 
Warnings: _____
Pass Rate: _____%

Status: [ ] PASS [ ] PASS WITH WARNINGS [ ] FAIL
```

---

## 🔍 Issues Found

### Critical Issues
1. ___________________________________________________
2. ___________________________________________________

### Warnings
1. ___________________________________________________
2. ___________________________________________________

### Notes
___________________________________________________________
___________________________________________________________
___________________________________________________________

---

## 📸 Screenshots Taken

- [ ] Tab 0: LCs for EXP4886039
- [ ] Tab 3: Document examination
- [ ] Tab 4: Payment release
- [ ] Tab 8: LC Settlements tab loaded
- [ ] Tab 8: PostDeliveryWorkflowPanel display
- [ ] Tab 8: Record Payment dialog
- [ ] Tab 8: Success message after payment
- [ ] Tab 8: Updated progress (60%)
- [ ] Browser console (F12) showing no errors

---

## ✅ Sign-Off

**Tester Name:** _______________________  
**Date:** _______________________  
**Time:** _______________________  
**Signature:** _______________________  

**Approved for Production:** [ ] Yes [ ] No [ ] With Conditions

**Conditions (if any):**
___________________________________________________________
___________________________________________________________

---

**Test Complete!** 🎉
