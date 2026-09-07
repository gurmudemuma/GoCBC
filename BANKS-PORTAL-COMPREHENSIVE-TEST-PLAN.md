# Banks Portal - Comprehensive Workflow Testing Plan

**Portal:** Banks Portal  
**User Role:** BANKS, Bank Officer, LC Officer, Payment Officer  
**Date:** 2026-09-01  
**Status:** Ready for Testing

---

## Test Environment Setup

### Prerequisites

1. **System Running:**
   ```bash
   # Start all services
   ./START-SYSTEM.bat
   
   # Verify services
   - PostgreSQL: localhost:5432
   - CouchDB: localhost:5984
   - API Server: localhost:3001
   - UI: localhost:3000
   ```

2. **Test User:**
   ```
   Username: bank_admin
   Password: [your password]
   Role: BANKS or Bank Officer
   Organization: Commercial Bank of Ethiopia
   ```

3. **Test Data Required:**
   - At least 2 approved contracts (from NBE)
   - At least 1 delivered shipment
   - Valid exporter and buyer information
   - Forex allocation records

---

## Tab 0: Payment Methods

### Overview
Unified workflow for all payment types: Letter of Credit (LC), Documentary Collection, Advance Payment, Consignment.

### Test Case 1.1: LC Creation Workflow

**Objective:** Create a new Letter of Credit for an approved contract

**Steps:**
1. Login as Bank Administrator
2. Navigate to "Payment Methods" tab (should be selected by default)
3. Verify KPI cards display:
   - Letter of Credit count
   - Documentary Collection count
   - Advance Payment count
   - Consignment count

4. Click "Select Payment Method" dropdown
5. Select "Letter of Credit"
6. Verify LC creation form appears

7. Fill LC Form:
   ```
   Contract Selection: [Select approved contract from dropdown]
   LC Number: LC-TEST-001
   Issuing Bank: Commercial Bank of Ethiopia
   Advising Bank: [Buyer's bank name]
   Beneficiary: [Exporter name from contract]
   Amount: [Auto-filled from contract value]
   Currency: USD
   Expiry Date: [90 days from today]
   Payment Terms: At Sight / Usance
   Incoterms: FOB / CIF
   Latest Shipment Date: [60 days from today]
   ```

8. Click "Create LC" button

**Expected Results:**
- ✅ Success message: "LC created successfully"
- ✅ LC appears in "Letter of Credit" section with status "REQUESTED"
- ✅ KPI card "Letter of Credit" count increases by 1
- ✅ Contract shows LC association
- ✅ Database record created in `letters_of_credit` table
- ✅ Blockchain record created (LC chaincode invoked)

**Verification Queries:**
```sql
-- PostgreSQL
SELECT * FROM letters_of_credit WHERE lc_id = 'LC-TEST-001';

-- Check blockchain
curl http://localhost:3001/api/v1/banking/lc/LC-TEST-001
```

**Pass Criteria:**
- LC created with correct data
- Status = 'REQUESTED'
- All fields match input
- Audit trail entry created

---

### Test Case 1.2: LC Approval Workflow

**Objective:** Approve a requested LC

**Steps:**
1. In Payment Methods tab, locate LC with status "REQUESTED"
2. Click "View Details" or "Actions" menu
3. Click "Approve LC" button
4. Confirm approval in dialog
5. Verify approval notification

**Expected Results:**
- ✅ LC status changes from "REQUESTED" → "APPROVED"
- ✅ Approval timestamp recorded
- ✅ Approving officer name saved
- ✅ NBE notified (if forex required)
- ✅ Exporter notified

**Verification:**
```sql
SELECT lc_id, status, approved_at, approved_by 
FROM letters_of_credit 
WHERE lc_id = 'LC-TEST-001';
```

---

### Test Case 1.3: LC Issuance (MT700 SWIFT Message)

**Objective:** Issue approved LC by sending MT700 SWIFT message

**Steps:**
1. Locate APPROVED LC in list
2. Click "Issue LC" button
3. Verify MT700 message preview dialog opens
4. Review SWIFT message fields:
   - Field 40A: Form of Documentary Credit
   - Field 20: Documentary Credit Number
   - Field 31C: Date of Issue
   - Field 31D: Date and Place of Expiry
   - Field 50: Applicant (Buyer)
   - Field 59: Beneficiary (Exporter)
   - Field 32B: Currency Code, Amount
   - Field 41A: Available With Bank
   - Field 42C: Drafts At
   - Field 43P: Partial Shipments
   - Field 43T: Transshipment
   - Field 44A: Loading On Board
   - Field 44B: For Transportation To
   - Field 45A: Description of Goods
   - Field 46A: Documents Required
   - Field 47A: Additional Conditions
   - Field 71B: Charges
5. Click "Send MT700" button
6. Confirm sending

**Expected Results:**
- ✅ MT700 SWIFT message created and sent
- ✅ LC status changes: "APPROVED" → "ISSUED"
- ✅ SWIFT message saved in `swift_messages` table
- ✅ Advising bank receives MT700
- ✅ Exporter notified of LC issuance
- ✅ Forex allocation can now proceed

**Verification:**
```sql
-- Check LC status
SELECT lc_id, status, issued_at, swift_mt700_ref 
FROM letters_of_credit 
WHERE lc_id = 'LC-TEST-001';

-- Check SWIFT message
SELECT message_id, message_type, sender_bic, receiver_bic, status
FROM swift_messages 
WHERE lc_id = 'LC-TEST-001' AND message_type = 'MT700';
```

**Pass Criteria:**
- LC status = 'ISSUED'
- MT700 message exists
- Message status = 'SENT'
- All SWIFT fields properly formatted

---

### Test Case 1.4: Documentary Collection Creation

**Objective:** Create Documentary Collection (CAD - Cash Against Documents)

