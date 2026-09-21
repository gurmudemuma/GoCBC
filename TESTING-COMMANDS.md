# Testing Commands Reference

Quick reference for testing the blockchain system.

---

## Run Expert Test Suite

**Full blockchain integration test (100% pass rate expected):**
```bash
node expert-blockchain-test.js
```

**Expected Output:**
```
Total Tests: 32
✅ Passed: 32
❌ Failed: 0
Pass Rate: 100.0%
```

---

## Verify Blockchain Integration

**Check blockchain transactions and signatures:**
```bash
node verify-real-blockchain.js
```

**Expected Output:**
```
📊 Total Blockchain Transactions: 139+
📝 Documents Verified: 44+
💰 LCs Processed: 17+
✅ VERIFIED: Real Hyperledger Fabric blockchain
```

---

## Fix Document Signatures (if needed)

**Backfill blockchain signatures for verified documents:**
```bash
node fix-document-signatures.js
```

**When to run:** If document signature coverage is below 90%

---

## Complete Full Workflow Test

**Test complete LC workflow (Tab 0 → Tab 5):**
```bash
node complete-full-banks-workflow.js
```

**Note:** This updates PostgreSQL directly for testing. Real workflow goes through UI.

---

## Quick Status Check

**Check LC status distribution:**
```bash
node quick-workflow-test.js
```

---

## Test N/A Fields

**Verify field normalization and data completeness:**
```bash
node test-na-fields.js
```

---

## Database Queries

### Check Blockchain Signatures
```sql
SELECT COUNT(*) FROM blockchain_signatures;
SELECT chaincode_function, COUNT(*) FROM blockchain_signatures GROUP BY chaincode_function;
```

### Check Document Coverage
```sql
SELECT 
  COUNT(*) as total_verified,
  COUNT(DISTINCT bs.entity_id) as with_signatures
FROM documents d
LEFT JOIN blockchain_signatures bs ON bs.entity_id = d.document_id
WHERE d.verification_status = 'verified';
```

### Check LC Status
```sql
SELECT status, COUNT(*) FROM letters_of_credit GROUP BY status;
```

---

## Restart Services

### Restart API
```bash
bash restart-api.sh
```

### Restart UI
```bash
bash restart-ui.sh
```

### Restart All
```bash
bash restart-all.sh
```

---

## Build Commands

### Build API
```bash
cd api && npm run build
```

### Build UI
```bash
cd ui && npm run build
```

---

## Check Logs

### API Logs
```bash
tail -f logs/api.log
```

### Blockchain Peer Logs
```bash
docker logs peer0.banks.cecbs.et -f
```

---

## Browser Testing

1. **Clear Cache:** Ctrl+F5 (force refresh)
2. **Open DevTools:** F12
3. **Check Console:** Look for [TAB] logs
4. **Test Workflow:**
   - Login as bank user
   - Navigate to Banks Portal
   - Check each tab shows data
   - Click on LC to view details
   - Verify no N/A values

---

## Expected Results

### ✅ All Tests Should Show:
- Blockchain signatures: Present
- Transaction IDs: Valid 64-char hex
- MSP organizations: 10+ active
- Document coverage: >90%
- Field normalization: Working
- Parallel fetching: Active
- Pass rate: 100%

### ❌ If Tests Fail:
1. Check API is running: `curl http://localhost:3001/api/v1/health`
2. Check database connection: `psql -U cecbs -d cecbs -c "SELECT 1;"`
3. Check blockchain network: `docker ps | grep peer`
4. Review logs: `tail -f logs/api.log`
5. Rebuild API: `cd api && npm run build`
6. Restart services: `bash restart-all.sh`

---

## Troubleshooting

### Issue: Tests fail with "connection refused"
**Solution:** API server not running
```bash
bash restart-api.sh
```

### Issue: "relation does not exist" errors
**Solution:** Database not initialized
```bash
cd api && npm run migrate
```

### Issue: Blockchain timeout errors
**Solution:** Fabric network not running
```bash
docker-compose -f docker-compose-fabric.yml up -d
```

### Issue: N/A values still showing
**Solution:** Browser cache
```
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Restart API server
```

---

## Quick Health Check

**One command to check everything:**
```bash
echo "=== API Health ===" && \
curl -s http://localhost:3001/api/v1/health | jq && \
echo "=== Database ===" && \
psql -U cecbs -d cecbs -c "SELECT COUNT(*) FROM blockchain_signatures;" && \
echo "=== Blockchain ===" && \
docker ps --filter "name=peer" --format "{{.Names}}: {{.Status}}"
```

---

## Documentation

- **Blockchain Audit:** `BLOCKCHAIN-INTEGRATION-AUDIT.md`
- **Expert Test Report:** `EXPERT-TEST-REPORT.md`
- **Issues Fixed:** `ISSUES-FIXED-SUMMARY.md`
- **Real Blockchain Flow:** `REAL-BLOCKCHAIN-FLOW.md`
- **N/A Fields Fix:** `NA-FIELDS-FIX-SUMMARY.md`

---

**Quick Start:**
```bash
# 1. Run expert test
node expert-blockchain-test.js

# 2. If 100% pass → System is good!
# 3. If any failures → Check logs and restart services
```
