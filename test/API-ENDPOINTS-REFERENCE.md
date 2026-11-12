# GoCBC API Endpoints Reference - Complete Field Requirements

This document maps all workflow endpoint requirements for end-to-end testing validation.

## Contract Workflow

### POST /api/v1/contracts
**Purpose:** Create new sales contract

**Required Fields:**
- `contractID` (string) - Unique contract identifier
- `exporterID` (string) - Exporter identifier
- `buyerID` (string) - Buyer identifier  
- `buyerCountry` (string) - Buyer country
- `buyerBank` (string) - Buyer's bank (issuing bank)
- `exporterBank` (string) - Exporter's bank (advising bank)
- `coffeeType` (string) - Type of coffee
- `quantity` (number) - Quantity in kg
- `pricePerKg` (number) - Price per kg (minimum 5.0)
- `currency` (string) - Currency code (e.g., USD, EUR)
- `eudrRequired` (boolean) - EUDR requirement flag

**Optional Fields:**
- `grade` (string) - Coffee grade
- `deliveryTerms` (string) - Delivery terms (e.g., FOB, CIF)
- `paymentTerms` (string) - Payment terms
- `paymentMethod` (enum) - LC, CAD, TT_ADVANCE, TT_POST, ADVANCE
- `contractDate` (string, ISO format) - Contract date
- `supersedesContractID` (string) - Previous contract ID if amendment

**Response:**
- Status: PENDING
- Returns contract data with contractID

---

### POST /api/v1/contracts/:contractID/approve
**Purpose:** Approve contract (ECTA role)

**Required Fields:**
- `contractID` (path parameter) - Contract to approve

**Optional Fields:**
- `comments` (string) - Approval comments

**Response:**
- Status: CONTRACT_APPROVED
- Returns updated contract data

---

## Banking / LC Workflow

### POST /api/v1/banking/lc/request
**Purpose:** Request Letter of Credit

**Required Fields:**
- `lcID` (string) - Unique LC identifier
- `contractID` (string) - Associated contract
- `exporterID` (string) - Exporter identifier
- `bankName` (string) - Issuing bank name
- `amount` (number) - LC amount
- `currency` (string) - Currency code
- `expiryDate` (string, ISO format) - LC expiry date

**Optional Fields:**
- `terms` (string) - LC terms and conditions
- `applicantBank` (string) - Applicant bank

**Response:**
- Status: REQUESTED
- Returns LC data with lcID

---

### POST /api/v1/banking/lc/:lcID/examine-documents
**Purpose:** Bank examines LC documents

**Required Fields:**
- `lcID` (path parameter) - LC to examine

**Optional Fields:**
- `examinationNotes` (string) - Examination findings

**Response:**
- Status: UNDER_EXAMINATION → EXAMINED
- Updates LC status

---

### POST /api/v1/banking/lc/:lcID/approve
**Purpose:** Bank approves LC

**Required Fields:**
- `lcID` (path parameter) - LC to approve

**Optional Fields:**
- `comments` (string) - Approval comments

**Response:**
- Status: APPROVED
- LC ready for payment

---

### POST /api/v1/banking/lc/:lcID/release-payment
**Purpose:** Release LC payment to exporter

**Required Fields:**
- `lcID` (path parameter) - LC to pay
- `amount` (number) - Payment amount
- `currency` (string) - Payment currency

**Optional Fields:**
- `paymentReference` (string) - Payment reference number

**Response:**
- Status: PAID
- Payment recorded on blockchain

---

## Quality Inspection Workflow

### POST /api/v1/quality/inspections
**Purpose:** Request quality inspection

**Required Fields:**
- `inspectionID` (string) - Unique inspection identifier
- `exporterID` (string) - Exporter identifier
- `shipmentID` (string) - Associated shipment
- `coffeeType` (string) - Type of coffee to inspect
- `quantity` (number) - Quantity to inspect (kg)

**Optional Fields:**
- `warehouse` (string) - Warehouse location
- `requestedDate` (string, ISO format) - Requested inspection date

**Response:**
- Status: PENDING
- Inspection record created

---

### POST /api/v1/quality/inspections/:inspectionID/perform
**Purpose:** Perform quality inspection

**Required Fields:**
- `inspectionID` (path parameter) - Inspection to perform

**Optional Fields:**
- `findings` (string) - Inspection findings
- `moistureContent` (number) - Moisture percentage
- `defects` (number) - Defect count

**Response:**
- Status: IN_PROGRESS
- Inspection underway

---

### POST /api/v1/quality/inspections/:inspectionID/complete
**Purpose:** Complete quality inspection

