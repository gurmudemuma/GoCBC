# 🚀 API Quick Reference Guide
**New Endpoints - Workflow Completion**

---

## 1. Phytosanitary Certificate

### Request Certificate
```bash
POST /api/v1/phytosanitary/request
Authorization: Bearer {token}

{
  "certificateID": "PHYTO-2026-001",
  "shipmentID": "SHIP1722768000000",
  "exporterID": "EXP4342570",
  "plantDescription": "Coffee beans (Coffea arabica)",
  "quantity": 20000,
  "treatmentApplied": "Fumigation"
}
```

### Inspect Certificate (ECTA)
```bash
POST /api/v1/phytosanitary/PHYTO-2026-001/inspect
Authorization: Bearer {ecta_token}

{
  "inspectorName": "Dr. Mulugeta Assefa",
  "inspectionDate": "2026-08-05",
  "pestsDetected": false,
  "diseaseDetected": false,
  "inspectionNotes": "No pests or diseases detected. Coffee is fit for export."
}
```

### Issue Certificate (ECTA)
```bash
POST /api/v1/phytosanitary/PHYTO-2026-001/issue
Authorization: Bearer {ecta_token}

{
  "certificateNumber": "PC-2026-ETH-12345",
  "issuingAuthority": "ECTA Quality Lab",
  "validUntil": "2027-02-05",
  "additionalDeclarations": "Treated with methyl bromide as per IPPC standards"
}
```

---

## 2. EUDR Compliance

### Submit Due Diligence
```bash
POST /api/v1/eudr/due-diligence
Authorization: Bearer {token}

{
  "dueDiligenceID": "EUDR-2026-001",
  "shipmentID": "SHIP1722768000000",
  "exporterID": "EXP4342570",
  "geoCoordinates": [
    {"lat": 6.123456, "lon": 38.654321},
    {"lat": 6.123789, "lon": 38.654987}
  ],
  "plotSize": 5.5,
  "farmName": "Yirgacheffe Highland Farm",
  "farmLocation": "Gedeo Zone, SNNPR",
  "deforestationFree": true,
  "legalHarvest": true,
  "harvestDate": "2026-01-15",
  "landRights": "DOCUMENTED"
}
```

### Verify Compliance (ECTA)
```bash
POST /api/v1/eudr/EUDR-2026-001/verify
Authorization: Bearer {ecta_token}

{
  "verifiedBy": "ECTA EUDR Officer",
  "verified": true,
  "verificationNotes": "All geo-coordinates verified via satellite imagery. No deforestation detected."
}
```

---

## 3. Land Transport

### Start Transport (Addis Ababa)
```bash
POST /api/v1/land-transport/SHIP1722768000000/start
Authorization: Bearer {token}

{
  "transportCompany": "Ethiopian Freight Services",
  "truckPlateNumber": "ET-3-12345",
  "driverName": "Tesfaye Mengistu",
  "driverPhone": "+251911234567",
  "sealNumber": "SEAL-2026-001",
  "departureTime": "2026-08-05T06:00:00Z"
}
```

### Record Border Crossing
```bash
POST /api/v1/land-transport/SHIP1722768000000/border-crossing
Authorization: Bearer {token}

{
  "crossingTime": "2026-08-05T14:30:00Z",
  "customsOfficer": "Officer Kassa Tesfaye",
  "sealVerified": true,
  "notes": "Seal intact. All documents verified at border."
}
```

### Record Port Arrival (Djibouti)
```bash
POST /api/v1/land-transport/SHIP1722768000000/arrive
Authorization: Bearer {token}

{
  "arrivalTime": "2026-08-05T18:00:00Z",
  "receivedBy": "Djibouti Port Authority",
  "sealCondition": "INTACT",
  "notes": "Cargo received in good condition"
}
```

---

## 4. Insurance

