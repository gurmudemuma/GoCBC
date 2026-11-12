# Manual Testing Guide for 22 New API Endpoints
**Date:** November 10, 2026  
**Purpose:** Manual testing checklist for new endpoints before automated test suite

---

## Prerequisites

### 1. Run Database Migrations

```bash
# Navigate to project root
cd /home/guda/GoCBC

# Run migration script to create all new tables
node scripts/migrate-db-pg.js
```

**Expected Output:**
```
✅ Successful: 5
   - 066_add_advanced_banking_tables.sql
   - 067_add_advanced_shipping_tables.sql
   - 068_add_customs_extended_tables.sql
   - 069_add_nbe_retention_tables.sql
   - 070_add_2fa_and_session_tables.sql
```

### 2. Start API Server

```bash
# Start the API server
cd /home/guda/GoCBC/api
npm run dev
```

**Expected:** Server running on `http://localhost:3000`

### 3. Get Authentication Token

```bash
# Login as admin or appropriate role
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Save the token
export TOKEN="Bearer <your-jwt-token>"
```

---

## Testing Checklist

### Category 1: Banking Advanced Endpoints (5 endpoints)

#### ✅ Test 1.1: LC Transfer
```bash
curl -X POST http://localhost:3000/api/v1/banking/lc/LC-123/transfer \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newBeneficiary": "EXP-NEW-001",
    "newBeneficiaryName": "New Exporter Ltd",
    "transferReason": "Business restructuring",
    "transferType": "FULL",
    "approvedBy": "BANK-OFFICER-001"
  }'
```

**Expected Response:**
- ✅ Status: 201 Created
- ✅ Contains: `transferId`, `lcId`, `status: "PENDING"`
- ✅ Database: New row in `lc_transfers` table

**Validation Checks:**
- [ ] LC exists and is in transferable status
- [ ] New beneficiary is validated
- [ ] Transfer type is valid (FULL/PARTIAL)
- [ ] Optional blockchain recording attempted

---

#### ✅ Test 1.2: Standby LC Issuance
```bash
curl -X POST http://localhost:3000/api/v1/banking/lc/standby/issue \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "standbyLCNumber": "SBLC-2024-001",
    "beneficiary": "EXP-001",
    "applicant": "BUYER-001",
    "amount": 50000.00,
    "currency": "USD",
    "expiryDate": "2025-12-31",
    "purpose": "Performance guarantee",
    "issuingBank": "Commercial Bank of Ethiopia",
    "terms": "Payable on demand with signed statement of default"
  }'
```

**Expected Response:**
- ✅ Status: 201 Created
- ✅ Contains: `standbyLCId`, `standbyLCNumber`, `status: "ACTIVE"`
- ✅ Database: New row in `standby_letters_of_credit` table

---

#### ✅ Test 1.3: Deferred Payment Recording
```bash
curl -X POST http://localhost:3000/api/v1/banking/lc/LC-123/deferred-payment/record \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentTerms": "90 days after B/L date",
    "maturityDate": "2025-03-31",
    "acceptanceDate": "2024-12-31",
    "deferredAmount": 75000.00,
    "interestRate": 5.5,
    "acceptingBank": "Dashen Bank"
  }'
```

**Expected Response:**
- ✅ Status: 201 Created
- ✅ Contains: `deferredPaymentId`, `lcId`, `maturityDate`

---

#### ✅ Test 1.4: Acceptance Financing
```bash
curl -X POST http://localhost:3000/api/v1/banking/lc/LC-123/acceptance-financing \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "financingAmount": 60000.00,
    "tenor": 60,
    "interestRate": 7.5,
    "discountRate": 6.8,
    "financingBank": "Awash Bank",
    "acceptanceDate": "2024-12-15",
    "maturityDate": "2025-02-15"
  }'
```

**Expected Response:**
- ✅ Status: 201 Created
- ✅ Contains: `financingId`, `financingAmount`, `totalCost`

---

#### ✅ Test 1.5: Forex Conversion
```bash
curl -X POST http://localhost:3000/api/v1/banking/payment/PAY-123/apply-forex \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromCurrency": "USD",
    "toCurrency": "ETB",
    "amount": 100000.00,
    "exchangeRate": 55.75,
    "conversionType": "SPOT",
    "conversionDate": "2024-11-10"
  }'
```

