# Banks Portal - Manual Test Execution Script
**Date:** September 1, 2026  
**Tester:** _____________  
**Test Duration:** ~60-90 minutes

## Prerequisites Checklist
- [ ] System is running (START-SYSTEM.bat executed)
- [ ] UI accessible at http://localhost:3000
- [ ] API accessible at http://localhost:3001
- [ ] Test user credentials ready: `bank_admin / Bank@2024`
- [ ] Browser DevTools open (F12) to monitor console errors
- [ ] Database accessible for verification queries

---

## Test Execution Instructions

### How to Use This Script
1. Check each box `[ ]` as you complete the step
2. Record results in the "Result" column (✅ Pass / ❌ Fail / ⚠️ Partial)
3. Note any issues in the "Notes" section
4. Take screenshots for failures
5. Record timestamps for performance issues

---

## TAB 0: PAYMENT METHODS

### Test Case 0.1: Tab Load and KPIs
**Objective:** Verify Payment Methods tab loads correctly with KPI cards

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Login as bank_admin | Login successful, redirected to Banks Portal | [ ] | |
| 2 | Verify default tab is "Payment Methods" | Tab 0 active, content visible | [ ] | |
| 3 | Check KPI cards display | See 4+ KPI cards with metrics | [ ] | |
| 4 | Verify KPI data accuracy | Numbers match database records | [ ] | |
| 5 | Check for console errors | No errors in browser console | [ ] | |

**KPIs to Verify:**
- [ ] Total LCs Count
- [ ] Active LCs Value
- [ ] Pending Approvals
- [ ] Settlement Status

### Test Case 0.2: Letter of Credit Creation
**Objective:** Create a new LC and verify it appears in the system

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Click "Create LC" or "New Payment Method" button | Dialog/form opens | [ ] | |
| 2 | Fill LC Number: `LC-TEST-${timestamp}` | Value accepted | [ ] | |
| 3 | Fill Amount: `100000` | Value accepted | [ ] | |
| 4 | Select Currency: `USD` | USD selected | [ ] | |
| 5 | Set Expiry Date: +90 days | Date accepted | [ ] | |
| 6 | Select Contract from dropdown | Contract selected | [ ] | |
| 7 | Click "Submit" or "Create" | Success message shown | [ ] | |
| 8 | Verify LC appears in list | New LC visible in DataGrid | [ ] | |
| 9 | Check blockchain record | LC recorded on blockchain | [ ] | |

**Database Verification:**
```sql
SELECT * FROM letters_of_credit 
WHERE lc_number LIKE 'LC-TEST-%' 
ORDER BY created_at DESC LIMIT 1;
```
- [ ] Record exists in PostgreSQL
- [ ] Blockchain hash present

### Test Case 0.3: LC List Display
**Objective:** Verify LC list displays correctly with all columns

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | View LC DataGrid | Grid displays with data | [ ] | |
| 2 | Check columns present | All expected columns visible | [ ] | |
| 3 | Test sorting | Click column headers to sort | [ ] | |
| 4 | Test filtering | Use filter inputs | [ ] | |
| 5 | Test pagination | Navigate between pages | [ ] | |

**Expected Columns:**
- [ ] LC Number
- [ ] Contract ID
- [ ] Amount
- [ ] Currency
- [ ] Status
- [ ] Expiry Date
- [ ] Actions

---

## TAB 1: FOREX ALLOCATIONS

### Test Case 1.1: Tab Load
**Objective:** Verify Forex Allocations tab loads correctly

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Click "Forex Allocations" tab | Tab switches to index 1 | [ ] | |
| 2 | Wait for data to load | Loading indicator then content | [ ] | |
| 3 | Verify forex data displays | Grid or cards with forex info | [ ] | |
| 4 | Check retention policy info | 30% retention rule displayed | [ ] | |
| 5 | Verify exchange rates | Current USD/ETB rate shown | [ ] | |

### Test Case 1.2: Forex Allocation Details
**Objective:** Verify forex allocation details are accurate

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Select a forex allocation record | Details displayed | [ ] | |
| 2 | Verify USD amount | Matches LC amount | [ ] | |
| 3 | Verify ETB conversion | Math correct (USD × rate) | [ ] | |
| 4 | Verify 30% retention | 30% marked for retention | [ ] | |
| 5 | Verify 70% for repatriation | 70% available | [ ] | |

