# 📚 API DOCUMENTATION
## Ethiopian Coffee Export Consortium Blockchain System (CECBS)

---

## 🎯 **OVERVIEW**

This document provides comprehensive API specifications for the CECBS system, including all chaincode functions, REST API endpoints, and integration patterns for the 2026-compliant Ethiopian coffee export workflow.

---

## 🔗 **CHAINCODE FUNCTIONS**

### **EXPORTER MANAGEMENT**

#### `RegisterExporter`
**Description**: Register a new coffee exporter with ECTA certification
**Parameters**:
- `exporterID` (string): Unique exporter identifier
- `companyName` (string): Company legal name
- `ectaLicenseNumber` (string): ECTA license number
- `capitalRequirement` (string): Required capital amount
- `professionalTaster` (string): Certified taster name
- `tasterCertificate` (string): Taster certificate number
- `licenseExpiryDate` (string): License expiry date

**Example**:
```json
{
  "function": "RegisterExporter",
  "Args": [
    "EXP2026001",
    "Modern Coffee Exports PLC",
    "ECTA-LIC-2026-001",
    "75000000",
    "Dr. Meron Teshome",
    "TASTER-CERT-2026-001",
    "2027-12-31"
  ]
}
```

#### `ReadExporter`
**Description**: Retrieve exporter details by ID
**Parameters**:
- `exporterID` (string): Exporter identifier

#### `UpdateExporterLaboratory`
**Description**: Update exporter laboratory certification status
**Parameters**:
- `exporterID` (string): Exporter identifier
- `certified` (string): "true" or "false"

#### `QueryAllExporters`
**Description**: Retrieve all registered exporters
**Parameters**: None

---

### **SALES CONTRACT MANAGEMENT**

#### `RegisterSalesContract`
**Description**: Register a new sales contract with NBE
**Parameters**:
- `contractID` (string): Unique contract identifier
- `exporterID` (string): Exporter identifier
- `buyerID` (string): Buyer identifier
- `buyerCountry` (string): Buyer country
- `coffeeType` (string): Coffee type/grade
- `quantity` (string): Quantity in kg
- `pricePerKg` (string): Price per kilogram
- `currency` (string): Currency code
- `eudrRequired` (string): "true" for EU buyers

**Example**:
```json
{
  "function": "RegisterSalesContract",
  "Args": [
    "CONTRACT2026001",
    "EXP2026001",
    "BUYER_GERMANY_001",
    "Germany",
    "Specialty Arabica",
    "2000",
    "9.25",
    "USD",
    "true"
  ]
}
```

#### `ApproveSalesContract`
**Description**: Approve a registered sales contract
**Parameters**:
- `contractID` (string): Contract identifier

#### `ReadSalesContract`
**Description**: Retrieve contract details by ID
**Parameters**:
- `contractID` (string): Contract identifier

#### `QueryAllContracts`
**Description**: Retrieve all sales contracts
**Parameters**: None

---

### **SHIPMENT MANAGEMENT**

#### `CreateShipment`
**Description**: Create a new coffee shipment
**Parameters**:
- `shipmentID` (string): Unique shipment identifier
- `exporterID` (string): Exporter identifier
- `buyerID` (string): Buyer identifier
- `origin` (string): Coffee origin location
- `quantity` (string): Quantity in kg
- `grade` (string): Coffee grade
- `icoNumber` (string): ICO certificate number
- `ecxLotNumber` (string): ECX lot number
- `channel` (string): Sales channel
- `forexRate` (string): Exchange rate
- `valueUSD` (string): Value in USD
- `eudrCompliant` (string): "true" or "false"

#### `UpdateShipmentStatus`
**Description**: Update shipment status
**Parameters**:
- `shipmentID` (string): Shipment identifier
- `newStatus` (string): New status

#### `ReadShipment`
**Description**: Retrieve shipment details by ID
**Parameters**:
- `shipmentID` (string): Shipment identifier

#### `QueryAllAssets`
**Description**: Retrieve all shipments
**Parameters**: None

#### `GetShipmentHistory`
**Description**: Get complete transaction history for a shipment
**Parameters**:
- `shipmentID` (string): Shipment identifier

---

### **ADVANCED QUERY FUNCTIONS**

#### `QueryShipmentsByExporter`
**Description**: Get all shipments for a specific exporter
**Parameters**:
- `exporterID` (string): Exporter identifier

