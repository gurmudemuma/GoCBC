# ECTA to Customs Workflow Integration

## Overview

This document describes the automated workflow integration between **ECTA (Ethiopian Coffee & Tea Authority)** and **Customs Portal**, ensuring that customs clearance can only begin after ECTA issues an export permit.

## Workflow Sequence

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ECTA WORKFLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Request Quality Inspection (PENDING)                                │
│  2. Perform Inspection (INSPECTED)                                      │
│  3. Approve Quality (APPROVED) ← Quality certificate issued             │
│  4. Issue Export Permit (PERMIT_ISSUED) ← ✅ ECTA FINAL STATUS         │
│                                                                           │
│     ⬇️  AUTOMATIC TRIGGER  ⬇️                                            │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                       CUSTOMS WORKFLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  5. Submit Customs Declaration (SUBMITTED) ← Auto-created               │
│  6. Review Declaration (UNDER_INSPECTION)                               │
│  7. Complete Inspection (UNDER_REVIEW)                                  │
│  8. Clear Declaration (CLEARED) ← ✅ CUSTOMS FINAL STATUS               │
│                                                                           │
│     ⬇️  SHIPMENT READY FOR EXPORT  ⬇️                                    │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Implementation Components

### 1. Blockchain Event Emission (quality.go)

When ECTA issues an export permit, an event is emitted on the blockchain:

```go
// IssueExportPermit function in chaincodes/coffee/quality.go
event := map[string]interface{}{
    "eventType":      "ExportPermitIssued",
    "inspectionID":   inspectionID,
    "shipmentID":     inspection.ShipmentID,
    "exporterID":     inspection.ExporterID,
    "exportPermitNo": exportPermitNo,
    "nextWorkflow":   "CUSTOMS_DECLARATION",
}
ctx.GetStub().SetEvent("ExportPermitIssued", eventJSON)
```

**Status Transition:** Shipment status changes to `PERMIT_ISSUED`

### 2. Customs Declaration Validation (customs.go)

Before accepting a customs declaration, the chaincode validates that an ECTA export permit exists:

```go
// SubmitCustomsDeclaration function in chaincodes/coffee/customs.go
// ✅ VALIDATE ECTA EXPORT PERMIT EXISTS BEFORE CUSTOMS DECLARATION
if shipment.Status != "PERMIT_ISSUED" && shipment.Status != "CUSTOMS_DECLARED" {
    return error: "ECTA export permit must be issued first"
}

// Verify quality inspection has export permit
inspections := QueryInspectionsByShipment(shipmentID)
hasPermit := false
for _, insp := range inspections {
    if insp.Status == "APPROVED" && insp.ExportPermitNo != "" {
        hasPermit = true
        break
    }
}
if !hasPermit {
    return error: "no valid ECTA export permit found"
}
```

### 3. Automatic Customs Declaration Creation (API Layer)

#### Endpoint: `POST /api/v1/customs/declaration/auto-create-from-permit`

This endpoint automatically creates a customs declaration when called after ECTA issues a permit:

**Request:**
```json
{
  "inspectionId": "INS-SHIP001",
  "shipmentId": "SHIP001",
  "exporterId": "EXP001",
  "exportPermitNo": "ECTA-2024-001234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Customs declaration auto-created from ECTA export permit",
  "declarationId": "CD-SHIP001",
  "shipmentId": "SHIP001",
  "exportPermitNo": "ECTA-2024-001234",
  "autoMapped": {
    "quantity": "5000",
    "value": "50000",
    "currency": "USD",
    "destination": "Netherlands",
    "exporterId": "EXP001",
    "eudrCompliant": true,
    "hsCode": "090111",
    "portOfExit": "Djibouti Port"
  },
  "txId": "abc123..."
}
```

**Data Auto-Mapping:**
- Fetches inspection data for quality details
- Fetches shipment data for quantity, value, EUDR compliance
- Fetches contract data for destination, currency
- Pre-fills customs declaration with validated data