**Manual Calculation:**
```
LC Amount (USD): __________
Exchange Rate: __________
Total ETB: __________ (USD × Rate)
30% Retention: __________ (Total × 0.3)
70% Repatriation: __________ (Total × 0.7)
```

---

## TAB 2: SWIFT MESSAGES

### Test Case 2.1: SWIFT Messages Display
**Objective:** Verify SWIFT messages are displayed correctly

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Click "SWIFT Messages" tab | Tab switches to index 2 | [ ] | |
| 2 | Wait for messages to load | Messages appear | [ ] | |
| 3 | Check message types present | MT700, MT103, etc. | [ ] | |
| 4 | Verify message format | Valid SWIFT format | [ ] | |
| 5 | Check timestamps | Correct date/time | [ ] | |

### Test Case 2.2: SWIFT Message Creation
**Objective:** Create and send SWIFT message

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Click "Compose" or "New Message" | Form opens | [ ] | |
| 2 | Select message type: MT700 | Type selected | [ ] | |
| 3 | Fill required fields | All fields valid | [ ] | |
| 4 | Click "Send" | Success confirmation | [ ] | |
| 5 | Verify message in list | New message visible | [ ] | |

---

## TAB 3: DOCUMENT EXAMINATION

### Test Case 3.1: Document List Display
**Objective:** Verify documents requiring examination are listed

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Click "Document Examination" tab | Tab switches to index 3 | [ ] | |
| 2 | Wait for documents to load | Document list appears | [ ] | |
| 3 | Verify document types | Invoice, BL, COO, etc. | [ ] | |
| 4 | Check status indicators | Pending/Approved/Rejected | [ ] | |
| 5 | Verify exporter info | Correct exporter names | [ ] | |

### Test Case 3.2: Document Review Process
**Objective:** Review and approve/reject documents

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Click on a pending document | Document details open | [ ] | |
| 2 | View document preview/download | Document accessible | [ ] | |
| 3 | Check document contents | Readable and valid | [ ] | |
| 4 | Enter review notes | Text accepted | [ ] | |
| 5 | Click "Approve" or "Reject" | Status updated | [ ] | |
| 6 | Verify audit trail | Action logged | [ ] | |

---

## TAB 4: PAYMENT RELEASE

### Test Case 4.1: Payment Release List
**Objective:** Verify payments ready for release are listed

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Click "Payment Release" tab | Tab switches to index 4 | [ ] | |
| 2 | Wait for payment data | Payments appear | [ ] | |
| 3 | Verify payment details | Amount, LC, exporter correct | [ ] | |
| 4 | Check approval status | Requires authorization | [ ] | |
| 5 | Verify compliance checks | All checks passed | [ ] | |

### Test Case 4.2: Release Payment
**Objective:** Execute payment release

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Select a payment for release | Payment selected | [ ] | |
| 2 | Click "Authorize Payment" | Confirmation dialog | [ ] | |
| 3 | Enter authorization code/PIN | Code accepted | [ ] | |
| 4 | Confirm release | Success message | [ ] | |
| 5 | Verify payment status updated | Status = "Released" | [ ] | |
| 6 | Check blockchain record | Transaction recorded | [ ] | |

---

## TAB 5: ANALYTICS

### Test Case 5.1: Analytics Dashboard
**Objective:** Verify analytics and reports display correctly

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Click "Analytics" tab | Tab switches to index 5 | [ ] | |
| 2 | Wait for charts to render | Charts appear (2-3 sec) | [ ] | |
| 3 | Verify chart types | Bar, line, pie charts | [ ] | |
| 4 | Check data accuracy | Numbers match KPIs | [ ] | |
| 5 | Test date range filter | Charts update | [ ] | |

### Test Case 5.2: Export Reports
**Objective:** Export analytics data

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Click "Export" or "Download" | Format options shown | [ ] | |
| 2 | Select format (PDF/Excel) | Format selected | [ ] | |
| 3 | Click "Download" | File downloads | [ ] | |
| 4 | Open downloaded file | Data correct and readable | [ ] | |

---

## TAB 6: USER MANAGEMENT

### Test Case 6.1: User List Display
**Objective:** Verify bank users are listed correctly

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Click "User Management" tab | Tab switches to index 6 | [ ] | |
| 2 | Wait for user data | User list appears | [ ] | |
| 3 | Verify user columns | Name, role, status, etc. | [ ] | |
| 4 | Check user count | Matches expected number | [ ] | |
| 5 | Test search functionality | Search works | [ ] | |