**Expected Response:**
- ✅ Status: 201 Created
- ✅ Contains: `conversionId`, `convertedAmount` (5575000.00 ETB)

---

### Category 2: Shipping Advanced Endpoints (6 endpoints)

#### ✅ Test 2.1: Issue Bill of Lading (Negotiable)
```bash
curl -X POST http://localhost:3000/api/v1/shipping/bookings/BK-123/bill-of-lading/issue \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blNumber": "MAEU-BL-2024-001",
    "blType": "NEGOTIABLE",
    "shipperName": "Ethiopian Coffee Exporter",
    "consigneeName": "European Coffee Importer",
    "notifyParty": "Import Agent Europe",
    "vesselName": "MV COFFEE STAR",
    "voyageNumber": "V-2024-45",
    "portOfLoading": "Djibouti",
    "portOfDischarge": "Rotterdam",
    "placeOfDelivery": "Rotterdam Warehouse",
    "cargoDescription": "Green Coffee Beans - Grade 1",
    "grossWeight": 18000.00,
    "numberOfPackages": 300,
    "freightTerms": "FOB"
  }'
```

**Expected Response:**
- ✅ Status: 201 Created
- ✅ Contains: `blId`, `blNumber`, `blType: "NEGOTIABLE"`
- ✅ Database: New row in `bills_of_lading` table

**Test All B/L Types:**
- [ ] NEGOTIABLE
- [ ] NON_NEGOTIABLE
- [ ] SEA_WAYBILL
- [ ] MASTER_BL
- [ ] HOUSE_BL

---

#### ✅ Test 2.2: Amend Booking
```bash
curl -X PUT http://localhost:3000/api/v1/shipping/bookings/BK-123/amend \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amendmentReason": "Change in container size",
    "originalDetails": {
      "containerType": "20FT",
      "quantity": 2
    },
    "amendedDetails": {
      "containerType": "40FT",
      "quantity": 1
    },
    "requestedBy": "EXP-001"
  }'
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: `amendmentId`, `bookingId`, `status: "PENDING"`

---

#### ✅ Test 2.3: Cancel Booking
```bash
curl -X DELETE http://localhost:3000/api/v1/shipping/bookings/BK-123/cancel \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cancellationReason": "Shipment delayed - buyer request",
    "cancelledBy": "EXP-001"
  }'
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: `bookingId`, `status: "CANCELLED"`

---

#### ✅ Test 2.4: Allocate Container
```bash
curl -X POST http://localhost:3000/api/v1/shipping/bookings/BK-123/containers/allocate \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "containerNumber": "MAEU1234567",
    "containerSize": "40FT",
    "containerType": "DRY",
    "allocationDate": "2024-11-10",
    "pickupLocation": "Addis Ababa Terminal",
    "returnLocation": "Djibouti Port"
  }'
```

**Expected Response:**
- ✅ Status: 201 Created
- ✅ Contains: `allocationId`, `containerNumber`

---

#### ✅ Test 2.5: Submit Container Stuffing Report
```bash
curl -X POST http://localhost:3000/api/v1/shipping/containers/MAEU1234567/stuffing-report \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stuffingDate": "2024-11-10",
    "stuffingLocation": "Addis Ababa Warehouse",
    "supervisorName": "John Supervisor",
    "cargoDetails": [
      {
        "description": "Green Coffee - Grade 1",
        "packages": 300,
        "weight": 18000.00
      }
    ],
    "sealNumber": "SEAL-78945612",
    "photos": ["photo1.jpg", "photo2.jpg"]
  }'
```

**Expected Response:**
- ✅ Status: 201 Created
- ✅ Contains: `stuffingReportId`, `containerNumber`

---

#### ✅ Test 2.6: Query Bills of Lading
```bash
curl -X GET "http://localhost:3000/api/v1/shipping/bills-of-lading?blType=NEGOTIABLE&status=ISSUED" \
  -H "Authorization: $TOKEN"
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: Array of B/Ls with filters applied

---

### Category 3: Customs Extended Endpoints (4 endpoints)

#### ✅ Test 3.1: Amend Customs Declaration
```bash
curl -X PUT http://localhost:3000/api/v1/customs/declaration/DECL-123/amend \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amendmentReason": "Correction in HS code",
    "originalValues": {
      "hsCode": "0901.11",
      "quantity": 18000
    },
    "amendedValues": {
      "hsCode": "0901.12",
      "quantity": 18000
    },
    "amendmentRequestedBy": "EXP-001"
  }'
