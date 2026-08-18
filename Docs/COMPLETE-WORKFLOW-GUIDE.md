# Ethiopian Coffee Export Consortium Blockchain System (CECBS)
# Complete Export Workflow Guide

**Version:** 2.0  
**Last Updated:** February 2026  
**Document Type:** Master Workflow Guide  

---

## Table of Contents

1. [Overview](#overview)
2. [Workflow Architecture](#workflow-architecture)
3. [Stage 1: Exporter Registration & Application](#stage-1-exporter-registration--application)
4. [Stage 2: Contract Registration & Approval](#stage-2-contract-registration--approval)
5. [Stage 3: Letter of Credit (LC) Workflow](#stage-3-letter-of-credit-lc-workflow)
6. [Stage 4: Forex Allocation Workflow](#stage-4-forex-allocation-workflow)
7. [Stage 5: Shipment Creation & Quality Inspection](#stage-5-shipment-creation--quality-inspection)
8. [Stage 6: Customs Declaration & Clearance](#stage-6-customs-declaration--clearance)
9. [Stage 7: SWIFT Payment Processing](#stage-7-swift-payment-processing)
10. [Stage 8: Payment Settlement & Forex Utilization](#stage-8-payment-settlement--forex-utilization)
11. [Payment Methods](#payment-methods)
12. [Document Requirements](#document-requirements)
13. [Audit Trail Tracking](#audit-trail-tracking)
14. [API Reference](#api-reference)
15. [Troubleshooting](#troubleshooting)

---

## Overview

### System Purpose
The Ethiopian Coffee Export Consortium Blockchain System (CECBS) manages the complete coffee export journey from exporter registration through payment settlement. The system ensures:

- **Compliance**: ECTA regulations, NBE forex policy, customs requirements
- **Transparency**: Full audit trail of all transactions
- **Security**: Hyperledger Fabric blockchain with cryptographic verification
- **Efficiency**: Automated workflows reducing manual intervention

### Key Stakeholders

| Organization | Role | Responsibilities |
|--------------|------|------------------|
| **ECTA** (Ethiopian Coffee & Tea Authority) | Regulator | Exporter registration, export compliance, quality standards |
| **NBE** (National Bank of Ethiopia) | Financial Regulator | Forex policy setting (50% retention rate) |
| **Banks** | Financial Services | LC issuance, forex allocation, payment processing |
| **Customs** | Trade Control | Export clearance, duty collection, EUDR compliance |
| **Exporters** | Coffee Sellers | Contract creation, shipment, document submission |

---

## Workflow Architecture

### Complete Journey Flow

```
Applicant Registration → ECTA Approval → Exporter Account Created
                                    ↓
        Contract Registration (Exporter) → ECTA Approval → NBE Monitoring
                                    ↓
        LC Request (Exporter) → Bank Approval → Bank Issuance
                                    ↓
        Forex Request (Auto) → Bank Allocation (per NBE 50% policy)
                                    ↓
        Shipment Creation (Exporter) → Quality Inspection (ECTA)
                                    ↓
        Customs Declaration (Exporter) → Customs Inspection → Customs Clearance
                                    ↓
        SWIFT Messages (Bank) → Document Verification → Payment Release
                                    ↓
        Payment Settlement → Forex Utilization → Export Complete
```

### Timeline Estimates

| Stage | Typical Duration | Critical Path |
|-------|------------------|---------------|
| Exporter Application → Approval | 5-10 business days | Yes |
| Contract Registration → ECTA Approval | 2-5 business days | Yes |
| LC Request → Issuance | 3-7 business days | Yes |
| Forex Allocation | 1-2 business days | No (parallel with LC) |
| Quality Inspection | 3-5 business days | Yes |
| Customs Clearance | 2-4 business days | Yes |
| Land Transport (Addis → Djibouti) | 3-5 days | Yes |
| Sea/Air Shipping | 30-45 days (sea), 5-7 days (air) | Yes |
| Payment Settlement | 5-10 business days | Yes |
| **Total Timeline** | **~60-90 days** (typical export cycle) | |

---

## Stage 1: Exporter Registration & Application

### 1.1 Application Submission

**Actor:** Applicant (Prospective Exporter)  
**Status:** `inactive` → Applicant Portal

#### Process
1. Applicant visits system and creates account
2. System creates user with `inactive` status
3. Applicant fills application form with company details
4. Applicant uploads required documents
5. System redirects to application tracking page

#### API Endpoints
```javascript
// POST /api/v1/exporters/apply
{
  "fullName": "Abebe Kebede",
  "companyName": "Ethiopian Coffee Masters Ltd",
  "tinNumber": "TIN-1234567890",
  "email": "abebe@coffeemasters.et",
  "phone": "+251911234567",
  "exporterType": "company",  // private, company, individual
  "capitalAmount": "20000000", // ETB
  "professionalTaster": "yes",
  "laboratoryCertified": true,
  "bankName": "Commercial Bank of Ethiopia",
  "bankBranch": "Main Branch",
  "address": "Addis Ababa, Ethiopia"
}
```

#### Document Requirements
- Business Registration Certificate
- TIN Certificate
- Bank Reference Letter
- Laboratory Certification (if applicable)
- Professional Taster Certificate (if applicable)

#### Capital Requirements (ECTA Directive 1106/2025)
- **Private Exporters**: 15,000,000 ETB
- **Trade Associations/Companies**: 20,000,000 ETB
- **Individual Exporters (Competency Certified)**: 10,000,000 ETB

#### Code Reference
- Frontend: `ui/src/pages/application-status.tsx`
- API: `api/src/routes/exporters.ts` → POST `/exporters/apply`
- Database: `exporter_applications` table

---

### 1.2 ECTA Review & Approval

**Actor:** ECTA Officer  
**Portal:** ECTA Portal

#### Process
1. ECTA officer views pending applications
2. Reviews submitted documents
3. Verifies capital requirement compliance
4. Approves or rejects application
5. System creates blockchain exporter record
6. System creates active user account
7. Applicant can now login as exporter

#### API Endpoints
```javascript
// POST /api/v1/exporters/applications/:id/approve
{
  "comments": "Application meets all requirements",
  "ectaLicenseNumber": "ECTA-2026-12345",
  "licenseExpiryDate": "2027-12-31"
}

// Chaincode: RegisterExporter
```

#### Approval Criteria
✅ Valid TIN and business registration  
✅ Capital requirement met for exporter type  
✅ Laboratory certification (for company/private)  
✅ Professional taster certification  
✅ Bank reference letter  
✅ No outstanding violations

#### Code Reference
- Frontend: `ui/src/components/portals/ECTAPortal.tsx`
- API: `api/src/routes/exporters.ts` → POST `/exporters/applications/:id/approve`
- Chaincode: `chaincodes/coffee/main.go` → `RegisterExporter()`

---

## Stage 2: Contract Registration & Approval

### 2.1 Contract Creation

**Actor:** Exporter  
**Portal:** Exporter Portal  
**Prerequisites:** Active exporter account, ECTA license valid

#### Process
1. Exporter navigates to "Create Contract" section
2. Fills contract details (buyer, coffee type, quantity, price)
3. Selects payment method (LC, CAD, Advance, etc.)
4. Uploads contract documents (signed contract, proforma invoice)
5. System registers contract on blockchain with status `REGISTERED`

#### API Endpoints
```javascript
// POST /api/v1/contracts
{
  "contractID": "CONTRACT-20260217-001",
  "exporterID": "EXP4342570",
  "buyerID": "BUYER-USA-001",
  "buyerName": "ABC Coffee Importers Inc",
  "buyerCountry": "USA",
  "buyerBank": "JPMorgan Chase",        // Issuing bank
  "exporterBank": "Commercial Bank of Ethiopia",  // Advising bank
  "coffeeType": "Arabica Yirgacheffe",
  "quantity": 20000,  // kg
  "pricePerKg": 8.50,  // USD
  "currency": "USD",
  "paymentMethod": "LC",  // LC, CAD, TT_ADVANCE, TT_POST, ADVANCE
  "eudrRequired": true,
  "documents": ["DOC-1234567890123", "DOC-9876543210987"]
}
```

#### Validation Rules
- Price per kg ≥ $5.00 USD (minimum price requirement)
- Buyer bank (issuing bank) must be specified
- Exporter bank (advising bank) must be specified
- Quantity > 0
- Valid coffee type
- Documents must exist and belong to exporter

#### Code Reference
- Frontend: `ui/src/components/portals/ExporterPortal.tsx`
- API: `api/src/routes/contracts.ts` → POST `/contracts`
- Chaincode: `chaincodes/coffee/main.go` → `RegisterSalesContractWithPaymentMethod()`

---

### 2.2 ECTA Approval (Export Compliance)

**Actor:** ECTA Officer  
**Portal:** ECTA Portal  
**Status Transition:** `REGISTERED` → `APPROVED`

#### Process
1. ECTA officer reviews contract in pending list
2. Verifies contract documents
3. Checks compliance with export regulations
4. Checks EUDR compliance (if EU destination)
5. Approves contract
6. System generates ECTA reference number (format: `ECTA-YYYY-NNNN`)
7. Contract becomes available for LC issuance

#### API Endpoints
```javascript
// POST /api/v1/contracts/:contractID/approve
{} // No body required, auth token identifies ECTA user
```

#### Approval Checklist
✅ Signed contract document uploaded and verified  
✅ Proforma invoice uploaded  
✅ Price ≥ minimum threshold  
✅ EUDR compliance for EU destinations  
✅ Coffee type and origin properly declared  
✅ Buyer details complete and valid

#### Audit Trail Entry
- **Action**: `APPROVE`
- **Entity Type**: `CONTRACT`
- **Performed By**: ECTA Officer (X.509 certificate)
- **Organization**: `ECTAMSP`
- **Old Status**: `REGISTERED`
- **New Status**: `APPROVED`
- **Metadata**: ECTA reference number, approval timestamp

#### Code Reference
- Frontend: `ui/src/components/portals/ECTAPortal.tsx` → `handleApproveContract()`
- API: `api/src/routes/contracts.ts` → POST `/contracts/:contractID/approve`
- Chaincode: `chaincodes/coffee/main.go` → `ApproveSalesContract()`

---

## Stage 3: Letter of Credit (LC) Workflow

### 3.1 LC Request

**Actor:** Exporter  
**Portal:** Exporter Portal  
**Prerequisites:** Contract status = `APPROVED`

#### Process
1. Exporter navigates to approved contract
2. Clicks "Request LC"
3. System auto-fills LC details from contract
4. Exporter reviews and confirms LC request
5. System creates LC record with status `REQUESTED`

#### API Endpoints
```javascript
// POST /api/v1/banking/lc/request
{
  "lcID": "LC-20260217-001",
  "contractID": "CONTRACT-20260217-001",
  "exporterID": "EXP4342570",
  "bankName": "Commercial Bank of Ethiopia",
  "amount": "170000",  // Auto-calculated from contract
  "currency": "USD",
  "expiryDate": "2026-05-17"  // 90 days from request
}
```

#### Auto-Mapping
System automatically populates:
- **Amount**: Contract totalValue (quantity × pricePerKg)
- **Currency**: From contract
- **Exporter ID**: From contract
- **Beneficiary Bank**: From contract.exporterBank

#### Code Reference
- Frontend: `ui/src/components/portals/ExporterPortal.tsx`
- API: `api/src/routes/banking.ts` → POST `/banking/lc/request`
- Chaincode: `chaincodes/coffee/banking.go` → `RequestLC()`

---

### 3.2 Bank LC Approval

**Actor:** Bank Officer  
**Portal:** Banks Portal  
**Status Transition:** `REQUESTED` → `APPROVED`

#### Process
1. Bank officer reviews LC request in Banks Portal
2. Verifies contract is ECTA-approved
3. Checks exporter creditworthiness
4. Reviews LC terms and amount
5. Approves LC
6. System updates LC status to `APPROVED`

#### API Endpoints
```javascript
// POST /api/v1/banking/lc/:lcID/approve
{
  "beneficiary": "EXP4342570"  // Optional, defaults to exporter
}
```

#### Approval Criteria
✅ Contract approved by ECTA  
✅ Exporter has valid license  
✅ Amount matches contract value  
✅ Beneficiary bank details correct  
✅ Issuing bank details verified  
✅ LC terms align with UCP 600 standards

#### Code Reference
- Frontend: `ui/src/components/portals/BanksPortal.tsx`
- API: `api/src/routes/banking.ts` → POST `/banking/lc/:lcID/approve`
- Chaincode: `chaincodes/coffee/banking.go` → `ApproveLC()`

---

### 3.3 Bank LC Issuance

**Actor:** Bank Officer  
**Portal:** Banks Portal  
**Status Transition:** `APPROVED` → `ISSUED`

#### Process
1. Bank officer reviews approved LC
2. Sets LC terms and conditions
3. Issues LC
4. System updates LC status to `ISSUED`
5. **System auto-creates forex request** (linked to LC and contract)

#### API Endpoints
```javascript
// POST /api/v1/banking/lc/:lcID/issue
{
  "terms": "Payment against shipping documents as per UCP 600",
  "latestShipmentDate": "2026-04-15",
  "portOfLoading": "Djibouti Port",
  "portOfDischarge": "New York Port"
}
```

#### LC Terms Example
- **Payment Terms**: Sight LC (payment on presentation)
- **Partial Shipment**: Allowed / Not Allowed
- **Transhipment**: Allowed / Not Allowed
- **Documents Required**:
  - Commercial Invoice (3 originals)
  - Full Set Clean On Board Bill of Lading
  - Certificate of Origin (Form A)
  - Quality Certificate from ECTA
  - Phytosanitary Certificate
  - Packing List

#### Auto-Created Forex Request
After LC issuance, system automatically:
1. Creates forex request with ID `FOREX_{lcID}_{timestamp}`
2. Links to LC and contract
3. Sets status to `REQUESTED`
4. Notifies bank for allocation

#### Code Reference
- Frontend: `ui/src/components/portals/BanksPortal.tsx`
- API: `api/src/routes/banking.ts` → POST `/banking/lc/:lcID/issue`
- Chaincode: `chaincodes/coffee/banking.go` → `IssueLC()`

---

## Stage 4: Forex Allocation Workflow

### 4.1 Forex Allocation (by Bank per NBE Policy)

**Actor:** Bank Officer  
**Portal:** Banks Portal  
**Status Transition:** `REQUESTED` → `ALLOCATED`  
**NBE Policy**: 50% retention rate (FXD/01/2024)

#### Process
1. Bank officer views forex requests in Banks Portal
2. Reviews linked LC and contract details
3. Sets allocation parameters per NBE policy
4. Allocates forex
5. System updates forex status to `ALLOCATED`

#### API Endpoints
```javascript
// POST /api/v1/forex/allocate
{
  "forexId": "FOREX_LC-20260217-001_1708185600",
  "lcId": "LC-20260217-001",
  "amount": "170000",         // Auto-filled from LC
  "exchangeRate": "115.50",   // Current ETB/USD rate
  "retentionRate": "50",      // NBE policy (50%)
  "officer": "Bank Officer - Dawit Tadesse",
  "approvalRef": "NBE-FX-1708185600",
  "expiryDate": "2026-08-15"  // 180 days from allocation
}
```

#### Forex Calculation Example
- **LC Amount**: $170,000 USD
- **Exchange Rate**: 115.50 ETB/USD
- **Total ETB**: 19,635,000 ETB
- **Retention (50%)**: 9,817,500 ETB (kept in Ethiopia)
- **Available for Payment**: 9,817,500 ETB equivalent

#### NBE Retention Policy
**Per NBE Directive FXD/01/2024:**
- Coffee exports: **50% retention** in local currency (ETB)
- Other exports: Varies by product
- Banks execute allocation, NBE monitors compliance
- Retention must be repatriated within 180 days

#### Code Reference
- Frontend: `ui/src/components/portals/BanksPortal.tsx`
- API: `api/src/routes/forex.ts` → POST `/forex/allocate`
- Chaincode: `chaincodes/coffee/banking.go` → `AllocateForex()`

---

## Stage 5: Shipment Creation & Quality Inspection

### 5.1 Shipment Creation

**Actor:** Exporter  
**Portal:** Exporter Portal  
**Prerequisites:** Contract approved, LC issued, Forex allocated

#### Process
1. Exporter sources coffee from suppliers
2. Coffee is processed and prepared for export
3. Exporter creates shipment record in system
4. System validates contract, LC, and forex are ready
5. System links shipment to LC (updates LC status to `SHIPPED`)
6. Shipment status set to `CREATED`

#### API Endpoints
```javascript
// POST /api/v1/shipments
{
  "shipmentID": "SHIP-20260217-001",
  "contractID": "CONTRACT-20260217-001",
  "exporterID": "EXP4342570",
  "buyerID": "BUYER-USA-001",
  "origin": "Yirgacheffe, Ethiopia",
  "quantity": 20000,  // kg
  "grade": "Grade 1",
  "icoNumber": "ET-0000-00001",  // ICO traceability number
  "ecxLotNumber": "ECX-2026-00001-12345",  // If ECX channel
  "channel": "ECX",  // ECX, Union, Direct Export
  "forexRate": 115.5,
  "valueUSD": 170000,
  "eudrCompliant": true,
  "documents": []  // Quality docs added later
}
```

#### Shipment Channels
- **ECX** (Ethiopia Commodity Exchange): Requires ECX lot number
- **Union/Cooperative**: Requires union approval reference
- **Direct Export**: Requires bond reference

#### Validation Rules
✅ Contract must be `APPROVED`  
✅ LC must be `ISSUED`  
✅ Forex must be `ALLOCATED`  
✅ Quantity ≤ contract quantity  
✅ Grade must be specified  
✅ ICO number required for traceability

#### Code Reference
- Frontend: `ui/src/components/portals/ExporterPortal.tsx`
- API: `api/src/routes/shipments.ts` → POST `/shipments`
- Chaincode: `chaincodes/coffee/main.go` → `CreateShipment()`

---

### 5.2 Quality Inspection (ECTA)

**Actor:** ECTA Quality Inspector  
**Portal:** ECTA Portal  
**Status Transition:** `CREATED` → `QUALITY_APPROVED`

#### Process
1. ECTA schedules quality inspection
2. Inspector takes coffee samples
3. Performs sensory evaluation (cupping)
4. Performs laboratory tests
5. Records inspection results in system
6. Approves or rejects shipment quality
7. Issues export permit if approved

#### API Endpoints
```javascript
// POST /api/v1/quality/inspections
{
  "inspectionID": "INSP-20260217-001",
  "shipmentID": "SHIP-20260217-001",
  "contractID": "CONTRACT-20260217-001",
  "exporterID": "EXP4342570",
  "scheduledDate": "2026-02-20"
}

// POST /api/v1/quality/inspections/:inspectionID/perform
{
  "inspectorID": "ECTA-QC-001",
  "inspectorName": "ECTA Quality Lab",
  "sampleSize": 100,
  "moistureContent": 11.2,  // % (must be ≤ 12.5%)
  "defectCount": 3,
  "beanSize": "15+",
  "color": "Green",
  "odor": "Clean",
  // Cupping scores (0-10 scale)
  "fragrance": 8,
  "flavor": 8,
  "aftertaste": 8,
  "acidity": 8,
  "body": 8,
  "balance": 8,
  "uniformity": 10,
  "cleanCup": 10,
  "sweetness": 10,
  "overall": 87,  // Total cupping score (max 100)
  "classification": "WASHED",
  "remarks": "Quality inspection passed"
}

// POST /api/v1/quality/inspections/:inspectionID/approve
{
  "approvedBy": "ECTA Quality Lab",
  "certificateNo": "QC-20260217-001"
}

// POST /api/v1/quality/inspections/:inspectionID/issue-permit
{
  "exportPermitNo": "EP-20260217-001",
  "issuedBy": "ECTA Quality Lab"
}
```

#### Quality Standards
**Moisture Content**: ≤ 12.5%  
**Defects**: Grade 1 (0-3), Grade 2 (4-12), Grade 3 (13-25)  
**Cupping Score**: Specialty (80+), Premium (75-79), Commercial (<75)  
**Bean Size**: Screen 14+, 15+, 16+, 17+  
**Classification**: Washed, Natural, Honey

#### Documents Generated
- **Quality Certificate**: Official ECTA quality report
- **Cupping Report**: Sensory evaluation results
- **Export Permit**: Authorization to export

#### Code Reference
- Frontend: `ui/src/components/portals/ECTAPortal.tsx`
- API: `api/src/routes/quality.ts`
- Chaincode: `chaincodes/coffee/quality.go`

---

## Stage 6: Customs Declaration & Clearance

### 6.1 Customs Declaration Submission

**Actor:** Exporter  
**Portal:** Exporter Portal  
**Prerequisites:** Quality inspection passed, export permit issued

#### Process
1. Exporter prepares customs declaration
2. Submits declaration with supporting documents
3. System validates declaration completeness
4. Customs receives notification
5. Declaration status set to `SUBMITTED`

#### API Endpoints
```javascript
// POST /api/v1/customs/declaration/submit
{
  "declarationID": "DECL-20260217-001",
  "shipmentID": "SHIP-20260217-001",
  "exporterID": "EXP4342570",
  "hsCode": "0901.11",  // HS code for coffee
  "description": "Coffee, not roasted, not decaffeinated",
  "quantity": 20000,  // kg
  "value": 170000,  // USD
  "currency": "USD",
  "destinationCountry": "USA",
  "portOfExit": "Djibouti Port",
  "transportMode": "SEA"
}
```

#### Required Documents
- Commercial Invoice
- Packing List
- Bill of Lading (B/L) or Air Waybill (AWB)
- Certificate of Origin
- Quality Certificate
- Phytosanitary Certificate
- Export Permit
- Insurance Certificate

#### HS Code Classification
- **0901.11**: Coffee, not roasted, not decaffeinated, Arabica
- **0901.12**: Coffee, not roasted, not decaffeinated, Other
- **0901.21**: Coffee, roasted, not decaffeinated
- **0901.22**: Coffee, roasted, decaffeinated

#### Code Reference
- Frontend: `ui/src/components/portals/ExporterPortal.tsx`
- API: `api/src/routes/customs.ts` → POST `/customs/declaration/submit`
- Chaincode: `chaincodes/coffee/customs.go` → `SubmitDeclaration()`

---

### 6.2 Customs Review & Inspection

**Actor:** Customs Officer  
**Portal:** Customs Portal  
**Status Transition:** `SUBMITTED` → `UNDER_REVIEW` → `INSPECTED`

#### Review Process
1. Customs officer reviews declaration
2. Verifies document completeness
3. Schedules physical inspection
4. Updates status to `UNDER_REVIEW`

```javascript
// POST /api/v1/customs/declaration/:declarationID/review
{
  "inspectorNotes": "Physical inspection scheduled",
  "inspectionType": "STANDARD"  // STANDARD, DETAILED, RANDOM
}
```

#### Inspection Process
1. Physical inspection of coffee shipment
2. Verification of quantity and quality
3. EUDR compliance check (for EU destinations)
4. Container seal verification
5. Document authenticity verification
6. Records inspection results

```javascript
// POST /api/v1/customs/declaration/:declarationID/complete-inspection
{
  "inspectionResult": "PASSED",  // PASSED, FAILED, CONDITIONAL
  "inspectorComments": "All requirements met - quality verified",
  "eudrVerified": true,
  "sealNumber": "SEAL-2026-001"
}
```

#### EUDR Compliance (EU Destinations)
Per EU Deforestation Regulation (EUDR):
✅ Geo-location data of coffee origin  
✅ Due diligence documentation  
✅ Deforestation-free declaration  
✅ Traceability to farm level  
✅ Supply chain documentation

#### Code Reference
- Frontend: `ui/src/components/portals/CustomsPortal.tsx`
- API: `api/src/routes/customs.ts`
- Chaincode: `chaincodes/coffee/customs.go`

---

### 6.3 Customs Clearance

**Actor:** Customs Officer  
**Portal:** Customs Portal  
**Status Transition:** `INSPECTED` → `CLEARED`

#### Process
1. Customs officer reviews inspection results
2. Calculates duties and taxes
3. Verifies payment of duties
4. Issues clearance certificate
5. Updates declaration status to `CLEARED`
6. Coffee authorized for export

#### API Endpoints
```javascript
// POST /api/v1/customs/declaration/:declarationID/clear
{
  "clearanceNumber": "CLR-20260217-001",
  "dutiesAmount": "5000",  // ETB
  "taxesAmount": "2000",   // ETB
  "clearanceOfficer": "Marta Tesfaye",
  "remarks": "Cleared for export - all requirements met"
}
```

#### Duties & Taxes Calculation
- **Export Duty**: Varies by product (coffee typically 0-2%)
- **VAT**: Exempt for exports
- **Service Charges**: Administrative fees
- **EUDR Compliance Fee**: If applicable

#### Documents Issued
- **Customs Clearance Certificate**: Official clearance
- **Export Declaration**: Stamped and approved
- **Release Order**: Authorization to load for export

#### Code Reference
- Frontend: `ui/src/components/portals/CustomsPortal.tsx`
- API: `api/src/routes/customs.ts` → POST `/customs/declaration/:declarationID/clear`
- Chaincode: `chaincodes/coffee/customs.go` → `ClearDeclaration()`

---

## Stage 7: SWIFT Payment Processing

### 7.1 SWIFT Message Types

The system supports multiple SWIFT message types for comprehensive payment processing:

| Message Type | Purpose | Sender | Receiver |
|--------------|---------|--------|----------|
| **MT700** | Issue of Documentary Credit | Issuing Bank (Buyer) | Advising Bank (Exporter) |
| **MT710** | Advice of Third Bank's DC | Advising Bank | Exporter |
| **MT103** | Single Customer Credit Transfer | Any Bank | Any Bank |
| **MT730** | Acknowledgement | Advising Bank | Issuing Bank |
| **MT750** | Discrepancy Notice | Bank | Exporter |
| **MT910** | Confirmation of Credit | Bank | Bank |

---

### 7.2 MT700 - LC Issuance

**Actor:** Bank Officer (Issuing Bank)  
**Portal:** Banks Portal

#### Process
1. Bank creates MT700 message for LC issuance
2. Includes all LC terms and conditions
3. Sends to advising bank (exporter's bank)
4. System records SWIFT message on blockchain

#### API Endpoints
```javascript
// POST /api/v1/swift/messages
{
  "messageID": "MT700_1708185600",
  "messageType": "MT700",
  "swiftReference": "DC20260217001",
  "senderBIC": "CHASUS33",  // JPMorgan Chase (Issuing Bank)
  "receiverBIC": "CBETETAA",  // CBE (Advising Bank)
  "amount": 170000,
  "currency": "USD",
  "linkedLcId": "LC-20260217-001",
  "lcNumber": "LC-CONTRACT-001",
  "applicant": "ABC Coffee Importers Inc",
  "beneficiary": "EXP4342570",
  "loadingPort": "Djibouti Port",
  "dischargePort": "New York Port, USA",
  "latestShipDate": "2026-04-15",
  "lcExpiryDate": "2026-05-17",
  "documents": [
    "Commercial Invoice (3 originals)",
    "Full Set Clean On Board Bill of Lading",
    "Certificate of Origin (Form A)",
    "Quality Certificate from ECTA",
    "Phytosanitary Certificate",
    "Packing List"
  ]
}
```

#### MT700 Key Fields
- **40A**: Form of Documentary Credit (IRREVOCABLE)
- **20**: Documentary Credit Number
- **31C**: Date of Issue
- **31D**: Date and Place of Expiry
- **50**: Applicant (Buyer)
- **59**: Beneficiary (Exporter)
- **32B**: Currency Code, Amount
- **41A**: Available With... By... (Payment terms)
- **44A**: Loading on Board / Dispatch
- **44B**: For Transportation to...
- **44C**: Latest Date of Shipment
- **46A**: Documents Required
- **47A**: Additional Conditions

#### Code Reference
- Frontend: `ui/src/components/portals/BanksPortal.tsx`
- API: `api/src/routes/swift.ts` → POST `/swift/messages`
- Chaincode: `chaincodes/coffee/payment.go` → `CreateSWIFTMessage()`

---

### 7.3 Document Examination & Payment Release

**Actor:** Bank Officer (Advising Bank)  
**Portal:** Banks Portal - Document Examination Tab

#### Process
1. Exporter submits shipping documents to bank
2. Bank examines documents against LC terms (UCP 600 Article 14)
3. Checks for discrepancies
4. If compliant: Releases payment
5. If discrepant: Issues MT750 discrepancy notice

#### API Endpoints
```javascript
// POST /api/v1/banking/payment/:paymentID/submit-documents
{
  "documents": [
    {
      "type": "COMMERCIAL_INVOICE",
      "documentId": "DOC-INV-001",
      "issueDate": "2026-02-20"
    },
    {
      "type": "BILL_OF_LADING",
      "documentId": "DOC-BL-001",
      "issueDate": "2026-02-21",
      "onBoardDate": "2026-02-21"
    }
  ]
}

// POST /api/v1/banking/payment/:paymentID/verify-documents
{
  "verifiedBy": "Document Examiner - Sarah Ahmed",
  "compliant": true,
  "comments": "All documents comply with LC terms"
}
```

#### Document Examination Checklist (UCP 600)
✅ Documents presented within LC validity  
✅ Invoice amount ≤ LC amount  
✅ Description of goods matches LC  
✅ Bill of Lading clean (no adverse remarks)  
✅ B/L shows "on board" notation  
✅ Shipment date ≤ latest shipment date  
✅ All required documents present  
✅ Documents consistent with each other  
✅ Proper endorsements and signatures

#### Discrepancy Handling
If discrepancies found:
1. Bank issues MT750 Discrepancy Notice
2. Exporter has option to:
   - Accept discrepancies (payment deduction)
   - Correct and resubmit documents
   - Request buyer waiver
3. Bank holds payment until resolution

#### Payment Release
Once documents verified:
1. Bank releases payment to exporter
2. Creates MT103 credit transfer
3. Updates payment status to `RELEASED`
4. Forex utilization recorded

#### Code Reference
- Frontend: `ui/src/components/portals/BanksPortal.tsx` → Document Examination Tab
- API: `api/src/routes/banking.ts` → POST `/banking/payment/:paymentID/verify-documents`
- Chaincode: `chaincodes/coffee/payment.go`

---

## Stage 8: Payment Settlement & Forex Utilization

### 8.1 Payment Initiation

**Actor:** Bank Officer  
**Portal:** Banks Portal - Payment Release Tab  
**Prerequisites:** Documents verified, LC compliant

#### Process
1. Bank officer initiates payment to exporter
2. System calculates forex conversion
3. Applies NBE retention (50%)
4. Creates payment record
5. Generates MT103 SWIFT message

#### API Endpoints
```javascript
// POST /api/v1/banking/payment/initiate
{
  "paymentID": "PAY-20260217-001",
  "contractID": "CONTRACT-20260217-001",
  "lcID": "LC-20260217-001",
  "forexID": "FOREX_LC-20260217-001_1708185600",
  "exporterID": "EXP4342570",
  "amount": "170000",
  "currency": "USD",
  "exchangeRate": "115.50",
  "retentionRate": "50",
  "receivingBank": "Commercial Bank of Ethiopia",
  "receivingBankBIC": "CBETETAA",
  "beneficiaryName": "Ethiopian Coffee Masters Ltd",
  "beneficiaryAccount": "1234567890",
  "swiftInstructions": "Payment for coffee export"
}
```

#### Payment Calculation
```
Total Payment (USD): $170,000
Exchange Rate: 115.50 ETB/USD
Total ETB Value: 19,635,000 ETB

NBE Retention (50%): 9,817,500 ETB
Available to Exporter (50%): 9,817,500 ETB

USD Equivalent to Exporter: $85,000
Retained in Ethiopia: $85,000 equivalent (9,817,500 ETB)
```

#### Code Reference
- Frontend: `ui/src/components/portals/BanksPortal.tsx` → Payment Release Tab
- API: `api/src/routes/payments.ts` → POST `/banking/payment/initiate`
- Chaincode: `chaincodes/coffee/payment.go` → `InitiatePayment()`

---

### 8.2 Forex Utilization

**Actor:** System (Automatic) / Bank Officer  
**Status Transition:** Forex `ALLOCATED` → `UTILIZED`

#### Process
1. Payment released to exporter
2. System marks forex as utilized
3. Records utilization amount and date
4. Updates retention compliance status
5. Generates forex utilization report for NBE

#### API Endpoints
```javascript
// POST /api/v1/forex/utilize
{
  "forexId": "FOREX_LC-20260217-001_1708185600",
  "utilizedAmount": "170000",
  "utilizationDate": "2026-02-25",
  "paymentReference": "PAY-20260217-001"
}
```

#### Forex Utilization Record
- **Total Allocated**: $170,000 USD
- **Utilized**: $170,000 USD
- **Retention Applied**: 50% (9,817,500 ETB)
- **Released to Exporter**: 9,817,500 ETB
- **NBE Compliance**: ✅ Compliant

#### NBE Reporting
System generates reports for NBE monitoring:
- Daily forex utilization summary
- Retention compliance report
- Exporter-wise forex usage
- Payment method breakdown
- Outstanding forex allocations

#### Code Reference
- API: `api/src/routes/forex.ts` → POST `/forex/utilize`
- Chaincode: `chaincodes/coffee/banking.go` → `UtilizeForex()`

---

### 8.3 Payment Settlement Complete

**Final Status**: Export journey complete ✅

#### Journey Summary
1. ✅ Exporter registered and approved
2. ✅ Contract registered and approved by ECTA
3. ✅ LC requested, approved, and issued
4. ✅ Forex allocated per NBE policy
5. ✅ Shipment created and quality inspected
6. ✅ Customs cleared for export
7. ✅ Documents submitted and verified
8. ✅ Payment released to exporter
9. ✅ Forex utilized with retention compliance

#### Completion Metrics
- **Total Duration**: 60-90 days (typical)
- **Blockchain Transactions**: 15-20 transactions
- **Organizations Involved**: 5 (Exporter, ECTA, Bank, Customs, NBE)
- **Documents Generated**: 20+ documents
- **Audit Trail Entries**: 30-50 entries
- **Payment Value**: $170,000 (example)
- **Retention Compliance**: 50% NBE policy

---

## Payment Methods

The system supports multiple payment methods beyond Letter of Credit:

### Payment Method Comparison

| Method | Risk Level | Timeline | Documentation | Use Case |
|--------|-----------|----------|---------------|----------|
| **LC (Letter of Credit)** | Low | 60-90 days | Heavy | Standard exports, new buyers |
| **CAD (Cash Against Documents)** | Medium | 45-60 days | Medium | Established relationships |
| **TT Advance** | Low (for exporter) | 30-45 days | Light | Pre-payment by buyer |
| **TT Post-Shipment** | High (for exporter) | 60-90 days | Light | Trusted buyers only |
| **Advance Payment** | Low (for exporter) | 30-45 days | Light | Small orders, new products |
| **Consignment** | High (for exporter) | 90-180 days | Medium | Market testing, agents |

---

### LC (Letter of Credit) - Default Method

**Process**: Already detailed in Stage 3  
**Risk**: Bank guarantee protects both parties  
**Timeline**: 60-90 days  
**Best For**: Standard exports, international trade

---

### CAD (Cash Against Documents) / Documentary Collection

**Process**:
1. Exporter ships goods
2. Submits documents to remitting bank
3. Bank forwards documents to collecting bank
4. Buyer pays upon document presentation
5. Documents released to buyer
6. Payment transferred to exporter

**API Endpoint**:
```javascript
// POST /api/v1/banking/cad/create
{
  "cadID": "CAD-20260217-001",
  "contractID": "CONTRACT-20260217-001",
  "drawerName": "Ethiopian Coffee Masters Ltd",
  "draweeName": "ABC Coffee Importers Inc",
  "paymentTerm": "SIGHT",  // SIGHT, 30_DAYS, 60_DAYS, 90_DAYS
  "collectingBank": "JPMorgan Chase",
  "remittingBank": "Commercial Bank of Ethiopia"
}
```

**Risk**: No bank payment guarantee, buyer may refuse documents  
**Timeline**: 45-60 days  
**Best For**: Established business relationships

---

### TT Advance (Telegraphic Transfer - Pre-Payment)

**Process**:
1. Buyer transfers payment in advance
2. Exporter receives confirmation
3. Exporter ships goods
4. Documents sent directly to buyer

**API Endpoint**:
```javascript
// POST /api/v1/banking/payment/initiate
{
  "paymentMethod": "TT_ADVANCE",
  "creditAdviceNumber": "CA-20260217-001",
  "swiftReference": "TT20260217001"
}
```

**Risk**: Low risk for exporter (payment received first)  
**Timeline**: 30-45 days  
**Best For**: Small orders, trusted buyers, first-time exports

---

## Document Requirements

### By Stage

#### Application Stage
- Business Registration Certificate
- TIN Certificate
- Bank Reference Letter
- Laboratory Certification
- Professional Taster Certificate

#### Contract Stage
- Signed Sales Contract
- Proforma Invoice
- Sample Quality Report

#### Shipment Stage
- Quality Certificate (ECTA)
- Cupping Report
- Export Permit
- Phytosanitary Certificate
- Certificate of Origin

#### Customs Stage
- Commercial Invoice
- Packing List
- Bill of Lading / Air Waybill
- Insurance Certificate
- All shipment documents

#### Payment Stage
- All above documents
- Inspection Certificate
- Weight Certificate
- Analysis Certificate (if required)

---

### Document Validation

System validates documents at each stage:

```javascript
// Document requirements per stage
STAGE_REQUIREMENTS = {
  application: ['BUSINESS_REG', 'TIN_CERT', 'BANK_REF'],
  contract: ['CONTRACT_SIGNED', 'PROFORMA_INVOICE'],
  shipment: ['QUALITY_CERT', 'CUPPING_REPORT', 'EXPORT_PERMIT'],
  customs: ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING'],
  payment: ['ALL_SHIPPING_DOCS', 'INSPECTION_CERT']
}
```

**Code Reference**: `api/src/utils/documentValidation.ts`

---

## Audit Trail Tracking

### What is Tracked

Every action in the system creates an audit trail entry:

```javascript
{
  "entity_type": "CONTRACT",  // EXPORTER, CONTRACT, LC, FOREX, SHIPMENT, PAYMENT
  "entity_id": "CONTRACT-20260217-001",
  "action": "APPROVE",  // CREATE, UPDATE, APPROVE, REJECT, SUBMIT, VERIFY
  "performed_by": "cn=ecta_admin,ou=ECTA,o=consortium",  // X.509 certificate
  "performed_by_org": "ECTAMSP",  // Organization MSP ID
  "old_value": "REGISTERED",
  "new_value": "APPROVED",
  "reason": "Contract meets all ECTA requirements",
  "metadata": {
    "ectaReference": "ECTA-2026-00001",
    "blockchainTxId": "abc123def456",
    "timestamp": "2026-02-17T10:30:00Z"
  },
  "ip_address": "192.168.1.100",
  "created_at": "2026-02-17T10:30:00Z"
}
```

### Audit Trail Queries

```javascript
// GET /api/v1/audit/entity/:entityType/:entityId
// Returns all audit entries for specific entity

// GET /api/v1/audit/portal/recent?limit=1000
// Returns recent activities for current user's organization

// GET /api/v1/audit/user/:userId
// Returns all activities performed by specific user
```

### Blockchain Verification

Each audit entry links to blockchain transaction:
- **Transaction ID**: Hyperledger Fabric transaction hash
- **Block Number**: Block containing the transaction
- **Timestamp**: Blockchain timestamp (immutable)
- **Endorsements**: Peer signatures
- **MSP ID**: Organization that endorsed

**Code Reference**:
- API: `api/src/routes/audit.ts`
- Frontend: `ui/src/components/portals/AuditTrailViewer.tsx`
- Database: `audit_trail` table

---

## API Reference

### Base URL
```
Development: http://localhost:3001/api/v1
Production: https://cecbs.gov.et/api/v1
```

### Authentication
All API endpoints require JWT authentication:

```javascript
headers: {
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json'
}
```

### Common Response Format

Success:
```javascript
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-02-17T10:30:00Z"
}
```

Error:
```javascript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": ["Field X is required"]
  },
  "timestamp": "2026-02-17T10:30:00Z"
}
```

### Key Endpoints Summary

**Exporters**:
- `POST /exporters/apply` - Submit application
- `POST /exporters/applications/:id/approve` - Approve application
- `GET /exporters/:id` - Get exporter details

**Contracts**:
- `POST /contracts` - Register contract
- `POST /contracts/:id/approve` - Approve contract (ECTA)
- `GET /contracts` - List all contracts
- `GET /contracts/:id` - Get contract details

**Banking**:
- `POST /banking/lc/request` - Request LC
- `POST /banking/lc/:id/approve` - Approve LC
- `POST /banking/lc/:id/issue` - Issue LC
- `GET /banking/lc` - List all LCs

**Forex**:
- `POST /forex/request` - Request forex
- `POST /forex/allocate` - Allocate forex (Bank)
- `POST /forex/utilize` - Utilize forex
- `GET /forex` - List all forex allocations

**Shipments**:
- `POST /shipments` - Create shipment
- `GET /shipments/:id` - Get shipment details
- `PUT /shipments/:id/status` - Update shipment status

**Customs**:
- `POST /customs/declaration/submit` - Submit declaration
- `POST /customs/declaration/:id/review` - Review declaration
- `POST /customs/declaration/:id/clear` - Clear declaration

**Payments**:
- `POST /banking/payment/initiate` - Initiate payment
- `POST /banking/payment/:id/submit-documents` - Submit documents
- `POST /banking/payment/:id/verify-documents` - Verify documents

**SWIFT**:
- `POST /swift/messages` - Create SWIFT message
- `GET /swift/messages` - List SWIFT messages
- `GET /swift/statistics` - Get SWIFT statistics

**Audit**:
- `GET /audit/entity/:type/:id` - Get entity audit trail
- `GET /audit/portal/recent` - Get recent activities
- `GET /audit/user/:userId` - Get user activities

---

## Troubleshooting

### Common Issues

#### 1. Applicant Cannot Login After Registration

**Symptom**: 401 Unauthorized error  
**Cause**: Account created with `inactive` status  
**Solution**: 
- Applicants with `inactive` status are redirected to `/application-status`
- They cannot access exporter portal until ECTA approves application
- After approval, status changes to `active` and full portal access granted

---

#### 2. Contract Approval Blocked - Missing Documents

**Symptom**: "Cannot approve contract: Required documents are missing"  
**Cause**: CONTRACT_SIGNED document not uploaded or not verified  
**Solution**:
1. Upload signed contract document
2. ECTA verifies document
3. Try approval again

---

#### 3. LC Issuance Fails - Peer Endorsement Mismatch

**Symptom**: "Peer endorsements do not match"  
**Cause**: Blockchain peers not synchronized  
**Solution**:
- Wait 5-10 seconds for peer synchronization
- Retry operation
- System has built-in retry logic (5 attempts with exponential backoff)

---

#### 4. Forex Allocation Fails - Forex Request Not Found

**Symptom**: "Forex request does not exist"  
**Cause**: Forex request not yet propagated to all peers  
**Solution**:
- Ensure forex request was created successfully
- Wait 10 seconds for blockchain synchronization
- System auto-retries with increasing wait times

---

#### 5. Document Upload Fails

**Symptom**: Upload fails or document not found  
**Cause**: File size exceeds limit or incorrect entity type  
**Solution**:
- Maximum file size: 10MB
- Supported formats: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX
- Ensure entity ID matches parent record

---

#### 6. Payment Settlement Delayed

**Symptom**: Payment not released after document verification  
**Cause**: Document discrepancies or LC terms not met  
**Solution**:
1. Review discrepancy notice (MT750)
2. Correct documents or request buyer waiver
3. Resubmit documents for verification

---

### System Health Checks

```bash
# Check API health
curl http://localhost:3001/health

# Check Fabric peer status
docker ps | grep peer

# Check chaincode status
peer lifecycle chaincode queryinstalled

# Check database connection
psql -h localhost -U cecbs_user -d cecbs_db -c "SELECT 1;"
```

---

## Summary

This complete workflow guide covers the entire Ethiopian coffee export journey from applicant registration through payment settlement. The system ensures:

✅ **Regulatory Compliance**: ECTA, NBE, Customs requirements  
✅ **Transparency**: Full audit trail on blockchain  
✅ **Security**: Cryptographic signatures and verification  
✅ **Efficiency**: Automated workflows and validations  
✅ **Traceability**: End-to-end tracking from farm to payment

### Key Metrics
- **Average Export Cycle**: 60-90 days
- **Blockchain Transactions**: 15-20 per export
- **Organizations Involved**: 5 (Exporter, ECTA, Bank, Customs, NBE)
- **Documents Generated**: 20+ per export
- **Audit Entries**: 30-50 per export
- **NBE Retention**: 50% forex retention policy

### Next Steps
1. Review specific portal guides for your role
2. Test workflow in development environment
3. Complete user training for your organization
4. Follow production deployment checklist
5. Monitor system using audit trail dashboards

---

**Document Control**  
**Version**: 2.0  
**Last Updated**: February 17, 2026  
**Maintained By**: CECBS Technical Team  
**Contact**: support@cecbs.gov.et  

---