### Test Case 6.2: User Creation
**Objective:** Create a new bank user

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Click "Add User" button | Form opens | [ ] | |
| 2 | Fill username: `test_bank_user_${timestamp}` | Accepted | [ ] | |
| 3 | Fill email: valid email | Accepted | [ ] | |
| 4 | Select role: "Bank Officer" | Role selected | [ ] | |
| 5 | Set permissions | Checkboxes work | [ ] | |
| 6 | Click "Create" | Success message | [ ] | |
| 7 | Verify user in list | New user visible | [ ] | |

---

## TAB 7: AUDIT TRAIL

### Test Case 7.1: Audit Trail Display
**Objective:** Verify all bank actions are logged

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Click "Audit Trail" tab | Tab switches to index 7 | [ ] | |
| 2 | Wait for audit data | Audit records appear | [ ] | |
| 3 | Verify recent actions logged | All actions present | [ ] | |
| 4 | Check blockchain verification | Hash icons present | [ ] | |
| 5 | Test filter by action type | Filters work | [ ] | |

### Test Case 7.2: Blockchain Verification
**Objective:** Verify audit records on blockchain

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Select an audit record | Details displayed | [ ] | |
| 2 | Click "Verify on Blockchain" | Verification dialog | [ ] | |
| 3 | View blockchain hash | Hash displayed | [ ] | |
| 4 | Click "View on Explorer" | Explorer opens (if available) | [ ] | |
| 5 | Verify data matches | Blockchain data = DB data | [ ] | |

---

## TAB 8: LC SETTLEMENTS (POST-DELIVERY) ⭐ NEW FEATURE

### Test Case 8.1: Tab Presence and Load
**Objective:** Verify the new LC Settlements tab exists and loads

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Count total tabs visible | Should be 9 tabs (0-8) | [ ] | |
| 2 | Click "LC Settlements" tab | Tab switches to index 8 | [ ] | |
| 3 | Wait for content to load | Content appears (3-5 sec) | [ ] | |
| 4 | Verify tab is at correct position | After "Audit Trail" | [ ] | |
| 5 | Check for console errors | No errors | [ ] | |

### Test Case 8.2: KPI Cards Display
**Objective:** Verify KPI cards for LC Settlements

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Verify "Delivered Shipments" KPI | Card visible with count | [ ] | |
| 2 | Verify "Pending Settlements" KPI | Card visible with count | [ ] | |
| 3 | Verify "Active LCs" KPI | Card visible with count | [ ] | |
| 4 | Verify "Completed Settlements" KPI | Card visible with count | [ ] | |
| 5 | Check KPI data accuracy | Numbers make sense | [ ] | |

### Test Case 8.3: Delivered Shipments Display
**Objective:** Verify delivered shipments are listed correctly

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Check for shipment cards | Cards displayed for each shipment | [ ] | |
| 2 | Verify "DELIVERED" badge | Green badge visible | [ ] | |
| 3 | Check shipment details | ID, contract, date visible | [ ] | |
| 4 | Verify PostDeliveryWorkflowPanel | Panel visible in each card | [ ] | |
| 5 | Check for empty state | Proper message if no shipments | [ ] | |

**Test Shipment:** Use `SHIP1786102768` or create new delivered shipment

### Test Case 8.4: PostDeliveryWorkflowPanel Component
**Objective:** Verify the workflow panel renders correctly

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Locate workflow panel | Panel visible in card | [ ] | |
| 2 | Check workflow title | "Post-Delivery Workflow" shown | [ ] | |
| 3 | Verify progress bar | Progress bar at top | [ ] | |
| 4 | Check progress percentage | Shows completion % | [ ] | |
| 5 | Verify step indicators | All 5 steps visible | [ ] | |

**Expected Steps:**
- [ ] 1. Payment Received
- [ ] 2. Forex Repatriated (NBE)
- [ ] 3. LC Settlement
- [ ] 4. ECTA Audit
- [ ] 5. Contract Closed

### Test Case 8.5: Workflow Step Status Icons
**Objective:** Verify status icons for each workflow step

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Check pending steps | Clock/pending icon | [ ] | |
| 2 | Check completed steps | Green checkmark | [ ] | |
| 3 | Check in-progress steps | Loading/spinner icon | [ ] | |
| 4 | Verify color coding | Green=done, yellow=pending | [ ] | |
| 5 | Check timestamps | Dates shown for completed | [ ] | |

