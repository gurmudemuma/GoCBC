# Banks Portal Testing Guide

**Date:** 2026-09-18  
**Purpose:** Step-by-step testing guide for Banks Portal workflow

## Prerequisites
- ✅ Backend running: `cd api && npm start`
- ✅ Blockchain network running: `cd blockchain && ./network.sh up`
- ✅ Frontend running: `cd ui && npm start`
- ✅ Test exporter account created with sample LCs
- ✅ Test bank user logged in

## Test Scenario: Complete LC Lifecycle

### Starting State
```javascript
LC ID: LC1787055024941
Exporter: Coffee Exporter ABC
Amount: $50,000 USD
Status: REQUESTED (created by exporter)
Documents: 12 uploaded (all types)
```

---

## Test 1: LC Approval & Issuance (Tab 0)

### Steps:
1. Login as bank user
2. Navigate to Banks Portal → Tab 0 (Payment Methods & LC Review)
3. Verify LC appears in the list with status `REQUESTED`
4. Click "View Details" on the LC
5. Review LC information
6. Click "Approve LC" button
7. Verify status changes to `APPROVED`
8. Click "Issue LC" button
9. Verify status changes to `ISSUED`

### Expected Results:
- ✅ LC visible with status `REQUESTED`
- ✅ Approve button creates blockchain signature
- ✅ Status updates to `APPROVED` immediately
- ✅ Issue button enabled after approval
- ✅ Status updates to `ISSUED` immediately
- ✅ LC moves to Tab 1 filter

### Verification Commands:
```bash
# Check blockchain signature for approval
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["QuerySignaturesByLC","LC1787055024941"]}'

# Expected output: 2 signatures (approve + issue)
```

---

## Test 2: Forex Allocation (Tab 1)

### Steps:
1. Navigate to Tab 1 (Forex Allocation)
2. Verify LC appears with status `ISSUED`
3. Check NBE forex pool balance (should show available forex)
4. Click "Allocate Forex" on the LC
5. Enter allocation amount: $50,000
6. Click "Confirm Allocation"
7. Verify status changes to `FOREX_ALLOCATED`

### Expected Results:
- ✅ LC visible with status `ISSUED`
- ✅ NBE forex pool shows available balance
- ✅ Allocation creates blockchain signature
- ✅ Status updates to `FOREX_ALLOCATED`
- ✅ Forex pool balance decreases by $50,000
- ✅ LC moves to Tab 2 filter

### Verification Commands:
```bash
# Check forex allocation
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["GetLC","LC1787055024941"]}'

# Expected: forexAllocated = 50000, status = FOREX_ALLOCATED
```

### NBE Portal Check:
- Open NBE Portal in another browser tab
- Navigate to Forex Monitoring
- Verify allocation appears in real-time
- Check forex pool balance decreased

---

## Test 3: Document Examination (Tab 2) ✅ CRITICAL

### Steps:
1. Navigate to Tab 2 (Document Examination)
2. Verify LC appears with status `FOREX_ALLOCATED`
3. Click "Examine Documents" button
4. Dialog opens showing 12 documents:
   - Bill of Lading
   - Commercial Invoice
   - Packing List
   - Certificate of Origin
   - Insurance Certificate
   - Quality Certificate
   - Phytosanitary Certificate
   - Weight Certificate
   - Fumigation Certificate
   - ICO Certificate
   - EUR1 Certificate
   - Customs Declaration

5. For EACH document:
   a. Click "View" to open document (PDF/image)
   b. Review document content
   c. Click "Approve" button
   d. Verify button shows loading spinner immediately
   e. Add remarks: "Document compliant with UCP 600"
   f. Verify document status changes to "verified"
   g. Verify blockchain signature created

6. After all 12 documents verified:
   - Verify LC status changes to `UTILIZED`
   - Verify LC remains visible in Tab 2 (historical view)
   - Verify LC appears in Tab 3 (Payment Release)

