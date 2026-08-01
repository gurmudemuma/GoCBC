# Ethiopian Coffee Export - Complete Workflow Sequence
## From Contract Creation to Payment Release

This document outlines every step in the correct sequence across all portals.

---

## WORKFLOW OVERVIEW

```
Exporter → ECTA → NBE → Bank → Customs → Shipping → Bank → Payment
```

---

## DETAILED STEP-BY-STEP SEQUENCE

### PHASE 1: CONTRACT & REGISTRATION

#### Step 1: Exporter Portal - Create Sales Contract
**Actor:** Exporter  
**Endpoint:** `POST /api/v1/contracts`  
**Data Required:**
- Contract ID
- Exporter ID
- Buyer information (name, country, bank)
- Coffee details (type, quantity, price per kg)
- Currency (USD)
- Payment terms
- Incoterm (FOB, CIF, etc.)
- EUDR compliance flag

**Status After:** Contract status = `PENDING_APPROVAL`

---

### PHASE 2: ECTA APPROVAL

#### Step 2: ECTA Portal - Review Contract for Export Compliance
**Actor:** ECTA Officer  
**Endpoint:** `POST /api/v1/contracts/{contractId}/approve`  
**Verification:**
- Exporter license validity
- Coffee quality standards
- Export documentation completeness
- EUDR compliance (if required)
- ECX certification (if applicable)

**Status After:** Contract status = `ECTA_APPROVED`

---

### PHASE 3: FOREX REQUEST & ALLOCATION

#### Step 3A: Exporter Portal - Submit Forex Request
**Actor:** Exporter  
**Endpoint:** `POST /api/v1/forex/request`  
**Data Required:**
- Forex ID
- Contract ID
- Amount (in USD)
- Currency
- Purpose (coffee export)

**Status After:** Forex status = `PENDING`

#### Step 3B: Bank Portal - Allocate Forex (per NBE policy)
**Actor:** Bank Officer  
**Endpoint:** `POST /api/v1/forex/allocate`  
**Data Required:**
- Forex ID
- LC ID (to be created)
- Amount
- Exchange rate (ETB/USD)
- Retention rate (40%)
- NBE approval reference
- Expiry date
- Bank officer name

**Status After:** Forex status = `ALLOCATED`

---

### PHASE 4: LETTER OF CREDIT (LC)

#### Step 4A: Exporter Portal - Request LC
**Actor:** Exporter  
**Endpoint:** `POST /api/v1/banking/lc/request`  
**Data Required:**
- LC ID
- Contract ID
- Exporter ID
- Bank name
- Amount (USD)
- Currency
- Expiry date
- Payment terms

**Status After:** LC status = `PENDING_APPROVAL`

#### Step 4B: Bank Portal - Review & Approve LC
**Actor:** Bank Officer  
**Endpoint:** `POST /api/v1/banking/lc/{lcId}/approve`  
**Verification:**
- Forex allocation verification
- Credit worthiness
- Documentation completeness
- Buyer's bank confirmation

**Status After:** LC status = `APPROVED`

#### Step 4C: Bank Portal - Issue LC
**Actor:** Bank Officer  
**Endpoint:** `POST /api/v1/banking/lc/{lcId}/issue`  
**Data Required:**
- LC terms and conditions
- Required documents list
- Shipment deadline
- Presentation period

**Status After:** LC status = `ISSUED`

---

### PHASE 5: SHIPMENT PREPARATION