### Test Case 8.6: Record Payment Functionality
**Objective:** Test Bank's ability to record payment

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Locate "Record Payment" button | Button visible for Bank role | [ ] | |
| 2 | Click "Record Payment" | Dialog opens | [ ] | |
| 3 | Verify form fields | Amount, currency, SWIFT, date | [ ] | |
| 4 | Fill Amount: `95000.00` | Value accepted | [ ] | |
| 5 | Fill Currency: `USD` | USD selected | [ ] | |
| 6 | Fill SWIFT Reference: `SWIFT-TEST-${timestamp}` | Accepted | [ ] | |
| 7 | Select Payment Date: today | Date selected | [ ] | |
| 8 | Click "Record" or "Submit" | Success message | [ ] | |
| 9 | Verify workflow updates | Step 1 marked complete | [ ] | |
| 10 | Check progress bar | Progress increased | [ ] | |
| 11 | Verify audit trail | Action logged | [ ] | |
| 12 | Check blockchain record | Transaction on blockchain | [ ] | |

**Database Verification:**
```sql
SELECT * FROM post_delivery_workflow 
WHERE shipment_id = 'SHIP1786102768';
```
- [ ] `payment_received` = true
- [ ] `payment_amount` = 95000
- [ ] `payment_date` set
- [ ] `blockchain_payment_hash` present

### Test Case 8.7: Record LC Settlement Functionality
**Objective:** Test Bank's ability to record LC settlement

**Prerequisites:** Payment must be recorded first (Test 8.6)

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Verify payment recorded | Step 1 has checkmark | [ ] | |
| 2 | Locate "Record LC Settlement" button | Button visible (may be disabled) | [ ] | |
| 3 | Check button enabled | Enabled if payment + forex done | [ ] | |
| 4 | Click "Record LC Settlement" | Dialog opens | [ ] | |
| 5 | Verify form fields | LC number, settlement date, notes | [ ] | |
| 6 | Fill LC Number: (auto-populated) | LC number present | [ ] | |
| 7 | Select Settlement Date: today | Date selected | [ ] | |
| 8 | Fill Notes: "Settlement completed" | Notes accepted | [ ] | |
| 9 | Click "Record Settlement" | Success message | [ ] | |
| 10 | Verify workflow updates | Step 3 marked complete | [ ] | |
| 11 | Check progress bar | Progress = 60% (3/5) | [ ] | |
| 12 | Verify audit trail | Action logged | [ ] | |
| 13 | Check blockchain record | Transaction on blockchain | [ ] | |

**Database Verification:**
```sql
SELECT * FROM post_delivery_workflow 
WHERE shipment_id = 'SHIP1786102768';
```
- [ ] `lc_settled` = true
- [ ] `lc_settlement_date` set
- [ ] `blockchain_lc_hash` present

### Test Case 8.8: Role-Based Permission Enforcement
**Objective:** Verify Bank role has correct permissions

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Check "Record Payment" button | ✅ VISIBLE for Bank | [ ] | |
| 2 | Check "Record LC Settlement" button | ✅ VISIBLE for Bank | [ ] | |
| 3 | Check "Record Forex" button | ❌ HIDDEN (NBE only) | [ ] | |
| 4 | Check "Complete Audit" button | ❌ HIDDEN (ECTA only) | [ ] | |
| 5 | Check "Close Contract" button | ❌ HIDDEN (Admin only) | [ ] | |

**Expected Permissions for Bank:**
- [ ] Can view all workflow steps (read-only)
- [ ] Can record payment (write)
- [ ] Can record LC settlement (write)
- [ ] Cannot record forex repatriation
- [ ] Cannot complete ECTA audit
- [ ] Cannot close contract

### Test Case 8.9: Workflow Progress Calculation
**Objective:** Verify progress percentage calculates correctly

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Start: no steps complete | Progress = 0% | [ ] | |
| 2 | After payment recorded | Progress = 20% (1/5) | [ ] | |
| 3 | After forex recorded | Progress = 40% (2/5) | [ ] | |
| 4 | After LC settlement | Progress = 60% (3/5) | [ ] | |
| 5 | After ECTA audit | Progress = 80% (4/5) | [ ] | |
| 6 | After contract closed | Progress = 100% (5/5) | [ ] | |