### Expected Results:
- ✅ LC visible with status `FOREX_ALLOCATED`
- ✅ All 12 documents listed in examination dialog
- ✅ Each approve button shows loading state immediately (optimistic update)
- ✅ Each document verification creates blockchain signature
- ✅ 12 blockchain signatures total (one per document)
- ✅ Each signature includes:
  - `signatureId`: `SIG_{docId}_{mspId}_{timestamp}`
  - `documentId`: Document ID
  - `action`: "APPROVE"
  - `verifier`: Bank user's certificate CN
  - `mspId`: Bank's MSP ID
  - `txId`: Blockchain transaction ID
  - `remarks`: Verification comments

- ✅ LC status changes to `UTILIZED` after all docs verified
- ✅ LC still visible in Tab 2 (keeps historical records)
- ✅ LC appears in Tab 3

### Verification Commands:
```bash
# Check all document signatures
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["QuerySignaturesByLC","LC1787055024941"]}'

# Expected: 14 signatures total (2 from Tab 0 + 12 from Tab 2)

# Check specific document signature
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["QuerySignaturesByDocument","DOC-123"]}'

# Check LC status
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["GetLC","LC1787055024941"]}'

# Expected: status = UTILIZED
```

### Backend Logs Check:
```bash
tail -f api/api.log | grep -i signature

# Expected output:
# [Fabric] Document verification signature created: SIG_DOC123_BankMSP_1726653240
# [Fabric] Blockchain TxId: a1b2c3d4e5f6...
```

### Exporter Portal Check:
- Open Exporter Portal
- Navigate to "My LCs"
- Click on LC1787055024941
- Verify all 12 documents show status "VERIFIED"
- Verify each document shows verifier name and timestamp
- Verify blockchain signature IDs visible

### KPI Check (Tab 2):
- **Pending Examination**: Should decrease by 1
- **Examined Today**: Should increase by 1
- **Avg Processing Time**: Should update with real calculation
- **Compliance Rate**: Should update (verified/total documents)

---

## Test 4: Payment Release (Tab 3) ✅ CRITICAL

### Steps:
1. Navigate to Tab 3 (Payment Release)
2. Verify LC appears with status `UTILIZED`
3. Verify "Release Payment" button is enabled
4. Click "Release Payment" button
5. Confirm payment details:
   - Amount: $50,000 USD
   - Beneficiary: Coffee Exporter ABC
   - Payment Method: SWIFT MT103
6. Click "Confirm Release"
7. Verify status changes to `PAYMENT_RELEASED`
8. Verify LC moves to Tab 5 (Settlement)

### Expected Results:
- ✅ Only LCs with status `UTILIZED` appear in Tab 3
- ✅ "Release Payment" button enabled for UTILIZED LCs
- ✅ Payment release creates blockchain signature
- ✅ Payment entity created in blockchain
- ✅ Status updates to `PAYMENT_RELEASED`
- ✅ LC appears in Tab 5

### Verification Commands:
```bash
# Check payment entity created
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["GetPayment","PAY-123"]}'

# Expected output:
{
  "paymentId": "PAY-123",
  "lcId": "LC1787055024941",
  "amount": 50000,
  "currency": "USD",
  "beneficiary": "Coffee Exporter ABC",
  "paymentMethod": "SWIFT",
  "status": "RELEASED",
  "blockchainTxId": "xyz789..."
}

# Check LC status
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["GetLC","LC1787055024941"]}'

# Expected: status = PAYMENT_RELEASED
```

### Exporter Portal Check:
- Navigate to Exporter Portal
- Verify payment notification received
- Check payment status: "RELEASED"
- Verify payment details match
- Verify blockchain TxId visible

---

## Test 5: SWIFT Messages (Tab 4)

### Steps:
1. Navigate to Tab 4 (SWIFT MT700 Messages)
2. Verify LC appears in list (if SWIFT messages exist)
3. Click "View SWIFT Messages"
4. Verify MT700 message content
5. Check message status

### Expected Results:
- ✅ LCs with SWIFT messages appear
- ✅ MT700 format compliant
- ✅ Message hash stored in blockchain

---

## Test 6: LC Settlement (Tab 5)

### Steps:
1. Navigate to Tab 5 (LC Settlement)
2. Verify LC appears with status `PAYMENT_RELEASED`
3. Click "Settle Payment" button
4. Confirm settlement details
5. Click "Confirm Settlement"
6. Verify status changes to `SETTLED`