```

**Expected Response:**
- ✅ Status: 201 Created
- ✅ Contains: `amendmentId`, `amendmentNumber`, `approvalStatus: "pending"`

---

#### ✅ Test 3.2: Cancel Customs Declaration
```bash
curl -X DELETE http://localhost:3000/api/v1/customs/declaration/DECL-123/cancel \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cancellationReason": "Duplicate submission",
    "requestedBy": "EXP-001"
  }'
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: `declarationId`, `cancellationStatus: "requested"`

---

#### ✅ Test 3.3: Calculate Duty
```bash
curl -X POST http://localhost:3000/api/v1/customs/declaration/DECL-123/calculate-duty \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customsValue": 100000.00,
    "currency": "USD",
    "exchangeRate": 55.75,
    "hsCode": "0901.11",
    "originCountry": "Ethiopia",
    "tradeAgreement": "COMESA"
  }'
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: `calculationId`, `basicDutyAmount`, `vatAmount`, `totalPayable`
- ✅ Calculation: Uses tariff rates and trade preferences

---

#### ✅ Test 3.4: Customs Valuation (WTO Methods)
```bash
curl -X POST http://localhost:3000/api/v1/customs/declaration/DECL-123/valuation \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "valuationMethod": "TRANSACTION",
    "invoiceValue": 100000.00,
    "invoiceCurrency": "USD",
    "adjustments": [
      {"type": "freight", "amount": 5000.00},
      {"type": "insurance", "amount": 1000.00}
    ],
    "isRelatedParty": false
  }'
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: `valuationId`, `finalCustomsValue`, `valuationMethod`
- ✅ Test all 6 WTO methods: TRANSACTION, IDENTICAL, SIMILAR, DEDUCTIVE, COMPUTED, FALLBACK

---

### Category 4: NBE Retention Endpoints (4 endpoints)

#### ✅ Test 4.1: Create Retention Account
```bash
curl -X POST http://localhost:3000/api/v1/nbe/retention-accounts \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exporterId": "EXP-001",
    "accountNumber": "RET-ACC-001-2024",
    "accountType": "FOREX_RETENTION",
    "currency": "USD",
    "retentionPercentage": 40.00,
    "minimumBalance": 50000.00,
    "holdsPolicy": "STANDARD",
    "notes": "Standard 40% retention account for coffee exports"
  }'
```

**Expected Response:**
- ✅ Status: 201 Created or 200 OK (if update)
- ✅ Contains: `accountId`, `retentionPercentage: 40`
- ✅ Database: Row in `retention_accounts` table

---

#### ✅ Test 4.2: Calculate Penalty
```bash
curl -X POST http://localhost:3000/api/v1/nbe/retention-accounts/1/calculate-penalty \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "violationType": "UNDER_RETENTION",
    "requiredAmount": 100000.00,
    "actualAmount": 75000.00,
    "violationStartDate": "2024-10-01",
    "violationEndDate": "2024-11-01",
    "notes": "Shortfall in October retention requirement"
  }'
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: `penaltyId`, `shortfallAmount: 25000`, `penaltyAmount`, `totalOwed`
- ✅ Penalty calculation: 2% per month for under-retention

**Test All Violation Types:**
- [ ] UNDER_RETENTION (2% monthly)
- [ ] LATE_REPATRIATION (1.5% monthly)
- [ ] UNAUTHORIZED_WITHDRAWAL (5% one-time)
- [ ] POLICY_VIOLATION (3% one-time)

---

#### ✅ Test 4.3: Submit Waiver Request
```bash
curl -X POST http://localhost:3000/api/v1/nbe/waiver-requests \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requestType": "PENALTY_WAIVER",
    "exporterId": "EXP-001",
    "accountId": 1,
    "penaltyId": 1,
    "waiverAmount": 500.00,
    "justification": "Force majeure - political unrest delayed repatriation",
    "supportingDocuments": [
      {"type": "bank_statement", "reference": "BS-2024-10"},
      {"type": "news_article", "reference": "conflict_report.pdf"}
    ]
  }'