**Steps:**
1. Select "Documentary Collection" from payment method dropdown
2. Fill CAD form:
   ```
   Contract ID: [Select contract]
   Collection Number: CAD-TEST-001
   Drawer: [Exporter name]
   Drawee: [Buyer name]
   Payment Term: SIGHT / D/A (Documents Against Acceptance)
   Acceptance Days: 30 (if D/A selected)
   Collecting Bank: [Buyer's bank]
   Remitting Bank: Commercial Bank of Ethiopia
   Amount: [From contract]
   Currency: USD
   Instructions: Present documents to drawee for payment
   ```

3. Click "Create Collection"

**Expected Results:**
- ✅ Collection created with status "CREATED"
- ✅ Appears in Documentary Collection section
- ✅ KPI updated
- ✅ Remitting bank (CBE) holds documents
- ✅ Collecting bank notified

**Verification:**
```sql
SELECT * FROM documentary_collections WHERE collection_number = 'CAD-TEST-001';
```

---

### Test Case 1.5: Advance Payment Registration

**Objective:** Record advance payment received

**Steps:**
1. Select "Advance Payment" from dropdown
2. Fill form:
   ```
   Contract ID: [Select contract]
   Credit Advice Number: CA-TEST-001
   Paying Bank: [Buyer's bank]
   SWIFT Reference: [MT103 reference]
   Beneficiary Account: [Exporter account at CBE]
   Amount: [Advance amount]
   Currency: USD
   Payment Date: [Today]
   ```

3. Click "Register Payment"

**Expected Results:**
- ✅ Advance payment recorded
- ✅ Status = "RECEIVED"
- ✅ Exporter notified
- ✅ Funds credited to exporter account
- ✅ Balance payment calculated (total - advance)

**Verification:**
```sql
SELECT * FROM advance_payments WHERE credit_advice_number = 'CA-TEST-001';
```

---

### Test Case 1.6: Consignment Setup

**Objective:** Create consignment arrangement

**Steps:**
1. Select "Consignment" from dropdown
2. Fill form:
   ```
   Contract ID: [Select contract]
   Commodity Type: FRUITS (Coffee)
   Description: Ethiopian Arabica Coffee Grade 1
   Buyer Name: [Buyer company]
   Buyer Address: [Destination country]
   Permit Amount: [Export value]
   Currency: USD
   Terms: Consignment basis - payment upon sale
   ```

3. Click "Create Consignment"

**Expected Results:**
- ✅ Consignment created
- ✅ Status = "ACTIVE"
- ✅ No upfront payment required
- ✅ Payment settlement handled post-sale
- ✅ Risk acknowledgment recorded

**Verification:**
```sql
SELECT * FROM consignments WHERE contract_id = '[contract_id]';
```

---

## Tab 1: Forex Allocations

### Overview
Monitor forex allocations approved by NBE for export contracts.

### Test Case 2.1: View Forex Allocations

**Objective:** View all forex allocations with filtering

**Steps:**
1. Click "Forex Allocations" tab
2. Verify KPI cards display:
   - Total Forex Allocated
   - Pending Requests
   - Approved This Month
   - Average Exchange Rate

3. Verify data table shows:
   - Contract ID
   - Exporter Name
   - Requested Amount
   - Allocated Amount
   - Currency
   - Exchange Rate
   - Retention Rate (30%)
   - Status (ALLOCATED/PENDING)
   - Expiry Date

4. Test filters:
   - Filter by status (ALLOCATED, PENDING, EXPIRED)
   - Search by contract ID
   - Sort by amount

**Expected Results:**
- ✅ All forex allocations displayed
- ✅ KPIs calculated correctly
- ✅ Filters work
- ✅ Data matches NBE approvals

**Pass Criteria:**
- Count matches database
- Calculations accurate (30% retention)
- Status reflects current state

---

### Test Case 2.2: Forex Allocation Details

**Objective:** View detailed forex allocation information

**Steps:**
1. Click on any forex allocation row
2. Verify detail dialog shows:
   - Forex ID
   - Contract details
   - LC association
   - Requested vs Allocated amounts
   - Exchange rate (Official NBE rate)
   - Retention breakdown:
     * 30% retained in USD
     * 70% converted to ETB
   - Expiry date
   - NBE approval reference
   - Approving officer

3. Verify "View Contract" button links to contract
4. Verify "View LC" button (if LC exists)

**Expected Results:**
- ✅ All forex details displayed
- ✅ Retention calculation correct
- ✅ Links functional
- ✅ Timestamps accurate

---

### Test Case 2.3: Forex Utilization Tracking

**Objective:** Track forex usage against allocation

**Steps:**
1. Locate allocated forex
2. Verify "Utilization" column shows:
   - Amount used
   - Amount remaining
   - Percentage utilized
3. Check if LC has drawn against forex
4. Verify utilization updates when LC is utilized

**Expected Results:**
- ✅ Utilization tracked accurately
- ✅ Updates real-time
- ✅ Cannot over-utilize
- ✅ Expiry prevents usage

**Verification:**
```sql
SELECT f.forex_id, f.allocated_amount, 
       COALESCE(SUM(lc.amount), 0) as utilized_amount,
       f.allocated_amount - COALESCE(SUM(lc.amount), 0) as remaining
FROM forex_allocations f
LEFT JOIN letters_of_credit lc ON f.forex_id = lc.forex_id
WHERE f.forex_id = '[forex_id]'
GROUP BY f.forex_id;
```

---

## Tab 2: SWIFT Messages

### Overview
Monitor SWIFT message traffic for international payments.

### Test Case 3.1: View SWIFT Messages

**Objective:** View all SWIFT messages sent/received

**Steps:**
1. Click "SWIFT Messages" tab
2. Verify KPI cards:
   - Total Messages
   - MT700 (LC Issuance)
   - MT103 (Payment Orders)
   - MT799 (Free Format)
   - Failed Messages

3. Verify message list shows:
   - Message ID
   - Message Type (MT700, MT103, MT799, MT910)
   - Sender BIC
   - Receiver BIC
   - Amount
   - Currency
   - Status (SENT, RECEIVED, FAILED)
   - Timestamp
   - Related LC/Payment

