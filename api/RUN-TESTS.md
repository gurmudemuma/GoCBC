# Quick Test Execution Guide

## ✅ All Fixes Complete - Tests Ready to Run

### Prerequisites
```bash
# Make sure you're in the API directory
cd /home/guda/GoCBC/api

# Verify compilation
npm run build
# Should show: Exit Code: 0 ✅
```

---

## Test Option 1: Integration Test (Automated Full Workflow)

### Run the automated test that exercises the complete workflow:

```bash
# Start API server (Terminal 1)
npm run dev

# Run integration test (Terminal 2)
node tests/integration/workflow-integration-test.js
```

### What it tests:
1. ✅ Contract registration (17 fields)
2. ✅ Contract approval
3. ✅ LC issuance (19 fields) + Forex auto-trigger
4. ✅ Forex allocation + 40% retention
5. ✅ Shipment creation + Quality task auto-creation
6. ✅ Quality approval + Customs auto-trigger
7. ✅ Customs approval
8. ✅ Payment recording + 40% retention

### Expected output:
```
╔════════════════════════════════════════════════════════════════════════════╗
║                            TEST SUMMARY                                    ║
╚════════════════════════════════════════════════════════════════════════════╝

Total Steps: 8
Passed: 8
Failed: 0
Duration: 15.23s

✅ ALL TESTS PASSED - Workflow is fully functional!
```

---

## Test Option 2: Parameter Signature Validation

### Verify all service method signatures are correct:

```bash
npx tsc tests/unit/service-parameters-test.ts --noEmit --skipLibCheck
```

### Expected output:
```
Exit Code: 0 ✅
```

This confirms:
- ✅ ContractService: registerContract, approveContract, rejectContract
- ✅ LCService: issueLC
- ✅ ForexService: allocateForex (both forexID and forexId)
- ✅ ShipmentService: createQualityInspectionTask
- ✅ PaymentService: recordPayment
- ✅ CustomsService: submitDeclaration

---

## Test Option 3: Manual API Testing

### Use curl, Postman, or any HTTP client:

```bash
# Base URL
BASE_URL="http://localhost:3001/api"

# 1. Register Contract
curl -X POST "$BASE_URL/contracts/register" \
  -H "Content-Type: application/json" \
  -d '{
    "contractID": "TEST-001",
    "exporterID": "EXP001",
    "buyerID": "BUYER001",
    "buyerName": "Test Buyer Inc.",
    "buyerCountry": "USA",
    "coffeeType": "Arabica",
    "quantity": 1000,
    "pricePerKg": 10,
    "currency": "USD",
    "paymentMethod": "LC",
    "eudrRequired": true
  }'

# 2. Approve Contract
curl -X POST "$BASE_URL/contracts/TEST-001/approve" \
  -H "Content-Type: application/json" \
  -d '{
    "approvedBy": "admin",
    "reason": "Compliance verified"
  }'

# 3. Issue LC (will auto-trigger Forex)
curl -X POST "$BASE_URL/banking/lc/issue" \
  -H "Content-Type: application/json" \
  -d '{
    "lcID": "LC-001",
    "lcNumber": "LC-2024-001",
    "contractID": "TEST-001",
    "exporterID": "EXP001",
    "issuingBank": "Commercial Bank of Ethiopia",
    "advisingBank": "Chase Bank",
    "beneficiary": "Test Exporter",
    "applicant": "Test Buyer",
    "amount": 10000,
    "currency": "USD",
    "expiryDate": "2025-12-31T00:00:00Z",
    "latestShipmentDate": "2025-11-30T00:00:00Z",
    "portOfLoading": "Addis Ababa",
    "portOfDischarge": "New York",
    "paymentTerms": "At sight",
    "partialShipment": false,
    "transhipment": false
  }'

# 4. Allocate Forex with 40% retention
curl -X POST "$BASE_URL/forex/FOREX-001/allocate" \
  -H "Content-Type: application/json" \
  -d '{
    "lcID": "LC-001",
    "amount": 10000,
    "exchangeRate": 115.5,
    "retentionRate": 40,
    "officer": "nbe_officer",
    "approvalRef": "NBE-001",
    "expiryDate": "2026-06-30T00:00:00Z"
  }'

# Continue with remaining steps...
```

---

## Verification Checklist

After running tests, verify:

### ✅ Contract Service
- [ ] Contract registered with all fields (buyerName, buyerBank, exporterBank, documents, supersedesContractID)
- [ ] Contract approved using object parameter
- [ ] Contract rejected using object parameter

### ✅ LC Service
- [ ] LC issued with all 19 fields
- [ ] Forex request auto-created (check logs for "🔥 LC issued - triggering forex auto-request")

### ✅ Forex Service
- [ ] Forex allocated using forexID parameter (capital ID)
- [ ] 40% retention calculated: $10,000 → $4,000 retention, $6,000 release
- [ ] Retention amounts stored in database

### ✅ Shipment Service
- [ ] Shipment created successfully
- [ ] Quality inspection task auto-created (check quality_inspections table)

### ✅ Quality Service
- [ ] Quality inspection approved
- [ ] Customs declaration auto-triggered (check logs for "🔥 Triggering customs declaration")

### ✅ Customs Service
- [ ] Customs declaration submitted
- [ ] Customs declaration approved

### ✅ Payment Service
- [ ] Payment recorded with 40% retention
- [ ] Retention: $10,000 → $4,000 retention, $6,000 release
- [ ] Retention amounts stored in database

---

## Troubleshooting

### If integration test fails:

1. **Check API server is running:**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Check blockchain network:**
   - Verify Hyperledger Fabric network is up
   - Check connection settings

3. **Check database:**
   ```bash
   # Verify PostgreSQL is running
   pg_isready
   
   # Check tables exist
   psql -d your_database -c "\dt"
   ```

4. **Check logs:**
   - API server terminal for errors
   - Look for "❌" error markers

### If parameter validation fails:

1. **Re-run compilation:**
   ```bash
   npm run build
   ```

2. **Check for syntax errors:**
   ```bash
   npx tsc --noEmit
   ```

---

## Success Indicators

### ✅ Green Lights (All should pass):
- TypeScript compilation: Exit Code 0
- Parameter validation: Exit Code 0
- Integration test: "ALL TESTS PASSED"
- API server: No error logs
- Database: All records created with correct values
- Blockchain: All transactions have tx_id

### 🔥 Auto-Trigger Logs (Should see these):
- "🔥 LC issued - triggering forex auto-request"
- "✅ Quality inspection task created"
- "🔥 Triggering customs declaration"

### 💰 40% Retention Logs (Should see these):
- "Forex allocated with retention: $4,000 (40%)"
- "Payment recorded with retention: $4,000 (40%)"

---

## Quick Status Check

```bash
# One-liner to verify everything compiles
cd /home/guda/GoCBC/api && npm run build && echo "✅ READY FOR TESTING"
```

**Expected:** `✅ READY FOR TESTING`

---

**Current Status: 🎯 ALL SYSTEMS GO**
