# Complete Workflow Testing Plan - All Portals & Status Transitions
**GoCBC System - October 23, 2026**

This document provides step-by-step testing procedures for all workflows across all 7 portals, covering all tabs, subtabs, and status transitions.

---

## TESTING PREREQUISITES

### Required Test Users
- **ADMIN** - Access to all portals
- **EXPORTER** - Exporter Portal
- **ECTA** - ECTA Portal (License Officer, Quality Inspector)
- **NBE** - NBE Portal (Forex Officer, Exchange Rate Officer)
- **BANKS** - Banks Portal (LC Officer, Payment Officer, Forex Officer)
- **CUSTOMS** - Customs Portal (Customs Officer, Inspection Officer)
- **SHIPPING** - Shipping Portal
- **ECX** - ECX Portal (Grading Officer, Warehouse Officer)

### Test Data Needed
- Sample exporter application
- Test sales contract
- Coffee lot for grading
- Shipment for logistics tracking

---

## WORKFLOW 1: EXPORTER PORTAL (8 Tabs)
**User:** EXPORTER role  
**URL:** http://localhost:3000/portals/exporter

### Tab 0: Dashboard
**Test:** View overview metrics
- [ ] KPI cards display: Total Contracts, Active Shipments, Pending LCs, Export Value
- [ ] Export Activity Trends chart loads
- [ ] Quick Actions buttons present

### Tab 1: Contracts (Status: DRAFT → REGISTERED → APPROVED → ACTIVE)
**Test:** Create and track sales contract

**Step 1: Create New Contract**
- [ ] Click "New Contract" button
- [ ] Fill form:
  - Buyer Name: "Test Coffee Importers Ltd"
  - Buyer Country: "Germany"
  - Buyer Bank: "Deutsche Bank AG"
  - Exporter Bank: "Commercial Bank of Ethiopia"
  - Coffee Type: "Yirgacheffe Washed"
  - Quantity: 10000 kg
  - Price per kg: $8.50 USD
  - Currency: USD
  - Incoterm: FOB
  - Payment Method: "Letter of Credit (LC)"
  - Port of Loading: "Djibouti"
  - Port of Destination: "Hamburg"
  - EUDR Required: Yes
- [ ] Upload required documents (Sales Contract PDF, Quality Certificate)
- [ ] Click "Submit Contract"
- [ ] Verify status: **DRAFT**

**Expected Status Flow:**
```
DRAFT → (NBE Registration) → REGISTERED → (NBE Approval) → APPROVED/NBE_APPROVED → ACTIVE
```

- [ ] Contract appears in list with status badge
- [ ] Can view contract details
- [ ] Status color: DRAFT (gray), REGISTERED (blue), APPROVED (green)

### Tab 2: Forex & Banking (Status: REQUESTED → ALLOCATED → UTILIZED)
**Test:** Request forex allocation and LC

**Step 1: Request Forex Allocation**
- [ ] Find approved contract
- [ ] Click "Request Forex"
- [ ] System auto-calculates: Contract Value × 60% (minimum retention)
- [ ] Verify forex request created
- [ ] Status: **REQUESTED**

**Step 2: Monitor LC Status**
- [ ] After forex allocated, click "Request LC"
- [ ] Fill LC terms
- [ ] Submit to bank
- [ ] Track LC Status: **REQUESTED** → **APPROVED** → **ISSUED** → **UTILIZED**

**Expected Counts:**
- Allocated Forex: Shows green count
- Issued LCs: Shows active count
- Pending LC Contracts: Shows orange count

### Tab 3: Shipments (Status: CREATED → REGISTERED → CUSTOMS_CLEARED → DELIVERED)
**Test:** Track shipment lifecycle

**Step 1: Create Shipment**
- [ ] Select active contract
- [ ] Click "Create Shipment"
- [ ] Fill:
  - Shipment ID: AUTO-GENERATED
  - Quantity: Match contract
  - Expected Departure Date
  - Transport Mode: SEA or AIR
- [ ] Submit
- [ ] Status: **CREATED**

**Status Tracking:**
```
CREATED → REGISTERED → QUALITY_INSPECTED → CUSTOMS_CLEARED → 
LAND_TRANSPORT → PORT_ARRIVED → DEPARTED → IN_TRANSIT → 
DESTINATION_ARRIVED → DELIVERED
```

- [ ] View shipment progress bar
- [ ] Track location updates
- [ ] Monitor milestone dates

### Tab 4: Customs (Status: DRAFT → SUBMITTED → CLEARED)
**Test:** Submit and track customs declaration

**Step 1: Submit Declaration**
- [ ] Click "Submit Customs Declaration"
- [ ] Fill declaration form:
  - Shipment ID
  - Customs Value
  - HS Code: 0901.11 (Coffee, not roasted)
  - EUDR Compliance: Yes
- [ ] Upload: Export Permit, Quality Certificate, Phytosanitary Certificate
- [ ] Submit
- [ ] Status: **SUBMITTED**

**Status Flow:**
```
DRAFT → SUBMITTED → INSPECTING → UNDER_REVIEW → CLEARED/REJECTED
```

- [ ] View declaration status
- [ ] Check clearance number when cleared
- [ ] Monitor inspection schedule

### Tab 5: LC & Payments (Status: PENDING → SETTLED)
**Test:** Track payment against LC

**Status Flow:**
```
LC: REQUESTED → APPROVED → ISSUED → DOCUMENTS_PRESENTED → 
     DOCUMENTS_EXAMINED → PAYMENT_RELEASED → SETTLED

Payment: PENDING → PROCESSING → COMPLETED
```