4. Test filters:
   - By message type
   - By status
   - By date range
   - By BIC code

**Expected Results:**
- ✅ All SWIFT messages listed
- ✅ KPIs accurate
- ✅ Filters work correctly
- ✅ Status icons visible

---

### Test Case 3.2: View SWIFT Message Details

**Objective:** View full SWIFT message content

**Steps:**
1. Click on any SWIFT message
2. Verify detail dialog shows:
   - Full SWIFT message format
   - Header (Basic Header, Application Header)
   - User Header
   - Text Block (all fields)
   - Trailer
   - Checksum
3. Verify "Download" button exports message
4. Verify "Print" button works

**Expected Results:**
- ✅ Complete SWIFT format displayed
- ✅ All fields properly formatted
- ✅ Download creates .txt file
- ✅ Print preview works

---

### Test Case 3.3: Send MT799 (Free Format Message)

**Objective:** Send free format SWIFT message to correspondent bank

**Steps:**
1. Click "Compose Message" button
2. Select "MT799 - Free Format"
3. Fill form:
   ```
   Receiver BIC: [Correspondent bank BIC]
   Reference: REF-MT799-001
   Related Reference: [LC number if applicable]
   Narrative: Free text message content
   ```
4. Click "Send Message"
5. Confirm sending

**Expected Results:**
- ✅ Message created with status "PENDING"
- ✅ After send: status = "SENT"
- ✅ Message saved in database
- ✅ Appears in SWIFT Messages list
- ✅ Audit trail created

**Verification:**
```sql
SELECT * FROM swift_messages 
WHERE message_type = 'MT799' 
ORDER BY created_at DESC LIMIT 1;
```

---

### Test Case 3.4: Receive MT910 (Confirmation of Credit)

**Objective:** Process incoming MT910 from advising bank

**Steps:**
1. Simulate MT910 receipt (or wait for actual message)
2. Verify message appears in "SWIFT Messages" tab
3. Click on MT910 message
4. Verify it links to original MT700 (LC)
5. Check LC status updated to "CONFIRMED"

**Expected Results:**
- ✅ MT910 received and parsed
- ✅ Linked to correct LC
- ✅ LC status updated
- ✅ Confirmation details saved

---

## Tab 3: Document Examination

### Overview
Examine shipping documents presented under LC for compliance.

### Test Case 4.1: View Documents for Examination

**Objective:** View LCs with documents ready for examination

**Steps:**
1. Click "Document Examination" tab
2. Verify KPI cards:
   - Total Documents Pending
   - Documents Examined Today
   - Discrepancies Found
   - Average Examination Time

3. Verify list shows LCs with:
   - LC Number
   - Exporter Name
   - Document Submission Date
   - Number of Documents
   - Status (PENDING_EXAM, UNDER_EXAM, EXAMINED)
   - Examiner Assigned

4. Click on LC to examine

**Expected Results:**
- ✅ Only LCs with submitted documents appear
- ✅ Status = "ISSUED" or "DOCUMENTS_SUBMITTED"
- ✅ Document count accurate
- ✅ Can be assigned to examiner

---

### Test Case 4.2: Examine LC Documents

**Objective:** Perform documentary compliance check

**Steps:**
1. Select LC for examination
2. Document examination panel opens
3. Verify documents list:
   - Bill of Lading (B/L)
   - Commercial Invoice
   - Packing List
   - Certificate of Origin
   - Insurance Certificate
   - Quality Certificate (ECTA)
   - Phytosanitary Certificate
   - Customs Declaration
   - Weight Certificate
   - Other documents

4. For each document:
   - Click "View" to open document
   - Check compliance with LC terms
   - Mark as "COMPLIANT" or "DISCREPANT"
   - If discrepant, note discrepancy reason

5. Common checks:
   - ✅ Shipment date within LC validity
   - ✅ Documents issued within allowed timeframe
   - ✅ Beneficiary name matches LC
   - ✅ Amount matches LC
   - ✅ Description of goods matches
   - ✅ Destination matches
   - ✅ All required documents present
   - ✅ Documents properly signed/stamped
   - ✅ No inconsistencies between documents

6. Complete examination form:
   ```
   Examination Result: COMPLIANT / DISCREPANT
   Discrepancies Found: [List if any]
   Examiner Notes: [Detailed notes]
   Recommendation: ACCEPT / REJECT / SEEK WAIVER
   ```

7. Click "Submit Examination"

**Expected Results - Compliant Documents:**
- ✅ LC status: "DOCUMENTS_SUBMITTED" → "DOCUMENTS_COMPLIANT"
- ✅ Examination record created
- ✅ Payment can proceed
- ✅ Exporter notified

**Expected Results - Discrepant Documents:**
- ✅ LC status: "DOCUMENTS_SUBMITTED" → "DISCREPANCIES_FOUND"
- ✅ Discrepancy report generated
- ✅ Exporter notified with details
- ✅ Buyer notified for waiver decision
- ✅ Payment held pending resolution

**Verification:**
```sql
SELECT lc_id, status, examined_at, examiner_id, 
       document_compliance_status, discrepancies
FROM letters_of_credit 
WHERE lc_id = '[lc_id]';

SELECT * FROM document_examinations 
WHERE lc_id = '[lc_id]' 
ORDER BY created_at DESC LIMIT 1;
```

---

### Test Case 4.3: Handle Document Discrepancies

**Objective:** Process discrepant documents

**Steps:**
1. LC with discrepancies identified
2. Notify buyer via system
3. Wait for buyer response:
   - Option A: Buyer accepts discrepancy (waiver)
   - Option B: Buyer rejects, exporter must correct
4. If waiver granted:
   - Update LC status to "DISCREPANCY_WAIVED"
   - Proceed to payment
5. If rejected:
   - Notify exporter
   - Wait for corrected documents
   - Re-examine when submitted