### 4. Integrated API Trigger (Quality Routes)

#### Endpoint: `POST /api/v1/quality/inspections/:inspectionID/issue-permit`

When ECTA issues an export permit through this endpoint, it automatically triggers customs declaration creation:

**Request:**
```json
{
  "exportPermitNo": "ECTA-2024-001234",
  "issuedBy": "ECTA Officer Ahmed T.",
  "autoCreateCustomsDeclaration": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inspectionId": "INS-SHIP001",
    "exportPermitNo": "ECTA-2024-001234",
    "status": "PERMIT_ISSUED"
  },
  "customsDeclaration": {
    "created": true,
    "declarationId": "CD-SHIP001",
    "shipmentId": "SHIP001"
  },
  "txId": "abc123...",
  "message": "Export permit issued and customs declaration workflow initiated for shipment SHIP001"
}
```

**Workflow Steps:**
1. Issue ECTA export permit on blockchain
2. Update shipment status to `PERMIT_ISSUED`
3. Emit `ExportPermitIssued` event
4. **Automatically call** `/api/v1/customs/declaration/auto-create-from-permit`
5. Create customs declaration with auto-mapped data
6. Update shipment status to `CUSTOMS_DECLARED`

## Shipment Status Transitions

| Status | Description | Organization | Next Status |
|--------|-------------|--------------|-------------|
| `QUALITY_APPROVED` | Quality inspection approved | ECTA | `PERMIT_ISSUED` |
| `PERMIT_ISSUED` | ✅ ECTA export permit issued | ECTA | `CUSTOMS_DECLARED` |
| `CUSTOMS_DECLARED` | Customs declaration submitted | Exporter/Customs | `UNDER_INSPECTION` |
| `CUSTOMS_CLEARED` | ✅ Customs clearance granted | Customs | `READY_FOR_EXPORT` |

## Validation Rules

### ECTA Permit Issuance Requirements
- ✅ Quality inspection must be performed (`INSPECTED`)
- ✅ Quality must be approved (`APPROVED`)
- ✅ Quality grade must be 1-5 (export quality)
- ✅ Certificate number must be issued
- ✅ Only ECTA MSP can issue export permits

### Customs Declaration Requirements
- ✅ Shipment status must be `PERMIT_ISSUED` or `CUSTOMS_DECLARED`
- ✅ ECTA export permit must exist for the shipment
- ✅ Quality inspection must have `ExportPermitNo` field populated
- ✅ Inspection status must be `APPROVED`

## Error Handling

### If ECTA Permit Not Issued
```json
{
  "success": false,
  "error": {
    "message": "customs declaration cannot be submitted: shipment SHIP001 status is QUALITY_APPROVED. ECTA export permit must be issued first (status must be PERMIT_ISSUED)"
  }
}
```

### If Quality Inspection Missing Export Permit
```json
{
  "success": false,
  "error": {
    "message": "customs declaration cannot be submitted: no valid ECTA export permit found for shipment SHIP001. Quality inspection must be approved and export permit issued first"
  }
}
```

## API Integration Flow

### Manual Workflow
```bash
# Step 1: Issue ECTA Export Permit
POST /api/v1/quality/inspections/INS-SHIP001/issue-permit
{
  "exportPermitNo": "ECTA-2024-001234",
  "issuedBy": "ECTA Officer"
}

# Step 2: Manually Create Customs Declaration (optional)
POST /api/v1/customs/declaration/submit
{
  "declarationID": "CD-SHIP001",
  "shipmentID": "SHIP001",
  ...
}
```

### Automated Workflow (Recommended)
```bash
# Single API Call - Issue permit and auto-create customs declaration
POST /api/v1/quality/inspections/INS-SHIP001/issue-permit
{
  "exportPermitNo": "ECTA-2024-001234",
  "issuedBy": "ECTA Officer",
  "autoCreateCustomsDeclaration": true  # Default: true
}
```

