# Live Testing Plan - GoCBC System

**Status:** System currently NOT RUNNING  
**Date:** January 7, 2025  
**Purpose:** Define comprehensive testing procedures to validate system functionality

---

## Current Status

✅ **Code Verification Complete** - All components analyzed and verified functional  
❌ **System Not Running** - Need to start services for live testing  
⚠️ **Docker Required** - Blockchain network requires Docker to run  

---

## Prerequisites for Testing

### 1. System Requirements
```bash
✅ Node.js 20.x
✅ Docker & Docker Compose
✅ PostgreSQL 15
✅ Go 1.21 (for chaincode)
✅ Ports available: 3000, 3001, 5432, 7050-12051, 5984-10984
```

### 2. Start the System
```bash
cd /home/guda/GoCBC

# Option 1: Full startup (recommended for first time)
./start-all.sh

# Option 2: Quick start (if already built)
./start-all.sh --skip-build

# Option 3: Check status
./status.sh
```

---

## Test Suite #1: System Health Check (5 minutes)

### 1.1 Check All Services Running
```bash
# Check blockchain network
docker ps | grep -E "(peer|orderer|couchdb|coffee)"

# Expected: 13 containers running
# - 1 orderer
# - 6 peers (ecta, ecx, banks, nbe, customs, shipping)
# - 6 couchdb instances
# - 1 coffee-chaincode

# Check API
curl http://localhost:3001/health

# Check UI
curl http://localhost:3000
```

### 1.2 Database Connectivity
```bash
# Test PostgreSQL
cd api
npm run test:db

# Expected output: Database connection successful
```

### 1.3 Blockchain Connectivity
```bash
# Test Fabric connection
node test-chaincode-connection.sh

# Expected: All 6 peers responding
```

---

## Test Suite #2: Blockchain Features Test (15 minutes)

### 2.1 X.509 Digital Signatures Test
```bash
node test-complete-blockchain.js

# Should verify:
# ✅ X.509 certificate extraction
# ✅ MSP ID capture
# ✅ Signature generation
# ✅ Transaction ID linkage
```

### 2.2 Transaction Immutability Test
```bash
node test-hash-chain.js

# Should verify:
# ✅ GetHistoryForKey() returns complete history
# ✅ Previous hash links
# ✅ No tampering possible
```

### 2.3 Multi-Org Endorsement Test
```bash
node test-full-consensus.js

# Should verify:
# ✅ MAJORITY policy (4/6 endorsement)
# ✅ All 6 organizations participating
# ✅ Consensus reached
```

### 2.4 Audit Log Test
```bash
node test-audit-working.js

# Should verify:
# ✅ CreateAuditLog() capturing all actions
# ✅ Actor tracking with X.509 identity
# ✅ Compliance flags (ECTA, EUDR, ICO)
```

---

## Test Suite #3: Document Management Test (20 minutes)

### 3.1 Upload Document Test
```bash
# Test document upload with blockchain hash storage
curl -X POST http://localhost:3001/api/v1/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test-document.pdf" \
  -F "entityType=CONTRACT" \
  -F "entityId=CONTRACT-001" \
  -F "documentType=CONTRACT_SIGNED"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "documentId": "DOC-...",
#     "hash": "e3b0c44...",
#     "blockchainTxId": "abc123..."
#   }
# }
```

### 3.2 Verify Document Test
```bash
# Test document verification
curl -X POST http://localhost:3001/api/v1/documents/DOC-001/verify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"verified": true, "remarks": "Document verified"}'

# Expected: Blockchain VerifyDocumentHash() called
```

### 3.3 Sign Document Test
```bash
# Test digital signature
curl -X POST http://localhost:3001/api/v1/documents/DOC-001/sign \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"signatureType": "APPROVE", "remarks": "Approved"}'

# Expected: X.509 signature recorded on blockchain
```

### 3.4 Retrieve Documents Test
```bash
# Test document retrieval by entity
curl http://localhost:3001/api/v1/documents/entity/CONTRACT/CONTRACT-001 \
  -H "Authorization: Bearer <token>"

# Expected: All documents linked to CONTRACT-001
```

### 3.5 Tamper Detection Test
```bash
# Modify file
# Try to verify - should fail with hash mismatch

node test-docverify.js --tamper

# Expected: TAMPER DETECTED error
```

---

