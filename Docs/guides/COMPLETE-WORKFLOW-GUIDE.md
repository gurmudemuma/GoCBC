# 🎯 Complete Coffee Export Workflow Guide
**Ethiopian Coffee Export Consortium Blockchain System (CECBS)**

---

## 📋 Table of Contents
1. [Exporter Onboarding](#phase-1-exporter-onboarding)
2. [Contract & Compliance](#phase-2-contract--compliance)
3. [Banking & Forex](#phase-3-banking--forex)
4. [Shipment & Quality Control](#phase-4-shipment--quality-control)
5. [Customs Clearance](#phase-5-customs-clearance)
6. [Payment Settlement](#phase-6-payment-settlement)
7. [Additional Features](#additional-features)

---

## ✅ PHASE 1: Exporter Onboarding

### Step 1.1: Application Submission (PUBLIC - No Auth)
**Endpoint**: `POST /api/v1/exporters/exporter-applications`

**Request**:
```json
{
  "companyName": "Ethiopian Coffee Masters Ltd",
  "tinNumber": "TIN-9876543210",
  "businessLicenseNumber": "BL-2026-12345",
  "capitalRequirement": 500000,
  "professionalTaster": "yes",
  "tasterCertificate": "CERT-2026-001",
  "contactPerson": "Abebe Kebede",
  "email": "abebe@coffeemasters.et",
  "phone": "+251911234567",
  "address": "Addis Ababa, Ethiopia",
  "city": "Addis Ababa",
  "region": "Addis Ababa",
  "bankName": "Commercial Bank of Ethiopia",
  "bankAccountNumber": "1000123456789",
  "bankBranchName": "Bole Branch",
  "bankBranchCode": "CBE-BOLE-001"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "applicationId": "APP-12345678",
    "status": "pending",
    "submittedAt": "2026-08-04T10:00:00Z",
    "message": "Application submitted successfully. Your account will be activated upon approval by ECTA."
  }
}
```

**What Happens**:
- ✅ Application record created in database
- ✅ INACTIVE user account automatically created
- ✅ Duplicate email check performed
- ✅ Status: Application = "pending", User = "inactive"

### Step 1.2: ECTA Review & Approval
**Endpoint**: `POST /api/v1/exporters/exporter-applications/:applicationId/approve`

**Required Role**: ECTA Admin

**Request**:
```json
{
  "exporterId": "EXP4342570",
  "ectaLicenseNumber": "ECX-2026-12345",
  "licenseExpiryDate": "2027-08-04",
  "bankName": "Commercial Bank of Ethiopia",
  "bankAccountNumber": "1000123456789",
  "bankBranch": "Bole Branch",
  "bankBranchCode": "CBE-BOLE-001"
}
```

**What Happens**:
- ✅ Exporter registered on blockchain (`RegisterExporter`)
- ✅ User account activated (status: "active")
- ✅ Username updated to exporterID
- ✅ New password generated and emailed
- ✅ Bank details recorded for payment settlement
- ✅ Email sent with login credentials

### Step 1.3: ECTA Rejection (if needed)
**Endpoint**: `POST /api/v1/exporters/exporter-applications/:applicationId/reject`

**Request**:
```json
{
  "reason": "Insufficient capital requirement documentation"
}
```

**What Happens**:
- ✅ User account marked as "rejected"
- ✅ Applicant can login to see rejection reason
- ✅ Resubmission allowed with corrections

---

## ✅ PHASE 2: Contract & Compliance

### Step 2.1: Sales Contract Registration
**Endpoint**: `POST /api/v1/contracts`

**Required Role**: Exporter

**Request**:
```json
{
  "contractID": "CONTRACT1722768000000",
  "exporterID": "EXP4342570",
  "buyerID": "BUYER001",
  "buyerCountry": "USA",
  "buyerBank": "JPMorgan Chase",
  "exporterBank": "Commercial Bank of Ethiopia",
  "coffeeType": "Arabica Yirgacheffe",
  "quantity": 20000,
  "pricePerKg": 8.50,
  "currency": "USD",
  "paymentMethod": "LC",
  "eudrRequired": true
}
```

**Payment Methods Supported**:
- `LC` - Letter of Credit (bank guaranteed, UCP 600)
- `CAD` - Cash Against Documents (no guarantee, URC 522)
- `TT_ADVANCE` - Telegraphic Transfer - Advance payment
- `TT_POST` - Telegraphic Transfer - Post-shipment payment
- `ADVANCE` - Advance Payment before production

**Chaincode**: `RegisterSalesContractWithPaymentMethod`

### Step 2.2: ECTA Contract Approval
**Endpoint**: `POST /api/v1/contracts/:contractID/approve`

**Required Role**: ECTA

**Document Verification**:
Before approval, system checks for:
- ✅ CONTRACT_SIGNED document uploaded
- ✅ Document verification status = "verified"

**Status Transition**: REGISTERED → APPROVED

---

## ✅ PHASE 3: Banking & Forex

### Step 3.1: Forex Request
**Endpoint**: `POST /api/v1/forex/request`

**Request**:
```json
{
  "forexId": "FX1722768000000",
  "contractId": "CONTRACT1722768000000",
  "exporterId": "EXP4342570",
  "amount": "170000",
  "currency": "USD"
}
```