### Expected Results:
- ✅ Only LCs with status `PAYMENT_RELEASED` or `SETTLED` appear
- ✅ Settlement creates blockchain signature
- ✅ Status updates to `SETTLED`
- ✅ Final state reached

### Verification Commands:
```bash
# Check final LC status
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["GetLC","LC1787055024941"]}'

# Expected: status = SETTLED

# Check all signatures for complete audit trail
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["QuerySignaturesByLC","LC1787055024941"]}'

# Expected: 16+ signatures total:
# - 2 from Tab 0 (approve + issue)
# - 1 from Tab 1 (forex allocation)
# - 12 from Tab 2 (document verifications)
# - 1 from Tab 3 (payment release)
# - 1 from Tab 5 (settlement)
```

### NBE Portal Check:
- Open NBE Portal
- Navigate to Completed Transactions
- Verify LC appears as SETTLED
- Check forex utilization recorded
- Verify compliance status

### Exporter Portal Check:
- Navigate to Exporter Portal
- Verify LC shows status "SETTLED"
- Verify payment confirmed
- Verify settlement date recorded
- Verify complete audit trail visible

---

## KPI Validation (All Tabs)

### Tab 0: Payment Methods
- **Pending Approvals**: Count of `REQUESTED` LCs
- **Approved Today**: Count of LCs approved today
- **Issued Today**: Count of LCs issued today
- **Total Value**: Sum of all LC amounts

### Tab 1: Forex Allocation
- **Pending Allocation**: Count of `ISSUED` LCs
- **Allocated Today**: Count of forex allocations today
- **Total Allocated**: Sum of all forex allocated
- **Available Pool**: NBE forex pool balance

### Tab 2: Document Examination ✅
- **Pending Examination**: Count of `FOREX_ALLOCATED` LCs
- **Examined Today**: Count of documents verified today
- **Avg Processing Time**: Calculated from upload → verify timestamps
- **Compliance Rate**: (Verified docs / Total docs) × 100%

### Tab 3: Payment Release
- **Pending Release**: Count of `UTILIZED` LCs
- **Released Today**: Count of payments released today
- **Total Amount**: Sum of payments released
- **Payment Method**: Distribution by SWIFT/ACH/Wire

### Tab 5: Settlement
- **Pending Settlement**: Count of `PAYMENT_RELEASED` LCs
- **Settled Today**: Count of settlements today
- **Total Settled**: Sum of settled amounts
- **Settlement Time**: Avg time from release → settlement

---

## Error Scenarios to Test

### Document Examination Errors
1. **Reject Document**:
   - Click "Reject" instead of "Approve"
   - Add remarks explaining rejection
   - Verify document status = "rejected"
   - Verify LC status remains `FOREX_ALLOCATED`
   - Verify blockchain signature created for rejection

2. **Mixed Approval/Rejection**:
   - Approve 10 documents
   - Reject 2 documents
   - Verify LC status remains `FOREX_ALLOCATED`
   - Verify exporter notified of rejected documents

3. **Network Timeout**:
   - Simulate slow blockchain response
   - Verify optimistic UI update
   - Verify error handling if blockchain fails
   - Verify UI reverts on error

### Payment Release Errors
1. **Insufficient Forex**:
   - Try to release payment when forex depleted
   - Verify error message shown
   - Verify LC status unchanged

2. **Invalid LC Status**:
   - Try to release payment for LC with status != `UTILIZED`
   - Verify blocked by backend validation

---

## Performance Testing

### Load Test: Multiple Document Examinations
```bash
# Create 10 LCs with 12 documents each
# Total: 120 document verifications

for i in {1..10}; do
  # Create LC
  # Upload 12 documents
  # Verify all documents
done

# Expected:
# - All 120 signatures created
# - No blockchain congestion
# - All UI updates within 3 seconds
# - No memory leaks in frontend
```

### Concurrent User Test
```bash
# 5 bank users examining documents simultaneously
# Expected:
# - No race conditions
# - All signatures unique
# - No duplicate verifications
# - Blockchain handles concurrent writes
```