- [ ] View LC details
- [ ] Check document examination status
- [ ] Monitor payment release
- [ ] Verify settlement

### Tab 6: Reports
**Test:** Generate export reports
- [ ] View export summary
- [ ] Check volume by destination
- [ ] Review payment status breakdown

### Tab 7: Audit Trail
**Test:** View activity log
- [ ] All contract actions logged
- [ ] Blockchain verification shown
- [ ] Transaction IDs visible
- [ ] MSP endorsements displayed

---

## WORKFLOW 2: ECTA PORTAL (10 Tabs + 5 Quality Control Stages)
**User:** ECTA Officer, Quality Inspector  
**URL:** http://localhost:3000/portals/ecta

### Tab 0: Pending Applications (Status: pending → approved/rejected)
**Test:** Review exporter license application

**Step 1: Review Application**
- [ ] Application appears in list
- [ ] Click "Review" button
- [ ] View application details:
  - Exporter ID
  - Company Name
  - Capital Requirement
  - Laboratory Facility status
  - Professional Taster details
- [ ] Check document uploads

**Step 2: Approve Application**
- [ ] Click "Approve" button
- [ ] Fill approval data:
  - ECTA License Number: AUTO-GENERATED (ECTA-LIC-2026-XXX)
  - License Expiry Date: +1 year
  - Primary Bank: Commercial Bank of Ethiopia
  - LC Processing Branch
- [ ] Submit approval
- [ ] Verify blockchain transaction
- [ ] Status: **APPROVED** → **ACTIVE**

**Step 3: Reject Application (Alternative)**
- [ ] Click "Reject" button
- [ ] Enter rejection reason
- [ ] Submit
- [ ] Status: **REJECTED**

### Tab 1: Approved Exporters (Status: ACTIVE → SUSPENDED)
**Test:** Manage active exporters
- [ ] View all approved exporters
- [ ] Check ECTA License Number displays
- [ ] Verify Laboratory Certified badge
- [ ] Can view exporter details
- [ ] Can suspend if needed

### Tab 2: Sales Contracts (Status: REGISTERED → APPROVED → REJECTED)
**Test:** Review registered contracts

**Step 1: Review Contract**
- [ ] Contract appears after NBE registration
- [ ] View contract details
- [ ] Check EUDR compliance flag
- [ ] Verify all required documents

**Step 2: Approve Contract**
- [ ] Click "Approve" button
- [ ] Status: **APPROVED**
- [ ] Blockchain transaction recorded

### Tab 3: Quality Control ⚡ (5 Workflow Stages)
**Test:** Complete quality inspection workflow

#### Stage 1: PENDING (Awaiting Scheduling)
- [ ] Shipments with status CREATED/REGISTERED appear
- [ ] Click "Schedule Inspection"
- [ ] Fill form:
  - Inspection Type: Pre-shipment
  - Priority Level: Normal
  - Inspection Date
  - Inspection Time
  - Location: ECX Warehouse / Port
  - Assigned Inspector
  - Exporter Contact Person
- [ ] Submit
- [ ] Status: **SCHEDULED**

#### Stage 2: SCHEDULED (Inspection Booked)
- [ ] Scheduled inspections appear with date
- [ ] Inspector assigned
- [ ] Click "Start Inspection"
- [ ] Status moves to **INSPECTING**

#### Stage 3: UNDER_REVIEW (Inspected, Awaiting Approval)
- [ ] Inspector fills results:
  - Visual Grade: Pass/Fail
  - Moisture Content: %
  - Bean Size: mm
  - Defect Count
  - Cupping Score (if applicable)
  - Overall Quality Score
  - Compliance with Ethiopian Standards
- [ ] Upload lab results
- [ ] Submit inspection report
- [ ] Status: **INSPECTED** / **UNDER_REVIEW**

#### Stage 4: APPROVED (Passed Inspection)
- [ ] Quality Officer reviews
- [ ] Click "Approve"
- [ ] Generate Quality Certificate
- [ ] Certificate Number assigned
- [ ] Status: **APPROVED**

#### Stage 5: REJECTED (Failed Inspection)
- [ ] If failed, click "Reject"
- [ ] Enter rejection reason
- [ ] Specify corrective actions
- [ ] Status: **REJECTED**

**Workflow Verification:**
```
PENDING → Schedule → SCHEDULED → Inspect → UNDER_REVIEW → 
Officer Review → APPROVED/REJECTED
```

### Tab 4: License Renewals
**Test:** Track expiring licenses
- [ ] Shows licenses expiring within 3 months
- [ ] Days remaining displayed
- [ ] Can initiate renewal process

### Tab 5: Analytics
**Test:** View ECTA statistics
- [ ] Total applications count
- [ ] Approval rate
- [ ] Active exporters count
- [ ] Contract approval trends

### Tab 6: Pre-shipment Inspection
**Test:** Detailed inspection management
- [ ] Similar to Quality Control tab
- [ ] More detailed inspection fields

### Tab 7: User Management
**Test:** Manage ECTA users (ADMIN only)
- [ ] View ECTA officers
- [ ] View quality inspectors
- [ ] Can add/edit/deactivate users

### Tab 8: Audit Trail
**Test:** View ECTA activity log
- [ ] All approvals logged
- [ ] Rejections tracked
- [ ] Blockchain transactions shown