**Required Fields:**
- `inspectionID` (path parameter) - Inspection to complete
- `grade` (string) - Quality grade (A, B, C, etc.)
- `passed` (boolean) - Pass/fail result

**Optional Fields:**
- `remarks` (string) - Inspector remarks
- `certificateNumber` (string) - Certificate reference

**Response:**
- Status: COMPLETED
- Quality certificate generated

---

### POST /api/v1/quality/inspections/:inspectionID/approve
**Purpose:** Approve quality inspection (ECTA)

**Required Fields:**
- `inspectionID` (path parameter) - Inspection to approve

**Optional Fields:**
- `approvalComments` (string) - Approval remarks

**Response:**
- Status: APPROVED
- Inspection approved for export

---

## Shipment Workflow

### POST /api/v1/shipments
**Purpose:** Create shipment record

**Required Fields:**
- `shipmentID` (string) - Unique shipment identifier
- `contractID` (string) - Associated contract
- `exporterID` (string) - Exporter identifier
- `buyerID` (string) - Buyer identifier
- `origin` (string) - Origin location
- `quantity` (number) - Shipment quantity (kg)
- `grade` (string) - Coffee grade
- `icoNumber` (string) - ICO number
- `channel` (string) - Export channel

**Optional Fields:**
- `destination` (string) - Destination location
- `carrier` (string) - Shipping carrier
- `estimatedDeparture` (string, ISO format) - Estimated departure
- `estimatedArrival` (string, ISO format) - Estimated arrival

**Response:**
- Status: CREATED
- Shipment registered on blockchain

---

### POST /api/v1/shipping/bookings
**Purpose:** Create freight booking

**Required Fields:**
- `bookingID` (string) - Unique booking identifier
- `shipmentID` (string) - Associated shipment
- `carrier` (string) - Shipping carrier name
- `vesselName` (string) - Vessel name
- `containerNumber` (string) - Container number

**Optional Fields:**
- `estimatedDeparture` (string, ISO format) - ETD
- `estimatedArrival` (string, ISO format) - ETA
- `portOfLoading` (string) - POL
- `portOfDischarge` (string) - POD
- `sealNumber` (string) - Container seal number

**Response:**
- Status: FREIGHT_BOOKED
- Booking confirmed
- Shipment status mirrored to FREIGHT_BOOKED

---

### POST /api/v1/shipping/bookings/:bookingID/depart
**Purpose:** Record shipment departure

**Required Fields:**
- `bookingID` (path parameter) - Booking to update

**Optional Fields:**
- `actualDeparture` (string, ISO format) - Actual departure time
- `location` (string) - Departure location

**Response:**
- Status: IN_TRANSIT
- Departure recorded
- Shipment status mirrored to IN_TRANSIT

---

### POST /api/v1/shipping/bookings/:bookingID/arrive
**Purpose:** Record shipment arrival

**Required Fields:**
- `bookingID` (path parameter) - Booking to update

**Optional Fields:**
- `actualArrival` (string, ISO format) - Actual arrival time
- `location` (string) - Arrival location

**Response:**
- Status: DELIVERED
- Arrival recorded
- Shipment status mirrored to DELIVERED

---

## Customs Workflow

### POST /api/v1/customs/declarations
**Purpose:** Submit customs declaration (wrapper endpoint)

**Required Fields:**
- `declarationID` (string) - Unique declaration identifier
- `shipmentID` (string) - Associated shipment
- `exporterID` (string) - Exporter identifier

**Optional Fields:**
- `declarationType` (string) - Type of declaration
- `customsValue` (number) - Declared value
- `dutyAmount` (number) - Duty amount

**Response:**
- Status: SUBMITTED
- Declaration created

---

### POST /api/v1/customs/declaration/submit
**Purpose:** Submit customs declaration (full endpoint)

**Required Fields:**
- `declarationID` (string) - Unique declaration identifier
- `shipmentID` (string) - Associated shipment
- `exporterID` (string) - Exporter identifier
- `permitNumber` (string) - Export permit number

**Optional Fields:**
- `declarationType` (string) - Type of declaration
- `customsValue` (number) - Declared value
- `dutyAmount` (number) - Duty amount

**Response:**
- Status: SUBMITTED
- Declaration registered on blockchain

---

### POST /api/v1/customs/declaration/:declarationID/review
**Purpose:** Customs reviews declaration

**Required Fields:**
- `declarationID` (path parameter) - Declaration to review

**Optional Fields:**
- `officerName` (string) - Reviewing officer
- `comments` (string) - Review comments

**Response:**
- Status: UNDER_REVIEW
- Review initiated