**Formula:** `(completed_steps / total_steps) × 100`

### Test Case 8.10: Multiple Shipments Display
**Objective:** Verify multiple delivered shipments are handled correctly

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Verify multiple shipment cards | Each in separate card | [ ] | |
| 2 | Check independent workflows | Each has own panel | [ ] | |
| 3 | Verify no data mixing | Correct data in each card | [ ] | |
| 4 | Test scrolling | Can scroll through all | [ ] | |
| 5 | Check performance | No lag with multiple cards | [ ] | |

---

## TAB 8: INTEGRATION TESTS

### Test Case 8.11: Complete LC Lifecycle Integration
**Objective:** Test full LC workflow from creation to settlement

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Tab 0: Create LC | LC created | [ ] | |
| 2 | Tab 3: Approve documents | Documents approved | [ ] | |
| 3 | Tab 4: Release payment | Payment released | [ ] | |
| 4 | (External) Mark shipment as DELIVERED | Status updated | [ ] | |
| 5 | Tab 8: Verify shipment appears | Visible in LC Settlements | [ ] | |
| 6 | Tab 8: Record payment | Payment recorded | [ ] | |
| 7 | (NBE Portal) Record forex | Forex recorded | [ ] | |
| 8 | Tab 8: Record LC settlement | Settlement recorded | [ ] | |
| 9 | (ECTA Portal) Complete audit | Audit completed | [ ] | |
| 10 | Tab 8: Verify 100% complete | All steps done | [ ] | |

**Timeline:** __________ minutes

### Test Case 8.12: Refresh Functionality
**Objective:** Verify onRefresh callback works

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Note current workflow state | Record progress % | [ ] | |
| 2 | (Different browser) Update workflow | Change made externally | [ ] | |
| 3 | Tab 8: Click refresh button | If available | [ ] | |
| 4 | Tab 8: Switch tabs away and back | Force reload | [ ] | |
| 5 | Verify data updates | New state visible | [ ] | |

### Test Case 8.13: Error Handling
**Objective:** Test error scenarios

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | (Stop API server) | Simulate API failure | [ ] | |
| 2 | Try to record payment | Error message shown | [ ] | |
| 3 | Check error message clarity | User-friendly message | [ ] | |
| 4 | (Restart API) | API back online | [ ] | |
| 5 | Retry action | Works now | [ ] | |

### Test Case 8.14: Blockchain Verification
**Objective:** Verify blockchain integration for settlements

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Record payment | Success | [ ] | |
| 2 | Check workflow panel | Blockchain hash shown | [ ] | |
| 3 | Click "Verify on Blockchain" | If button present | [ ] | |
| 4 | Verify data on blockchain | Data matches | [ ] | |

**Blockchain Query:**
```bash
# Query chaincode for shipment
docker exec cli peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"queryShipment","Args":["SHIP1786102768"]}'
```

- [ ] Blockchain record found
- [ ] Payment data matches
- [ ] Settlement data matches
- [ ] Timestamps correct

---

## CROSS-TAB NAVIGATION TESTS

### Test Case 9.1: Tab Navigation Flow
**Objective:** Test smooth navigation between all tabs

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Tab 0 → Tab 1 | Switches smoothly | [ ] | |
| 2 | Tab 1 → Tab 2 | Switches smoothly | [ ] | |
| 3 | Tab 2 → Tab 3 | Switches smoothly | [ ] | |
| 4 | Tab 3 → Tab 4 | Switches smoothly | [ ] | |
| 5 | Tab 4 → Tab 5 | Switches smoothly | [ ] | |
| 6 | Tab 5 → Tab 6 | Switches smoothly | [ ] | |
| 7 | Tab 6 → Tab 7 | Switches smoothly | [ ] | |
| 8 | Tab 7 → Tab 8 | Switches smoothly | [ ] | |
| 9 | Tab 8 → Tab 0 | Switches smoothly | [ ] | |
| 10 | Random tab jumps | All work | [ ] | |

### Test Case 9.2: Data Persistence Across Tabs
**Objective:** Verify data persists when switching tabs

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Tab 0: Apply filter | Filter active | [ ] | |
| 2 | Switch to Tab 8 | Tab changes | [ ] | |
| 3 | Switch back to Tab 0 | Filter still active | [ ] | |
| 4 | Verify data not re-fetched | Uses cached data | [ ] | |

---

## PERFORMANCE TESTS