#### Step 5: Exporter Portal - Create Shipment Record
**Actor:** Exporter  
**Endpoint:** `POST /api/v1/shipments`  
**Data Required:**
- Shipment ID
- Contract ID
- Exporter ID
- Buyer ID
- Origin (Ethiopian region)
- Destination (buyer's country/port)
- Quantity (kg)
- Coffee grade
- ICO number (International Coffee Organization)
- ECX lot number (if via ECX)
- Forex rate
- Value (USD)
- EUDR compliance status

**Status After:** Shipment status = `PENDING_QUALITY_CHECK`

---

### PHASE 6: QUALITY INSPECTION

#### Step 6: ECX/Lab - Quality Inspection & Certification
**Actor:** Quality Inspector  
**Endpoint:** `POST /api/v1/shipments/{shipmentId}/quality-check`  
**Verification:**
- Moisture content
- Bean size (screen size)
- Cup quality (taste profile)
- Defects count
- Overall grade confirmation

**Certificates Generated:**
- Quality certificate
- Phytosanitary certificate
- Certificate of origin

**Status After:** Shipment status = `QUALITY_APPROVED`

---

### PHASE 7: CUSTOMS CLEARANCE

#### Step 7A: Exporter Portal - Submit Customs Declaration
**Actor:** Exporter  
**Endpoint:** `POST /api/v1/customs/declaration/submit`  
**Data Required:**
- Declaration ID (format: CD-{ShipmentID})
- Shipment ID
- Exporter ID
- Declaration type (EXPORT)
- HS Code (090111 for coffee)
- Quantity
- Value
- Currency
- Destination country
- Port of exit (Djibouti Port)
- EUDR compliance

**Auto-Mapped from Shipment:**
- Quantity
- Exporter ID
- EUDR status
- Value

**Auto-Mapped from Contract:**
- Destination
- Currency
- Incoterm

**Status After:** Declaration status = `SUBMITTED`

#### Step 7B: Customs Portal - Review Declaration & Schedule Inspection
**Actor:** Customs Officer  
**Endpoint:** `POST /api/v1/customs/declaration/{declarationId}/review`  
**Data Required:**
- Inspector notes
- Inspection type (DOCUMENTARY/PHYSICAL/BOTH)
- Scheduled date

**Status After:** Declaration status = `UNDER_INSPECTION`

#### Step 7C: Customs Portal - Complete Physical Inspection
**Actor:** Customs Inspector  
**Endpoint:** `POST /api/v1/customs/declaration/{declarationId}/complete-inspection`  
**Verification:**
- Physical verification of goods
- Documentation verification
- Quality certificate validation
- Phytosanitary compliance
- EUDR compliance (if applicable)

**Data Required:**
- Inspection result (PASSED/FAILED)
- Inspector comments

**Status After:** Declaration status = `UNDER_REVIEW`

#### Step 7D: Customs Portal - Clear Declaration & Issue Export Permit
**Actor:** Customs Officer  
**Endpoint:** `POST /api/v1/customs/declaration/{declarationId}/clear`  
**Data Required:**
- Clearance number
- Duties amount (ETB)
- Officer name

**Status After:** 
- Declaration status = `CLEARED`
- Shipment status = `CUSTOMS_CLEARED`

**Documents Issued:**
- Export permit
- Customs clearance certificate

---

### PHASE 8: SHIPPING & DOCUMENTATION

#### Step 8: Shipping Company - Record Shipment Details
**Actor:** Shipping Agent  
**Endpoint:** `POST /api/v1/shipments/{shipmentId}/shipping-details`  
**Data Required:**
- Vessel name
- Bill of Lading (BOL) number
- Loading date
- Departure date
- Expected arrival date
- Container numbers
- Seal numbers

**Documents Generated:**
- Bill of Lading (clean on-board)
- Commercial invoice
- Packing list

**Status After:** Shipment status = `IN_TRANSIT`

---

### PHASE 9: SWIFT PAYMENT MESSAGES

#### Step 9A: Buyer's Bank - Issue MT700 (LC Issuance)
**Actor:** Buyer's Bank  
**Endpoint:** `POST /api/v1/swift/messages`  
**Message Type:** MT700  
**Data Required:**
- LC number
- Applicant (buyer)
- Beneficiary (exporter)
- Amount & currency
- Loading/discharge ports
- Latest ship date
- LC expiry date
- Required documents list

**Status:** DRAFT → APPROVED → SENT

#### Step 9B: Exporter's Bank - Send MT710 (Advice of LC)
**Actor:** Exporter's Bank  
**Endpoint:** `POST /api/v1/swift/messages`  
**Message Type:** MT710  
**Purpose:** Advise exporter of LC receipt

**Status:** DRAFT → APPROVED → SENT

#### Step 9C: Exporter's Bank - Present Documents (Document Presentation)
**Actor:** Exporter's Bank  
**Documents Presented:**
- Commercial invoice (3 originals)
- Full set clean on-board Bill of Lading
- Certificate of Origin (Form A)
- Quality certificate from ECX
- Phytosanitary certificate
- Packing list
- Insurance policy (if CIF)

#### Step 9D: Buyer's Bank - Send MT750 (Discrepancy Notice) [If Applicable]
**Actor:** Buyer's Bank  
**Endpoint:** `POST /api/v1/swift/messages`  
**Message Type:** MT750  
**Purpose:** Notify of any document discrepancies

**Status:** DRAFT → APPROVED → SENT → RECEIVED

#### Step 9E: Buyer's Bank - Send MT103 (Customer Credit Transfer)
**Actor:** Buyer's Bank  
**Endpoint:** `POST /api/v1/swift/messages`  
**Message Type:** MT103  
**Data Required:**
- Sender BIC (buyer's bank)
- Receiver BIC (exporter's bank)
- Amount & currency
- Beneficiary (exporter)
- Beneficiary account number
- Ordering customer (buyer)
- Remittance information
- Value date
- Linked LC ID

**Workflow:** DRAFT → APPROVED → SENT → RECEIVED → PROCESSING → SETTLED

#### Step 9F: Exporter's Bank - Send MT910 (Confirmation of Credit)
**Actor:** Exporter's Bank  
**Endpoint:** `POST /api/v1/swift/messages`  
**Message Type:** MT910  
**Purpose:** Confirm payment received and credited to exporter's account

**Workflow:** DRAFT → APPROVED → SENT → RECEIVED → PROCESSING → SETTLED

---

### PHASE 10: PAYMENT SETTLEMENT & FOREX UTILIZATION

#### Step 10A: Bank Portal - Record Payment Settlement
**Actor:** Bank Officer  
**Automatic:** Triggered by MT103 SETTLED status  
**Calculations:**
- Amount received: $170,000 USD
- Exchange rate: 115.50 ETB/USD
- Total in ETB: 19,635,000 ETB
- Retention (40%): 7,854,000 ETB (kept in USD)
- Converted to ETB (60%): 11,781,000 ETB (credited to exporter)

#### Step 10B: Bank Portal - Mark Forex as Utilized
**Actor:** Bank Officer  
**Endpoint:** `POST /api/v1/forex/utilize`  
**Data Required:**
- Forex ID
- Utilized amount

**Status After:** Forex status = `UTILIZED`

#### Step 10C: Bank Portal - Process Forex Retention
**Actor:** Bank Officer  
**Endpoint:** `POST /api/v1/forex/retention`  
**Purpose:** Record NBE retention requirement compliance  
**Data:**
- 40% retained in USD for NBE
- 60% converted and credited to exporter

**Status After:** Forex retention = `COMPLIANT`

---

## SUMMARY OF ALL PORTALS & THEIR ACTIONS

### 1. EXPORTER PORTAL
- Create sales contract
- Submit forex request
- Request LC
- Create shipment record
- Submit customs declaration
- Track shipment status
- View payment status

### 2. ECTA PORTAL
- Review and approve contracts (export compliance)
- Verify exporter license validity
- Monitor export quality standards
- Track EUDR compliance

### 3. NBE PORTAL
- Monitor forex retention compliance (NBE sets policy at 50%, banks execute)
- Track foreign exchange inflows
- Verify repatriation requirements

### 4. BANK PORTAL
- Allocate forex (with NBE approval)
- Review and approve LC requests
- Issue LCs
- Process SWIFT messages (MT700, MT710, MT103, MT750, MT910)
- Receive payments
- Process forex retention
- Mark forex as utilized
- Credit exporter accounts

### 5. CUSTOMS PORTAL
- Review declarations
- Schedule inspections
- Conduct physical inspections
- Issue clearances
- Generate export permits
- Monitor ASYCUDA integration

### 6. SHIPPING PORTAL
- Record vessel details
- Generate bills of lading
- Track shipment status
- Update shipping milestones

---

## KEY COMPLIANCE POINTS

### NBE Forex Retention Policy
- **40%** must be retained in foreign currency
- **60%** can be converted to ETB
- Monitored and enforced by NBE
- Bank executes retention
- Compliance tracked on blockchain

### EUDR Compliance (EU Regulation 2023/1115)
- Required for exports to EU
- Tracked from farm to port
- Deforestation-free certification
- Geo-location data required
- Due diligence documentation

### ASYCUDA Integration (Customs)
- Ethiopian customs system
- Automated data exchange
- Risk profiling
- Duty assessment
- Clearance automation

---

## STATUS TRANSITIONS SUMMARY

### Contract Status Flow
```
DRAFT → PENDING_APPROVAL → ECTA_APPROVED → ACTIVE
```

### Forex Status Flow
```
PENDING → ALLOCATED → UTILIZED → SETTLED
```

### LC Status Flow
```
PENDING_APPROVAL → APPROVED → ISSUED → UTILIZED → SETTLED
```

### Shipment Status Flow
```
PENDING_QUALITY_CHECK → QUALITY_APPROVED → PENDING_CUSTOMS → 
CUSTOMS_CLEARED → IN_TRANSIT → DELIVERED
```

### Declaration (Customs) Status Flow
```
SUBMITTED → UNDER_INSPECTION → UNDER_REVIEW → CLEARED
```

### SWIFT Message Status Flow
```
DRAFT → APPROVED → SENT → RECEIVED → PROCESSING → SETTLED
```

---

## BLOCKCHAIN TRANSACTIONS

All critical steps are recorded on Hyperledger Fabric blockchain:

1. ✅ Contract registration (immutable)
2. ✅ ECTA approval (with MSP identity)
3. ✅ Forex allocation (with MSP identity and NBE policy compliance)
5. ✅ LC issuance (with MSP identity)
6. ✅ Shipment creation (immutable)
7. ✅ Quality inspection results (immutable)
8. ✅ Customs clearance (with MSP identity & audit trail)
9. ✅ SWIFT message records (immutable)
10. ✅ Payment settlement (immutable)
11. ✅ Forex utilization (with compliance data)

---

## COMPLETE END-TO-END TIMELINE

**Typical Duration:** 28-40 days from contract to payment

- **Day 0-1:** Contract creation & registration
- **Day 1-2:** ECTA approval
- **Day 2-4:** Forex allocation (bank executes per NBE policy)
- **Day 5-7:** LC issuance
- **Day 7-14:** Shipment preparation & quality check
- **Day 14-16:** Customs clearance
- **Day 16-17:** Loading & departure
- **Day 17-35:** Sea transit (varies by destination)
- **Day 35-38:** Destination port arrival
- **Day 38-40:** Document presentation
- **Day 40-42:** Payment processing
- **Day 42-45:** Payment settlement & forex retention

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-18  
**System:** Ethiopian Coffee Export Consortium Blockchain System (CECBS)