---

### POST /api/v1/customs/declaration/:declarationID/inspect
**Purpose:** Conduct physical inspection

**Required Fields:**
- `declarationID` (path parameter) - Declaration to inspect

**Optional Fields:**
- `inspectionNotes` (string) - Inspection findings

**Response:**
- Status: UNDER_INSPECTION
- Inspection in progress

---

### POST /api/v1/customs/declaration/:declarationID/complete-inspection
**Purpose:** Complete customs inspection

**Required Fields:**
- `declarationID` (path parameter) - Declaration ID

**Optional Fields:**
- `findings` (string) - Inspection findings
- `discrepancies` (string) - Any discrepancies found

**Response:**
- Status: INSPECTED
- Ready for clearance decision

---

### POST /api/v1/customs/declaration/:declarationID/clear
**Purpose:** Clear customs declaration

**Required Fields:**
- `declarationID` (path parameter) - Declaration to clear

**Optional Fields:**
- `clearanceComments` (string) - Clearance notes

**Response:**
- Status: CLEARED
- Shipment cleared for export
- Shipment status updated to CUSTOMS_CLEARED

---

### POST /api/v1/customs/declaration/:declarationID/reject
**Purpose:** Reject customs declaration

**Required Fields:**
- `declarationID` (path parameter) - Declaration to reject
- `rejectionReason` (string) - Reason for rejection

**Optional Fields:**
- `remedialAction` (string) - Required remedial action

**Response:**
- Status: REJECTED
- Declaration rejected with reason

---

## Forex Workflow

### POST /api/v1/forex
**Purpose:** Request forex allocation (wrapper endpoint)

**Required Fields:**
- `forexID` (string) - Unique forex identifier
- `contractID` (string) - Associated contract
- `exporterID` (string) - Exporter identifier
- `amount` (number) - Forex amount requested

**Optional Fields:**
- `currency` (string) - Currency (defaults to USD from contract)
- `lcNumber` (string) - Related LC number

**Response:**
- Status: REQUESTED
- Forex request created on blockchain

---

### POST /api/v1/forex/:forexID/confirm
**Purpose:** NBE confirms forex request

**Required Fields:**
- `forexId` (path parameter) - Forex ID to confirm

**Optional Fields:**
- `comments` (string) - NBE comments

**Response:**
- Status: CONFIRMED
- Forex allocation confirmed

---

### POST /api/v1/forex/:forexID/allocate
**Purpose:** Allocate forex to exporter

**Required Fields:**
- `forexId` (path parameter) - Forex ID to allocate
- `lcId` (string) - Associated LC ID

**Optional Fields:**
- `allocationAmount` (number) - Amount allocated
- `allocationNotes` (string) - Allocation notes

**Response:**
- Status: ALLOCATED
- Forex ready for use

---

## Document Workflow

### POST /api/v1/documents
**Purpose:** Register document (metadata only, no file upload)

**Required Fields:**
- `documentID` (string) - Unique document identifier
- `documentType` (string) - Type of document
- `fileName` (string) - File name
- `fileHash` (string) - SHA-256 hash of file

**Optional Fields:**
- `shipmentID` (string) - Associated shipment
- `contractID` (string) - Associated contract
- `entityType` (string) - Entity type (SHIPMENT, CONTRACT, APPLICATION)
- `entityId` (string) - Entity identifier
- `ipfsCID` (string) - IPFS content identifier

**Response:**
- Document registered on blockchain
- Returns documentID and txId

---

### POST /api/v1/documents/upload
**Purpose:** Upload document file (with file data)

**Method:** multipart/form-data

**Required Fields:**
- `file` (file) - Document file to upload
- `documentID` (string) - Unique document identifier
- `documentType` (string) - Type of document
- `fileName` (string) - File name

**Optional Fields:**
- `shipmentID` (string) - Associated shipment
- `contractID` (string) - Associated contract
- `entityType` (string) - Entity type
- `entityId` (string) - Entity identifier
- `encrypt` (boolean) - Encrypt file flag

**Response:**
- File uploaded to server
- Document hash registered on blockchain
- Returns documentID, filePath, fileHash, txId

---

### POST /api/v1/documents/upload-registration
**Purpose:** Upload registration document (no auth required, rate limited)

**Method:** multipart/form-data

**Required Fields:**
- `file` (file) - Document file to upload

**Optional Fields:**
- `fileName` (string) - Override file name
- `entityType` (string) - Entity type (defaults to EXPORTER_APPLICATION)
- `entityId` (string) - Entity identifier
- `documentType` (string) - Document type (defaults to OTHER)