### Test Case 10.1: Load Time Measurement
**Objective:** Measure tab load times

| Tab | Load Time (seconds) | Acceptable? (<3s) | Notes |
|-----|---------------------|-------------------|-------|
| Tab 0: Payment Methods | _______ | [ ] | |
| Tab 1: Forex | _______ | [ ] | |
| Tab 2: SWIFT | _______ | [ ] | |
| Tab 3: Documents | _______ | [ ] | |
| Tab 4: Payment Release | _______ | [ ] | |
| Tab 5: Analytics | _______ | [ ] | |
| Tab 6: Users | _______ | [ ] | |
| Tab 7: Audit | _______ | [ ] | |
| Tab 8: LC Settlements | _______ | [ ] | |

**Average Load Time:** _______ seconds

### Test Case 10.2: Memory Usage
**Objective:** Monitor memory consumption

| Metric | Value | Acceptable? | Notes |
|--------|-------|-------------|-------|
| Initial memory (page load) | _______ MB | [ ] | |
| After visiting all tabs | _______ MB | [ ] | |
| Memory increase | _______ MB | [ ] | |
| Memory leaks detected? | Yes / No | [ ] | |

**Tool:** Chrome DevTools → Performance → Memory

---

## BROWSER COMPATIBILITY

### Test Case 11.1: Cross-Browser Testing
**Objective:** Verify Banks Portal works in all browsers

| Browser | Version | Tab 8 Works? | All Features? | Notes |
|---------|---------|--------------|---------------|-------|
| Chrome | _______ | [ ] | [ ] | |
| Firefox | _______ | [ ] | [ ] | |
| Edge | _______ | [ ] | [ ] | |
| Safari | _______ | [ ] | [ ] | |

---

## SECURITY TESTS

### Test Case 12.1: Authorization Checks
**Objective:** Verify unauthorized users cannot access Bank functions

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Logout from bank_admin | Logged out | [ ] | |
| 2 | Login as exporter_user | Login successful | [ ] | |
| 3 | Try to access Banks Portal | Access denied or redirect | [ ] | |
| 4 | Directly navigate to /banks | Blocked | [ ] | |

### Test Case 12.2: Role Enforcement
**Objective:** Verify Bank role restrictions

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | Check developer tools | F12 opened | [ ] | |
| 2 | Try to manipulate role in localStorage | Modified | [ ] | |
| 3 | Refresh page | Role reset to correct value | [ ] | |
| 4 | Try API call with wrong role | 403 Forbidden | [ ] | |

---

## EDGE CASES & ERROR SCENARIOS

### Test Case 13.1: No Delivered Shipments
**Objective:** Test Tab 8 with no delivered shipments

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | (Ensure no delivered shipments) | Database clear | [ ] | |
| 2 | Navigate to Tab 8 | Tab loads | [ ] | |
| 3 | Check empty state | Proper message shown | [ ] | |
| 4 | Verify no errors | Console clean | [ ] | |

**Expected Message:** "No delivered shipments requiring settlement" or similar

### Test Case 13.2: API Timeout
**Objective:** Test behavior when API is slow

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | (Simulate slow API) | Add delay in API | [ ] | |
| 2 | Navigate to Tab 8 | Loading indicator shown | [ ] | |
| 3 | Wait for response | Data eventually loads | [ ] | |
| 4 | Check user experience | Not frozen | [ ] | |

### Test Case 13.3: Invalid Data Handling
**Objective:** Test with malformed data

| Step | Action | Expected Result | Result | Notes |
|------|--------|----------------|--------|-------|
| 1 | (Inject invalid shipment data) | Bad data in DB | [ ] | |
| 2 | Navigate to Tab 8 | Tab loads | [ ] | |
| 3 | Check error handling | Graceful degradation | [ ] | |
| 4 | Verify app doesn't crash | Still functional | [ ] | |

---

## FINAL VERIFICATION

### Checklist: Tab 8 (LC Settlements) Complete Feature Verification

#### Visual Elements
- [ ] Tab exists at index 8
- [ ] Tab label is "LC Settlements"
- [ ] Tab icon present (if applicable)
- [ ] KPI cards display correctly
- [ ] Shipment cards render properly
- [ ] PostDeliveryWorkflowPanel component visible
- [ ] Progress bar renders
- [ ] Step indicators visible
- [ ] Icons display correctly (checkmarks, pending, etc.)
- [ ] Responsive design works (mobile/tablet)