**Expected Results:**
- ✅ Waiver process tracked
- ✅ Timeline recorded
- ✅ Decisions logged
- ✅ Payment released or held appropriately

---

## Tab 4: Payment Release

### Overview
Release payment to exporter after document compliance confirmation.

### Test Case 5.1: View Payments Ready for Release

**Objective:** View LCs ready for payment

**Steps:**
1. Click "Payment Release" tab
2. Verify KPI cards:
   - Total Payment Value Pending
   - Payments Released Today
   - Average Processing Time
   - Outstanding Amount

3. Verify list shows:
   - LC Number
   - Exporter Name
   - Payment Amount
   - Currency
   - Document Status (COMPLIANT)
   - Ready for Release Date
   - Payment Type (At Sight / Usance)
   - Payment Due Date

4. Filter by:
   - Payment type
   - Due date
   - Amount range

**Expected Results:**
- ✅ Only compliant LCs appear
- ✅ KPIs calculated correctly
- ✅ Overdue payments highlighted
- ✅ Filters functional

---

### Test Case 5.2: Release LC Payment

**Objective:** Process payment to exporter

**Steps:**
1. Select LC ready for payment release
2. Click "Release Payment" button
3. Payment release dialog opens
4. Verify payment details:
   - Beneficiary: [Exporter name]
   - Account: [Exporter account at CBE]
   - Amount: [LC amount minus charges]
   - Currency: USD
   - Exchange Rate: [Current rate]
   - ETB Equivalent: [Calculated]
   - Charges Breakdown:
     * Bank charges
     * SWIFT charges
     * Examination fees
     * Other fees
   - Net Payment: [Amount after charges]

5. Review retention policy (if applicable):
   - 30% retained in USD
   - 70% converted to ETB

6. Fill payment authorization:
   ```
   Payment Method: SWIFT Transfer / Local Transfer
   Payment Reference: PAY-[LC_NUMBER]-001
   Value Date: [Today or future date]
   Authorized By: [Officer name]
   Authorization Level: [As per bank policy]
   ```

7. Click "Authorize Payment"
8. Enter authentication (2FA if enabled)
9. Confirm release

**Expected Results:**
- ✅ Payment instruction created
- ✅ LC status: "DOCUMENTS_COMPLIANT" → "UTILIZED"
- ✅ Payment status: "PENDING" → "PROCESSING" → "RELEASED"
- ✅ MT103 SWIFT message generated
- ✅ Exporter account credited
- ✅ Debit entry in applicant (buyer) account
- ✅ Forex utilized (if applicable)
- ✅ Exporter notified
- ✅ Payment confirmation to buyer

**Verification:**
```sql
-- Check LC utilization
SELECT lc_id, status, utilized_at, utilized_amount
FROM letters_of_credit 
WHERE lc_id = '[lc_id]';

-- Check payment record
SELECT * FROM payments 
WHERE lc_id = '[lc_id]' 
ORDER BY created_at DESC LIMIT 1;

-- Check SWIFT MT103
SELECT * FROM swift_messages 
WHERE message_type = 'MT103' AND reference = '[lc_id]';

-- Check forex utilization
UPDATE forex_allocations 
SET utilized_amount = utilized_amount + [payment_amount]
WHERE forex_id = (SELECT forex_id FROM letters_of_credit WHERE lc_id = '[lc_id]');
```

**Pass Criteria:**
- Payment released successfully
- All records updated
- Balances correct
- Notifications sent
- Audit trail complete

---

### Test Case 5.3: Handle Usance LC Payment

**Objective:** Release payment for time (usance) LC

**Steps:**
1. Select usance LC (e.g., 90 days after sight)
2. Verify maturity date calculated correctly
3. On maturity date:
   - Click "Release Usance Payment"
   - Follow payment release process
4. For acceptance before payment:
   - Verify acceptance recorded
   - Verify maturity date set from acceptance date
5. Release payment on maturity

**Expected Results:**
- ✅ Maturity date calculated correctly
- ✅ Payment released on maturity (not before)
- ✅ Interest calculated (if applicable)
- ✅ Acceptance documented

---

## Tab 5: Analytics

### Overview
View banking analytics and reports.

### Test Case 6.1: View Analytics Dashboard

**Objective:** View comprehensive banking metrics

**Steps:**
1. Click "Analytics" tab
2. Verify sections displayed:

**A. Overview KPIs:**
- Total LCs Issued (YTD)
- Total Payment Value
- Average LC Amount
- Success Rate

**B. Charts:**
- LC Volume by Month (Line chart)
- Payment Methods Distribution (Pie chart)
- Top Exporters by Value (Bar chart)
- Average Processing Time Trend (Line chart)

**C. Performance Metrics:**
- Document Examination Time (Avg)
- Payment Release Time (Avg)
- Discrepancy Rate (%)
- Customer Satisfaction Score

**D. Risk Metrics:**
- Overdue Payments
- Pending Examinations > 5 days
- Expired Forex Allocations
- Unutilized LCs

**Expected Results:**
- ✅ All KPIs display correct values
- ✅ Charts render properly
- ✅ Data matches database
- ✅ Interactive filters work
- ✅ Date range selector functional

---

### Test Case 6.2: Generate Reports

**Objective:** Export banking reports

**Steps:**
1. In Analytics tab, click "Generate Report"
2. Select report type:
   - LC Activity Report
   - Payment Settlement Report
   - Document Examination Report
   - Forex Utilization Report
   - SWIFT Message Report
   - Audit Report

3. Select parameters:
   - Date Range: [From - To]
   - Export Format: PDF / Excel / CSV
   - Include Charts: Yes/No
   - Grouping: By Exporter / By Month / By Status

4. Click "Generate"
5. Download report

**Expected Results:**
- ✅ Report generates within 30 seconds
- ✅ All data included
- ✅ Format correct (PDF/Excel/CSV)
- ✅ Charts included if selected
- ✅ Totals calculated correctly
- ✅ Download successful