### Tab 9: Post-Delivery Audits
**Test:** Audit delivered shipments
- [ ] Delivered shipments appear
- [ ] Can perform post-delivery quality audit

---

## WORKFLOW 3: BANKS PORTAL (4 Parents → 9 Children + 4 Payment Methods)
**User:** Bank Officer, LC Officer, Forex Officer  
**URL:** http://localhost:3000/portals/banks

### PARENT 1: Payment Operations

#### Child 0: Payment Methods ⚡ (4 Payment Types)
**Test:** Select and process by payment method

**Payment Method 1: LC (Letter of Credit) - RECOMMENDED**
**Status Flow:**
```
REQUESTED → APPROVED → ISSUED → DOCUMENTS_PRESENTED → 
DOCUMENTS_EXAMINED → PAYMENT_RELEASED → SETTLED
```

- [ ] Hover over "Payment Methods" tab
- [ ] Dropdown shows 4 methods with risk levels
- [ ] Click "LC (Letter of Credit)"
- [ ] View LC requests table
- [ ] Columns: LC ID, Contract ID, Amount, Exporter, Bank, Status

**Step 1: Approve LC Request**
- [ ] Find LC with status **REQUESTED**
- [ ] Click "Approve Request"
- [ ] Review LC terms
- [ ] Click "Approve & Issue LC"
- [ ] Status: **APPROVED**

**Step 2: Issue LC (Send MT700)**
- [ ] LC status **APPROVED**
- [ ] Click "Issue LC"
- [ ] MT700 SWIFT message sent
- [ ] Status: **ISSUED**
- [ ] Blockchain transaction recorded

**Payment Method 2: CAD (Documentary Collection) - MEDIUM RISK**
- [ ] Switch to CAD from dropdown
- [ ] View documentary collection requests
- [ ] Status: DRAFT → COLLECTION_INITIATED → DOCUMENTS_SENT → PAID

**Payment Method 3: ADVANCE (Advance Payment) - LOW RISK**
- [ ] Switch to ADVANCE
- [ ] View advance payment requests
- [ ] Status: REQUESTED → APPROVED → TRANSFERRED

**Payment Method 4: CONSIGNMENT - HIGH RISK**
- [ ] Switch to CONSIGNMENT
- [ ] View consignment shipments
- [ ] Status: SHIPPED → SOLD → PAYMENT_RECEIVED

#### Child 2: Document Examination
**Test:** Examine LC documents

**Status:** DOCUMENTS_PRESENTED → DOCUMENTS_EXAMINED → APPROVED/DISCREPANT

- [ ] LC with documents presented appears
- [ ] Click "Examine Documents"
- [ ] Check documents:
  - Bill of Lading
  - Commercial Invoice
  - Packing List
  - Quality Certificate
  - Insurance Certificate
  - Certificate of Origin
- [ ] Each document: Accept / Reject with reason
- [ ] Click "Complete Examination"
- [ ] If all pass: Status **DOCUMENTS_ACCEPTED**
- [ ] If issues: Status **DISCREPANT** (goes to Child 9)

#### Child 3: Payment Release
**Test:** Release payment after document approval

**Status:** DOCUMENTS_ACCEPTED → PAYMENT_AUTHORIZED → PAYMENT_RELEASED → SETTLED

- [ ] LCs with accepted documents appear
- [ ] Click "Release Payment"
- [ ] Enter payment details:
  - Payment Method: TT/SWIFT
  - Beneficiary Account
  - Payment Reference
- [ ] Click "Authorize Payment"
- [ ] Status: **PAYMENT_RELEASED**
- [ ] SWIFT MT103 sent
- [ ] Blockchain recorded

#### Child 9: LC Discrepancies
**Test:** Handle document discrepancies

- [ ] View LCs with **DISCREPANT** status
- [ ] Discrepancy details shown
- [ ] Options:
  - Accept with waiver
  - Request correction from exporter
  - Reject documents
- [ ] Can communicate with exporter
- [ ] Track resolution

### PARENT 2: Forex & Settlements

#### Child 1: Forex Allocations
**Test:** Allocate forex to approved contracts

**Status:** REQUESTED → ALLOCATED → UTILIZED

**Step 1: Review Forex Request**
- [ ] Request appears from exporter
- [ ] View contract details
- [ ] Check NBE approval
- [ ] Requested Amount shown

**Step 2: Allocate Forex**
- [ ] Click "Allocate Forex"
- [ ] Fill allocation form:
  - Allocated Amount (USD)
  - Exchange Rate (ETB/USD) - from NBE
  - Retention Rate (%) - minimum 60%
  - NBE Officer name
  - NBE Approval Reference
  - Expiry Date
- [ ] Click "Allocate"
- [ ] Status: **ALLOCATED**
- [ ] LC can now be issued

#### Child 5: LC Settlements
**Test:** Settle LCs after shipment delivery

**Status:** PAYMENT_RELEASED → FOREX_REPATRIATED → SETTLED

- [ ] Delivered shipments with LCs appear
- [ ] Click "Settle LC"
- [ ] Verify:
  - Payment released
  - Goods delivered
  - Documents archived
  - Forex repatriation confirmed (60% minimum)
- [ ] Click "Complete Settlement"
- [ ] Status: **SETTLED**
- [ ] Blockchain finalized

### PARENT 3: Communication & Issues

#### Child 4: SWIFT Messages
**Test:** Track international payments