---

## Blockchain Audit Trail Verification

### Complete Signature Chain
```bash
# Query all signatures for LC
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["QuerySignaturesByLC","LC1787055024941"]}'

# Verify chain of custody:
1. LC Approval (Bank)
2. LC Issuance (Bank)
3. Forex Allocation (Bank)
4. Document 1 Verification (Bank)
5. Document 2 Verification (Bank)
   ... (12 documents)
16. Payment Release (Bank)
17. Settlement (Bank)

# Each signature must have:
- Unique signatureId
- Valid X.509 certificate
- Correct MSP ID
- Proper timestamp sequence
- Valid blockchain TxId
```

---

## Success Criteria

### Must Pass All:
- [ ] All 6 tabs display correct LCs based on status
- [ ] Status transitions follow blockchain validation rules
- [ ] All blockchain signatures created successfully
- [ ] Optimistic UI updates work (no delays)
- [ ] Cross-portal visibility working (Exporter + NBE)
- [ ] KPIs show real data (no hardcoded values)
- [ ] Error handling works correctly
- [ ] Blockchain audit trail complete
- [ ] No TypeScript compilation errors
- [ ] No console errors in browser
- [ ] Backend logs show all chaincode calls
- [ ] Performance acceptable (< 3s per action)

---

## Quick Test Commands

### Start All Services
```bash
# Terminal 1: Blockchain
cd blockchain && ./network.sh up

# Terminal 2: Backend
cd api && npm start

# Terminal 3: Frontend
cd ui && npm start
```

### Reset Test Data
```bash
# Reset blockchain to clean state
cd blockchain && ./network.sh down
cd blockchain && ./network.sh up

# Reset Postgres
psql -d cecbs -c "TRUNCATE lc_requests CASCADE;"
psql -d cecbs -c "TRUNCATE documents CASCADE;"
psql -d cecbs -c "TRUNCATE payments CASCADE;"

# Recreate test data
cd api && node backfill-test-data.js
```

### Monitor Logs
```bash
# Backend API logs
tail -f api/api.log

# Blockchain peer logs
docker logs -f peer0.bank1.cecbs.et

# Frontend console
# Open browser DevTools → Console tab
```

---

## Troubleshooting

### Issue: LC not appearing in tab
**Check:**
1. LC status matches tab filter
2. Browser refreshed after status change
3. No JavaScript errors in console
4. Backend API returning correct data

### Issue: Approve button not responding
**Check:**
1. Token valid (not expired)
2. Network connection to backend
3. Browser console for errors
4. Backend logs for API errors

### Issue: Status not updating
**Check:**
1. Blockchain network running
2. Chaincode deployed correctly
3. Postgres database synced
4. Backend fabricService working

### Issue: Blockchain signature not created
**Check:**
1. Chaincode function called correctly
2. X.509 certificate valid
3. MSP ID configured correctly
4. Blockchain network responsive

---

## Final Validation

After completing all tests, verify:
```bash
# Check total signatures created
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["QueryAllSignatures"]}'

# Check all LCs in SETTLED status
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["QueryLCsByStatus","SETTLED"]}'

# Check all payments released
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["QueryAllPayments"]}'
```

**Expected Results:**
- All test LCs reached SETTLED status
- All blockchain signatures valid
- All KPIs showing accurate data
- Cross-portal visibility confirmed
- Audit trail complete and queryable

---

## Next Steps After Testing

1. **Production Deployment:**
   - Deploy to staging environment
   - Run load tests with real data volume
   - Security audit of blockchain access
   - Performance optimization if needed

2. **User Training:**
   - Create user manual for bank officers
   - Record workflow demo videos
   - Conduct training sessions
   - Gather user feedback

3. **Monitoring Setup:**
   - Configure blockchain monitoring
   - Set up API performance tracking
   - Create alerting for failures
   - Dashboard for real-time metrics

---

**Document Status:** ✅ Ready for Testing  
**Last Updated:** 2026-09-18  
**Tested By:** _[To be filled]_  
**Test Results:** _[To be filled]_
