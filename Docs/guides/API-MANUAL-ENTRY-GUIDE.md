# API Manual Entry Guide - Workaround for Features Without UI

**Purpose:** Temporary guide for entering data via API for deployed features that don't have UI yet  
**Audience:** System administrators, support staff  
**Valid Until:** UI is built (Sprints 1-2)

---

## 🎯 OVERVIEW

These 4 features are deployed and working but don't have UI forms yet:
1. Export Proceeds Repatriation
2. Pre-shipment Inspection
3. Border Crossing Documentation
4. LC Discrepancy Handling

**Workaround:** Use API calls or database entry until UI is ready

---

## 1️⃣ EXPORT PROCEEDS REPATRIATION

### Initiate Repatriation

```bash
curl -X POST http://localhost:3000/api/repatriation/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "exporterId": "EXP001",
    "invoiceId": "INV001",
    "amount": 100000,
    "currency": "USD",
    "dueDate": "2026-11-05",
    "paymentId": "PAY001"
  }'
```

**Response:**
```json
{
  "success": true,
  "repatriationId": "REP001",
  "message": "Repatriation initiated successfully"
}
```

---

### Record Actual Repatriation

```bash
curl -X POST http://localhost:3000/api/repatriation/REP001/record \
  -H "Content-Type: application/json" \
  -d '{
    "repatriatedAmount": 100000,
    "swiftReference": "SWIFT123456",
    "repatriationDate": "2026-10-20",
    "bankReference": "BANK789"
  }'
```

---

### Verify Repatriation (NBE)

```bash
curl -X POST http://localhost:3000/api/repatriation/REP001/verify \
  -H "Content-Type: application/json" \
  -d '{
    "verifiedBy": "NBE_OFFICER_001",
    "compliant": true,
    "notes": "All documentation in order"
  }'
```

---

### Apply Penalty (if late)

```bash
curl -X POST http://localhost:3000/api/repatriation/REP001/penalty \
  -H "Content-Type: application/json" \
  -d '{
    "penaltyAmount": 5000,
    "reason": "Late repatriation - exceeded 30 days",
    "appliedBy": "NBE_OFFICER_001"
  }'
```

---

### Request Waiver

```bash
curl -X POST http://localhost:3000/api/repatriation/REP001/waiver/request \
  -H "Content-Type: application/json" \
  -d '{
    "requestedBy": "EXP001",
    "reason": "Banking delays due to SWIFT issues",
    "supportingDocs": ["DOC001", "DOC002"]
  }'
```

---

### Query Overdue Repatriations

```bash
curl -X GET http://localhost:3000/api/repatriation/overdue
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "repatriations": [
    {
      "repatriationId": "REP002",
      "exporterId": "EXP002",
      "amount": 50000,
      "dueDate": "2026-09-30",
      "daysOverdue": 6,
      "status": "overdue"
    }
  ]
}
```

---

## 2️⃣ PRE-SHIPMENT INSPECTION

### Request Inspection

```bash
curl -X POST http://localhost:3000/api/inspection/request \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentId": "SHIP001",
    "requestedBy": "EXP001",
    "inspectionType": "quality",
    "inspectorCompany": "SGS",
    "requestedDate": "2026-10-25"
  }'
```

**Response:**
```json
{
  "success": true,
  "inspectionId": "INSP001",
  "message": "Inspection requested successfully"
}
```

---

### Schedule Inspection

```bash
curl -X POST http://localhost:3000/api/inspection/INSP001/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledDate": "2026-10-25",
    "scheduledTime": "10:00",
    "inspectorId": "SGS_INSPECTOR_001",
    "inspectorName": "John Doe",
    "location": "Warehouse A, Addis Ababa"
  }'
```

---

### Record Inspection Results

```bash
curl -X POST http://localhost:3000/api/inspection/INSP001/results \
  -H "Content-Type: application/json" \
  -d '{
    "inspectionDate": "2026-10-25",
    "weightVerified": true,
    "weightActual": 19800,
    "qualityVerified": true,
    "moistureContent": 11.5,
    "defectCount": 3,
    "containerCondition": "good",
    "sealIntegrity": "intact",
    "result": "passed",
    "notes": "All quality parameters within acceptable range",
    "samplesCollected": 5
  }'
```

---

### Issue Certificate

```bash
curl -X POST http://localhost:3000/api/inspection/INSP001/certificate \
  -H "Content-Type: application/json" \
  -d '{
    "certificateNumber": "SGS-CERT-2026-001",
    "issuedDate": "2026-10-25",
    "validUntil": "2026-11-25",
    "issuedBy": "SGS_INSPECTOR_001"
  }'
```

---

### Approve Inspection

```bash
curl -X POST http://localhost:3000/api/inspection/INSP001/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approvedBy": "ECTA_OFFICER_001",
    "approvalDate": "2026-10-26",
    "notes": "Certificate verified and approved"
  }'
```

---

### Query Inspections by Status

```bash
curl -X GET http://localhost:3000/api/inspection/status/pending
```

---

### Get Statistics