- [ ] View SWIFT messages table
- [ ] Message types: MT700 (LC), MT103 (Payment), MT799 (Free Format)
- [ ] Columns: Message ID, Type, Sender, Receiver, Amount, Status
- [ ] Status: DRAFT → SENT → ACKNOWLEDGED → SETTLED
- [ ] Can view message details
- [ ] Track by SWIFT reference

### PARENT 4: System Management

#### Child 6: Analytics
**Test:** View banking analytics
- [ ] Total LCs issued
- [ ] Total forex allocated
- [ ] Payment volume
- [ ] Charts and trends

#### Child 7: User Management
**Test:** Manage bank users (ADMIN only)
- [ ] View bank officers
- [ ] Roles: LC Officer, Forex Officer, Payment Officer
- [ ] Can add/edit/deactivate

#### Child 8: Audit Trail
**Test:** View banking activity log
- [ ] All LC actions logged
- [ ] Forex allocations tracked
- [ ] Payments recorded
- [ ] Blockchain proof shown

---

## WORKFLOW 4: NBE PORTAL (8 Tabs + 9 Subtabs)
**User:** NBE Officer, Forex Officer  
**URL:** http://localhost:3000/portals/nbe

### Tab 0: Forex Monitoring ⚡ (3 Subtabs)

#### Subtab 0: All Forex
**Test:** View complete forex overview
- [ ] KPI cards show:
  - Total Forex Requests
  - Allocated
  - Requested
  - Total Value (M USD)
- [ ] Click KPI to filter
- [ ] Table shows all forex requests

#### Subtab 1: Allocated
**Test:** View allocated forex only
- [ ] Click "Allocated" KPI
- [ ] Filter changes to show only **ALLOCATED** status
- [ ] KPIs update:
  - Allocated count
  - Allocated Amount
  - Avg Retention Rate
  - Back to All button
- [ ] Table filtered

#### Subtab 2: Requested
**Test:** Process pending forex requests
- [ ] Click "Requested" KPI
- [ ] Shows only **REQUESTED** status
- [ ] KPIs update:
  - Pending Requests
  - Requested Amount
  - Ready for Approval
  - Back to All button

**Allocate Forex:**
- [ ] Click "Allocate" on request
- [ ] Fill form:
  - Allocated Amount
  - Exchange Rate (from Tab 1)
  - Retention Rate (60-100%)
  - NBE Officer
  - NBE Approval Reference
  - Expiry Date
- [ ] Submit
- [ ] Status: **ALLOCATED**
- [ ] Blockchain recorded

### Tab 1: Exchange Rates
**Test:** Manage USD-ETB exchange rates

**Step 1: Set Exchange Rate**
- [ ] Current rate displayed
- [ ] Click "Set New Rate"
- [ ] Fill form:
  - Buying Rate (ETB): e.g., 115.00
  - Selling Rate (ETB): e.g., 116.00
  - Effective Date
  - Justification
- [ ] Submit
- [ ] Status: **ACTIVE**
- [ ] Historical rates shown

### Tab 2: SWIFT Monitoring ⚡ (3 Subtabs)

#### Subtab 0: All Messages
**Test:** View all SWIFT messages
- [ ] KPI cards:
  - Total Messages
  - Forex Inflow
  - High Value Txns
- [ ] Table with all messages
- [ ] Columns: Message ID, Type, Sender BIC, Receiver BIC, Amount, Status

#### Subtab 1: Analytics & Charts
**Test:** View SWIFT analytics
- [ ] KPI: Avg Message Value
- [ ] Charts:
  - Daily message volume
  - Amount by type
  - Country breakdown
- [ ] Time series trends

#### Subtab 2: Compliance Alerts
**Test:** Monitor regulatory compliance
- [ ] High value transaction alerts (>$100K)
- [ ] Suspicious patterns
- [ ] Missing documentation
- [ ] Retention rate violations
- [ ] Can flag for review

### Tab 3: Forex Repatriation
**Test:** Verify forex repatriation compliance

**Status:** DELIVERED → REPATRIATION_DUE → REPATRIATION_VERIFIED

- [ ] Delivered shipments appear
- [ ] Check repatriation requirements:
  - Minimum 60% of export value
  - Within 180 days
- [ ] View payment proof
- [ ] Click "Verify Repatriation"
- [ ] Status: **REPATRIATION_VERIFIED**

### Tab 4: Policy & Compliance
**Test:** Monitor policy compliance
- [ ] Minimum Price Compliance metrics
- [ ] EUDR documentation status
- [ ] Regulatory updates display
- [ ] Can flag non-compliant contracts

### Tab 5: Analytics ⚡ (3 Subtabs)

#### Subtab 0: Overview
**Test:** View summary metrics
- [ ] KPI cards:
  - Total Contracts
  - Forex Allocated
  - SWIFT Messages
- [ ] Quick stats

#### Subtab 1: Trends
**Test:** View growth analysis
- [ ] Monthly Growth metric
- [ ] Trend charts:
  - Contract volume over time
  - Forex allocation trends
  - Export value trends

#### Subtab 2: Breakdown
**Test:** Detailed analytics
- [ ] Breakdown by:
  - Destination country
  - Coffee type
  - Bank
  - Exporter
- [ ] Detailed reports

### Tab 6: User Management
**Test:** Manage NBE users (ADMIN only)
- [ ] View NBE officers
- [ ] Roles: Forex Officer, Exchange Rate Officer, Settlement Officer
- [ ] Can add/edit/deactivate

### Tab 7: Audit Trail
**Test:** View NBE activity log
- [ ] Forex allocations logged
- [ ] Exchange rate changes tracked
- [ ] Contract approvals recorded
- [ ] Blockchain proof shown

