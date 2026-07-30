# Customs Portal - Quick Start Guide

## Overview

The Customs Portal is automatically triggered after ECTA (Ethiopian Coffee & Tea Authority) issues an export permit. This guide shows you how to work with the customs clearance workflow.

## Prerequisites

Before customs clearance can begin:
- ✅ Quality inspection must be **APPROVED** (by ECTA)
- ✅ Export permit must be **ISSUED** (by ECTA)
- ✅ Shipment status must be **PERMIT_ISSUED**

## Quick Start: Complete Customs Workflow

### Option 1: Automatic (Recommended)

When ECTA issues an export permit, customs declaration is auto-created:

```bash
# ECTA issues export permit (customs declaration auto-created)
POST /api/v1/quality/inspections/INS-SHIP001/issue-permit
Content-Type: application/json
Authorization: Bearer <token>

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
  "customsDeclaration": {
    "created": true,
    "declarationId": "CD-SHIP001",
    "shipmentId": "SHIP001"
  },
  "message": "Export permit issued and customs declaration workflow initiated"
}
```

### Option 2: Manual Customs Declaration

If you need to manually create a customs declaration:

```bash
POST /api/v1/customs/declaration/submit
Content-Type: application/json
Authorization: Bearer <token>

{
  "declarationID": "CD-SHIP001",
  "shipmentID": "SHIP001",
  "exporterID": "EXP001",
  "declarationType": "STANDARD",
  "hsCode": "090111",
  "quantity": "5000",
  "value": "50000",
  "currency": "USD",
  "destination": "Netherlands",
  "portOfExit": "Djibouti Port",
  "eudrCompliant": "true"
}
```

## Customs Workflow Steps

### Step 1: View Declaration Details

```bash
GET /api/v1/customs/declaration/CD-SHIP001
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "declarationId": "CD-SHIP001",
    "shipmentId": "SHIP001",
    "exporterId": "EXP001",
    "status": "SUBMITTED",
    "hsCode": "090111",
    "quantity": 5000,
    "totalValue": 50000,
    "currency": "USD",
    "destination": "Netherlands",
    "portOfExit": "Djibouti Port"
  }
}
```

### Step 2: Review Declaration (Start Inspection)

```bash
POST /api/v1/customs/declaration/CD-SHIP001/review
Content-Type: application/json
Authorization: Bearer <token>

{
  "inspectorNotes": "Reviewing documents and shipment details",
  "inspectionType": "DOCUMENTARY",
  "scheduledDate": "2024-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "status": "UNDER_INSPECTION",
  "message": "Inspection scheduled successfully"
}
```

### Step 3: Complete Inspection

```bash
POST /api/v1/customs/declaration/CD-SHIP001/complete-inspection
Content-Type: application/json
Authorization: Bearer <token>

{
  "inspectionResult": "PASSED",
  "inspectorComments": "All documents verified, container seal intact",
  "completedDate": "2024-01-16"
}
```

**Response:**
```json
{
  "success": true,
  "status": "UNDER_REVIEW",
  "message": "Inspection completed successfully"
}
```

### Step 4: Clear Declaration (Final Approval)

```bash
POST /api/v1/customs/declaration/CD-SHIP001/clear
Content-Type: application/json
Authorization: Bearer <token>

{
  "clearanceNumber": "CLR-2024-001234",
  "dutiesAmount": "0"
}
```

**Response:**
```json
{
  "success": true,
  "clearanceNumber": "CLR-2024-001234",
  "message": "Declaration cleared successfully"
}
```

## Alternative: Reject Declaration

If there are issues:

```bash
POST /api/v1/customs/declaration/CD-SHIP001/reject
Content-Type: application/json
Authorization: Bearer <token>

{
  "reason": "Missing phytosanitary certificate",
  "rejectedBy": "Customs Officer Alemayehu"
}
```

## Query Declarations

### Get All Declarations

```bash
GET /api/v1/customs/declarations
Authorization: Bearer <token>
```

### Get Declarations by Status

```bash
GET /api/v1/customs/declaration/status/SUBMITTED
Authorization: Bearer <token>
```

### Get Declarations by Exporter

```bash
GET /api/v1/customs/declaration/exporter/EXP001
Authorization: Bearer <token>
```

### Get Permit-Ready Inspections

View shipments with ECTA permits ready for customs:

```bash
GET /api/v1/customs/permit-ready
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "inspectionId": "INS-SHIP001",
      "shipmentId": "SHIP001",
      "exporterId": "EXP001",
      "qualityGrade": "Grade 1",
      "classification": "WASHED",
      "certificateNo": "CERT-001",
      "exportPermitNo": "ECTA-2024-001234",
      "status": "APPROVED"
    }
  ]
}
```

## Status Flow

```
PERMIT_ISSUED (ECTA)
    ↓
SUBMITTED (Customs Declaration)
    ↓
UNDER_INSPECTION (Risk Assessment)
    ↓
UNDER_REVIEW (Inspection Complete)
    ↓
CLEARED (Customs Approved) ✅
```

## Risk Assessment

The system automatically assesses risk based on:
- **Value**: High-value shipments (>$50,000) = MEDIUM/HIGH risk
- **Permits**: Missing export permit = HIGH risk
- **HS Code**: Certain codes flagged for inspection = MEDIUM risk
- **Documentation**: Incomplete docs = HIGH risk

### View Risk Rules

```bash
GET /api/v1/customs/risk-rules
Authorization: Bearer <token>
```

### Override Risk Decision

```bash
POST /api/v1/customs/declaration/CD-SHIP001/override-risk
Content-Type: application/json
Authorization: Bearer <token>

{
  "riskLevel": "LOW",
  "overrideReason": "Exporter has clean history, documents verified",
  "overriddenBy": "Customs Supervisor"
}
```