```

**Expected Response:**
- ✅ Status: 201 Created
- ✅ Contains: `waiverId`, `requestStatus: "PENDING"`

**Test All Request Types:**
- [ ] PENALTY_WAIVER
- [ ] RETENTION_REDUCTION
- [ ] COMPLIANCE_EXTENSION

---

#### ✅ Test 4.4: Compliance Tracking
```bash
curl -X GET "http://localhost:3000/api/v1/nbe/compliance-tracking?exporterId=EXP-001" \
  -H "Authorization: $TOKEN"
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: 
  - `summary` object with totals
  - `accounts` array with compliance status (COMPLIANT, AT_RISK, NON_COMPLIANT)
  - Penalty statistics

---

### Category 5: User Management Endpoints (7 endpoints)

#### ✅ Test 5.1: Setup 2FA
```bash
curl -X POST http://localhost:3000/api/v1/users/1/2fa/setup \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: `secret`, `qrCodeUrl`, `backupCodes` (8 codes)
- ✅ Database: Row in `user_2fa_settings` with `is_enabled: false`

---

#### ✅ Test 5.2: Verify 2FA
```bash
curl -X POST http://localhost:3000/api/v1/users/1/2fa/verify \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: `twoFactorEnabled: true`
- ✅ Database: `user_2fa_settings.is_enabled` updated to true

---

#### ✅ Test 5.3: Disable 2FA
```bash
curl -X POST http://localhost:3000/api/v1/users/1/2fa/disable \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "user-password"
  }'
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: `twoFactorEnabled: false`

---

#### ✅ Test 5.4: Get User Sessions
```bash
curl -X GET http://localhost:3000/api/v1/users/1/sessions \
  -H "Authorization: $TOKEN"
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: Array of active sessions with device info, IP, user agent

---

#### ✅ Test 5.5: Revoke Specific Session
```bash
curl -X DELETE http://localhost:3000/api/v1/users/1/sessions/SESSION-123 \
  -H "Authorization: $TOKEN"
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: `sessionId`, `message: "Session revoked successfully"`

---

#### ✅ Test 5.6: Revoke All Sessions
```bash
curl -X DELETE http://localhost:3000/api/v1/users/1/sessions \
  -H "Authorization: $TOKEN"
```

**Expected Response:**
- ✅ Status: 200 OK
- ✅ Contains: `sessionsRevoked` count

---

## Summary Checklist

### Database Migrations
- [ ] Migration 066: Advanced banking tables created
- [ ] Migration 067: Advanced shipping tables created
- [ ] Migration 068: Customs extended tables created
- [ ] Migration 069: NBE retention tables created
- [ ] Migration 070: 2FA and session tables created

### Banking Endpoints (5)
- [ ] LC Transfer
- [ ] Standby LC Issuance
- [ ] Deferred Payment Recording
- [ ] Acceptance Financing
- [ ] Forex Conversion

### Shipping Endpoints (6)
- [ ] Issue B/L (all 5 types)
- [ ] Amend Booking
- [ ] Cancel Booking
- [ ] Allocate Container
- [ ] Container Stuffing Report
- [ ] Query B/Ls

### Customs Endpoints (4)
- [ ] Amend Declaration
- [ ] Cancel Declaration
- [ ] Calculate Duty
- [ ] Customs Valuation (all 6 WTO methods)

### NBE Retention Endpoints (4)
- [ ] Create Retention Account
- [ ] Calculate Penalty (all 4 violation types)
- [ ] Submit Waiver Request (all 3 types)
- [ ] Compliance Tracking

### User Management Endpoints (7)
- [ ] Setup 2FA
- [ ] Verify 2FA
- [ ] Disable 2FA
- [ ] Get Sessions
- [ ] Revoke Session
- [ ] Revoke All Sessions

---

## Notes for Automated Testing (Task 8)

Based on manual testing results, the automated test suite should cover:

1. **Happy path scenarios** - All successful operations
2. **Validation errors** - Missing fields, invalid data types
3. **Authorization checks** - Role-based access control
4. **Business logic** - Calculations, status transitions
5. **Database integrity** - Foreign key constraints, unique constraints
6. **Edge cases** - Boundary values, null handling

**Total tests planned:** 70 comprehensive tests covering all workflows

---

**Manual Testing Status:** Ready to begin  
**Next Step:** Run migrations → Test endpoints → Proceed to Task 8 (automated tests)