---

## WORKFLOW 5: CUSTOMS PORTAL (8 Tabs)
**User:** Customs Officer, Inspection Officer  
**URL:** http://localhost:3000/portals/customs

### Tab 0: Submitted
**Test:** Review submitted declarations

**Status:** SUBMITTED → (Action Required)

- [ ] Declarations with **SUBMITTED** status appear
- [ ] Click "Schedule Inspection"
- [ ] Fill inspection form:
  - Inspection Type: Physical / Documentary / Risk-Based
  - Priority Level: High / Normal / Low
  - Inspection Date
  - Inspection Time
  - Location: Warehouse / Port / Border
  - Assigned Inspector
  - Contact Person / Phone
- [ ] Submit
- [ ] Status: **INSPECTING**

### Tab 1: Inspecting
**Test:** Conduct and complete inspection

**Status:** INSPECTING → (Inspection Complete)

**Step 1: Perform Inspection**
- [ ] Declaration appears with inspection scheduled
- [ ] Inspector accesses declaration
- [ ] Inspection checklist:
  - Physical inspection of goods
  - Document verification
  - HS Code verification
  - EUDR compliance check
  - Quality certificate validation
  - Phytosanitary certificate check
  - Invoice verification
- [ ] Upload inspection photos/notes
- [ ] Complete inspection form

**Step 2: Submit Inspection Report**
- [ ] Status: **UNDER_REVIEW**

### Tab 2: Under Review
**Test:** Final review before clearance

**Status:** UNDER_REVIEW → CLEARED / REJECTED

**Option 1: Clear Declaration**
- [ ] Click "Clear"
- [ ] Fill clearance form:
  - Clearance Number: AUTO-GENERATED (CLR-XXXXXXX)
  - Clearance Date
  - Cleared By (Officer)
  - Clearance Type: FULL / PARTIAL
  - Customs Duties (ETB)
  - VAT Amount (ETB)
  - Exit Point: DJIBOUTI / MOYALE / GALAFI
  - Clearance Validity: 30 / 60 / 90 days
  - Clearance Remarks
- [ ] Submit
- [ ] Status: **CLEARED**
- [ ] Blockchain recorded

**Option 2: Reject Declaration**
- [ ] Click "Reject"
- [ ] Fill rejection form:
  - Rejection Category: DOCUMENTATION / VALUATION / CLASSIFICATION / COMPLIANCE
  - Severity Level: CORRECTABLE / MAJOR
  - Rejected By (Officer)
  - Rejection Date
  - Detailed Rejection Reason
  - Required Actions for Resubmission
  - Legal Reference (optional)
  - Appeal Deadline: 7 / 14 / 30 days
- [ ] Submit
- [ ] Status: **REJECTED**

### Tab 3: Cleared
**Test:** View cleared declarations
- [ ] All **CLEARED** declarations listed
- [ ] Clearance number displayed
- [ ] Can view clearance certificate
- [ ] Export permitted

### Tab 4: Rejected
**Test:** Manage rejected declarations
- [ ] All **REJECTED** declarations listed
- [ ] Rejection reason shown
- [ ] Exporter can view required actions
- [ ] Can appeal or resubmit

### Tab 5: Border Crossing
**Test:** Track cross-border shipments

**Status:** CLEARED → IN_TRANSIT → BORDER_CROSSED

- [ ] Cleared shipments appear
- [ ] Track to border:
  - Departure from customs warehouse
  - In transit to Djibouti
  - Arrival at border
  - Border crossing confirmed
- [ ] Border officer verification
- [ ] Status: **BORDER_CROSSED**

### Tab 6: User Management
**Test:** Manage customs users (ADMIN only)
- [ ] View customs officers
- [ ] Roles: Inspection Officer, Clearance Officer, Border Officer
- [ ] Can add/edit/deactivate

### Tab 7: Audit Trail
**Test:** View customs activity log
- [ ] All declarations logged
- [ ] Inspections tracked
- [ ] Clearances recorded
- [ ] Rejections documented
- [ ] Blockchain proof shown

---

## WORKFLOW 6: SHIPPING PORTAL (10 Lifecycle Tabs)
**User:** Shipping Agent  
**URL:** http://localhost:3000/portals/shipping

**Complete Lifecycle Status Flow:**
```
CUSTOMS_CLEARED [10%] → LAND_TRANSPORT [25%] → PORT_ARRIVED [40%] → 
CONTAINER_STUFFED [55%] → VESSEL_LOADED [70%] → DEPARTED [75%] → 
IN_TRANSIT [85%] → DESTINATION_ARRIVED [95%] → DELIVERED [100%]
```

### Tab 0: Clearance (CUSTOMS_CLEARED - 10%)
**Test:** View customs-cleared shipments ready for transport

- [ ] Shipments with **CUSTOMS_CLEARED** status appear
- [ ] Clearance number shown
- [ ] Click "Start Land Transport"
- [ ] Fill form:
  - Truck Registration Number
  - Driver Name
  - Driver License
  - Estimated Departure Date
  - Route: Addis Ababa → Djibouti (800km)
- [ ] Submit
- [ ] Status: **LAND_TRANSPORT**
- [ ] Progress: 25%

### Tab 1: Land Transport (LAND_TRANSPORT - 25%)
**Test:** Track land transport to Djibouti port