## Test Suite #4: Portal Workflows Test (30 minutes)

### 4.1 ECTA Portal - Exporter Registration
```bash
# Login to ECTA portal
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "ecta_admin", "password": "ecta123"}'

# Create exporter
curl -X POST http://localhost:3001/api/v1/exporters \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Coffee Export",
    "tinNumber": "TIN001",
    "businessLicense": "BL001"
  }'

# Expected: Blockchain CreateExporter() called
```

### 4.2 Banks Portal - LC Issuance
```bash
# Create Letter of Credit
curl -X POST http://localhost:3001/api/v1/banking/lc \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "CONTRACT-001",
    "amount": 100000,
    "currency": "USD",
    "beneficiary": "EXP-001"
  }'

# Expected: Blockchain CreateLC() called
```

### 4.3 Quality Portal - Inspection
```bash
# Create quality inspection
curl -X POST http://localhost:3001/api/v1/quality/inspections \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "CONTRACT-001",
    "cupScore": 85.5,
    "grade": "Grade 1"
  }'

# Expected: Blockchain CreateQualityInspection() called
```

### 4.4 Customs Portal - Clearance
```bash
# Process customs declaration
curl -X POST http://localhost:3001/api/v1/customs/declarations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "shipmentId": "SHIP-001",
    "declarationType": "EXPORT"
  }'

# Expected: Blockchain CreateCustomsDeclaration() called
```

---

## Test Suite #5: End-to-End Workflow Test (45 minutes)

### 5.1 Complete LC-Based Export Workflow
```bash
# Run comprehensive workflow test
node test-complete-integrated-workflow.js

# This should execute:
# 1. ✅ Exporter registration → ECTA approval
# 2. ✅ Contract creation → ECTA approval
# 3. ✅ Quality inspection → Certificate issuance
# 4. ✅ LC issuance → Bank approval
# 5. ✅ Forex allocation → NBE approval
# 6. ✅ Shipment creation → Bill of Lading
# 7. ✅ Customs clearance → Declaration approval
# 8. ✅ Document examination → Bank verification
# 9. ✅ Payment release → Exporter receives funds
# 10. ✅ Audit trail → Complete history queryable
```

### 5.2 Verify Blockchain Data Persistence
```bash
# Query blockchain for complete audit trail
node show-all-transactions-simple.js

# Expected: All transactions visible with:
# - Transaction IDs
# - X.509 signer identities
# - Timestamps
# - Action types
# - Field changes
```

### 5.3 Verify Dual-Database Sync
```bash
# Test data consistency
node test-both-databases.js

# Should verify:
# ✅ PostgreSQL has cached data
# ✅ Blockchain has source truth
# ✅ blockchain_tx_id links match
# ✅ Data consistency maintained
```

---

## Test Suite #6: Security & Performance Test (30 minutes)

### 6.1 Authentication Test
```bash
# Test login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -d '{"username": "test", "password": "wrong"}'

# Expected: 401 Unauthorized

# Test JWT
curl http://localhost:3001/api/v1/exporters \
  -H "Authorization: Bearer invalid_token"

# Expected: 403 Forbidden
```

### 6.2 Role-Based Access Control Test
```bash
# Test ECTA user accessing Banks endpoint
# Expected: 403 Forbidden

# Test Bank user accessing NBE endpoint
# Expected: 403 Forbidden
```

### 6.3 Multi-Party Approval Test
```bash
# Test sequential approval workflow
node test-two-step-forex-workflow.js

# Should verify:
# ✅ Level 1 approval recorded
# ✅ Level 2 approval required
# ✅ Workflow complete only after all approvals
```

### 6.4 Performance Test
```bash
# Test concurrent operations
for i in {1..10}; do
  curl -X GET http://localhost:3001/api/v1/exporters &
done
wait

# Expected: All requests complete successfully
# Response time < 2 seconds
```

---

## Test Suite #7: UI Integration Test (20 minutes)

### 7.1 Portal Navigation Test
```
1. Open http://localhost:3000
2. Login as ECTA user
3. Navigate through all tabs
4. Verify data displays correctly
5. Verify blockchain badges show on actions
```

### 7.2 Real-Time Updates Test
```
1. Open portal in two browsers
2. Create transaction in Browser A
3. Verify update appears in Browser B
4. Check blockchain transaction ID displayed
```