#### `QueryEUDRCompliantShipments`
**Description**: Get all EUDR-compliant shipments
**Parameters**: None

#### `GetCompleteTraceability`
**Description**: Get complete traceability data for a shipment
**Parameters**:
- `shipmentID` (string): Shipment identifier

**Response Structure**:
```json
{
  "shipment": { /* Shipment details */ },
  "exporter": { /* Exporter details */ },
  "contract": { /* Sales contract details */ },
  "traceabilityComplete": true,
  "eudrCompliant": true,
  "generatedAt": "2026-05-31T19:42:50Z"
}
```

---

## 🌐 **REST API ENDPOINTS**

### **Base URL**: `https://api.cecbs.et/v1`

### **Authentication**
All API endpoints require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

### **EXPORTER ENDPOINTS**

#### `POST /exporters`
Register a new exporter
```json
{
  "exporterID": "EXP2026001",
  "companyName": "Modern Coffee Exports PLC",
  "ectaLicenseNumber": "ECTA-LIC-2026-001",
  "capitalRequirement": 75000000,
  "professionalTaster": "Dr. Meron Teshome",
  "tasterCertificate": "TASTER-CERT-2026-001",
  "licenseExpiryDate": "2027-12-31"
}
```

#### `GET /exporters`
Get all exporters
**Query Parameters**:
- `status` (optional): Filter by license status
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

#### `GET /exporters/{exporterID}`
Get specific exporter details

#### `PUT /exporters/{exporterID}/laboratory`
Update laboratory certification
```json
{
  "certified": true
}
```

### **CONTRACT ENDPOINTS**

#### `POST /contracts`
Register a new sales contract
```json
{
  "contractID": "CONTRACT2026001",
  "exporterID": "EXP2026001",
  "buyerID": "BUYER_GERMANY_001",
  "buyerCountry": "Germany",
  "coffeeType": "Specialty Arabica",
  "quantity": 2000,
  "pricePerKg": 9.25,
  "currency": "USD",
  "eudrRequired": true
}
```

#### `GET /contracts`
Get all contracts
**Query Parameters**:
- `exporterID` (optional): Filter by exporter
- `status` (optional): Filter by contract status
- `eudrRequired` (optional): Filter EUDR-required contracts

#### `GET /contracts/{contractID}`
Get specific contract details

#### `POST /contracts/{contractID}/approve`
Approve a sales contract

### **SHIPMENT ENDPOINTS**

#### `POST /shipments`
Create a new shipment
```json
{
  "shipmentID": "SHIPMENT2026001",
  "exporterID": "EXP2026001",
  "buyerID": "BUYER_GERMANY_001",
  "origin": "Yirgacheffe, Gedeo Zone",
  "quantity": 2000,
  "grade": "Grade 1",
  "icoNumber": "ICO-ETH-2026-001",
  "ecxLotNumber": "ECX-YRG-2026-001",
  "channel": "direct",
  "forexRate": 57.25,
  "valueUSD": 18500,
  "eudrCompliant": true
}
```

#### `GET /shipments`
Get all shipments
**Query Parameters**:
- `exporterID` (optional): Filter by exporter
- `status` (optional): Filter by status
- `eudrCompliant` (optional): Filter EUDR-compliant shipments
- `dateFrom` (optional): Filter from date
- `dateTo` (optional): Filter to date

#### `GET /shipments/{shipmentID}`
Get specific shipment details

#### `PUT /shipments/{shipmentID}/status`
Update shipment status
```json
{
  "status": "QUALITY_CONTROL"
}
```

#### `GET /shipments/{shipmentID}/history`
Get shipment transaction history

#### `GET /shipments/{shipmentID}/traceability`
Get complete traceability data

### **ANALYTICS ENDPOINTS**

#### `GET /analytics/dashboard`
Get dashboard analytics
**Response**:
```json
{
  "totalExporters": 150,
  "activeContracts": 45,
  "shipmentsThisMonth": 23,
  "eudrComplianceRate": 98.5,
  "totalExportValue": 2500000,
  "topDestinations": [
    {"country": "Germany", "percentage": 35},
    {"country": "USA", "percentage": 28},
    {"country": "Japan", "percentage": 15}
  ]
}
```

#### `GET /analytics/exports`
Get export statistics
**Query Parameters**:
- `period` (required): "daily", "weekly", "monthly", "yearly"
- `dateFrom` (optional): Start date
- `dateTo` (optional): End date