- [ ] Shipments in **LAND_TRANSPORT** appear
- [ ] Track location updates
- [ ] Click "Confirm Port Arrival"
- [ ] Enter:
  - Arrival Date/Time
  - Port Location
  - Truck Condition Report
- [ ] Submit
- [ ] Status: **PORT_ARRIVED**
- [ ] Progress: 40%

### Tab 2: Port Arrival (PORT_ARRIVED - 40%)
**Test:** Manage arrived shipments at port

- [ ] Shipments with **PORT_ARRIVED** status appear
- [ ] Port receipt confirmed
- [ ] Click "Start Container Stuffing"
- [ ] Fill form:
  - Container Number
  - Container Type: 20ft / 40ft / 40ft HC / Reefer
  - Container Seal Number
  - Stuffing Location
- [ ] Submit
- [ ] Status: **CONTAINER_STUFFED**
- [ ] Progress: 55%

### Tab 3: Container Stuffing (CONTAINER_STUFFED - 55%)
**Test:** Complete container loading

- [ ] Shipments with **CONTAINER_STUFFED** status appear
- [ ] Container details shown
- [ ] Click "Load on Vessel"
- [ ] Fill form:
  - Vessel Name / Flight Number
  - Voyage Number
  - Carrier: Maersk / MSC / CMA CGM / Ethiopian Airlines
  - Loading Date
- [ ] Submit
- [ ] Status: **VESSEL_LOADED**
- [ ] Progress: 70%

### Tab 4: Vessel Loading (VESSEL_LOADED - 70%)
**Test:** Confirm vessel loading

- [ ] Shipments **VESSEL_LOADED** appear
- [ ] Bill of Lading / Airway Bill generated
- [ ] Document number shown
- [ ] Click "Confirm Departure"
- [ ] Enter:
  - Actual Departure Date/Time
  - Captain Signature (for sea)
  - Port of Departure: Djibouti
- [ ] Submit
- [ ] Status: **DEPARTED**
- [ ] Progress: 75%

### Tab 5: Departed (DEPARTED - 75%)
**Test:** Track departed shipments

- [ ] Shipments with **DEPARTED** status appear
- [ ] Departure confirmed
- [ ] ETD (Estimated Time of Departure) shown
- [ ] ETA (Estimated Time of Arrival) calculated
- [ ] System auto-updates to **IN_TRANSIT** after 24 hours

### Tab 6: In Transit (IN_TRANSIT - 85%)
**Test:** Monitor ocean/air freight

- [ ] Shipments in **IN_TRANSIT** appear
- [ ] For SEA: 25-35 days transit
- [ ] For AIR: 1-3 days transit
- [ ] Tracking updates:
  - Current location
  - Days in transit
  - Days remaining
- [ ] Can update tracking milestones
- [ ] Click "Confirm Destination Arrival" when arrived
- [ ] Status: **DESTINATION_ARRIVED**
- [ ] Progress: 95%

### Tab 7: Destination Arrived (DESTINATION_ARRIVED - 95%)
**Test:** Confirm arrival at buyer's port

- [ ] Shipments **DESTINATION_ARRIVED** appear
- [ ] Port of Discharge confirmed
- [ ] Buyer notified
- [ ] Click "Confirm Delivery"
- [ ] Fill final delivery form:
  - Actual Arrival Date
  - Buyer Signature
  - Goods Condition: Good / Damaged
  - Delivery Notes
- [ ] Upload delivery receipt
- [ ] Submit
- [ ] Status: **DELIVERED**
- [ ] Progress: 100%

### Tab 8: Delivered (DELIVERED - 100%)
**Test:** View completed deliveries

- [ ] All **DELIVERED** shipments appear
- [ ] Complete delivery details shown
- [ ] Delivery badge displayed
- [ ] Can generate delivery report
- [ ] Triggers:
  - LC settlement process (Banks)
  - Forex repatriation check (NBE)
  - Post-delivery audit (ECTA)

### Tab 9: Users
**Test:** Manage shipping users (ADMIN only)
- [ ] View shipping agents
- [ ] Can add/edit/deactivate
- [ ] Role-restricted tab

---

## WORKFLOW 7: ECX PORTAL (4 Tabs)
**User:** ECX Officer, Grading Officer  
**URL:** http://localhost:3000/portals/ecx

### Tab 0: Coffee Lots (Status: WAREHOUSED → GRADED → ASSIGNED → RELEASED)
**Test:** Complete coffee lot lifecycle

**Step 1: Register Intake**
- [ ] Click "Register Intake"
- [ ] Fill intake form:
  - Exporter ID
  - Company Name
  - Origin Region: Yirgacheffe / Sidama / Guji / Gedeo / etc.
  - Sub-Region: Kochere, Bensa, etc.
  - Quantity (kg)
  - Number of Bags (60kg each)
  - Harvest Season: 2025/2026
  - Processing Method: Washed / Natural / Honey
  - Receiving Warehouse: WH-ADDIS-01 / WH-ADDIS-02
- [ ] Submit
- [ ] ECX Lot Number: AUTO-GENERATED (LOT-2026-XXXXX)
- [ ] Status: **WAREHOUSED**

**Step 2: Grade Coffee**
- [ ] Find lot with **WAREHOUSED** status
- [ ] Click "Grade"
- [ ] Fill grading form:
  - Moisture Content (%): Must be ≤12% for export
  - Defect Count (per 300g): 
    - Grade 1: ≤3 | Grade 2: ≤12 | Grade 3: ≤25
  - Cupping Score (SCA): 
    - Specialty: ≥80 | Exchange: ≥75 | Commercial: ≥60
  - Assigned Grade: Grade 1 / Grade 2 / Grade 3 / Grade 4 / Grade 5
  - Grading Officer: Select from list
  - Grading Remarks