**Response:**
- File uploaded
- Document registered on blockchain
- Returns documentID, fileHash, txId

---

### POST /api/v1/documents/:documentID/sign
**Purpose:** Sign document with digital signature

**Required Fields:**
- `documentId` (path parameter) - Document to sign
- `signatureType` (string) - UPLOAD, VERIFY, APPROVE, or REJECT

**Optional Fields:**
- `remarks` (string) - Signature remarks
- `reason` (string) - Reason for signing/rejecting (required for REJECT)

**Response:**
- Signature recorded on blockchain
- Multi-party approval tracked
- Returns signature data with txId

**Notes:**
- APPROVE triggers multi-party approval workflow
- ECTA users can directly approve quality documents
- Other documents require approval workflow validation

---

## Certificate Workflow

### POST /api/v1/certificates/coo/request
**Purpose:** Request Certificate of Origin

**Required Fields:**
- `certificateID` (string) - Unique certificate ID
- `shipmentID` (string) - Associated shipment
- `exporterID` (string) - Exporter identifier
- `origin` (string) - Country of origin

**Optional Fields:**
- `remarks` (string) - Additional remarks

**Response:**
- Status: REQUESTED
- COO request submitted

---

### POST /api/v1/phytosanitary/request
**Purpose:** Request Phytosanitary certificate

**Required Fields:**
- `certificateID` (string) - Unique certificate ID
- `shipmentID` (string) - Associated shipment
- `exporterID` (string) - Exporter identifier

**Optional Fields:**
- `treatment` (string) - Treatment applied
- `inspectionDate` (string, ISO format) - Inspection date
- `remarks` (string) - Additional remarks

**Response:**
- Status: REQUESTED
- Phytosanitary request submitted

---

### POST /api/v1/phytosanitary/:certificateID/inspect
**Purpose:** Conduct phytosanitary inspection

**Required Fields:**
- `certificateID` (path parameter) - Certificate to inspect

**Optional Fields:**
- `inspectionNotes` (string) - Inspection findings
- `treatment` (string) - Treatment applied

**Response:**
- Status: INSPECTED
- Inspection completed

---

### POST /api/v1/phytosanitary/:certificateID/issue
**Purpose:** Issue phytosanitary certificate

**Required Fields:**
- `certificateID` (path parameter) - Certificate to issue

**Optional Fields:**
- `issueDate` (string, ISO format) - Issue date
- `validUntil` (string, ISO format) - Expiry date

**Response:**
- Status: ISSUED
- Certificate issued and signed

---

## Repatriation Workflow

### POST /api/v1/repatriation/initiate
**Purpose:** Initiate forex repatriation tracking

**Required Fields:**
- `repatriationID` (string) - Unique repatriation ID
- `forexID` (string) - Associated forex allocation
- `expectedAmount` (number) - Expected repatriation amount
- `expectedDate` (string, ISO format) - Expected repatriation date

**Optional Fields:**
- `currency` (string) - Currency code

**Response:**
- Status: INITIATED
- Repatriation tracking started

---

### POST /api/v1/repatriation/:id/record
**Purpose:** Record actual repatriation

**Required Fields:**
- `id` (path parameter) - Repatriation ID
- `actualAmount` (number) - Actual amount repatriated
- `actualDate` (string, ISO format) - Actual repatriation date

**Optional Fields:**
- `reference` (string) - Bank reference number
- `swiftReference` (string) - SWIFT reference

**Response:**
- Status: RECORDED
- Repatriation recorded

---

### POST /api/v1/repatriation/:id/verify
**Purpose:** NBE verifies repatriation

**Required Fields:**
- `id` (path parameter) - Repatriation ID

**Optional Fields:**
- `verificationNotes` (string) - NBE verification notes
- `verified` (boolean) - Verification result

**Response:**
- Status: VERIFIED or DISCREPANCY
- Repatriation verified by NBE

---

### POST /api/v1/repatriation/:id/penalty
**Purpose:** Apply penalty for non-compliance

**Required Fields:**
- `id` (path parameter) - Repatriation ID
- `penaltyAmount` (number) - Penalty amount
- `penaltyReason` (string) - Reason for penalty

**Optional Fields:**
- `dueDate` (string, ISO format) - Payment due date

**Response:**
- Status: PENALTY_APPLIED
- Penalty recorded

---

## Retention Workflow

### POST /api/v1/retention/policy
**Purpose:** Set NBE retention policy (NBE only)

**Required Fields:**
- `policyID` (string) - Unique policy ID
- `commodityType` (string) - Commodity type (e.g., COFFEE)
- `retentionRate` (number) - Retention percentage (0-100)