---

## Tab 6: User Management

### Overview
Manage bank portal users and permissions.

### Test Case 7.1: View Users

**Objective:** View all bank users

**Steps:**
1. Click "User Management" tab
2. Verify only users with role containing "BANK" appear:
   - BANKS
   - Bank Officer
   - LC Officer
   - Payment Officer
   - Forex Officer
   - SWIFT Officer
   - Document Officer

3. Verify user list shows:
   - Username
   - Full Name
   - Email
   - Role
   - Organization
   - Status (Active/Inactive)
   - Last Login
   - Created Date

4. Test search and filters

**Expected Results:**
- ✅ All bank users displayed
- ✅ Correct role filtering
- ✅ Search works
- ✅ Status accurate

---

### Test Case 7.2: Create New Bank User

**Objective:** Add new bank officer

**Steps:**
1. Click "Add User" button
2. Fill user form:
   ```
   Username: bank_officer_test
   Full Name: Test Bank Officer
   Email: test.officer@cbe.com.et
   Phone: +251911234567
   Role: Bank Officer
   Organization: Commercial Bank of Ethiopia
   Department: Trade Finance
   Status: Active
   Permissions:
     - View LCs: ✓
     - Create LCs: ✓
     - Approve LCs: ✓ (requires higher level)
     - Examine Documents: ✓
     - Release Payments: ✓ (requires dual authorization)
   ```

3. Click "Create User"
4. Verify user receives email with credentials
5. Test login with new user

**Expected Results:**
- ✅ User created successfully
- ✅ Appears in user list
- ✅ Can login
- ✅ Permissions enforced
- ✅ Email sent

**Verification:**
```sql
SELECT * FROM users WHERE username = 'bank_officer_test';
```

---

### Test Case 7.3: Modify User Permissions

**Objective:** Update user role and permissions

**Steps:**
1. Select existing user
2. Click "Edit Permissions"
3. Change role from "Bank Officer" to "LC Officer"
4. Adjust permissions accordingly
5. Save changes
6. Logout and login as that user
7. Verify new permissions applied

**Expected Results:**
- ✅ Role updated
- ✅ Permissions changed
- ✅ Old permissions revoked
- ✅ New permissions active
- ✅ User notified of change

---

### Test Case 7.4: Deactivate User

**Objective:** Deactivate user account

**Steps:**
1. Select user to deactivate
2. Click "Deactivate" button
3. Confirm deactivation
4. Verify user status = "Inactive"
5. Try to login as deactivated user

**Expected Results:**
- ✅ User status changed to "Inactive"
- ✅ Login denied with message "Account inactive"
- ✅ User cannot perform any actions
- ✅ Audit trail records deactivation

---

## Tab 7: Audit Trail

### Overview
View complete audit trail of all banking activities.

### Test Case 8.1: View Audit Trail

**Objective:** View comprehensive audit logs

**Steps:**
1. Click "Audit Trail" tab
2. Verify KPI cards:
   - Total Activities
   - Today's Actions
   - Blockchain Verified
   - Organizations Involved

3. Verify audit log shows:
   - Timestamp
   - User
   - Action Type
   - Entity Type (LC, Payment, Document)
   - Entity ID
   - Description
   - Status
   - IP Address
   - Blockchain Hash (if verified)

4. Test filters:
   - By date range
   - By user
   - By action type
   - By entity type
   - Blockchain verified only

**Expected Results:**
- ✅ All activities logged
- ✅ KPIs accurate
- ✅ Filters work
- ✅ Real-time updates
- ✅ Blockchain hashes visible

---

### Test Case 8.2: View Specific Entity Audit Trail

**Objective:** View audit history for specific LC

**Steps:**
1. In Audit Trail, click "Filter by Entity"
2. Select "Letter of Credit"
3. Enter LC ID
4. View timeline of all actions on that LC:
   - Creation
   - Approval
   - Issuance
   - Document submission
   - Examination
   - Payment release
   - Utilization

**Expected Results:**
- ✅ Complete LC lifecycle visible
- ✅ All actions chronologically ordered
- ✅ User actions attributed
- ✅ Timestamps accurate
- ✅ Status changes tracked

---

### Test Case 8.3: Blockchain Verification

**Objective:** Verify audit records on blockchain

**Steps:**
1. Select any audit record with blockchain hash
2. Click "Verify on Blockchain"
3. System queries Hyperledger Fabric
4. Verify:
   - Transaction ID matches
   - Timestamp matches
   - Data hash matches
   - Block number shown
   - Channel: coffeechannel

**Expected Results:**
- ✅ Blockchain verification successful
- ✅ Hashes match
- ✅ Tamper-proof confirmed
- ✅ Immutable record verified

**Verification:**
```bash
# Query blockchain directly
docker exec cli peer chaincode query \
  -C coffeechannel \
  -n coffee \
  -c '{"Args":["GetLC","LC-TEST-001"]}'
```

---

## Tab 8: LC Settlements (New - Post-Delivery)

### Overview
Track LC settlement and payment processing for delivered shipments.

### Test Case 9.1: View Delivered Shipments for Settlement

**Objective:** View delivered shipments requiring LC settlement

**Steps:**
1. Click "LC Settlements" tab (Tab 8)
2. Verify KPI cards display:
   - Delivered Shipments
   - Pending Settlement
   - Active LCs
   - Completed Settlements

3. Verify shipment list shows:
   - Shipment ID
   - Contract ID
   - LC Number
   - Delivered status badge
   - Shipment details

4. Verify only DELIVERED shipments appear
5. Verify count matches database

**Expected Results:**
- ✅ Tab renders correctly
- ✅ KPIs display accurate counts
- ✅ Only delivered shipments shown
- ✅ LC information mapped correctly
- ✅ No console errors

**Verification:**
```sql
SELECT COUNT(*) FROM shipments WHERE status = 'DELIVERED';
```

---

