# Workflow API Endpoint Reference

Complete reference for all endpoints used in the E2E workflow testing.

---

## 1. Exporter Registration (Application Submission)

**Endpoint**: `POST /api/v1/exporters/exporter-applications`

**Authentication**: ❌ PUBLIC (no authentication required)

**Description**: Submits a new exporter application and creates a temporary user account with login credentials.

**Required Fields**:
```json
{
  "companyName": "string",
  "tinNumber": "string",
  "businessLicenseNumber": "string",
  "capitalRequirement": "string",
  "professionalTaster": "string",  // "yes" or "no"
  "contactPerson": "string",
  "email": "string",  // valid email
  "phone": "string",
  "address": "string",
  "city": "string"
}
```

**Optional Fields**:
```json
{
  "tasterCertificate": "string",
  "region": "string",
  "bankName": "string",
  "bankAccountNumber": "string",  // max 13 digits
  "bankBranchName": "string",
  "bankBranchCode": "string",
  "exporterType": "private|company|individual",
  "laboratoryFacility": "string",
  "laboratoryCertificateNumber": "string",
  "registrationDate": "YYYY-MM-DD",
  "comments": "string",
  "documents": []
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "applicationId": "APP-XXXXXX",
    "tempUsername": "TEMP-XXXXXX",
    "tempPassword": "string",
    "message": "Application submitted successfully"
  }
}
```

---

## 2. Application Approval (ECTA Admin)

**Endpoint**: `POST /api/v1/exporters/exporter-applications/:applicationId/approve`

**Authentication**: ✅ Required (ECTA admin)

**Required Fields**:
```json
{
  "approvedBy": "string",  // admin username
  "licenseNumber": "string",  // ECTA license number
  "licenseExpiryDate": "YYYY-MM-DD"
}
```

**Optional Fields**:
```json
{
  "comments": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "exporterId": "string",  // assigned exporter ID
    "licenseNumber": "string",
    "message": "Application approved successfully"
  }
}
```

---

## 3. Contract Registration

**Endpoint**: `POST /api/v1/contracts`

**Authentication**: ✅ Required

**Field Name Convention**: **PascalCase** (contractID, exporterID, buyerID)

**Required Fields**:
```json
{
  "contractID": "string",
  "exporterID": "string",
  "buyerID": "string",
  "buyerCountry": "string",
  "buyerBank": "string",  // issuing bank
  "exporterBank": "string",  // advising bank
  "coffeeType": "string",
  "quantity": number,
  "pricePerKg": number,  // minimum 5.0 USD
  "currency": "string",
  "eudrRequired": boolean
}
```

**Optional Fields**:
```json
{
  "paymentMethod": "LC|CAD|TT_ADVANCE|TT_POST|ADVANCE",
  "supersedesContractID": "string",  // if amending existing contract
  "organicCertified": boolean,
  "fairTradeCertified": boolean,
  "portOfLoading": "string",
  "portOfDestination": "string",
  "deliveryDate": "string",
  "incoterm": "string",
  "specialInstructions": "string",
  "documents": []
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "contractId": "string",
    "message": "Contract registered successfully"
  }
}
```

---

## 4. Quality Inspection Request

**Endpoint**: `POST /api/v1/quality/inspections`

**Authentication**: ✅ Required

**Field Name Convention**: **PascalCase** (inspectionID, exporterID, shipmentID)

**Required Fields**:
```json
{
  "inspectionID": "string",
  "exporterID": "string",
  "shipmentID": "string"  // ⚠️ Requires shipment record to exist first
}
```

**Optional Fields**:
```json
{
  "contractID": "string",
  "coffeeType": "string",
  "quantity": number,
  "requestedDate": "YYYY-MM-DD",
  "inspectionType": "PRE_SHIPMENT|POST_SHIPMENT",
  "sampleLocation": "string",
  "requestedBy": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "inspectionId": "string",
    "status": "PENDING",
    "message": "Inspection requested successfully"
  }
}
```

**⚠️ Important**: This endpoint requires a shipmentID, which suggests the correct workflow order is:
1. Contract Registration
2. **Shipment Record Creation** (not actual shipping, just record)
3. Quality Inspection
4. Customs Clearance
5. Actual Shipping

---

## 5. Letter of Credit (LC) Issuance

**Endpoint**: ❓ **NEEDS INVESTIGATION**

**Possible Endpoints**:
- `/api/v1/banking/lc` - **NOT FOUND** (404 error)
- `/api/v1/forex/lc` - **TO BE VERIFIED**
- `/api/v1/lc` - **TO BE VERIFIED**

**Status**: ❌ Endpoint not confirmed. The `/api/v1/banking/lc` route returns 404.

**Action Needed**: 
1. Check `/api/v1/banking` route for actual LC endpoints
2. Check `/api/v1/forex` route for LC management
3. Check `/api/v1/lc` LC amendments route for LC creation

**Expected Fields** (based on test script):
```json
{
  "lcNumber": "string",
  "contractId": "string",
  "exporterId": "string",
  "issuingBank": "string",
  "advisingBank": "string",
  "beneficiary": "string",
  "applicant": "string",
  "amount": number,
  "currency": "string",
  "issueDate": "YYYY-MM-DD",
  "expiryDate": "YYYY-MM-DD",
  "paymentTerms": "string",
  "latestShipmentDate": "YYYY-MM-DD",
  "portOfLoading": "string",
  "portOfDischarge": "string",
  "partialShipment": boolean,
  "transhipment": boolean
}
```

