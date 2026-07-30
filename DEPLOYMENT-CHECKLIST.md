# ECTA to Customs Integration - Deployment Checklist

## Pre-Deployment Verification

### ✅ Code Compilation
- [x] Chaincode compiles: `cd chaincodes/coffee && go build` ✓
- [x] TypeScript compiles: `cd api && npx tsc --noEmit` ✓
- [x] No syntax errors

### ✅ Files Modified
- [x] `chaincodes/coffee/quality.go` - Event emission + helper function
- [x] `chaincodes/coffee/customs.go` - ECTA permit validation
- [x] `api/src/routes/quality.ts` - Auto-trigger implementation
- [x] `api/src/routes/customs.ts` - Auto-create endpoint
- [x] `tests/test-ecta-customs-integration.js` - Integration test

## Deployment Steps

### Step 1: Update Chaincode on Blockchain

```bash
# Navigate to chaincode directory
cd chaincodes/coffee

# Build chaincode
go build

# Package chaincode (if using Fabric 2.x)
peer lifecycle chaincode package coffee.tar.gz \
  --path . \
  --lang golang \
  --label coffee_1.0

# Install on all peers (repeat for each org)
peer lifecycle chaincode install coffee.tar.gz

# Approve and commit (follow your network's upgrade process)
```

### Step 2: Restart API Server

```bash
# Stop current API server
pm2 stop cecbs-api
# or
kill $(lsof -t -i:3001)

# Navigate to API directory
cd api

# Install dependencies (if needed)
npm install

# Start API server
npm start
# or with PM2
pm2 start ecosystem.config.js
```

### Step 3: Verify Deployment

```bash
# Test API is running
curl http://localhost:3001/health

# Run integration test
cd tests
node test-ecta-customs-integration.js
```

## Post-Deployment Verification

### ✅ API Endpoints Available
```bash
# Check quality endpoint
curl -X POST http://localhost:3001/api/v1/quality/inspections/TEST/issue-permit

# Check customs endpoint
curl -X POST http://localhost:3001/api/v1/customs/declaration/auto-create-from-permit

# Check permit-ready endpoint
curl http://localhost:3001/api/v1/customs/permit-ready
```

### ✅ Blockchain Functions Working
```bash
# Test from peer container
peer chaincode query -C cecbschannel -n coffee -c '{"Args":["QueryInspectionsByShipment","SHIP001"]}'

# Verify event emission
peer chaincode invoke -C cecbschannel -n coffee -c '{"Args":["IssueExportPermit","INS001","PERMIT001","Officer"]}'
# Check for ExportPermitIssued event in logs
```

### ✅ Integration Test Passes
```bash
cd tests
node test-ecta-customs-integration.js

# Expected: All tests pass with green checkmarks
```

## Rollback Plan

If issues occur:

### 1. Revert Chaincode
```bash
# Install previous chaincode version
peer lifecycle chaincode install coffee_previous.tar.gz
peer lifecycle chaincode approve ...
peer lifecycle chaincode commit ...
```

### 2. Revert API Code
```bash
cd api
git checkout main src/routes/quality.ts src/routes/customs.ts
npm start
```

### 3. Verify System Works
```bash
# Run original workflow tests
node tests/test-complete-workflow.js
```

## Monitoring

### Check Logs

```bash
# API logs
tail -f api/logs/combined.log | grep -i "customs\|permit"

# Peer logs (Fabric)
docker logs peer0.ecta.cecbs.com 2>&1 | grep -i "ExportPermitIssued"

# Check for errors
grep -i "error\|failed" api/logs/error.log
```

### Key Metrics to Monitor
- ECTA permit issuance success rate
- Customs declaration auto-creation rate
- Validation rejection rate
- End-to-end workflow completion time

## Troubleshooting

### Issue: Customs declaration not auto-created
**Check:**
1. API logs for errors in quality route
2. `autoCreateCustomsDeclaration` flag in request
3. Network connectivity between quality and customs API

**Fix:**
```bash
# Manually trigger auto-create
curl -X POST http://localhost:3001/api/v1/customs/declaration/auto-create-from-permit \
  -H "Content-Type: application/json" \
  -d '{"inspectionId":"INS001","shipmentId":"SHIP001","exporterId":"EXP001","exportPermitNo":"ECTA-001"}'
```

### Issue: Validation errors on customs submission
**Check:**
1. ECTA permit was issued on blockchain
2. Shipment status is `PERMIT_ISSUED`
3. Quality inspection has `ExportPermitNo` field

**Fix:**
```bash
# Query inspection to verify permit
peer chaincode query -C cecbschannel -n coffee \
  -c '{"Args":["ReadInspection","INS001"]}'

# Check for ExportPermitNo field
```

### Issue: TypeScript compilation errors
**Check:**
```bash
cd api
npx tsc --noEmit
```

**Fix:**
- Review error messages
- Fix type issues
- Ensure all imports are correct

## Success Criteria

✅ All checks must pass:
- [ ] Chaincode deploys without errors
- [ ] API starts successfully
- [ ] Integration test passes (100%)
- [ ] ECTA permit issuance works
- [ ] Customs auto-creation works
- [ ] Validation rules enforce permit requirement
- [ ] No regression in existing workflows

## Contact

For deployment support:
- System Admin: [contact info]
- Blockchain Team: [contact info]
- API Team: [contact info]

## Documentation References
- Implementation Summary: `IMPLEMENTATION-SUMMARY.md`
- Integration Guide: `ECTA-CUSTOMS-WORKFLOW-INTEGRATION.md`
- Workflow Diagram: `WORKFLOW-STATUS-DIAGRAM.md`
- Quick Start: `CUSTOMS-PORTAL-QUICK-START.md`