```bash
curl -X GET http://localhost:3000/api/inspection/statistics
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "total": 150,
    "pending": 12,
    "inProgress": 5,
    "completed": 128,
    "approved": 125,
    "rejected": 5,
    "passRate": 96.2
  }
}
```

---

## 3️⃣ BORDER CROSSING DOCUMENTATION

### Initiate Border Crossing

```bash
curl -X POST http://localhost:3000/api/bordercrossing/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentId": "SHIP001",
    "exitPoint": "Galafi",
    "destination": "Djibouti Port",
    "estimatedCrossingDate": "2026-10-28",
    "driverName": "Ahmed Ibrahim",
    "driverLicense": "ETH123456",
    "truckPlate": "AA-3-12345"
  }'
```

**Response:**
```json
{
  "success": true,
  "crossingId": "BC001",
  "message": "Border crossing initiated"
}
```

---

### Record Customs Clearance

```bash
curl -X POST http://localhost:3000/api/bordercrossing/BC001/clearance \
  -H "Content-Type: application/json" \
  -d '{
    "clearanceDate": "2026-10-28",
    "customsOfficer": "OFFICER_001",
    "customsDeclarationNumber": "CUST-2026-001",
    "exitStamp": true,
    "sealsVerified": true,
    "sealNumbers": ["SEAL001", "SEAL002"]
  }'
```

---

### Record Departure

```bash
curl -X POST http://localhost:3000/api/bordercrossing/BC001/departure \
  -H "Content-Type: application/json" \
  -d '{
    "departureDate": "2026-10-28T14:30:00Z",
    "gpsLocation": {
      "latitude": 11.7833,
      "longitude": 41.9167
    }
  }'
```

---

### Record Actual Border Crossing

```bash
curl -X POST http://localhost:3000/api/bordercrossing/BC001/crossing \
  -H "Content-Type: application/json" \
  -d '{
    "crossingDate": "2026-10-28T16:45:00Z",
    "borderPost": "Galafi Border Post",
    "exitVerified": true,
    "entryVerified": true,
    "gpsLocation": {
      "latitude": 11.8033,
      "longitude": 42.0167
    }
  }'
```

---

### Update Location (GPS Tracking)

```bash
curl -X POST http://localhost:3000/api/bordercrossing/BC001/location \
  -H "Content-Type: application/json" \
  -d '{
    "currentLocation": "En route to Djibouti",
    "gpsLocation": {
      "latitude": 11.5881,
      "longitude": 43.1456
    },
    "timestamp": "2026-10-28T18:30:00Z"
  }'
```

---

### Report Delay

```bash
curl -X POST http://localhost:3000/api/bordercrossing/BC001/delay \
  -H "Content-Type: application/json" \
  -d '{
    "delayReason": "Road construction",
    "delayDuration": 120,
    "reportedBy": "DRIVER_001",
    "expectedResolution": "2026-10-28T20:00:00Z"
  }'
```

---

### Record Arrival at Destination

```bash
curl -X POST http://localhost:3000/api/bordercrossing/BC001/arrival \
  -H "Content-Type: application/json" \
  -d '{
    "arrivalDate": "2026-10-29T08:00:00Z",
    "arrivalLocation": "Djibouti Port Terminal 2",
    "sealsIntact": true,
    "receivedBy": "PORT_OFFICER_001"
  }'
```

---

### Get Active Crossings

```bash
curl -X GET http://localhost:3000/api/bordercrossing/active
```

---

## 4️⃣ LC DISCREPANCY HANDLING

### Report LC Discrepancy

```bash
curl -X POST http://localhost:3000/api/banking/lc/LC001/discrepancy/report \
  -H "Content-Type: application/json" \
  -d '{
    "reportedBy": "BANK001",
    "reportedDate": "2026-10-30",
    "discrepancyType": "document_mismatch",
    "discrepancies": [
      {
        "documentType": "Bill of Lading",
        "issue": "Shipment date differs from LC terms",
        "lcValue": "2026-10-25",
        "documentValue": "2026-10-28"
      },
      {
        "documentType": "Commercial Invoice",
        "issue": "Amount exceeds LC value",
        "lcValue": "100000 USD",
        "documentValue": "102000 USD"
      }
    ],
    "severity": "major"
  }'
```

**Response:**
```json
{
  "success": true,
  "discrepancyId": "DISC001",
  "lcId": "LC001",
  "status": "reported",
  "message": "Discrepancy reported successfully"
}
```

---

### Resolve Discrepancy

```bash
curl -X POST http://localhost:3000/api/banking/lc/LC001/discrepancy/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "resolvedBy": "BANK_OFFICER_001",
    "resolutionDate": "2026-11-02",
    "resolution": "Buyer accepted discrepancies",
    "resolutionNotes": "Buyer confirmed shipment delay acceptable, invoice difference waived",
    "documentsAmended": false
  }'
```

---

### Request Discrepancy Waiver

```bash
curl -X POST http://localhost:3000/api/banking/lc/LC001/discrepancy/waive \
  -H "Content-Type: application/json" \
  -d '{
    "requestedBy": "BUYER_001",
    "waiverDate": "2026-11-01",
    "waiverReason": "Delays acceptable, commercial relationship maintained",
    "discrepanciesWaived": ["DISC001"]
  }'
```