- [ ] Submit
- [ ] Status: **GRADED**
- [ ] Quality certificate generated

**Step 3: Assign to Contract**
- [ ] Find graded lot
- [ ] Click "Assign to Contract"
- [ ] Fill form:
  - Sales Contract ID (NBE-registered)
  - Agreed Price (USD/kg): Must be ≥$5.00 (NBE minimum FOB)
  - Buyer confirmation
- [ ] Submit
- [ ] Status: **ASSIGNED**

**Step 4: Release for Export**
- [ ] Find assigned lot
- [ ] Click "Release"
- [ ] Verify:
  - Export Permit validated
  - ECC clearance confirmed
  - Container booking confirmed
  - All documents complete
- [ ] Enter Release Authorization Note
- [ ] Submit
- [ ] Status: **RELEASED**
- [ ] Lot ready for shipment

**Complete Status Flow:**
```
WAREHOUSED → GRADED → ASSIGNED → RELEASED
```

### Tab 1: Market Prices
**Test:** View current coffee prices
- [ ] Regional prices displayed
- [ ] Breakdown by:
  - Region (Yirgacheffe, Sidama, Guji, etc.)
  - Grade (Grade 1, 2, 3)
  - Price (USD/kg)
- [ ] Price trends chart
- [ ] Last updated timestamp

### Tab 2: Grading Standards
**Test:** View Ethiopian coffee grading standards
- [ ] Grade eligibility table:
  - Grade 1: ≤3 defects, score ≥80
  - Grade 2: ≤12 defects, score ≥80
  - Grade 3: ≤25 defects, score ≥75
  - Grade 4: ≤45 defects, score ≥60
  - Grade 5: ≤100 defects, commercial
- [ ] Reference guide for graders
- [ ] Defect types explained

### Tab 3: User Management
**Test:** Manage ECX users (ADMIN only)
- [ ] View ECX officers
- [ ] Roles: Grading Officer, Warehouse Officer, Registration Officer, Release Officer
- [ ] Can add/edit/deactivate

---

## COMPLETE END-TO-END WORKFLOW TEST
**Test all portals in sequence for one export transaction**

### Phase 1: License & Setup
1. **ECTA:** Approve exporter application → **ACTIVE**
2. **ECX:** Register exporter in system

### Phase 2: Contract & Approval
3. **Exporter:** Create sales contract → **DRAFT**
4. **NBE:** Register contract → **REGISTERED**
5. **NBE:** Approve contract → **APPROVED**
6. **ECTA:** Review contract → **APPROVED**

### Phase 3: Coffee Preparation
7. **ECX:** Register coffee lot → **WAREHOUSED**
8. **ECX:** Grade coffee → **GRADED** (Grade 1)
9. **ECX:** Assign to contract → **ASSIGNED**

### Phase 4: Forex & Banking
10. **Exporter:** Request forex → **REQUESTED**
11. **NBE:** Allocate forex → **ALLOCATED**
12. **Banks:** Receive forex allocation
13. **Exporter:** Request LC → **REQUESTED**
14. **Banks:** Approve LC → **APPROVED**
15. **Banks:** Issue LC (MT700) → **ISSUED**

### Phase 5: Quality & Export Clearance
16. **ECX:** Release coffee lot → **RELEASED**
17. **Exporter:** Create shipment → **CREATED**
18. **ECTA:** Schedule quality inspection → **SCHEDULED**
19. **ECTA:** Conduct inspection → **UNDER_REVIEW**
20. **ECTA:** Approve quality → **APPROVED**
21. **Exporter:** Submit customs declaration → **SUBMITTED**
22. **Customs:** Schedule inspection → **INSPECTING**
23. **Customs:** Complete inspection → **UNDER_REVIEW**
24. **Customs:** Clear declaration → **CLEARED**

### Phase 6: Shipping & Logistics
25. **Shipping:** Start land transport → **LAND_TRANSPORT** [25%]
26. **Shipping:** Confirm port arrival → **PORT_ARRIVED** [40%]
27. **Shipping:** Container stuffing → **CONTAINER_STUFFED** [55%]
28. **Shipping:** Load on vessel → **VESSEL_LOADED** [70%]
29. **Shipping:** Confirm departure → **DEPARTED** [75%]
30. **Shipping:** In transit → **IN_TRANSIT** [85%]
31. **Shipping:** Destination arrival → **DESTINATION_ARRIVED** [95%]
32. **Shipping:** Confirm delivery → **DELIVERED** [100%]

### Phase 7: Payment & Settlement
33. **Banks:** Documents presented → **DOCUMENTS_PRESENTED**
34. **Banks:** Examine documents → **DOCUMENTS_EXAMINED**
35. **Banks:** Release payment → **PAYMENT_RELEASED**
36. **Banks:** Settle LC → **SETTLED**
37. **NBE:** Verify forex repatriation → **REPATRIATION_VERIFIED**

### Phase 8: Post-Delivery
38. **ECTA:** Post-delivery audit → **AUDIT_COMPLETE**
39. **All Portals:** Blockchain proof visible
40. **All Portals:** Audit trail complete

---

## STATUS SUMMARY TABLE

### All Unique Statuses Across System (60+ statuses)

