# ECTA to Customs Workflow - Implementation Summary

## What Was Implemented

### 1. Blockchain Layer (Chaincode)

#### File: `chaincodes/coffee/quality.go`
- **Added event emission** when ECTA issues export permit
- Event includes: `ExportPermitIssued` with shipment ID, permit number, and next workflow signal
- Updates shipment status to `PERMIT_ISSUED`

#### File: `chaincodes/coffee/customs.go`
- **Added ECTA permit validation** before customs declaration submission
- Checks:
  - Shipment status must be `PERMIT_ISSUED` or `CUSTOMS_DECLARED`
  - Quality inspection must have status `APPROVED`
  - Export permit number must exist (`ExportPermitNo` field)
- Returns clear error messages if prerequisites not met

#### File: `chaincodes/coffee/quality.go`
- **Added helper function** `QueryInspectionsByShipment` to support customs validation

### 2. API Layer (Backend)

#### File: `api/src/routes/customs.ts`
- **New endpoint**: `POST /api/v1/customs/declaration/auto-create-from-permit`
  - Automatically creates customs declaration when ECTA permit is issued
  - Auto-maps data from inspection, shipment, and contract
  - Validates ECTA permit exists before creating

#### File: `api/src/routes/quality.ts`
- **Enhanced endpoint**: `POST /api/v1/quality/inspections/:inspectionID/issue-permit`
  - Now automatically triggers customs declaration creation
  - Calls auto-create endpoint after permit issuance
  - Returns both permit and customs declaration info
  - Can be disabled with `autoCreateCustomsDeclaration: false`

### 3. Testing

#### File: `tests/test-ecta-customs-integration.js`
- Complete end-to-end test covering:
  - ECTA workflow (request → perform → approve → issue permit)
  - Automatic customs declaration creation
  - Customs workflow (review → inspect → clear)
  - Validation rules (cannot submit without permit)
  - Query functions (permit-ready shipments)

## How It Works

### Workflow Sequence

```
1. ECTA Quality Inspection
   ├─► Request Inspection (PENDING)
   ├─► Perform Inspection (INSPECTED)
   ├─► Approve Quality (APPROVED)
   └─► Issue Export Permit (PERMIT_ISSUED) ✅
         │
         ├─► Emit blockchain event: ExportPermitIssued
         ├─► Update shipment status: PERMIT_ISSUED
         └─► AUTO-TRIGGER: Call customs auto-create API
               │
2. Customs Declaration (Auto-Created)
   ├─► Submit Declaration (SUBMITTED) ← AUTO
   ├─► Review Declaration (UNDER_INSPECTION)
   ├─► Complete Inspection (UNDER_REVIEW)
   └─► Clear Declaration (CLEARED) ✅
         │
         └─► Update shipment status: CUSTOMS_CLEARED
```

### Data Flow

1. **ECTA issues permit** → Blockchain chaincode
2. **Blockchain emits event** → `ExportPermitIssued`
3. **API catches event** → Quality route `/issue-permit`
4. **API calls customs** → `/auto-create-from-permit`
5. **Customs validates** → Checks permit exists on blockchain
6. **Customs creates declaration** → With auto-mapped data
7. **Shipment status updated** → `CUSTOMS_DECLARED`

### Validation Rules

#### Before Customs Declaration:
✅ MUST have:
- ECTA export permit issued
- Shipment status = `PERMIT_ISSUED`
- Quality inspection status = `APPROVED`
- Export permit number populated

❌ WILL FAIL if:
- No ECTA permit
- Shipment status wrong
- Quality not approved
- Missing permit number

## Files Changed

### Chaincode (Go)
1. `chaincodes/coffee/quality.go` - Added event emission, helper function
2. `chaincodes/coffee/customs.go` - Added permit validation

### API Routes (TypeScript)
1. `api/src/routes/quality.ts` - Enhanced permit issuance with auto-trigger
2. `api/src/routes/customs.ts` - Added auto-create endpoint

### Tests (JavaScript)
1. `tests/test-ecta-customs-integration.js` - New comprehensive test

## API Changes

### New Endpoint
```
POST /api/v1/customs/declaration/auto-create-from-permit
Body: {
  inspectionId: string,
  shipmentId: string,
  exporterId: string,
  exportPermitNo: string
}
```

### Enhanced Endpoint
```
POST /api/v1/quality/inspections/:inspectionID/issue-permit
Body: {
  exportPermitNo: string,
  issuedBy: string,
  autoCreateCustomsDeclaration: boolean (default: true)
}
Response: {
  ...,
  customsDeclaration: {
    created: boolean,
    declarationId: string,
    shipmentId: string
  }
}
```

## Configuration

### Enable/Disable Auto-Creation
Set in environment or request body:
```bash
# Environment (default: true)
AUTO_CREATE_CUSTOMS_DECLARATION=true

# Request body
{
  "autoCreateCustomsDeclaration": false
}
```

## Testing

### Run Integration Test
```bash
cd tests
node test-ecta-customs-integration.js
```

### Expected Output
```
✅ Quality inspection requested
✅ Quality inspection performed
✅ Quality inspection approved
✅ ECTA export permit issued
✅ Customs declaration auto-created
✅ Declaration under inspection
✅ Customs inspection completed
✅ Customs declaration cleared!
✅ Validation works: Cannot submit without permit
🎉 ECTA → Customs integration working correctly!
```

## Error Messages

### Common Errors
1. **"customs declaration cannot be submitted: shipment status is QUALITY_APPROVED"**
   - Solution: Issue ECTA export permit first

2. **"no valid ECTA export permit found for shipment"**
   - Solution: Complete ECTA workflow through permit issuance

3. **"Declaration already exists"**
   - Solution: This is expected if auto-create was triggered multiple times

## Next Steps

### To Deploy:
1. ✅ Code is ready (chaincode compiles, TypeScript compiles)
2. Deploy updated chaincode to blockchain network
3. Restart API server to load new routes
4. Run integration test to verify

### To Use:
1. Complete ECTA workflow up to quality approval
2. Issue export permit (customs auto-created)
3. Complete customs workflow (review → inspect → clear)
4. Shipment ready for export

## Key Benefits

✅ **Automatic workflow trigger** - No manual step needed
✅ **Data validation** - Cannot bypass ECTA permit requirement
✅ **Auto-mapping** - Reduces data entry errors
✅ **Blockchain audit** - All steps recorded immutably
✅ **Clear error messages** - Easy troubleshooting
✅ **Backward compatible** - Manual creation still possible