### 7.3 Document Upload UI Test
```
1. Navigate to Documents tab
2. Upload test PDF
3. Verify blockchain hash calculated
4. Verify document appears in list
5. Verify verification workflow works
```

---

## Test Results Template

```markdown
## Test Execution Results

**Date:** 
**Executed By:** 
**System Version:** 

### Test Suite #1: System Health
- [ ] All containers running (13/13)
- [ ] API responding (port 3001)
- [ ] UI loaded (port 3000)
- [ ] Database connected
- [ ] Blockchain connected

### Test Suite #2: Blockchain Features
- [ ] X.509 signatures working
- [ ] Transaction immutability verified
- [ ] Multi-org consensus working
- [ ] Audit logs capturing all actions

### Test Suite #3: Document Management
- [ ] Upload working
- [ ] Verification working
- [ ] Signing working
- [ ] Retrieval working
- [ ] Tamper detection working

### Test Suite #4: Portal Workflows
- [ ] ECTA portal functional
- [ ] Banks portal functional
- [ ] Quality portal functional
- [ ] Customs portal functional

### Test Suite #5: End-to-End Workflow
- [ ] Complete LC workflow successful
- [ ] Blockchain persistence verified
- [ ] Dual-database sync verified

### Test Suite #6: Security & Performance
- [ ] Authentication working
- [ ] RBAC enforced
- [ ] Multi-party approval working
- [ ] Performance acceptable

### Test Suite #7: UI Integration
- [ ] Navigation working
- [ ] Real-time updates working
- [ ] Document UI working

### Issues Found:
(List any issues)

### Overall Result:
[ ] PASS - All tests successful
[ ] PASS WITH MINOR ISSUES
[ ] FAIL - Critical issues found
```

---

## Quick Start Testing Commands

If you want to start the system and run basic tests immediately:

```bash
# Terminal 1: Start system
cd /home/guda/GoCBC
./start-all.sh

# Wait for startup (2-3 minutes)

# Terminal 2: Run quick tests
cd /home/guda/GoCBC

# Test 1: System health
./status.sh

# Test 2: Blockchain verification
node verify-real-blockchain.js

# Test 3: Portal data test
node test-all-portals-data.js

# Test 4: Complete workflow
node test-complete-integrated-workflow.js

# Test 5: Document management
node test-documents-display.js
```

---

## Automated Test Suite

For comprehensive automated testing:

```bash
# Run all tests
./test-system-e2e.sh

# This will execute:
# - Health checks
# - Blockchain feature tests
# - Portal workflow tests
# - End-to-end scenarios
# - Performance tests

# Generate test report
./test-system-e2e.sh --report
```

---

## Troubleshooting

### If containers don't start:
```bash
# Clean restart
./stop-all.sh
docker system prune -f
./start-all.sh
```

### If blockchain connection fails:
```bash
# Regenerate credentials
./regenerate-api-wallets.sh
```

### If database connection fails:
```bash
# Check PostgreSQL
docker logs postgres-cecbs
```

### If API doesn't start:
```bash
# Check logs
cd api
npm run logs
```

---

## Expected Test Duration

- **Quick Health Check:** 5 minutes
- **Blockchain Features:** 15 minutes
- **Document Management:** 20 minutes
- **Portal Workflows:** 30 minutes
- **End-to-End Test:** 45 minutes
- **Security & Performance:** 30 minutes
- **UI Integration:** 20 minutes

**Total Comprehensive Test Time:** ~2.5 hours

**Quick Smoke Test Time:** ~15 minutes (health + basic workflow)

---

## Test Evidence Collection

For each test, collect:
1. ✅ Command executed
2. ✅ Expected result
3. ✅ Actual result
4. ✅ Screenshots (for UI tests)
5. ✅ Blockchain transaction IDs
6. ✅ Log excerpts
7. ✅ Timestamp

This evidence can be used for:
- Stakeholder demonstrations
- Technical documentation
- Deployment verification
- Compliance audits

---

## Conclusion

This testing plan provides comprehensive coverage of all system components. Once executed, it will provide concrete evidence that the system is fully functional and production-ready.

**Current Status:** Code verified ✅ | Live testing pending ⏳  
**Next Step:** Start system and execute Test Suite #1

---

**Document Created:** January 7, 2025  
**Purpose:** Live system testing guide  
**Status:** Ready for execution when system is started