#### `GET /analytics/compliance`
Get EUDR compliance statistics

#### `GET /analytics/quality`
Get quality control statistics

---

## 🔐 **AUTHENTICATION & AUTHORIZATION**

### **JWT Token Structure**
```json
{
  "sub": "user123",
  "org": "ECTA",
  "role": "admin",
  "permissions": ["read:exporters", "write:contracts"],
  "exp": 1640995200
}
```

### **Organization Roles**
- **ECTA**: Exporter management, quality control
- **ECX**: Lot registration, trading
- **NBE**: Contract approval, forex management
- **Banks**: Export permits, payments
- **Customs**: Clearance, inspection
- **Shipping**: Logistics, delivery

### **Permission Levels**
- `read:exporters` - View exporter data
- `write:exporters` - Create/update exporters
- `read:contracts` - View contracts
- `write:contracts` - Create/approve contracts
- `read:shipments` - View shipments
- `write:shipments` - Create/update shipments
- `admin:system` - Full system access

---

## 📊 **RESPONSE FORMATS**

### **Success Response**
```json
{
  "success": true,
  "data": { /* Response data */ },
  "timestamp": "2026-05-31T19:42:50Z",
  "txId": "abc123def456"
}
```

### **Error Response**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid exporter ID format",
    "details": "Exporter ID must start with 'EXP'"
  },
  "timestamp": "2026-05-31T19:42:50Z"
}
```

### **Pagination Response**
```json
{
  "success": true,
  "data": [ /* Array of items */ ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  },
  "timestamp": "2026-05-31T19:42:50Z"
}
```

---

## 🔄 **WEBHOOK EVENTS**

### **Event Types**
- `exporter.registered` - New exporter registered
- `contract.registered` - New contract registered
- `contract.approved` - Contract approved
- `shipment.created` - New shipment created
- `shipment.status_updated` - Shipment status changed
- `quality.completed` - Quality control completed

### **Webhook Payload**
```json
{
  "event": "shipment.created",
  "timestamp": "2026-05-31T19:42:50Z",
  "data": {
    "shipmentID": "SHIPMENT2026001",
    "exporterID": "EXP2026001",
    "status": "CREATED"
  },
  "signature": "sha256=abc123def456"
}
```

---

## 🚀 **SDK EXAMPLES**

### **Node.js SDK**
```javascript
const CECBS = require('@cecbs/sdk');

const client = new CECBS({
  apiUrl: 'https://api.cecbs.et/v1',
  apiKey: 'your-api-key'
});

// Register exporter
const exporter = await client.exporters.register({
  exporterID: 'EXP2026001',
  companyName: 'Modern Coffee Exports PLC',
  ectaLicenseNumber: 'ECTA-LIC-2026-001'
});

// Create shipment
const shipment = await client.shipments.create({
  shipmentID: 'SHIPMENT2026001',
  exporterID: 'EXP2026001',
  quantity: 2000,
  eudrCompliant: true
});

// Get traceability
const trace = await client.shipments.getTraceability('SHIPMENT2026001');
```

### **Python SDK**
```python
from cecbs import CECBSClient

client = CECBSClient(
    api_url='https://api.cecbs.et/v1',
    api_key='your-api-key'
)

# Register exporter
exporter = client.exporters.register(
    exporter_id='EXP2026001',
    company_name='Modern Coffee Exports PLC',
    ecta_license_number='ECTA-LIC-2026-001'
)

# Query EUDR compliant shipments
shipments = client.shipments.query(eudr_compliant=True)
```

---

## 📈 **RATE LIMITS**

- **Standard API**: 1000 requests/hour
- **Blockchain Operations**: 100 transactions/hour
- **Analytics Queries**: 500 requests/hour
- **Webhook Deliveries**: 10,000/day

---

## 🔧 **ERROR CODES**

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid input parameters |
| `AUTHENTICATION_ERROR` | Invalid or expired token |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `DUPLICATE_ERROR` | Resource already exists |
| `BLOCKCHAIN_ERROR` | Blockchain transaction failed |
| `NETWORK_ERROR` | Network connectivity issue |
| `RATE_LIMIT_ERROR` | Rate limit exceeded |

---

**Status**: ✅ **COMPLETE API DOCUMENTATION**  
**Version**: 📋 **v1.2 - Enhanced 2026 Compliance**  
**Last Updated**: 📅 **May 31, 2026**

*Ethiopian Coffee Export Consortium Blockchain System - API Documentation*