### Test Case 9.2: View Post-Delivery Workflow Panel

**Objective:** Verify PostDeliveryWorkflowPanel renders for each shipment

**Steps:**
1. In LC Settlements tab, locate delivered shipment card
2. Verify card displays:
   - Shipment ID
   - Contract ID with LC reference
   - "Delivered" badge
3. Verify PostDeliveryWorkflowPanel component renders below
4. Verify panel shows:
   - Workflow checklist
   - Payment Received step
   - Forex Repatriated step
   - LC Settlement step
   - ECTA Audit step
   - Contract Closed step
5. Verify progress bar shows completion percentage
6. Verify days since delivery counter

**Expected Results:**
- ✅ Panel renders without errors
- ✅ All workflow steps visible
- ✅ Current status indicated
- ✅ Checkmarks for completed steps
- ✅ Action buttons for Bank role

---

### Test Case 9.3: Record Payment Received

**Objective:** Record buyer payment receipt as Bank

**Steps:**
1. In LC Settlements tab, locate shipment with uncompleted payment
2. In PostDeliveryWorkflowPanel, verify "Payment Received" step shows:
   - RadioButtonUnchecked icon (not completed)
   - Status: "Awaiting payment from buyer"
   - "Record Payment" button visible
3. Click "Record Payment" button
4. Payment dialog opens
5. Fill payment form:
   ```
   Payment Amount: [LC amount or shipment value]
   Currency: USD
   SWIFT Reference: [MT103 reference from buyer's bank]
   ```
6. Click "Record Payment"
7. Wait for success notification

**Expected Results:**
- ✅ Payment dialog opens
- ✅ Form validates required fields
- ✅ API call successful: `POST /api/v1/post-delivery/:shipmentId/payment`
- ✅ Success message displayed
- ✅ Payment step shows CheckCircle icon (completed)
- ✅ Payment details shown: Amount, Date
- ✅ Progress bar updates
- ✅ Next step (Forex) becomes actionable
- ✅ Database updated
- ✅ Blockchain record created

**Verification:**
```sql
SELECT payment_received, payment_received_date, payment_amount, payment_currency
FROM post_delivery_workflow 
WHERE shipment_id = '[shipment_id]';
```

**API Verification:**
```bash
curl -X GET http://localhost:3001/api/v1/post-delivery/[shipment_id]/status \
  -H "Authorization: Bearer [token]"
```

**Pass Criteria:**
- payment_received = true
- payment_received_date populated
- payment_amount matches input
- overall_status updated to 'IN_PROGRESS'
- completion_percentage increased

---

### Test Case 9.4: Record LC Settlement

**Objective:** Record LC settlement after payment received

**Steps:**
1. Ensure "Payment Received" step is completed
2. Locate "LC Settlement" step in workflow
3. Verify step shows:
   - RadioButtonUnchecked icon (if not completed)
   - Status: "Awaiting LC settlement"
   - "Record LC Settlement" button visible
4. Click "Record LC Settlement" button
5. LC Settlement dialog opens
6. Fill form:
   ```
   LC Reference Number: [LC number from shipment]
   Settlement Date: [Today]
   Notes: Settlement completed via SWIFT
   ```
7. Click "Record Settlement"

**Expected Results:**
- ✅ LC Settlement dialog opens
- ✅ Form submits successfully
- ✅ API call: `POST /api/v1/post-delivery/:shipmentId/lc-settlement`
- ✅ LC Settlement step shows CheckCircle icon
- ✅ Settlement details displayed: LC Ref, Date
- ✅ Progress bar updates
- ✅ Database record updated
- ✅ LC status updated to "SETTLED"

**Verification:**
```sql
-- Check post-delivery workflow
SELECT lc_settled, lc_settlement_date
FROM post_delivery_workflow 
WHERE shipment_id = '[shipment_id]';

-- Check LC status
SELECT lc_id, status, settled_at
FROM letters_of_credit
WHERE lc_id = '[lc_number]';
```

**Pass Criteria:**
- lc_settled = true
- lc_settlement_date populated
- LC status = 'SETTLED'
- completion_percentage increased

---

### Test Case 9.5: Monitor Complete Workflow Progress

**Objective:** Monitor all workflow steps from Bank perspective

**Steps:**
1. In LC Settlements tab, view workflow panel
2. Verify Bank can see all steps:
   - ✅ Payment Received (Bank action)
   - ⏳ Forex Repatriated (NBE action - view only)
   - ✅ LC Settlement (Bank action)
   - ⏳ ECTA Audit (ECTA action - view only)
   - ⏳ Contract Closed (ECTA action - view only)

3. Verify Bank can only act on:
   - Payment Received
   - LC Settlement

4. Verify Bank can view status of:
   - Forex Repatriation (done by NBE)
   - ECTA Audit (done by ECTA)
   - Contract Closure (done by ECTA)

5. Verify progress bar reflects overall completion
6. Verify issues/alerts shown if any delays

**Expected Results:**
- ✅ All steps visible to Bank
- ✅ Action buttons only for Bank responsibilities
- ✅ Other steps show status (read-only)
- ✅ Progress bar accurate (e.g., 40% if 2/5 done)
- ✅ Real-time updates when other parties complete steps
- ✅ Color coding: Green (done), Orange (pending), Red (delayed)

---

### Test Case 9.6: Verify Workflow Completion

**Objective:** Verify workflow shows COMPLETED when all steps done

**Steps:**
1. Complete all workflow steps:
   - Bank: Record payment ✅
   - NBE: Record forex ✅
   - Bank: Record LC settlement ✅
   - ECTA: Complete audit ✅
   - ECTA: Close contract ✅

2. Return to Banks Portal → LC Settlements tab
3. Locate the shipment
4. Verify PostDeliveryWorkflowPanel shows:
   - All steps with CheckCircle icon
   - Progress bar at 100%
   - Overall status: "COMPLETED"
   - Completion date displayed
   - Success message/badge