| Portal | Tab/Subtab | Status Flow |
|--------|-----------|-------------|
| **Exporter** | Contracts | DRAFT → REGISTERED → APPROVED → NBE_APPROVED → ACTIVE |
| **Exporter** | Forex | REQUESTED → ALLOCATED → UTILIZED |
| **Exporter** | Shipments | CREATED → REGISTERED → QUALITY_INSPECTED → CUSTOMS_CLEARED → LAND_TRANSPORT → PORT_ARRIVED → DEPARTED → IN_TRANSIT → DESTINATION_ARRIVED → DELIVERED |
| **Exporter** | Customs | DRAFT → SUBMITTED → INSPECTING → UNDER_REVIEW → CLEARED / REJECTED |
| **Exporter** | LC | REQUESTED → APPROVED → ISSUED → DOCUMENTS_PRESENTED → DOCUMENTS_EXAMINED → PAYMENT_RELEASED → SETTLED |
| **ECTA** | Applications | pending → APPROVED / REJECTED |
| **ECTA** | Exporters | ACTIVE → SUSPENDED |
| **ECTA** | Contracts | REGISTERED → APPROVED / REJECTED |
| **ECTA** | Quality Control | PENDING → SCHEDULED → UNDER_REVIEW / INSPECTED → APPROVED / REJECTED |
| **Banks** | LC | REQUESTED → APPROVED → ISSUED → DOCUMENTS_PRESENTED → DOCUMENTS_EXAMINED → DISCREPANT / PAYMENT_RELEASED → SETTLED |
| **Banks** | Forex | REQUESTED → ALLOCATED → UTILIZED |
| **Banks** | CAD | DRAFT → COLLECTION_INITIATED → DOCUMENTS_SENT → PAID |
| **Banks** | Advance | REQUESTED → APPROVED → TRANSFERRED |
| **Banks** | Consignment | SHIPPED → SOLD → PAYMENT_RECEIVED |
| **Banks** | SWIFT | DRAFT → SENT → ACKNOWLEDGED → SETTLED |
| **NBE** | Forex | REQUESTED → ALLOCATED → UTILIZED |
| **NBE** | Exchange Rates | ACTIVE / INACTIVE |
| **NBE** | Repatriation | DELIVERED → REPATRIATION_DUE → REPATRIATION_VERIFIED |
| **Customs** | Declarations | SUBMITTED → INSPECTING → UNDER_REVIEW → CLEARED / REJECTED |
| **Customs** | Border | CLEARED → IN_TRANSIT → BORDER_CROSSED |
| **Shipping** | Lifecycle | CUSTOMS_CLEARED → LAND_TRANSPORT → PORT_ARRIVED → CONTAINER_STUFFED → VESSEL_LOADED → DEPARTED → IN_TRANSIT → DESTINATION_ARRIVED → DELIVERED |
| **ECX** | Coffee Lots | WAREHOUSED → GRADED → ASSIGNED → RELEASED |

---

## TESTING CHECKLIST SUMMARY

### Critical Paths to Test
- [ ] Complete exporter application to approval
- [ ] Contract creation to NBE approval
- [ ] Coffee lot warehousing to release
- [ ] Forex request to allocation
- [ ] LC request to issuance
- [ ] Quality inspection complete workflow (5 stages)
- [ ] Payment method selection (4 types)
- [ ] Customs declaration to clearance
- [ ] Shipping complete lifecycle (10 stages)
- [ ] Document examination to payment release
- [ ] Forex repatriation verification
- [ ] SWIFT monitoring (3 views)
- [ ] NBE Analytics dashboard (3 sections)

### Blockchain Verification Points
- [ ] Exporter approval (ECTA)
- [ ] Contract registration (NBE)
- [ ] Contract approval (ECTA, NBE)
- [ ] LC issuance (Banks)
- [ ] Forex allocation (NBE, Banks)
- [ ] Quality approval (ECTA)
- [ ] Customs clearance (Customs)
- [ ] Shipment milestones (Shipping)
- [ ] Payment release (Banks)
- [ ] LC settlement (Banks)

### UI/UX Elements to Verify
- [ ] Dynamic tab counts update correctly
- [ ] Status badges show correct colors
- [ ] Progress bars reflect actual status
- [ ] Blockchain badges display
- [ ] Document upload works
- [ ] PDF generation works
- [ ] Search/filter functions
- [ ] Pagination works
- [ ] Role-based tab visibility
- [ ] Dropdown hover menus (Banks Payment Methods)
- [ ] KPI card filtering (NBE Forex)
- [ ] Subtab navigation (NBE SWIFT, Analytics)
- [ ] Workflow stage filters (ECTA Quality Control)

---

## EXPECTED RESULTS

### Successful Completion Criteria
✅ All 94 navigational elements accessible  
✅ All status transitions work correctly  
✅ Blockchain transactions recorded at key points  
✅ Documents upload and display properly  
✅ Role-based access controls enforced  
✅ Dynamic counts update in real-time  
✅ Subtabs and hierarchical navigation functional  
✅ End-to-end workflow completes successfully  
✅ Audit trails capture all activities  
✅ No console errors or broken UI elements  

---

**Testing Notes:**
- Test with different user roles to verify RBAC
- Check both SEA and AIR shipping modes
- Test rejection flows as well as approval flows
- Verify blockchain proof displays correctly
- Test edge cases (missing documents, expired LCs, etc.)
- Monitor console for errors during navigation
- Check mobile responsiveness if applicable

**Document Version:** 1.0  
**Last Updated:** October 23, 2026  
**Status:** Ready for Testing