---

## 6. Forex Allocation Request (NBE)

**Endpoint**: `POST /api/v1/forex/request`

**Authentication**: ✅ Required

**Required Fields**:
```json
{
  "forexId": "string",
  "contractId": "string",  // contract must exist on blockchain
  "exporterId": "string",
  "amount": number,
  "currency": "string",
  "requestedBy": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "forexId": "string",
    "status": "PENDING",
    "message": "Forex allocation requested"
  }
}
```

**⚠️ Important**: This endpoint requires the contract to exist on the blockchain first. If contract creation fails, forex allocation will fail with:
```
"message": "RequestForex: contract CONT-XXXXX does not exist"
```

---

## 7. Customs Declaration

**Endpoint**: `POST /api/v1/customs/declarations`

**Authentication**: ✅ Required

**Status**: ❌ Returns 404 - **NEEDS INVESTIGATION**

**Expected Fields** (based on test script):
```json
{
  "declarationId": "string",
  "contractId": "string",
  "exporterId": "string",
  "commodityType": "string",
  "hsCode": "string",
  "quantity": number,
  "value": number,
  "currency": "string",
  "destinationCountry": "string",
  "portOfExit": "string",
  "transportMode": "string",
  "containerNumber": "string",
  "declarationType": "EXPORT"
}
```

**Action Needed**: Check `/api/v1/customs` route to find actual customs declaration endpoint.

---

## 8. Shipment Creation

**Endpoint**: `POST /api/v1/shipments`

**Authentication**: ✅ Required

**Field Name Convention**: **PascalCase** (shipmentID, contractID, exporterID, buyerID)

**Required Fields**:
```json
{
  "shipmentID": "string",
  "contractID": "string",
  "exporterID": "string",
  "buyerID": "string",
  "grade": "string",  // coffee grade
  "icoNumber": "string",  // ICO certificate number
  "channel": "string",  // shipping channel
  "forexRate": number,
  "valueUSD": number,
  "eudrCompliant": boolean
}
```

**Optional Fields** (based on test script):
```json
{
  "origin": "string",
  "destination": "string",
  "transportMode": "SEA|AIR|LAND",
  "carrier": "string",
  "vesselName": "string",
  "containerNumber": "string",
  "billOfLading": "string",
  "departureDate": "YYYY-MM-DD",
  "estimatedArrival": "YYYY-MM-DD",
  "quantity": number,
  "status": "IN_TRANSIT|DELIVERED|etc"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "shipmentId": "string",
    "status": "CREATED",
    "message": "Shipment created successfully"
  }
}
```

---

## Correct Workflow Order

Based on API dependencies:

1. **Exporter Registration** - `POST /api/v1/exporters/exporter-applications` (PUBLIC)
2. **ECTA Approval** - `POST /api/v1/exporters/exporter-applications/:id/approve` (ECTA Admin)
3. **Contract Registration** - `POST /api/v1/contracts` (Exporter/ECX)
4. **Shipment Record Creation** - `POST /api/v1/shipments` (create record, not actual shipping)
5. **Quality Inspection** - `POST /api/v1/quality/inspections` (requires shipmentID)
6. **Letter of Credit Issuance** - `POST /api/v1/banking/lc` or `/forex/lc` (Bank)
7. **Forex Allocation** - `POST /api/v1/forex/request` (NBE) - requires contract on blockchain
8. **Customs Declaration** - `POST /api/v1/customs/declarations` (Customs)
9. **Actual Shipping** - Update shipment status to IN_TRANSIT

---

## Field Name Conventions Summary

| Endpoint | Convention | Examples |
|----------|------------|----------|
| Exporter Applications | camelCase | `companyName`, `tinNumber`, `contactPerson` |
| Contracts | **PascalCase** | `contractID`, `exporterID`, `buyerID` |
| Quality Inspections | **PascalCase** | `inspectionID`, `exporterID`, `shipmentID` |
| Shipments | **PascalCase** | `shipmentID`, `contractID`, `exporterID` |
| Customs | **Unknown** | Needs investigation |
| Banking/LC | **Unknown** | Needs investigation |
| Forex | camelCase | `forexId`, `contractId`, `exporterId` |

---

## Outstanding Issues

### 1. Banking/LC Endpoint
- **Problem**: `/api/v1/banking/lc` returns 404
- **Action**: Investigate actual LC endpoint location
- **Candidates**: `/banking/*`, `/forex/*`, `/lc/*`

### 2. Customs Declaration Endpoint
- **Problem**: `/api/v1/customs/declarations` returns 404
- **Action**: Check `/api/v1/customs` route for actual endpoint path

### 3. Quality Inspection Workflow Order
- **Problem**: Requires shipmentID but logically inspection happens before shipping
- **Clarification Needed**: Confirm that shipment "record" is created early, actual shipping happens later

---

## Next Steps for Testing

1. ✅ Fix application submission (user creation issue)
2. ❓ Investigate LC endpoint location
3. ❓ Investigate customs declaration endpoint
4. ✅ Update contract creation to use PascalCase fields
5. ✅ Update shipment creation to use PascalCase fields and include all required fields
6. ✅ Adjust workflow order: Contract → Shipment Record → Quality Inspection