**Expected Results:**
- ✅ All checkmarks green
- ✅ Progress bar: 100%
- ✅ Status badge: "COMPLETED" (green)
- ✅ Completion date shown
- ✅ No action buttons (all done)
- ✅ Database: overall_status = 'COMPLETED'
- ✅ Blockchain: Contract marked as closed

**Verification:**
```sql
SELECT shipment_id, overall_status, completion_percentage,
       payment_received, forex_repatriated, lc_settled,
       ecta_audit_completed, contract_closed
FROM post_delivery_workflow 
WHERE shipment_id = '[shipment_id]';
```

**Expected DB Values:**
```
overall_status: 'COMPLETED'
completion_percentage: 100
payment_received: true
forex_repatriated: true
lc_settled: true
ecta_audit_completed: true
contract_closed: true
```

---

### Test Case 9.7: Error Handling in LC Settlements

**Objective:** Test error scenarios in post-delivery workflow

**Scenarios:**

**A. Invalid Payment Amount:**
1. Try to record payment with negative amount
2. Try to record payment with amount > LC amount
3. Verify validation error shown

**B. Network Error:**
1. Disconnect network
2. Try to record payment
3. Verify error message: "Network error, please try again"

**C. Duplicate Recording:**
1. Record payment successfully
2. Try to record payment again for same shipment
3. Verify error: "Payment already recorded"

**D. Unauthorized Action:**
1. Login as non-Bank user (e.g., Exporter)
2. Try to access LC Settlements tab
3. Verify tab not visible or access denied

**E. Missing LC Reference:**
1. Try to record LC settlement for shipment without LC
2. Verify appropriate message or skip LC step

**Expected Results:**
- ✅ All validations work
- ✅ Error messages clear and helpful
- ✅ No system crashes
- ✅ User can retry after fixing error
- ✅ Permissions enforced

---

### Test Case 9.8: Refresh and Real-Time Updates

**Objective:** Verify data refreshes correctly

**Steps:**
1. Open LC Settlements tab in Banks Portal
2. In another browser tab, open NBE Portal
3. As NBE, record forex repatriation for same shipment
4. Return to Banks Portal tab
5. Click refresh icon or wait for auto-refresh
6. Verify forex step now shows as completed

**Expected Results:**
- ✅ Refresh button works
- ✅ Data reloads from API
- ✅ Forex step updated with checkmark
- ✅ Progress bar updated
- ✅ No need to navigate away and back

---

## Integration Testing

### Test Case 10.1: End-to-End LC Workflow

**Objective:** Complete full LC lifecycle from creation to settlement

**Steps:**
1. **Tab 0: Payment Methods**
   - Create LC for approved contract ✅
   - Approve LC ✅
   - Issue LC (send MT700) ✅

2. **Wait for Exporter Actions:**
   - Exporter ships goods
   - Shipping marks as DELIVERED
   - Exporter submits documents

3. **Tab 3: Document Examination**
   - Examine submitted documents ✅
   - Mark as compliant ✅

4. **Tab 4: Payment Release**
   - Release payment to exporter ✅

5. **Tab 8: LC Settlements**
   - Record payment received ✅
   - Record LC settlement ✅
   - Monitor workflow completion ✅

6. **Tab 7: Audit Trail**
   - Verify all actions logged ✅
   - Verify blockchain records ✅

**Expected Results:**
- ✅ Complete workflow executes without errors
- ✅ All status transitions correct
- ✅ Notifications sent at each step
- ✅ Data consistent across all tabs
- ✅ Audit trail complete
- ✅ Total time: < 30 minutes (manual steps)

---

### Test Case 10.2: Multi-User Concurrent Testing

**Objective:** Test concurrent access by multiple bank officers

**Steps:**
1. Login with 3 different bank users simultaneously
2. User A: Create LC
3. User B: Examine documents for different LC
4. User C: Release payment for third LC
5. All users: Check audit trail
6. Verify no conflicts or race conditions

**Expected Results:**
- ✅ All actions complete successfully
- ✅ No data corruption
- ✅ Locks prevent conflicts
- ✅ Audit trail shows correct users

---

## Performance Testing

### Test Case 11.1: Load Testing

**Objective:** Test portal performance under load

**Steps:**
1. Load 100+ LCs in database
2. Navigate between all tabs
3. Measure:
   - Page load time
   - Tab switch time
   - Data grid render time
   - API response time
   - Chart render time

**Expected Results:**
- ✅ Tab load: < 2 seconds
- ✅ Data grid render: < 1 second
- ✅ API calls: < 500ms
- ✅ Charts: < 1 second
- ✅ No memory leaks

---

### Test Case 11.2: Database Performance

**Objective:** Verify database queries optimized

**Steps:**
1. Enable query logging
2. Perform all test cases
3. Review slow queries (> 1 second)
4. Verify indexes exist:
   - letters_of_credit(lc_id)
   - letters_of_credit(contract_id)
   - letters_of_credit(status)
   - forex_allocations(forex_id)
   - swift_messages(lc_id)
   - payments(lc_id)
   - post_delivery_workflow(shipment_id)

**Expected Results:**
- ✅ No queries > 1 second
- ✅ All indexes present
- ✅ Query plans optimized

---

## Security Testing

### Test Case 12.1: Authentication

**Objective:** Verify authentication required

**Steps:**
1. Access Banks Portal without logging in
2. Try to access API endpoints without token
3. Use expired token
4. Use token from different user role

**Expected Results:**
- ✅ Redirected to login page
- ✅ API returns 401 Unauthorized
- ✅ Expired tokens rejected
- ✅ Role-based access enforced

---

### Test Case 12.2: Authorization (RBAC)

**Objective:** Verify role-based permissions

**Scenarios:**

**A. Bank Officer:**
- ✅ Can view LCs
- ✅ Can create LCs
- ❌ Cannot approve LCs (requires LC Officer)
- ✅ Can examine documents
- ❌ Cannot release payments (requires Payment Officer)

