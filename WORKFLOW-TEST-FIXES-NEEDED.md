# Workflow Test - API Endpoint Fixes Needed

## Summary
The complete workflow test script reveals several API endpoint issues that need to be resolved before full E2E testing can succeed.

## Test Run Results (2026-11-08)
- **Application Submission**: ✅ SUCCESS (after fixing duplicate user creation issue)
- **ECTA Approval**: Needs testing after Phase 1 fix
- **Contract Creation**: ❌ FAILED - Field name mismatches
- **Quality Inspection**: ❌ FAILED - Missing shipmentID requirement
- **Banking/LC**: ❌ FAILED - Endpoint not found
- **Forex Allocation**: ⚠️ WARNING - Contract dependency issue
- **Customs Declaration**: ❌ FAILED - Endpoint not found  
- **Shipment Creation**: ❌ FAILED - Field validation errors

---

## Issue 1: Application Submission Flow ✅ IDENTIFIED

**Problem**: Script was creating user account manually, then trying to submit application with same email, causing "EMAIL_EXISTS" error.

**Root Cause**: The `/api/v1/exporters/exporter-applications` endpoint is PUBLIC and creates BOTH the application AND a temporary user account automatically.

**Solution**: Remove manual user creation step. Let the application endpoint handle user creation.

**Status**: Script updated to fix this issue.

---

## Issue 2: Contract Creation - Field Name Mismatches ❌

**Endpoint**: `POST /api/v1/contracts`

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {"field": "contractID", "message": "Contract ID is required"},
      {"field": "exporterID", "message": "Exporter ID is required"},
      {"field": "buyerID", "message": "Buyer ID is required"},
      {"field": "buyerBank", "message": "Buyer bank (issuing bank) is required"},
      {"field": "exporterBank", "message": "Exporter bank (advising bank) is required"},
      {"field": "eudrRequired", "message": "EUDR required must be a boolean"}
    ]
  }
}
```

**Current Request**:
```json
{
  "contractId": "CONT-...",
  "exporterId": "EXP...",
  "buyerId": "BUYER...",
  ...
}
```

**Problem**: API expects **PascalCase** field names (contractID, exporterID, buyerID) but script sends **camelCase** (contractId, exporterId, buyerId).

**Required Fields Missing**:
- `buyerBank` - issuing bank name
- `exporterBank` - advising bank name  
- `eudrRequired` - boolean flag

**Needs Investigation**: Check the contracts route file to see actual field name expectations.

---

## Issue 3: Quality Inspection - Requires Shipment ID ❌

**Endpoint**: `POST /api/v1/quality/inspections`

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {"field": "inspectionID", "message": "Inspection ID is required"},
      {"field": "exporterID", "message": "Exporter ID is required"},
      {"field": "shipmentID", "message": "Shipment ID is required"}
    ]
  }
}
```

**Problem**: Quality inspection requires `shipmentID`, but logically quality inspection happens BEFORE shipping.

**Questions**:
1. Should quality inspection accept `contractID` instead of `shipmentID`?
2. Or should the workflow be: Contract → Shipment Created → Quality Inspection → Customs → Actual Shipping?

**Current Logical Flow**:
```
Application → Contract → Quality Inspection → LC → Forex → Customs → Shipment
```

**Possibly Correct Flow**:
```
Application → Contract → Shipment Record Created → Quality Inspection → LC → Customs Clearance → Actual Shipping
```

**Needs Investigation**: Check the quality inspection route to understand the intended flow.

---

## Issue 4: Banking/LC Endpoint Not Found ❌

**Endpoint**: `POST /api/v1/banking/lc`

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Route /api/v1/banking/lc not found"
  }
}
```

**Problem**: No `/banking` route exists.

**Needs Investigation**:
1. Check if LC management is under `/api/v1/forex/lc` or `/api/v1/nbe/lc-monitoring`
2. Check available banking endpoints
3. Determine correct endpoint for LC issuance

---

## Issue 5: Customs Declaration Endpoint Not Found ❌

**Endpoint**: `POST /api/v1/customs/declarations`

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Route /api/v1/customs/declarations not found"
  }
}
```

**Problem**: No `/customs/declarations` route exists.

**Needs Investigation**:
1. Check actual customs endpoints in the portals route or dedicated customs route
2. May be under `/api/v1/portals/customs/declarations` or similar

---

## Issue 6: Shipment Creation - Field Validation Errors ❌

**Endpoint**: `POST /api/v1/shipments`

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {"field": "shipmentID", "message": "Shipment ID is required"},
      {"field": "contractID", "message": "Contract ID is required"},
      {"field": "exporterID", "message": "Exporter ID is required"},
      {"field": "buyerID", "message": "Buyer ID is required"},
      {"field": "grade", "message": "Grade is required"},
      {"field": "icoNumber", "message": "ICO number is required"},
      {"field": "channel", "message": "Channel is required"},
      {"field": "forexRate", "message": "Forex rate must be a number"},
      {"field": "valueUSD", "message": "Value USD must be a number"},
      {"field": "eudrCompliant", "message": "EUDR compliant must be a boolean"}
    ]
  }
}
```

**Current Request**:
```json
{
  "shipmentId": "SHIP-...",
  "contractId": "CONT-...",
  "exporterId": "EXP...",
  ...
}
```

**Problems**:
1. Same PascalCase vs camelCase issue (shipmentID vs shipmentId)
2. Missing required fields:
   - `buyerID`
   - `grade` - coffee grade
   - `icoNumber` - ICO certificate number
   - `channel` - shipping channel
   - `forexRate` - exchange rate
   - `valueUSD` - shipment value in USD
   - `eudrCompliant` - EUDR compliance flag

---

## Issue 7: Forex Allocation - Contract Not Found (Cascading Failure) ⚠️

**Endpoint**: `POST /api/v1/forex/request`

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "REQUEST_FAILED",
    "message": "No valid responses from any peers. Errors:\n    peer=peer0.ecta.cecbs.et, status=500, message=RequestForex: contract CONT-20261108130641 does not exist"
  }
}
```

**Problem**: Forex allocation failed because the contract creation failed earlier (Issue #2).

**Status**: This will be resolved once contract creation is fixed.

---

## Recommended Next Steps

### 1. Investigate Actual API Endpoints
```bash
# Search for route definitions
grep -r "router.post.*contracts" api/src/routes/
grep -r "router.post.*quality" api/src/routes/
grep -r "router.post.*banking" api/src/routes/
grep -r "router.post.*customs" api/src/routes/
grep -r "router.post.*shipments" api/src/routes/
```

### 2. Check Field Name Conventions
- Determine if API uses PascalCase or camelCase
- Check validation schemas in route files
- Update test script to match actual API expectations

### 3. Verify Workflow Order
- Confirm the correct sequence of operations
- Understand dependencies between steps
- Identify which records must exist before creating dependent records

### 4. Create API Documentation
- Document all POST endpoints with required fields
- Specify field names, types, and validation rules
- Document workflow dependencies

---

## Current Test Script Path
`/home/guda/GoCBC/tests/complete-workflow-test.sh`

## Test Output Path
`/tmp/workflow-test-output.txt`
`/tmp/complete-workflow-test.txt`