## Common Errors & Solutions

### Error: "Customs declaration cannot be submitted"

**Cause:** ECTA export permit not issued yet

**Solution:**
1. Check shipment status: `GET /api/v1/shipments/SHIP001`
2. Verify status is `PERMIT_ISSUED`
3. If not, complete ECTA workflow first

### Error: "No valid ECTA export permit found"

**Cause:** Quality inspection missing export permit number

**Solution:**
1. Check inspection: `GET /api/v1/quality/inspections/INS-SHIP001`
2. Verify `exportPermitNo` field is populated
3. If empty, issue export permit via ECTA

### Error: "Declaration cannot be cleared"

**Cause:** Current status is not `UNDER_REVIEW`

**Solution:**
1. Check current status
2. Complete review step first
3. Status must be `UNDER_REVIEW` before clearance

## Workflow Definition

Get the complete customs workflow steps:

```bash
GET /api/v1/customs/workflow
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "step": 1,
      "title": "Export declaration",
      "description": "Submit electronic declaration with HS code, quantity, destination..."
    },
    {
      "step": 2,
      "title": "Supporting documents",
      "description": "Verify commercial invoice, packing list, certificates..."
    },
    {
      "step": 3,
      "title": "Risk management",
      "description": "Determine inspection requirements..."
    },
    {
      "step": 4,
      "title": "Physical inspection",
      "description": "Verify container, seal, bags, weight..."
    },
    {
      "step": 5,
      "title": "Customs release",
      "description": "Authorize export, proceed to Djibouti..."
    }
  ]
}
```

## Integration with ECTA

### Verify ECTA Permit Before Customs

The system automatically checks:
1. Shipment status = `PERMIT_ISSUED`
2. Quality inspection status = `APPROVED`
3. Export permit number exists
4. Inspection grade = 1-5 (export quality)

### Auto-Mapped Fields

When customs declaration is auto-created from ECTA permit, these fields are populated:

| Field | Source | Fallback |
|-------|--------|----------|
| `quantity` | Shipment | Inspection sample size |
| `value` | Shipment/Contract | "0" |
| `currency` | Contract | "USD" |
| `destination` | Contract buyer country | "" |
| `exporterId` | Inspection/Shipment | Request body |
| `eudrCompliant` | Shipment | false |
| `hsCode` | Fixed | "090111" (coffee) |
| `portOfExit` | Fixed | "Djibouti Port" |

## Testing

### Full Workflow Test Script

```javascript
const axios = require('axios');
const baseURL = 'http://localhost:3001/api/v1';

async function testCustomsWorkflow() {
  // 1. Get permit-ready shipments
  const ready = await axios.get(`${baseURL}/customs/permit-ready`);
  const shipment = ready.data.data[0];
  
  // 2. Auto-create declaration from permit
  await axios.post(`${baseURL}/customs/declaration/auto-create-from-permit`, {
    inspectionId: shipment.inspectionId,
    shipmentId: shipment.shipmentId,
    exporterId: shipment.exporterId,
    exportPermitNo: shipment.exportPermitNo
  });
  
  // 3. Review declaration
  await axios.post(`${baseURL}/customs/declaration/${shipment.shipmentId}/review`, {
    inspectorNotes: "Documentary review",
    inspectionType: "DOCUMENTARY"
  });
  
  // 4. Complete inspection
  await axios.post(`${baseURL}/customs/declaration/${shipment.shipmentId}/complete-inspection`, {
    inspectionResult: "PASSED",
    inspectorComments: "All clear"
  });
  
  // 5. Clear declaration
  await axios.post(`${baseURL}/customs/declaration/${shipment.shipmentId}/clear`, {
    clearanceNumber: `CLR-${Date.now()}`,
    dutiesAmount: "0"
  });
  
  console.log('✅ Customs workflow completed');
}
```

## Environment Setup

### Required Environment Variables

```bash
# .env
NODE_ENV=development
PORT=3001
BLOCKCHAIN_ENABLED=true
FABRIC_NETWORK_PATH=/path/to/network
AUTO_CREATE_CUSTOMS_DECLARATION=true
```

### Database Setup

The customs portal uses SQLite for local audit logs:

```sql
-- declarations table
CREATE TABLE declarations (
  declaration_id TEXT PRIMARY KEY,
  shipment_id TEXT,
  exporter_id TEXT,
  status TEXT,
  created_at DATETIME
);

-- declaration_audit table
CREATE TABLE declaration_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  declaration_id TEXT,
  action TEXT,
  performed_by TEXT,
  details TEXT,
  timestamp DATETIME
);

-- declaration_risk table
CREATE TABLE declaration_risk (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  declaration_id TEXT,
  risk_level TEXT,
  reason TEXT,
  assessed_by TEXT,
  assessed_at DATETIME
);
```

## Support & Documentation

- **Full Integration Guide:** [ECTA-CUSTOMS-WORKFLOW-INTEGRATION.md](./ECTA-CUSTOMS-WORKFLOW-INTEGRATION.md)
- **Workflow Diagram:** [WORKFLOW-STATUS-DIAGRAM.md](./WORKFLOW-STATUS-DIAGRAM.md)
- **API Logs:** `api/logs/combined.log`
- **Blockchain Logs:** Check peer container logs

## Key Takeaways

✅ **ECTA permit issuance triggers customs workflow automatically**
✅ **Customs cannot proceed without valid ECTA export permit**
✅ **All workflow transitions are recorded on blockchain**
✅ **Risk assessment happens automatically**
✅ **Data is auto-mapped from inspection, shipment, and contract**
✅ **Status validation ensures proper workflow sequencing**