**B. LC Officer:**
- ✅ Can approve LCs
- ✅ Can issue LCs
- ✅ All Bank Officer permissions

**C. Payment Officer:**
- ✅ Can release payments
- ✅ Can authorize settlements
- ✅ All Bank Officer permissions

**D. SWIFT Officer:**
- ✅ Can send SWIFT messages
- ✅ Can view all messages
- ✅ Limited other permissions

**E. Exporter (Non-Bank):**
- ❌ Cannot access Banks Portal
- ❌ Cannot see other tabs

**Expected Results:**
- ✅ All permissions enforced
- ✅ Unauthorized actions blocked
- ✅ Error messages clear

---

### Test Case 12.3: Data Security

**Objective:** Verify sensitive data protected

**Steps:**
1. Check API responses for sensitive data exposure
2. Verify passwords not logged
3. Verify SWIFT credentials encrypted
4. Verify SSL/TLS used for all API calls
5. Check for SQL injection vulnerabilities
6. Check for XSS vulnerabilities

**Expected Results:**
- ✅ No sensitive data in logs
- ✅ Passwords hashed (bcrypt)
- ✅ HTTPS enforced
- ✅ Parameterized queries used
- ✅ Input sanitized

---

## Test Execution Summary Template

### Test Run Information

```
Test Run Date: _______________
Tester Name: _______________
Environment: Development / Staging / Production
Browser: Chrome / Firefox / Edge
Version: _______________
```

### Test Results Summary

| Tab | Test Cases | Passed | Failed | Blocked | Pass Rate |
|-----|------------|--------|--------|---------|-----------|
| 0. Payment Methods | 6 | ___ | ___ | ___ | ___% |
| 1. Forex Allocations | 3 | ___ | ___ | ___ | ___% |
| 2. SWIFT Messages | 4 | ___ | ___ | ___ | ___% |
| 3. Document Examination | 3 | ___ | ___ | ___ | ___% |
| 4. Payment Release | 3 | ___ | ___ | ___ | ___% |
| 5. Analytics | 2 | ___ | ___ | ___ | ___% |
| 6. User Management | 4 | ___ | ___ | ___ | ___% |
| 7. Audit Trail | 3 | ___ | ___ | ___ | ___% |
| 8. LC Settlements (NEW) | 8 | ___ | ___ | ___ | ___% |
| **TOTAL** | **36** | **___** | **___** | **___** | **___%** |

### Critical Issues Found

| ID | Severity | Tab | Description | Status |
|----|----------|-----|-------------|--------|
| 1  |          |     |             |        |
| 2  |          |     |             |        |
| 3  |          |     |             |        |

### Test Sign-Off

```
Tested By: _____________________  Date: _______________
Reviewed By: ___________________  Date: _______________
Approved By: ___________________  Date: _______________
```

---

## Automated Test Script Template

```javascript
// banks-portal.test.js
const { test, expect } = require('@playwright/test');

test.describe('Banks Portal - All Tabs', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="username"]', 'bank_admin');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/portals/banks');
  });

  test('Tab 0: Create LC', async ({ page }) => {
    // Wait for tab to load
    await page.waitForSelector('text=Payment Methods');
    
    // Click create LC
    await page.click('button:has-text("Create LC")');
    
    // Fill form
    await page.selectOption('select[name="contractId"]', '1');
    await page.fill('input[name="lcNumber"]', 'LC-AUTO-TEST-001');
    await page.fill('input[name="amount"]', '100000');
    
    // Submit
    await page.click('button:has-text("Create")');
    
    // Verify success
    await expect(page.locator('text=LC created successfully')).toBeVisible();
  });

  test('Tab 8: View LC Settlements', async ({ page }) => {
    // Click LC Settlements tab
    await page.click('text=LC Settlements');
    
    // Verify tab loads
    await expect(page.locator('text=LC Settlement Tracking')).toBeVisible();
    
    // Verify delivered shipments appear
    const shipmentCards = page.locator('div[role="card"]');
    await expect(shipmentCards).toHaveCountGreaterThan(0);
    
    // Verify PostDeliveryWorkflowPanel renders
    await expect(page.locator('text=Post-Delivery Workflow')).toBeVisible();
  });

  test('Tab 8: Record Payment', async ({ page }) => {
    await page.click('text=LC Settlements');
    
    // Click Record Payment button
    await page.click('button:has-text("Record Payment")');
    
    // Fill payment form
    await page.fill('input[name="paymentAmount"]', '100000');
    await page.selectOption('select[name="paymentCurrency"]', 'USD');
    await page.fill('input[name="swiftReference"]', 'MT103-TEST-001');
    
    // Submit
    await page.click('button:has-text("Record Payment")');
    
    // Verify success
    await expect(page.locator('text=Payment recorded successfully')).toBeVisible({ timeout: 10000 });
    
    // Verify checkmark appears
    await expect(page.locator('svg[data-testid="CheckCircleIcon"]')).toBeVisible();
  });

  // Add more tests for each tab...
});
```

---

## Conclusion

This comprehensive test plan covers all 9 tabs of the Banks Portal including the newly integrated LC Settlements tab. Execute all test cases systematically and document results.

**Recommended Testing Order:**
1. Tab 0 (Payment Methods) - Foundation
2. Tab 1 (Forex Allocations) - Dependencies
3. Tab 2 (SWIFT Messages) - Communication
4. Tab 3 (Document Examination) - Compliance
5. Tab 4 (Payment Release) - Execution
6. Tab 8 (LC Settlements) - Post-Delivery NEW ⭐
7. Tab 5 (Analytics) - Reporting
8. Tab 6 (User Management) - Administration
9. Tab 7 (Audit Trail) - Verification

**Critical Path:** 0 → 3 → 4 → 8 (LC lifecycle + settlement)

**Estimated Testing Time:** 8-12 hours for complete manual testing

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-01  
**Next Review:** After each portal update