## Testing the Integration

### End-to-End Test Script
```javascript
// tests/test-ecta-customs-integration.js
const axios = require('axios');

async function testECTACustomsIntegration() {
  const baseURL = 'http://localhost:3001/api/v1';
  
  // 1. Request quality inspection
  await axios.post(`${baseURL}/quality/inspections`, {
    inspectionID: 'INS-TEST001',
    shipmentID: 'SHIP-TEST001',
    contractID: 'CONTRACT001',
    exporterID: 'EXP001'
  });
  
  // 2. Perform inspection
  await axios.post(`${baseURL}/quality/inspections/INS-TEST001/perform`, {
    inspectorID: 'INSP-001',
    inspectorName: 'ECTA Inspector',
    sampleSize: 100,
    moistureContent: 11.2,
    defectCount: 3,
    beanSize: '17',
    color: 'Green',
    odor: 'Clean',
    classification: 'WASHED',
    fragrance: 8.5,
    flavor: 8.5,
    // ... other cupping scores
  });
  
  // 3. Approve inspection
  await axios.post(`${baseURL}/quality/inspections/INS-TEST001/approve`, {
    approvedBy: 'ECTA Officer',
    certificateNo: 'CERT-001'
  });
  
  // 4. Issue export permit (auto-creates customs declaration)
  const response = await axios.post(`${baseURL}/quality/inspections/INS-TEST001/issue-permit`, {
    exportPermitNo: 'ECTA-2024-001234',
    issuedBy: 'ECTA Officer Ahmed',
    autoCreateCustomsDeclaration: true
  });
  
  console.log('✅ ECTA Permit Issued:', response.data.data.exportPermitNo);
  console.log('✅ Customs Declaration Created:', response.data.customsDeclaration.declarationId);
  
  // 5. Verify customs declaration exists
  const customsDecl = await axios.get(`${baseURL}/customs/declaration/CD-SHIP-TEST001`);
  console.log('✅ Customs Declaration Status:', customsDecl.data.data.status);
}

testECTACustomsIntegration();
```

## Configuration

### Environment Variables
```bash
# .env
API_BASE_URL=http://localhost:3001
AUTO_CREATE_CUSTOMS_DECLARATION=true
```

### Feature Flags
To disable automatic customs declaration creation:
```javascript
// api/src/routes/quality.ts
const autoCreateCustomsDeclaration = process.env.AUTO_CREATE_CUSTOMS_DECLARATION !== 'false';
```

## Security Considerations

### MSP Access Control
- ✅ Only ECTA MSP can issue export permits
- ✅ Only Customs MSP can clear declarations
- ✅ X.509 certificate tracking for non-repudiation

### Audit Trail
Every workflow transition is logged with:
- MSP identity (organization)
- X.509 certificate (individual user)
- Timestamp (blockchain transaction time)
- Field changes (before/after values)

### Compliance
- ✅ ECTA quality standards enforcement
- ✅ NBE (National Bank of Ethiopia) compliance
- ✅ EUDR (EU Deforestation Regulation) tracking
- ✅ ICO (International Coffee Organization) standards

## Troubleshooting

### Common Issues

**Issue:** "Customs declaration cannot be submitted"
- **Cause:** ECTA export permit not issued yet
- **Solution:** Complete ECTA workflow up to `IssueExportPermit` step

**Issue:** "No valid ECTA export permit found"
- **Cause:** Quality inspection not approved or permit number missing
- **Solution:** Verify inspection status is `APPROVED` and `ExportPermitNo` field is populated

**Issue:** "Declaration already exists"
- **Cause:** Auto-create was triggered multiple times
- **Solution:** This is a safety check - the existing declaration will be used

## Support

For questions or issues related to ECTA-Customs workflow integration:
- Check blockchain events: `ExportPermitIssued`
- Review API logs: `api/logs/combined.log`
- Verify shipment status transitions
- Contact system administrators for MSP identity issues