**Optional Fields:**
- `effectiveDate` (string, ISO format) - Policy effective date
- `description` (string) - Policy description

**Response:**
- Policy created/updated
- Returns policy data

---

### POST /api/v1/retention/:forexID/retention
**Purpose:** Calculate and enforce retention on forex

**Required Fields:**
- `forexId` (path parameter) - Forex ID

**Optional Fields:**
- `forceRecalculate` (boolean) - Force recalculation

**Response:**
- Retention calculated and recorded
- Returns retention amount and details

---

## Exchange Rates Workflow

### POST /api/v1/exchange-rates
**Purpose:** Set exchange rate (NBE only)

**Required Fields:**
- `rateID` (string) - Unique rate ID
- `currency` (string) - Currency code
- `buyingRate` (number) - Buying rate
- `sellingRate` (number) - Selling rate

**Optional Fields:**
- `effectiveDate` (string, ISO format) - Rate effective date

**Response:**
- Rate created/updated
- Returns rate data

---

## Permit Workflow

### POST /api/v1/permits
**Purpose:** Create export permit

**Required Fields:**
- `permitID` (string) - Unique permit ID
- `exporterID` (string) - Exporter identifier
- `quantity` (number) - Permitted quantity
- `coffeeType` (string) - Coffee type

**Optional Fields:**
- `validFrom` (string, ISO format) - Validity start date
- `validUntil` (string, ISO format) - Validity end date

**Response:**
- Permit created
- Returns permit data

---

### POST /api/v1/permits/issue
**Purpose:** Issue export permit

**Required Fields:**
- `permitId` (string) - Permit ID to issue
- `exporterID` (string) - Exporter identifier

**Optional Fields:**
- `issuanceNotes` (string) - Issuance notes

**Response:**
- Status: ISSUED
- Permit issued

---

### POST /api/v1/permits/utilize
**Purpose:** Utilize export permit (mark as used)

**Required Fields:**
- `permitId` (string) - Permit ID to utilize

**Response:**
- Status: UTILIZED
- Permit marked as used

---

### POST /api/v1/permits/settle
**Purpose:** Settle export permit

**Required Fields:**
- `permitId` (string) - Permit ID to settle
- `repatriatedAmount` (number) - Amount repatriated

**Optional Fields:**
- `settlementNotes` (string) - Settlement notes

**Response:**
- Status: SETTLED
- Permit settled

---

## Land Transport Workflow

### POST /api/v1/land-transport/:shipmentID/start
**Purpose:** Start land transport journey

**Required Fields:**
- `shipmentID` (path parameter) - Shipment ID

**Optional Fields:**
- `vehicleNumber` (string) - Vehicle registration
- `driverName` (string) - Driver name
- `departureLocation` (string) - Departure location

**Response:**
- Status: IN_LAND_TRANSIT
- Journey started

---

### POST /api/v1/land-transport/:shipmentID/border-crossing
**Purpose:** Record border crossing

**Required Fields:**
- `shipmentID` (path parameter) - Shipment ID
- `borderPost` (string) - Border post name

**Optional Fields:**
- `crossingTime` (string, ISO format) - Crossing timestamp
- `customsOfficer` (string) - Customs officer name

**Response:**
- Status: AT_BORDER
- Border crossing recorded

---

### POST /api/v1/land-transport/:shipmentID/arrive
**Purpose:** Record arrival at destination

**Required Fields:**
- `shipmentID` (path parameter) - Shipment ID

**Optional Fields:**
- `arrivalTime` (string, ISO format) - Arrival timestamp
- `arrivalLocation` (string) - Arrival location

**Response:**
- Status: ARRIVED_AT_PORT
- Arrival recorded

---

## Summary

**Total Endpoints Documented:** 60+

**Key Patterns:**
1. All POST endpoints return blockchain transaction IDs (txId) when blockchain operations succeed
2. Most workflows follow: CREATE → REVIEW/INSPECT → APPROVE/COMPLETE → FINALIZE
3. Status transitions are enforced at blockchain level
4. Optional fields provide additional context but are not required for workflow progression
5. Authentication required for all endpoints except /documents/upload-registration
6. Role-based access control enforced on all state-changing operations

**Testing Recommendations:**
1. Always validate required fields before making requests
2. Check response status codes (201 for creation, 200 for updates, 400 for validation errors)
3. Verify blockchain transaction IDs are returned
4. Confirm status transitions match expected workflow
5. Test with minimal required fields first, then add optional fields
6. Verify role-based access controls are enforced