### Register Policy
```bash
POST /api/v1/insurance/register
Authorization: Bearer {token}

{
  "policyNumber": "INS-2026-ETH-12345",
  "shipmentID": "SHIP1722768000000",
  "insuranceCompany": "Ethiopian Insurance Corporation",
  "coverageAmount": 200000,
  "currency": "USD",
  "policyType": "MARINE_CARGO",
  "effectiveDate": "2026-08-05",
  "expiryDate": "2027-02-05",
  "beneficiary": "EXP4342570",
  "coverageDetails": "All-risk marine cargo insurance covering loss or damage during transit"
}
```

### File Claim
```bash
POST /api/v1/insurance/INS-2026-ETH-12345/claim
Authorization: Bearer {token}

{
  "claimAmount": 5000,
  "claimReason": "Minor water damage to 10 bags during sea transit",
  "incidentDate": "2026-09-15",
  "supportingDocuments": ["SURVEY-REPORT-001", "PHOTOS-001"]
}
```

---

## 5. Document Courier

### Send Documents
```bash
POST /api/v1/courier/SHIP1722768000000/send
Authorization: Bearer {token}

{
  "courierCompany": "DHL Express",
  "trackingNumber": "DHL-1234567890",
  "documents": [
    "Bill of Lading (Original)",
    "Commercial Invoice",
    "Certificate of Origin",
    "Quality Certificate",
    "Phytosanitary Certificate"
  ],
  "recipient": "ABC Coffee Importers Inc.",
  "recipientAddress": "123 Harbor St, New York, NY 10001, USA",
  "sentDate": "2026-08-06T10:00:00Z"
}
```

### Confirm Receipt
```bash
POST /api/v1/courier/SHIP1722768000000/receive
Authorization: Bearer {token}

{
  "receivedDate": "2026-08-10T14:30:00Z",
  "receivedBy": "John Smith, Import Manager",
  "condition": "GOOD",
  "notes": "All 5 original documents received in excellent condition"
}
```

### Update Status (Intermediate)
```bash
PUT /api/v1/courier/SHIP1722768000000/update-status
Authorization: Bearer {token}

{
  "status": "IN_TRANSIT",
  "location": "Dubai Hub",
  "updateTime": "2026-08-08T22:00:00Z",
  "notes": "Package cleared customs, en route to destination"
}
```

---

## 📱 Testing All New Endpoints

```bash
# Set variables
export API_URL="http://localhost:3001/api/v1"
export TOKEN="your_jwt_token_here"

# Test Phytosanitary
curl -X POST $API_URL/phytosanitary/request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"certificateID":"PHYTO-001","shipmentID":"SHIP001","exporterID":"EXP001"}'

# Test EUDR
curl -X POST $API_URL/eudr/due-diligence \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dueDiligenceID":"EUDR-001","shipmentID":"SHIP001","exporterID":"EXP001","geoCoordinates":[{"lat":6.12,"lon":38.65}],"plotSize":5.5,"farmName":"Test Farm","deforestationFree":true,"legalHarvest":true}'

# Test Land Transport
curl -X POST $API_URL/land-transport/SHIP001/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transportCompany":"Test Transport","truckPlateNumber":"ET-3-12345","driverName":"Test Driver","sealNumber":"SEAL-001"}'

# Test Insurance
curl -X POST $API_URL/insurance/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"policyNumber":"INS-001","shipmentID":"SHIP001","insuranceCompany":"Test Insurance","coverageAmount":100000,"currency":"USD","policyType":"MARINE_CARGO"}'

# Test Courier
curl -X POST $API_URL/courier/SHIP001/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"courierCompany":"DHL","trackingNumber":"DHL-12345","documents":["B/L","Invoice"]}'
```

---

## ✅ Verification Checklist

- [ ] All 5 new route files created
- [ ] Server.ts updated with route registrations
- [ ] API starts without errors
- [ ] Swagger docs accessible at `/api-docs`
- [ ] All new endpoints return proper responses
- [ ] Authentication working on protected routes
- [ ] RBAC enforced (ECTA-only endpoints)
- [ ] Blockchain integration functional
- [ ] Complete workflow test passes

**All Systems Ready** 🚀