#### Functionality
- [ ] Tab switching works
- [ ] Data loads from API
- [ ] "Record Payment" button works
- [ ] Payment form submits successfully
- [ ] "Record LC Settlement" button works
- [ ] Settlement form submits successfully
- [ ] Progress updates after actions
- [ ] Audit trail records actions
- [ ] Blockchain integration works
- [ ] Refresh/reload works

#### Data Integrity
- [ ] PostgreSQL records match UI
- [ ] Blockchain records match UI
- [ ] Progress percentages accurate
- [ ] Timestamps correct
- [ ] Currency amounts correct
- [ ] No data duplication
- [ ] No data loss on refresh

#### Permissions
- [ ] Bank role has correct access
- [ ] Hidden buttons for other roles
- [ ] API authorization enforced
- [ ] No unauthorized actions possible

#### Integration
- [ ] Works with other tabs
- [ ] Integrates with NBE Portal
- [ ] Integrates with ECTA Portal
- [ ] Blockchain synchronization works
- [ ] Email notifications sent (if applicable)

#### Performance
- [ ] Loads within 3 seconds
- [ ] No memory leaks
- [ ] Handles multiple shipments
- [ ] Smooth animations
- [ ] No console errors

#### Error Handling
- [ ] API errors handled gracefully
- [ ] Network failures handled
- [ ] Invalid data handled
- [ ] Empty states shown
- [ ] User-friendly error messages

---

## TEST SUMMARY

### Results Overview

| Category | Total Tests | Passed | Failed | Partial | Pass Rate |
|----------|-------------|--------|--------|---------|-----------|
| Tab 0: Payment Methods | _____ | _____ | _____ | _____ | _____% |
| Tab 1: Forex | _____ | _____ | _____ | _____ | _____% |
| Tab 2: SWIFT | _____ | _____ | _____ | _____ | _____% |
| Tab 3: Documents | _____ | _____ | _____ | _____ | _____% |
| Tab 4: Payment Release | _____ | _____ | _____ | _____ | _____% |
| Tab 5: Analytics | _____ | _____ | _____ | _____ | _____% |
| Tab 6: Users | _____ | _____ | _____ | _____ | _____% |
| Tab 7: Audit | _____ | _____ | _____ | _____ | _____% |
| **Tab 8: LC Settlements** | _____ | _____ | _____ | _____ | _____% |
| Integration Tests | _____ | _____ | _____ | _____ | _____% |
| **TOTAL** | _____ | _____ | _____ | _____ | _____% |

### Critical Issues Found
1. __________________________________________________
2. __________________________________________________
3. __________________________________________________

### Minor Issues Found
1. __________________________________________________
2. __________________________________________________
3. __________________________________________________

### Recommendations
1. __________________________________________________
2. __________________________________________________
3. __________________________________________________

### Sign-Off

**Tester Name:** _____________________  
**Date:** _____________________  
**Signature:** _____________________  

**Ready for Production?** [ ] Yes [ ] No [ ] With Conditions

**Conditions (if any):** 
_________________________________________________________
_________________________________________________________

---

## APPENDIX: Useful Commands

### Database Queries

```sql
-- Check delivered shipments
SELECT * FROM shipments WHERE status = 'DELIVERED';

-- Check post-delivery workflows
SELECT * FROM post_delivery_workflow;

-- Check specific workflow
SELECT * FROM post_delivery_workflow WHERE shipment_id = 'SHIP1786102768';

-- Check audit trail
SELECT * FROM audit_trail WHERE action LIKE '%post_delivery%' ORDER BY timestamp DESC LIMIT 20;
```

### Blockchain Queries

```bash
# Query shipment on blockchain
docker exec cli peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"queryShipment","Args":["SHIP1786102768"]}'

# Query all shipments
docker exec cli peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"function":"queryAllShipments","Args":[]}'
```

### API Endpoints to Test

```bash
# Get post-delivery status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/post-delivery/SHIP1786102768/status

# Record payment
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":95000,"currency":"USD","swiftReference":"TEST123"}' \
  http://localhost:3001/api/v1/post-delivery/SHIP1786102768/payment

# Record LC settlement
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lcNumber":"LC123","notes":"Settled"}' \
  http://localhost:3001/api/v1/post-delivery/SHIP1786102768/lc-settlement
```

---

**END OF TEST SCRIPT**