---

### Reject LC Documents

```bash
curl -X POST http://localhost:3000/api/banking/lc/LC001/discrepancy/reject \
  -H "Content-Type: application/json" \
  -d '{
    "rejectedBy": "BUYER_001",
    "rejectionDate": "2026-11-01",
    "rejectionReason": "Discrepancies too significant, require corrected documents",
    "paymentImpact": "Payment withheld pending document correction"
  }'
```

---

### Get LC Discrepancies

```bash
curl -X GET http://localhost:3000/api/banking/lc/LC001/discrepancies
```

---

### Query All LCs with Discrepancies

```bash
curl -X GET http://localhost:3000/api/banking/lc/discrepancies
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "lcs": [
    {
      "lcId": "LC001",
      "lcNumber": "LC-2026-001",
      "discrepancyStatus": "reported",
      "discrepancyCount": 2,
      "reportedDate": "2026-10-30",
      "severity": "major"
    }
  ]
}
```

---

## 🔍 HEALTH CHECKS

### Check All New Features

```bash
# Repatriation
curl http://localhost:3000/api/repatriation/health

# Inspection
curl http://localhost:3000/api/inspection/health

# Border Crossing
curl http://localhost:3000/api/bordercrossing/health

# Banking (LC Discrepancies)
curl http://localhost:3000/api/banking/health
```

**Expected Response (all):**
```json
{
  "status": "healthy",
  "timestamp": "2026-10-06T10:30:00Z",
  "service": "repatriation",
  "database": "connected",
  "blockchain": "connected"
}
```

---

## 📊 QUERY & REPORTING

### Get Entity by ID

```bash
# Get repatriation details
curl http://localhost:3000/api/repatriation/exporter/EXP001

# Get inspections for shipment
curl http://localhost:3000/api/inspection/shipment/SHIP001

# Get border crossings for shipment
curl http://localhost:3000/api/bordercrossing/shipment/SHIP001
```

---

### Filter by Status

```bash
# Pending repatriations
curl http://localhost:3000/api/repatriation/status/pending

# Completed inspections
curl http://localhost:3000/api/inspection/status/completed

# In-transit border crossings
curl http://localhost:3000/api/bordercrossing/status/in_transit
```

---

## 🛠️ ADMIN TOOLS

### Database Direct Entry (Backup Method)

If API is not working, connect to PostgreSQL directly:

```bash
# Connect to database
docker exec -it $(docker ps -q -f name=postgres) psql -U cecbs -d cecbs

# Insert repatriation record
INSERT INTO export_proceeds_repatriation (
  repatriation_id, payment_id, exporter_id, 
  export_amount, currency, due_date, status
) VALUES (
  'REP001', 'PAY001', 'EXP001',
  100000.00, 'USD', '2026-11-05', 'initiated'
);

# Query records
SELECT * FROM export_proceeds_repatriation WHERE exporter_id = 'EXP001';
SELECT * FROM pre_shipment_inspections WHERE status = 'pending';
SELECT * FROM border_crossings WHERE status = 'in_transit';
```

---

## 📝 COMMON WORKFLOWS

### Complete Repatriation Workflow

```bash
# 1. Initiate
curl -X POST http://localhost:3000/api/repatriation/initiate -d '{...}'

# 2. Record repatriation
curl -X POST http://localhost:3000/api/repatriation/REP001/record -d '{...}'

# 3. NBE verification
curl -X POST http://localhost:3000/api/repatriation/REP001/verify -d '{...}'

# Done!
```

---

### Complete Inspection Workflow

```bash
# 1. Request inspection
curl -X POST http://localhost:3000/api/inspection/request -d '{...}'

# 2. Schedule
curl -X POST http://localhost:3000/api/inspection/INSP001/schedule -d '{...}'

# 3. Record results
curl -X POST http://localhost:3000/api/inspection/INSP001/results -d '{...}'

# 4. Issue certificate
curl -X POST http://localhost:3000/api/inspection/INSP001/certificate -d '{...}'

# 5. Approve
curl -X POST http://localhost:3000/api/inspection/INSP001/approve -d '{...}'

# Done!
```

---

## 📞 SUPPORT

**For API Issues:**
- Email: api-support@gocbc.et
- Phone: +251-XXX-XXXX
- Slack: #api-support

**For Training:**
- Request training session: training@gocbc.et
- Watch video tutorials: docs.gocbc.et/videos

**For Data Entry Help:**
- Contact admin team: admin@gocbc.et
- Response time: < 2 hours

---

## 🎯 TEMPORARY NATURE

**This is a TEMPORARY workaround!**

**UI Development Schedule:**
- Sprint 1 (Weeks 2-3): Repatriation & Inspection UI
- Sprint 2 (Weeks 4-5): Border Crossing & LC Discrepancy UI

**Once UI is ready, this guide will be deprecated.**

---

**Questions? Contact: support@gocbc.et**
